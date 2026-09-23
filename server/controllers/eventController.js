const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventAttendance = require('../models/EventAttendance');
const User = require('../models/User');
const { createNotification, createManyNotifications } = require('../services/notificationService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventDate,
      eventTime,
      venue,
      department,
      organizer,
      imageUrl,
      isRegistrationEnabled,
      maxParticipants,
      registrationDeadline
    } = req.body;

    if (!title || !description || !eventDate || !eventTime || !venue) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, eventDate, eventTime, and venue are required'
      });
    }

    let parsedMax = null;
    if (maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== '') {
      parsedMax = parseInt(maxParticipants, 10);
      if (isNaN(parsedMax) || parsedMax < 1) {
        return res.status(400).json({
          success: false,
          message: 'Maximum participants must be a positive number'
        });
      }
    }

    let parsedDeadline = null;
    if (registrationDeadline) {
      parsedDeadline = new Date(registrationDeadline);
      if (isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration deadline date format'
        });
      }
    }

    const event = await Event.create({
      title,
      description,
      eventDate,
      eventTime,
      venue,
      department,
      organizer,
      imageUrl: imageUrl || '',
      isRegistrationEnabled: isRegistrationEnabled !== undefined ? Boolean(isRegistrationEnabled) : true,
      maxParticipants: parsedMax,
      registrationDeadline: parsedDeadline,
      registeredCount: 0
    });

    // Dispatch EVENT_CREATED notification to students
    try {
      const students = await User.find({ role: 'student', isActive: true, _id: { $ne: req.user._id } }).select('_id');
      if (students.length > 0) {
        const notifications = students.map((student) => ({
          recipient: student._id,
          type: 'EVENT_CREATED',
          title: 'New Campus Event',
          message: `New event '${event.title}' has been published.`,
          relatedId: event._id,
          relatedType: 'Event',
          link: '/student/events'
        }));
        await createManyNotifications(notifications);
      }
    } catch (notifError) {
      console.error('Failed to dispatch event created notifications:', notifError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create event',
      error: error.message
    });
  }
};

