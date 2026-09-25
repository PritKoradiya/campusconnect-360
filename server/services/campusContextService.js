const Complaint = require('../models/Complaint');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventAttendance = require('../models/EventAttendance');
const LostFound = require('../models/LostFound');
const Notification = require('../models/Notification');

/**
 * Safe backend context retrieval functions.
 * All functions strictly query by the authenticated user's ID.
 * MongoDB is never directly exposed to the LLM.
 */

const getMyComplaints = async (userId) => {
  try {
    const complaints = await Complaint.find({ student: userId })
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const counts = {
      total: complaints.length,
      pending: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0
    };

    complaints.forEach((c) => {
      if (c.status === 'Pending') counts.pending += 1;
      else if (c.status === 'In Progress') counts.inProgress += 1;
      else if (c.status === 'Resolved') counts.resolved += 1;
      else if (c.status === 'Rejected') counts.rejected += 1;
    });

    const recentComplaints = complaints.map((c) => ({
      title: c.title,
      category: c.category,
      priority: c.priority,
      status: c.status,
      department: c.department?.name || 'Unassigned',
      adminRemarks: c.adminRemarks || null,
      departmentRemarks: c.departmentRemarks || null,
      submittedDate: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
    }));

    return {
      type: 'complaints',
      summary: counts,
      items: recentComplaints
    };
  } catch (error) {
    console.error('Error in getMyComplaints:', error.message);
    return null;
  }
};

const getMyRegistrations = async (userId) => {
  try {
    const registrations = await EventRegistration.find({
      student: userId,
      status: 'REGISTERED'
    })
      .populate({
        path: 'event',
        select: 'title eventDate eventTime venue organizer isActive'
      })
      .sort({ registeredAt: -1 })
      .limit(10)
      .lean();

    const validRegistrations = registrations
      .filter((r) => r.event)
      .map((r) => ({
        eventTitle: r.event.title,
        eventDate: r.event.eventDate ? new Date(r.event.eventDate).toLocaleDateString() : 'N/A',
        eventTime: r.event.eventTime || 'N/A',
        venue: r.event.venue || 'N/A',
        organizer: r.event.organizer || 'Campus',
        registeredAt: r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : 'N/A'
      }));

    return {
      type: 'registrations',
      totalRegistered: validRegistrations.length,
      items: validRegistrations
    };
  } catch (error) {
    console.error('Error in getMyRegistrations:', error.message);
    return null;
  }
};

const getMyAttendance = async (userId) => {
  try {
    const attendanceRecords = await EventAttendance.find({
      student: userId,
      checkedIn: true
    })
      .populate({
        path: 'event',
        select: 'title eventDate venue'
      })
      .sort({ checkedInAt: -1 })
      .limit(10)
      .lean();

    const attendedItems = attendanceRecords
      .filter((a) => a.event)
      .map((a) => ({
        eventTitle: a.event.title,
        eventDate: a.event.eventDate ? new Date(a.event.eventDate).toLocaleDateString() : 'N/A',
        venue: a.event.venue || 'N/A',
        checkedInAt: a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : 'N/A'
      }));

    return {
      type: 'attendance',
      totalAttended: attendanceRecords.length,
      items: attendedItems
    };
  } catch (error) {
    console.error('Error in getMyAttendance:', error.message);
    return null;
  }
};

const getUpcomingEvents = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({
      isActive: true,
      eventDate: { $gte: today }
    })
      .sort({ eventDate: 1 })
      .limit(5)
      .select('title description eventDate eventTime venue organizer isRegistrationEnabled registeredCount')
      .lean();

    const items = events.map((e) => ({
      title: e.title,
      description: e.description ? e.description.substring(0, 120) : '',
      eventDate: e.eventDate ? new Date(e.eventDate).toLocaleDateString() : 'N/A',
      eventTime: e.eventTime || 'N/A',
      venue: e.venue || 'N/A',
      organizer: e.organizer || 'Campus',
      registrationOpen: Boolean(e.isRegistrationEnabled)
    }));

    return {
      type: 'upcoming_events',
      totalUpcoming: items.length,
      items
    };
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error.message);
    return null;
  }
};

const getMyLostFound = async (userId) => {
  try {
    const reports = await LostFound.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const counts = {
      total: reports.length,
      lost: reports.filter((r) => r.type === 'Lost').length,
      found: reports.filter((r) => r.type === 'Found').length,
      open: reports.filter((r) => r.status === 'Open').length,
      claimedOrClosed: reports.filter((r) => r.status !== 'Open').length
    };

    const items = reports.map((r) => ({
      itemName: r.itemName,
      type: r.type,
      location: r.location,
      status: r.status,
      itemDate: r.itemDate ? new Date(r.itemDate).toLocaleDateString() : 'N/A'
    }));

    return {
      type: 'lost_found',
      summary: counts,
      items
    };
  } catch (error) {
    console.error('Error in getMyLostFound:', error.message);
    return null;
  }
};

const getMyProfile = (user) => {
  if (!user) return null;
  return {
    type: 'profile',
    studentInfo: {
      name: user.name || 'N/A',
      enrollmentNo: user.enrollmentNo || 'N/A',
      email: user.email || 'N/A',
      role: user.role || 'student',
      branch: user.branch || 'N/A',
      semester: user.semester || 'N/A',
      department: user.department || 'N/A',
      division: user.division || 'N/A',
      academicYear: user.academicYear || 'N/A'
    }
  };
};

const getMyNotifications = async (userId) => {
  try {
    const notifications = await Notification.find({
      recipient: userId,
      isRead: false
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      type: 'notifications',
      unreadCount: notifications.length,
      recent: notifications.map((n) => ({
        title: n.title,
        message: n.message,
        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'N/A'
      }))
    };
  } catch (error) {
    console.error('Error in getMyNotifications:', error.message);
    return null;
  }
};

module.exports = {
  getMyComplaints,
  getMyRegistrations,
  getMyAttendance,
  getUpcomingEvents,
  getMyLostFound,
  getMyProfile,
  getMyNotifications
};
