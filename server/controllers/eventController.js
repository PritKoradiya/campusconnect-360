const mongoose = require('mongoose');
const Event = require('../models/Event');

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

    event.isActive = false;
    await event.save();

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