const getAllActiveEvents = async (req, res) => {
  try {
    const events = await Event.find({ isActive: true }).sort({
      eventDate: 1,
      createdAt: -1
    });

    // If the requester is a student, attach their registration state efficiently
    let enrichedEvents = events;
    if (req.user && req.user.role === 'student') {
      const studentRegistrations = await EventRegistration.find({
        student: req.user._id,
        status: 'REGISTERED'
      }).select('event');

      const registeredSet = new Set(studentRegistrations.map((r) => r.event.toString()));

      enrichedEvents = events.map((event) => {
        const plain = event.toObject ? event.toObject() : { ...event };
        plain.isRegistered = registeredSet.has(plain._id.toString());
        return plain;
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Active events fetched successfully',
      count: enrichedEvents.length,
      events: enrichedEvents
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch events',
      error: error.message
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(id);

    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const plainEvent = event.toObject ? event.toObject() : { ...event };

    // If student, attach registration status and details
    if (req.user && req.user.role === 'student') {
      const registration = await EventRegistration.findOne({
        event: event._id,
        student: req.user._id
      });

      plainEvent.isRegistered = registration?.status === 'REGISTERED';
      plainEvent.userRegistration = registration || null;
    }

    return res.status(200).json({
      success: true,
      message: 'Event fetched successfully',
      event: plainEvent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch event',
      error: error.message
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      eventDate,
      eventTime,
      venue,
      department,
      organizer,
      imageUrl,
      isActive,
      isRegistrationEnabled,
      maxParticipants,
      registrationDeadline
    } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const isTitleChanged = title !== undefined && title.trim() !== event.title;
    const isDescriptionChanged = description !== undefined && description.trim() !== event.description;
    const isDateChanged =
      eventDate !== undefined &&
      new Date(eventDate).getTime() !== new Date(event.eventDate).getTime();
    const isTimeChanged = eventTime !== undefined && eventTime.trim() !== event.eventTime;
    const isVenueChanged = venue !== undefined && venue.trim() !== event.venue;
    const isDepartmentChanged =
      department !== undefined && (department || '').trim() !== (event.department || '').trim();
    const isOrganizerChanged =
      organizer !== undefined && (organizer || '').trim() !== (event.organizer || '').trim();
    const isImageChanged = imageUrl !== undefined && imageUrl !== event.imageUrl;
    const isStatusChanged = isActive !== undefined && isActive !== event.isActive;

    const hasMeaningfulChange =
      isTitleChanged ||
      isDescriptionChanged ||
      isDateChanged ||
      isTimeChanged ||
      isVenueChanged ||
      isDepartmentChanged ||
      isOrganizerChanged ||
      isImageChanged ||
      isStatusChanged;

    const wasActive = event.isActive;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (eventDate !== undefined) event.eventDate = eventDate;
    if (eventTime !== undefined) event.eventTime = eventTime;
    if (venue !== undefined) event.venue = venue;
    if (department !== undefined) event.department = department;
    if (organizer !== undefined) event.organizer = organizer;
    if (imageUrl !== undefined) event.imageUrl = imageUrl;
    if (isActive !== undefined) event.isActive = isActive;

    if (isRegistrationEnabled !== undefined) {
      event.isRegistrationEnabled = Boolean(isRegistrationEnabled);
    }

    if (maxParticipants !== undefined) {
      if (maxParticipants === null || maxParticipants === '') {
        event.maxParticipants = null;
      } else {
        const parsed = parseInt(maxParticipants, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          event.maxParticipants = parsed;
        }
      }
    }

    if (registrationDeadline !== undefined) {
      if (!registrationDeadline) {
        event.registrationDeadline = null;
      } else {
        const parsedDate = new Date(registrationDeadline);
        if (!isNaN(parsedDate.getTime())) {
          event.registrationDeadline = parsedDate;
        }
      }
    }

    const updatedEvent = await event.save();

    // Dispatch notification if meaningful change occurred
    if (hasMeaningfulChange) {
      try {
        const students = await User.find({ role: 'student', isActive: true, _id: { $ne: req.user._id } }).select('_id');
        if (students.length > 0) {
          const isNowInactive = wasActive && updatedEvent.isActive === false;
          const notifTitle = isNowInactive ? 'Event No Longer Available' : 'Event Updated';
          const notifMessage = isNowInactive
            ? `Event '${updatedEvent.title}' is no longer available.`
            : `Event '${updatedEvent.title}' has been updated.`;

          const notifications = students.map((student) => ({
            recipient: student._id,
            type: 'EVENT_UPDATED',
            title: notifTitle,
            message: notifMessage,
            relatedId: updatedEvent._id,
            relatedType: 'Event',
            link: '/student/events'
          }));
          await createManyNotifications(notifications);
        }
      } catch (notifError) {
        console.error('Failed to dispatch event updated notifications:', notifError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update event',
      error: error.message
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const wasActive = event.isActive;
    event.isActive = false;
    await event.save();

    // Dispatch cancellation notification if event was previously active
    if (wasActive) {
      try {
        const students = await User.find({ role: 'student', isActive: true, _id: { $ne: req.user._id } }).select('_id');
        if (students.length > 0) {
          const notifications = students.map((student) => ({
            recipient: student._id,
            type: 'EVENT_UPDATED',
            title: 'Event No Longer Available',
            message: `Event '${event.title}' is no longer available.`,
            relatedId: event._id,
            relatedType: 'Event',
            link: '/student/events'
          }));
          await createManyNotifications(notifications);
        }
      } catch (notifError) {
        console.error('Failed to dispatch event deleted notifications:', notifError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete event',
      error: error.message
    });
  }
};

// ==========================================
// EVENT REGISTRATION SYSTEM CONTROLLER METHODS
// ==========================================

/**
 * Register the authenticated student for an event
 * POST /api/events/:id/register
 */
const registerForEvent = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const studentId = req.user._id;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);

    if (!event || !event.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or is no longer active'
      });
    }

    // 1. Check if event is ended
    const eventDate = new Date(event.eventDate);
    eventDate.setHours(23, 59, 59, 999);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for an event that has already ended'
      });
    }

    // 2. Check if registration is enabled
    if (event.isRegistrationEnabled === false) {
      return res.status(400).json({
        success: false,
        message: 'Registration is not currently open for this event'
      });
    }

    // 3. Check registration deadline
    if (event.registrationDeadline) {
      const deadline = new Date(event.registrationDeadline);
      if (new Date() > deadline) {
        return res.status(400).json({
          success: false,
          message: 'The registration deadline for this event has passed'
        });
      }
    }

    // 4. Check duplicate active registration
    const existingRegistration = await EventRegistration.findOne({
      event: eventId,
      student: studentId
    });

    if (existingRegistration && existingRegistration.status === 'REGISTERED') {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // 5. Capacity Check (Count active registrations)
    if (event.maxParticipants && event.maxParticipants > 0) {
      const currentActiveCount = await EventRegistration.countDocuments({
        event: eventId,
        status: 'REGISTERED'
      });

      if (currentActiveCount >= event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'This event has reached its maximum participant capacity'
        });
      }
    }

    // 6. Safe Create or Reactivate Registration
    let registration;
    if (existingRegistration) {
      existingRegistration.status = 'REGISTERED';
      existingRegistration.registeredAt = new Date();
      existingRegistration.cancelledAt = null;
      registration = await existingRegistration.save();
    } else {
      registration = await EventRegistration.create({
        event: eventId,
        student: studentId,
        status: 'REGISTERED',
        registeredAt: new Date()
      });
    }

    // 7. Update registeredCount on Event
    const updatedCount = await EventRegistration.countDocuments({
      event: eventId,
      status: 'REGISTERED'
    });
    event.registeredCount = updatedCount;
    await event.save();

    // 8. Trigger real-time Notification to student
    try {
      await createNotification({
        recipient: studentId,
        type: 'EVENT_REGISTRATION',
        title: 'Event Registration Confirmed',
        message: `You have successfully registered for '${event.title}'.`,
        relatedId: event._id,
        relatedType: 'Event',
        link: '/student/my-registrations'
      });
    } catch (notifError) {
      console.error('Failed to dispatch registration confirmation notification:', notifError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      registration
    });
  } catch (error) {
    // Handle MongoDB 11000 duplicate key error defensively
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Could not process event registration',
      error: error.message
    });
  }
};

