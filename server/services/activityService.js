/**
 * Student Activity Feed Service
 *
 * Aggregates, normalizes, deduplicates, and paginates real historical activity
 * for an authenticated student from authoritative database sources:
 * 1. Complaints & Complaint Timeline events
 * 2. Event Registrations & Cancellations
 * 3. Event QR Attendances & Check-ins
 * 4. Lost & Found Reports & Status updates
 * 5. Profile Updates
 *
 * Uses real timestamps and guarantees strict student data isolation.
 */

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const EventRegistration = require('../models/EventRegistration');
const EventAttendance = require('../models/EventAttendance');
const LostFound = require('../models/LostFound');
const User = require('../models/User');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Normalizes complaint timeline records into feed activity objects.
 *
 * @param {Object} complaint
 * @returns {Array<Object>}
 */
const extractComplaintActivities = (complaint) => {
  const activities = [];
  if (!complaint) return activities;

  const complaintId = complaint._id.toString();
  const category = complaint.category || 'General';
  const priority = complaint.priority || 'Medium';
  const title = complaint.title || 'Untitled Complaint';

  if (Array.isArray(complaint.timeline) && complaint.timeline.length > 0) {
    complaint.timeline.forEach((item, idx) => {
      const ts = item.timestamp ? new Date(item.timestamp) : new Date(complaint.createdAt);
      const uniqueId = `complaint_${complaintId}_${item._id ? item._id.toString() : item.eventType + '_' + idx}_${ts.getTime()}`;

      let actionTitle = item.title;
      if (!actionTitle) {
        switch (item.eventType) {
          case 'COMPLAINT_SUBMITTED':
            actionTitle = 'Complaint Submitted';
            break;
          case 'COMPLAINT_ASSIGNED':
            actionTitle = item.departmentName ? `Assigned to ${item.departmentName}` : 'Complaint Assigned';
            break;
          case 'COMPLAINT_STATUS_CHANGED':
            actionTitle = `Status Changed to ${item.status || complaint.status}`;
            break;
          case 'COMPLAINT_REMARK_ADDED':
            actionTitle = 'Department Remark Added';
            break;
          case 'COMPLAINT_RESOLVED':
            actionTitle = 'Complaint Resolved';
            break;
          default:
            actionTitle = 'Complaint Updated';
        }
      }

      activities.push({
        id: uniqueId,
        type: 'COMPLAINT',
        sourceType: 'complaint',
        subType: item.eventType || 'COMPLAINT_UPDATE',
        eventType: item.eventType || 'COMPLAINT_UPDATE',
        title: actionTitle,
        description: item.description || `Complaint: "${title}"`,
        timestamp: ts,
        sourceId: complaintId,
        status: item.status || complaint.status,
        meta: {
          complaintTitle: title,
          category,
          priority,
          remark: item.remark || null,
          actorName: item.actorName || null,
          departmentName: item.departmentName || null
        },
        metadata: {
          complaintTitle: title,
          category,
          priority,
          remark: item.remark || null,
          actorName: item.actorName || null,
          departmentName: item.departmentName || null
        },
        link: '/student/my-complaints',
        actionLink: {
          path: '/student/my-complaints',
          label: 'View Complaint'
        }
      });
    });
  } else {
    // Fallback if complaint had no timeline array
    activities.push({
      id: `complaint_${complaintId}_submitted_${new Date(complaint.createdAt).getTime()}`,
      type: 'COMPLAINT',
      sourceType: 'complaint',
      subType: 'COMPLAINT_SUBMITTED',
      eventType: 'COMPLAINT_SUBMITTED',
      title: 'Complaint Submitted',
      description: `Submitted complaint: "${title}"`,
      timestamp: new Date(complaint.createdAt),
      sourceId: complaintId,
      status: complaint.status,
      meta: {
        complaintTitle: title,
        category,
        priority
      },
      metadata: {
        complaintTitle: title,
        category,
        priority
      },
      link: '/student/my-complaints',
      actionLink: {
        path: '/student/my-complaints',
        label: 'View Complaint'
      }
    });
  }

  return activities;
};

/**
 * Normalizes event registration and cancellation records.
 *
 * @param {Object} reg
 * @returns {Array<Object>}
 */
