const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { createManyNotifications } = require('../services/notificationService');

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
      imageUrl
    } = req.body;

    if (!title || !description || !eventDate || !eventTime || !venue) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, eventDate, eventTime, and venue are required'
      });
    }

    const event = await Event.create({
      title,
      description,
      eventDate,
      eventTime,
      venue,
      department,
      organizer,
      imageUrl: imageUrl || ''
    });

    // I1, I4, I5, I6, I7: Dispatch EVENT_CREATED notification to students
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

    return res.status(200).json({
      success: true,
      message: 'Active events fetched successfully',
      count: events.length,
      events
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

    return res.status(200).json({
      success: true,
      message: 'Event fetched successfully',
      event
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
      isActive
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

    const updatedEvent = await event.save();

    // I2, I3, I4, I5, I6, I7: Dispatch notification if meaningful change occurred
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

    // I3, I4, I5, I6, I7: Dispatch cancellation notification if event was previously active
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

module.exports = {
  createEvent,
  getAllActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent
};