/**
 * Cancel the authenticated student's registration for an event
 * DELETE /api/events/:id/register
 */
const cancelEventRegistration = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const studentId = req.user._id;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registration = await EventRegistration.findOne({
      event: eventId,
      student: studentId,
      status: 'REGISTERED'
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'No active registration found for this event'
      });
    }

    // Update status to CANCELLED and preserve audit history
    registration.status = 'CANCELLED';
    registration.cancelledAt = new Date();
    await registration.save();

    // Update registeredCount on Event
    const updatedCount = await EventRegistration.countDocuments({
      event: eventId,
      status: 'REGISTERED'
    });
    event.registeredCount = updatedCount;
    await event.save();

    // Trigger real-time Notification to student
    try {
      await createNotification({
        recipient: studentId,
        type: 'EVENT_REGISTRATION',
        title: 'Event Registration Cancelled',
        message: `Your registration for '${event.title}' has been cancelled.`,
        relatedId: event._id,
        relatedType: 'Event',
        link: '/student/my-registrations'
      });
    } catch (notifError) {
      console.error('Failed to dispatch registration cancellation notification:', notifError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      registration
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not cancel registration',
      error: error.message
    });
  }
};

/**
 * Get all registrations for the authenticated student
 * GET /api/events/my-registrations
 */