const extractRegistrationActivities = (reg) => {
  const activities = [];
  if (!reg) return activities;

  const regId = reg._id.toString();
  const event = reg.event || {};
  const eventTitle = event.title || 'Campus Event';
  const eventDate = event.eventDate ? new Date(event.eventDate).toLocaleDateString() : null;

  // Registration Activity
  const regTimestamp = reg.registeredAt ? new Date(reg.registeredAt) : new Date(reg.createdAt);
  activities.push({
    id: `event_reg_${regId}_registered_${regTimestamp.getTime()}`,
    type: 'EVENT',
    sourceType: 'event',
    subType: 'EVENT_REGISTRATION',
    eventType: 'EVENT_REGISTRATION',
    title: `Registered for "${eventTitle}"`,
    description: `Confirmed registration for "${eventTitle}"${eventDate ? ' scheduled for ' + eventDate : ''}.`,
    timestamp: regTimestamp,
    sourceId: regId,
    status: reg.status,
    meta: {
      eventId: event._id ? event._id.toString() : null,
      eventName: eventTitle,
      category: event.category || null,
      location: event.location || null,
      eventDate: event.eventDate || null
    },
    metadata: {
      eventId: event._id ? event._id.toString() : null,
      eventTitle,
      category: event.category || null,
      location: event.location || null,
      eventDate: event.eventDate || null
    },
    link: '/student/my-registrations',
    actionLink: {
      path: '/student/my-registrations',
      label: 'View Registration'
    }
  });

  // Cancellation Activity (if cancelled)
  if (reg.status === 'CANCELLED' && (reg.cancelledAt || reg.updatedAt)) {
    const cancelTimestamp = reg.cancelledAt ? new Date(reg.cancelledAt) : new Date(reg.updatedAt);
    activities.push({
      id: `event_reg_${regId}_cancelled_${cancelTimestamp.getTime()}`,
      type: 'EVENT',
      sourceType: 'event',
      subType: 'EVENT_CANCELLATION',
      eventType: 'EVENT_REGISTRATION_CANCELLED',
      title: `Cancelled Registration for "${eventTitle}"`,
      description: `Registration for "${eventTitle}" was cancelled.`,
      timestamp: cancelTimestamp,
      sourceId: regId,
      status: 'CANCELLED',
      meta: {
        eventId: event._id ? event._id.toString() : null,
        eventName: eventTitle
      },
      metadata: {
        eventId: event._id ? event._id.toString() : null,
        eventTitle
      },
      link: '/student/events',
      actionLink: {
        path: '/student/events',
        label: 'View Events'
      }
    });
  }

  return activities;
};

/**
 * Normalizes verified event QR attendance check-in records.
 *
 * @param {Object} att
 * @returns {Object|null}
 */
const extractAttendanceActivity = (att) => {
  if (!att || !att.checkedIn) return null;

  const attId = att._id.toString();
  const event = att.event || {};
  const eventTitle = event.title || 'Campus Event';
  const timestamp = att.checkedInAt ? new Date(att.checkedInAt) : new Date(att.createdAt);
  const methodLabel = att.checkInMethod === 'QR_SCAN' ? 'QR Code Scan' : 'Manual verification';

  return {
    id: `event_att_${attId}_checkedin_${timestamp.getTime()}`,
    type: 'EVENT',
    sourceType: 'event',
    subType: 'EVENT_ATTENDANCE',
    eventType: 'EVENT_ATTENDED',
    title: `Attended "${eventTitle}"`,
    description: `Attendance confirmed via ${methodLabel} for "${eventTitle}".`,
    timestamp,
    sourceId: attId,
    status: 'ATTENDED',
    meta: {
      eventId: event._id ? event._id.toString() : null,
      eventName: eventTitle,
      checkInMethod: att.checkInMethod === 'QR_SCAN' ? 'QR Scan' : 'Manual',
      location: event.location || null
    },
    metadata: {
      eventId: event._id ? event._id.toString() : null,
      eventTitle,
      checkInMethod: att.checkInMethod || 'QR_SCAN',
      location: event.location || null
    },
    link: '/student/my-registrations',
    actionLink: {
      path: '/student/my-registrations',
      label: 'View Attendance'
    }
  };
};

