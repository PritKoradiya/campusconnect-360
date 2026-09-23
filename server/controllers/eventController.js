const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
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
      cancelled: 0
    };

    registrations.forEach((r) => {
      if (r.status === 'CANCELLED') {
        summary.cancelled += 1;
      } else if (r.status === 'REGISTERED') {
        summary.registered += 1;
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
      count: registrations.length,
      summary,
      registrations
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
  getEventRegistrationsAdmin
};