const getMyRegistrations = async (req, res) => {
  try {
    const studentId = req.user._id;

    const registrations = await EventRegistration.find({ student: studentId })
      .populate({
        path: 'event',
        select:
          'title description eventDate eventTime venue department organizer imageUrl isActive maxParticipants registrationDeadline registeredCount isRegistrationEnabled'
      })
      .sort({ createdAt: -1 });

    const now = new Date();
    const summary = {
      total: registrations.length,
      registered: 0,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      checkedIn: 0
    };

    // Look up attendance records for these registrations
    const regIds = registrations.map((r) => r._id);
    const attendances = await EventAttendance.find({
      registration: { $in: regIds }
    }).lean();

    const attendanceMap = new Map(attendances.map((a) => [a.registration.toString(), a]));

    const enrichedRegistrations = registrations.map((r) => {
      const plain = r.toObject ? r.toObject() : { ...r };
      const att = attendanceMap.get(plain._id.toString());
      plain.attendance = att || null;
      plain.isCheckedIn = Boolean(att && att.checkedIn);
      return plain;
    });

    enrichedRegistrations.forEach((r) => {
      if (r.status === 'CANCELLED') {
        summary.cancelled += 1;
      } else if (r.status === 'REGISTERED') {
        summary.registered += 1;
        if (r.isCheckedIn) {
          summary.checkedIn += 1;
        }
        const evDate = r.event?.eventDate ? new Date(r.event.eventDate) : null;
        if (evDate) {
          evDate.setHours(23, 59, 59, 999);
          if (evDate >= now) {
            summary.upcoming += 1;
          } else {
            summary.completed += 1;
          }
        } else {
          summary.upcoming += 1;
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Student registrations fetched successfully',
      count: enrichedRegistrations.length,
      summary,
      registrations: enrichedRegistrations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch your registrations',
      error: error.message
    });
  }
};

/**
 * Get current student's registration status for a specific event
 * GET /api/events/:id/registration
 */
const getMyEventRegistrationStatus = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const studentId = req.user._id;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const registration = await EventRegistration.findOne({
      event: eventId,
      student: studentId
    });

    return res.status(200).json({
      success: true,
      isRegistered: registration?.status === 'REGISTERED',
      registration: registration || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch registration status',
      error: error.message
    });
  }
};

/**
 * Admin / Department view all participants and registration stats for an event
 * GET /api/events/:id/registrations
 */
const getEventRegistrationsAdmin = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { search, status } = req.query;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const filter = { event: eventId };
    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    const registrations = await EventRegistration.find(filter)
      .populate('student', 'name enrollmentNo email department branch semester phone')
      .sort({ registeredAt: -1 });

    let filtered = registrations;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = registrations.filter((r) => {
        const student = r.student;
        if (!student) return false;
        return (
          (student.name && student.name.toLowerCase().includes(q)) ||
          (student.email && student.email.toLowerCase().includes(q)) ||
          (student.enrollmentNo && student.enrollmentNo.toLowerCase().includes(q))
        );
      });
    }

    const totalCount = await EventRegistration.countDocuments({ event: eventId });
    const activeCount = await EventRegistration.countDocuments({ event: eventId, status: 'REGISTERED' });
    const cancelledCount = await EventRegistration.countDocuments({ event: eventId, status: 'CANCELLED' });

    const capacity = event.maxParticipants || null;
    const availableSeats = capacity !== null ? Math.max(0, capacity - activeCount) : null;

    return res.status(200).json({
      success: true,
      message: 'Event registrations fetched successfully',
      event: {
        _id: event._id,
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        venue: event.venue,
        department: event.department,
        organizer: event.organizer,
        maxParticipants: event.maxParticipants,
        registrationDeadline: event.registrationDeadline,
        isRegistrationEnabled: event.isRegistrationEnabled
      },
      stats: {
        totalRegistrations: totalCount,
        activeRegistrations: activeCount,
        cancelledRegistrations: cancelledCount,
        capacity,
        availableSeats
      },
      count: filtered.length,
      registrations: filtered
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch event registrations',
      error: error.message
    });
  }
};

// ==========================================
// QR ATTENDANCE SYSTEM CONTROLLER METHODS
// ==========================================

/**
 * Get authenticated student's QR pass for a specific event
 * GET /api/events/:id/pass
 */