/**
 * Normalizes Lost & Found submissions and status progressions.
 *
 * @param {Object} item
 * @returns {Array<Object>}
 */
const extractLostFoundActivities = (item) => {
  const activities = [];
  if (!item) return activities;

  const itemId = item._id.toString();
  const itemName = item.itemName || 'Untitled Item';
  const type = item.type || 'Lost';
  const location = item.location || 'Campus';
  const createdTimestamp = new Date(item.createdAt);

  // Creation Activity
  activities.push({
    id: `lostfound_${itemId}_created_${createdTimestamp.getTime()}`,
    type: 'LOST_FOUND',
    sourceType: 'lost_found',
    subType: type === 'Lost' ? 'LOST_REPORT_CREATED' : 'FOUND_REPORT_CREATED',
    eventType: type === 'Lost' ? 'LOST_ITEM_REPORTED' : 'FOUND_ITEM_REPORTED',
    title: `Reported ${type} Item: "${itemName}"`,
    description: `Reported ${type.toLowerCase()} item "${itemName}" at ${location}.`,
    timestamp: createdTimestamp,
    sourceId: itemId,
    status: item.status || 'Open',
    meta: {
      itemType: type,
      itemName,
      location,
      status: item.status
    },
    metadata: {
      itemType: type,
      itemName,
      location,
      status: item.status
    },
    link: '/student/lost-found',
    actionLink: {
      path: '/student/lost-found',
      label: 'View Item'
    }
  });

  // Status Change Activity (e.g. marked Claimed or Closed)
  if (
    item.status &&
    item.status !== 'Open' &&
    item.updatedAt &&
    new Date(item.updatedAt).getTime() - createdTimestamp.getTime() > 5000
  ) {
    const updatedTimestamp = new Date(item.updatedAt);
    activities.push({
      id: `lostfound_${itemId}_status_${item.status}_${updatedTimestamp.getTime()}`,
      type: 'LOST_FOUND',
      sourceType: 'lost_found',
      subType: 'LOST_FOUND_STATUS_CHANGED',
      eventType: type === 'Lost' ? 'LOST_ITEM_RESOLVED' : 'FOUND_ITEM_RESOLVED',
      title: `${type} Item Marked as ${item.status}`,
      description: `Your ${type.toLowerCase()} report for "${itemName}" is now marked as ${item.status}.`,
      timestamp: updatedTimestamp,
      sourceId: itemId,
      status: item.status,
      meta: {
        itemType: type,
        itemName,
        location,
        status: item.status,
        newStatus: item.status
      },
      metadata: {
        itemType: type,
        itemName,
        newStatus: item.status
      },
      link: '/student/lost-found',
      actionLink: {
        path: '/student/lost-found',
        label: 'View Item'
      }
    });
  }

  return activities;
};

/**
 * Normalizes student profile updates.
 *
 * @param {Object} user
 * @returns {Object|null}
 */
const extractProfileActivity = (user) => {
  if (!user || !user.updatedAt || !user.createdAt) return null;

  const createdTime = new Date(user.createdAt).getTime();
  const updatedTime = new Date(user.updatedAt).getTime();

  // Only consider updates that occurred after initial account registration (>10 seconds)
  if (updatedTime - createdTime < 10000) return null;

  return {
    id: `profile_${user._id.toString()}_updated_${Math.floor(updatedTime / 60000)}`,
    type: 'PROFILE',
    sourceType: 'profile',
    subType: 'PROFILE_UPDATED',
    eventType: 'PROFILE_UPDATED',
    title: 'Student Profile Updated',
    description: 'Updated personal profile and academic details.',
    timestamp: new Date(user.updatedAt),
    sourceId: user._id.toString(),
    status: 'COMPLETED',
    meta: {
      name: user.name,
      department: user.department || null,
      semester: user.semester || null
    },
    metadata: {
      name: user.name,
      department: user.department || null,
      semester: user.semester || null
    },
    link: '/student/profile',
    actionLink: {
      path: '/student/profile',
      label: 'View Profile'
    }
  };
};

