const mongoose = require('mongoose');
const Notice = require('../models/Notice');

const allowedTargetAudiences = ['All', 'Students', 'Faculty', 'Department'];
const allowedPriorities = ['Normal', 'Important', 'Urgent'];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const createNotice = async (req, res) => {
  try {
    const { title, description, targetAudience, priority, expiryDate } = req.body;

    if (!title || !description || !targetAudience || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, targetAudience, and priority are required'
      });
    }

    if (!allowedTargetAudiences.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'targetAudience must be All, Students, Faculty, or Department'
      });
    }

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be Normal, Important, or Urgent'
      });
    }

    const notice = await Notice.create({
      title,
      description,
      postedBy: req.user._id,
      targetAudience,
      priority,
      expiryDate
    });

    return res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      notice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create notice',
      error: error.message
    });
  }
};

const getAllActiveNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate('postedBy', 'name role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Active notices fetched successfully',
      count: notices.length,
      notices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch notices',
      error: error.message
    });
  }
};

const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice id'
      });
    }

    const notice = await Notice.findById(id).populate('postedBy', 'name role');

    if (!notice || !notice.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notice fetched successfully',
      notice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch notice',
      error: error.message
    });
  }
};

const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, targetAudience, priority, expiryDate, isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice id'
      });
    }

    if (targetAudience !== undefined && !allowedTargetAudiences.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'targetAudience must be All, Students, Faculty, or Department'
      });
    }

    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be Normal, Important, or Urgent'
      });
    }

    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (title !== undefined) notice.title = title;
    if (description !== undefined) notice.description = description;
    if (targetAudience !== undefined) notice.targetAudience = targetAudience;
    if (priority !== undefined) notice.priority = priority;
    if (expiryDate !== undefined) notice.expiryDate = expiryDate;
    if (isActive !== undefined) notice.isActive = isActive;

    const updatedNotice = await notice.save();
    await updatedNotice.populate('postedBy', 'name role');

    return res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      notice: updatedNotice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update notice',
      error: error.message
    });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notice id'
      });
    }

    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    notice.isActive = false;
    await notice.save();

    return res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete notice',
      error: error.message
    });
  }
};

module.exports = {
  createNotice,
  getAllActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
};