const getMyEventPass = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const studentId = req.user._id;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registration = await EventRegistration.findOne({
      event: eventId,
      student: studentId
    }).populate('student', 'name email enrollmentNo department branch semester phone');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'You are not registered for this event'
      });
    }

    if (registration.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Your registration for this event was cancelled'
      });
    }

    // Check attendance status
    const attendance = await EventAttendance.findOne({
      registration: registration._id
    });

    // Generate signed pass token (opaque and secure; contains no passwords or sensitive PII)
    const passPayload = {
      type: 'CC360_EVENT_PASS',
      regId: registration._id.toString(),
      eventId: event._id.toString(),
      studentId: studentId.toString()
    };

    const passToken = jwt.sign(
      passPayload,
      process.env.JWT_SECRET || 'campusconnect360secretkey',
      { expiresIn: '30d' }
    );

    const ticketId = registration._id.toString().slice(-8).toUpperCase();
    const qrData = JSON.stringify({
      v: '1',
      ticketId,
      regId: registration._id.toString(),
      token: passToken
    });

    return res.status(200).json({
      success: true,
      message: 'Event pass generated successfully',
      pass: {
        ticketId,
        qrData,
        passToken,
        registration: {
          _id: registration._id,
          status: registration.status,
          registeredAt: registration.registeredAt
        },
        event: {
          _id: event._id,
          title: event.title,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          venue: event.venue,
          department: event.department,
          organizer: event.organizer,
          imageUrl: event.imageUrl
        },
        student: registration.student,
        isCheckedIn: !!attendance,
        attendance: attendance
          ? {
              checkedInAt: attendance.checkedInAt,
              checkInMethod: attendance.checkInMethod
            }
          : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not generate event pass',
      error: error.message
    });
  }
};

/**
 * Admin / Department check in attendee via QR scan or manual ID
 * POST /api/events/:id/attendance/check-in
 */
const checkInAttendance = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    let { token, regId, rawQrPayload, checkInMethod } = req.body;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Parse rawQrPayload if provided
    if (rawQrPayload && (!token || !regId)) {
      if (typeof rawQrPayload === 'string') {
        try {
          const parsed = JSON.parse(rawQrPayload);
          if (parsed.token) token = parsed.token;
          if (parsed.regId) regId = parsed.regId;
        } catch {
          if (!token) token = rawQrPayload;
        }
      } else if (typeof rawQrPayload === 'object') {
        if (rawQrPayload.token) token = rawQrPayload.token;
        if (rawQrPayload.regId) regId = rawQrPayload.regId;
      }
    }

    let determinedMethod = checkInMethod || (token ? 'QR_SCAN' : 'MANUAL');

    // If token is provided, verify signature and payload integrity
    if (token) {
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'campusconnect360secretkey');
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired QR pass token. Please re-open the pass.',
          error: err.message
        });
      }

      if (decoded.type !== 'CC360_EVENT_PASS') {
        return res.status(400).json({
          success: false,
          message: 'Unrecognized pass format. Invalid QR code.'
        });
      }

      // Check if QR pass belongs to the current event
      if (decoded.eventId !== eventId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Wrong Event: This QR pass was issued for a different event.'
        });
      }

      regId = decoded.regId;
    }

    if (!regId || !isValidId(regId)) {
      return res.status(400).json({
        success: false,
        message: 'Registration ID or valid QR token is required for check-in'
      });
    }

    // Lookup registration
    const registration = await EventRegistration.findById(regId)
      .populate('student', 'name email enrollmentNo department branch semester phone')
      .populate('event', 'title eventDate eventTime venue');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found'
      });
    }

    // Validate event matching
    const regEventId = registration.event._id ? registration.event._id.toString() : registration.event.toString();
    if (regEventId !== eventId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Wrong Event: This registration belongs to a different event.'
      });
    }

    // Validate active registration status
    if (registration.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot Check In: This registration was cancelled by the student.'
      });
    }

    // Check for duplicate attendance (strict server-side guard)
    const existingAttendance = await EventAttendance.findOne({
      registration: registration._id
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        alreadyCheckedIn: true,
        message: 'Already Checked In: Student has already checked in for this event.',
        student: registration.student,
        attendance: {
          checkedInAt: existingAttendance.checkedInAt,
          checkInMethod: existingAttendance.checkInMethod
        }
      });
    }

    // Create attendance record
    const attendance = await EventAttendance.create({
      event: eventId,
      registration: registration._id,
      student: registration.student._id,
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: req.user._id,
      checkInMethod: determinedMethod
    });

    // Send confirmation notification to student
    try {
      await createNotification({
        recipient: registration.student._id,
        type: 'EVENT_ATTENDANCE',
        title: 'Event Check-In Confirmed',
        message: `Your attendance for "${registration.event.title || event.title}" has been successfully recorded. Welcome!`,
        link: '/student/my-registrations',
        data: {
          eventId: event._id,
          attendanceId: attendance._id,
          checkedInAt: attendance.checkedInAt
        }
      });
    } catch (notifErr) {
      console.warn('Failed to send attendance notification:', notifErr.message);
    }

    // Fetch updated live stats
    const totalRegistrations = await EventRegistration.countDocuments({
      event: eventId,
      status: 'REGISTERED'
    });
    const totalCheckedIn = await EventAttendance.countDocuments({ event: eventId });
    const notCheckedIn = Math.max(0, totalRegistrations - totalCheckedIn);
    const attendanceRate = totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      attendance: {
        _id: attendance._id,
        checkedInAt: attendance.checkedInAt,
        checkInMethod: attendance.checkInMethod
      },
      student: registration.student,
      ticketId: registration._id.toString().slice(-8).toUpperCase(),
      stats: {
        totalRegistrations,
        totalCheckedIn,
        notCheckedIn,
        attendanceRate
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        alreadyCheckedIn: true,
        message: 'Already Checked In: Student has already checked in for this event.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Could not record attendance',
      error: error.message
    });
  }
};