/**
 * Aggregates, filters, sorts, deduplicates, and paginates student activity.
 *
 * @param {string|mongoose.Types.ObjectId} studentId
 * @param {Object} [options={}]
 * @param {string} [options.category] - Filter by 'all' | 'complaint' | 'event' | 'lost_found' | 'profile'
 * @param {string} [options.type='ALL'] - Filter alias
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @returns {Promise<Object>}
 */
const getStudentActivities = async (studentId, options = {}) => {
  if (!studentId || !isValidId(studentId)) {
    throw new Error('Valid student ID is required');
  }

  const rawCategory = (options.category || options.type || 'ALL').toString().trim().toUpperCase();
  let requestedType = 'ALL';
  if (['COMPLAINT', 'COMPLAINTS'].includes(rawCategory)) requestedType = 'COMPLAINT';
  else if (['EVENT', 'EVENTS'].includes(rawCategory)) requestedType = 'EVENT';
  else if (['LOST_FOUND', 'LOSTFOUND', 'LOST-FOUND'].includes(rawCategory)) requestedType = 'LOST_FOUND';
  else if (['PROFILE', 'PROFILES', 'USER'].includes(rawCategory)) requestedType = 'PROFILE';

  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(options.limit, 10) || 20));

  // Execute independent source queries concurrently
  const [complaints, registrations, attendances, lostFoundItems, user] = await Promise.all([
    Complaint.find({ student: studentId })
      .select('title category priority status resolvedAt timeline createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean(),

    EventRegistration.find({ student: studentId })
      .populate('event', 'title category eventDate location')
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean(),

    EventAttendance.find({ student: studentId, checkedIn: true })
      .populate('event', 'title category eventDate location')
      .sort({ checkedInAt: -1 })
      .limit(40)
      .lean(),

    LostFound.find({ user: studentId })
      .select('itemName type status location itemDate createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(40)
      .lean(),

    User.findById(studentId)
      .select('name department semester createdAt updatedAt')
      .lean()
  ]);

  const rawActivities = [];

  // 1. Process Complaints
  if (Array.isArray(complaints)) {
    complaints.forEach((c) => {
      rawActivities.push(...extractComplaintActivities(c));
    });
  }

  // 2. Process Event Registrations
  if (Array.isArray(registrations)) {
    registrations.forEach((r) => {
      rawActivities.push(...extractRegistrationActivities(r));
    });
  }

  // 3. Process Event Attendances
  if (Array.isArray(attendances)) {
    attendances.forEach((a) => {
      const act = extractAttendanceActivity(a);
      if (act) rawActivities.push(act);
    });
  }

  // 4. Process Lost & Found
  if (Array.isArray(lostFoundItems)) {
    lostFoundItems.forEach((lf) => {
      rawActivities.push(...extractLostFoundActivities(lf));
    });
  }

  // 5. Process Profile
  if (user) {
    const profAct = extractProfileActivity(user);
    if (profAct) rawActivities.push(profAct);
  }

  // Deduplicate by unique id
  const seenIds = new Set();
  const deduplicated = [];

  for (const item of rawActivities) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduplicated.push(item);
    }
  }

  // Sort strictly by timestamp descending (newest first)
  deduplicated.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Count summaries for quick filter badges
  const counts = {
    all: deduplicated.length,
    complaint: deduplicated.filter((a) => a.type === 'COMPLAINT').length,
    event: deduplicated.filter((a) => a.type === 'EVENT').length,
    lost_found: deduplicated.filter((a) => a.type === 'LOST_FOUND').length,
    profile: deduplicated.filter((a) => a.type === 'PROFILE').length
  };

  // Filter if a specific type was requested
  const filtered =
    requestedType === 'ALL'
      ? deduplicated
      : deduplicated.filter((a) => a.type === requestedType);

  // Paginate
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedActivities = filtered.slice(startIndex, startIndex + limit);
  const hasMore = page < totalPages;

  return {
    activities: paginatedActivities,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore
    },
    counts
  };
};

module.exports = {
  getStudentActivities,
  extractComplaintActivities,
  extractRegistrationActivities,
  extractAttendanceActivity,
  extractLostFoundActivities,
  extractProfileActivity
};