/**
 * Admin / Department view event attendance live metrics and participant roster
 * GET /api/events/:id/attendance
 */
const getEventAttendance = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { search, status } = req.query;

    if (!isValidId(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event id'
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get all registered students
    const registrations = await EventRegistration.find({
      event: eventId,
      status: 'REGISTERED'
    })
      .populate('student', 'name email enrollmentNo department branch semester phone')
      .sort({ registeredAt: 1 });

    // Get all attendance records for this event
    const attendances = await EventAttendance.find({ event: eventId })
      .populate('checkedInBy', 'name role');

    const attendanceMap = new Map();
    let qrCount = 0;
    let manualCount = 0;

    attendances.forEach((att) => {
      attendanceMap.set(att.registration.toString(), att);
      if (att.checkInMethod === 'QR_SCAN') qrCount++;
      if (att.checkInMethod === 'MANUAL') manualCount++;
    });

    // Build unified roster
    let roster = registrations.map((reg) => {
      const att = attendanceMap.get(reg._id.toString());
      return {
        registrationId: reg._id,
        ticketId: reg._id.toString().slice(-8).toUpperCase(),
        registeredAt: reg.registeredAt,
        status: reg.status,
        student: reg.student,
        isCheckedIn: !!att,
        attendance: att
          ? {
              _id: att._id,
              checkedInAt: att.checkedInAt,
              checkInMethod: att.checkInMethod,
              checkedInBy: att.checkedInBy
            }
          : null
      };
    });

    // Apply status filter
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'CHECKED_IN') {
        roster = roster.filter((item) => item.isCheckedIn);
      } else if (s === 'NOT_CHECKED_IN') {
        roster = roster.filter((item) => !item.isCheckedIn);
      }
    }

    // Apply search filter
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      roster = roster.filter((item) => {
        const s = item.student;
        if (!s) return false;
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q)) ||
          (item.ticketId && item.ticketId.toLowerCase().includes(q))
        );
      });
    }

    const totalRegistrations = registrations.length;
    const totalCheckedIn = attendances.length;
    const notCheckedIn = Math.max(0, totalRegistrations - totalCheckedIn);
    const attendanceRate = totalRegistrations > 0 ? Math.round((totalCheckedIn / totalRegistrations) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: 'Event attendance fetched successfully',
      event: {
        _id: event._id,
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime,
        venue: event.venue,
        department: event.department,
        organizer: event.organizer,
        maxParticipants: event.maxParticipants
      },
      stats: {
        totalRegistrations,
        totalCheckedIn,
        notCheckedIn,
        attendanceRate,
        qrCount,
        manualCount
      },
      count: roster.length,
      roster
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch event attendance',
      error: error.message
    });
  }
};

module.exports = {
  createEvent,
  getAllActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelEventRegistration,
  getMyRegistrations,
  getMyEventRegistrationStatus,
  getEventRegistrationsAdmin,
  getMyEventPass,
  checkInAttendance,
  getEventAttendance
};

