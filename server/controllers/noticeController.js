const mongoose = require('mongoose');
const Notice = require('../models/Notice');
const User = require('../models/User');
const { createManyNotifications } = require('../services/notificationService');

const allowedTargetAudiences = ['All', 'Students', 'Faculty', 'Department'];
const allowedPriorities = ['Normal', 'Important', 'Urgent'];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const findNoticeRecipients = async (targetAudience, excludeUserId = null) => {
  const filter = { isActive: true };

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  if (targetAudience === 'Students') {
    filter.role = 'student';
  } else if (targetAudience === 'Department' || targetAudience === 'Faculty') {
    filter.role = 'department';
  }

  return User.find(filter).select('_id role');
};

const getNoticeLinkForRole = (role) => {
  if (role === 'student') return '/student/notices';
  if (role === 'admin') return '/admin/notices';
  return '/notifications';
};

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

    // H1, H2, H5, H6, H7: Notify matching target audience users
    try {
      const recipients = await findNoticeRecipients(targetAudience, req.user._id);
      if (recipients.length > 0) {
        const notifications = recipients.map((user) => ({
          recipient: user._id,
          type: 'NOTICE_CREATED',
          title: 'New Campus Notice',
          message: `New notice '${notice.title}' has been published.`,
          relatedId: notice._id,
          relatedType: 'Notice',
          link: getNoticeLinkForRole(user.role)
        }));
        await createManyNotifications(notifications);
      }
    } catch (notifError) {
      console.error('Failed to dispatch notice created notifications:', notifError.message);
    }

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

    const isTitleChanged = title !== undefined && title.trim() !== notice.title;
    const isDescriptionChanged = description !== undefined && description.trim() !== notice.description;
    const isAudienceChanged = targetAudience !== undefined && targetAudience !== notice.targetAudience;
    const isPriorityChanged = priority !== undefined && priority !== notice.priority;
    const isExpiryChanged = expiryDate !== undefined && String(expiryDate) !== String(notice.expiryDate);
    const isStatusChanged = isActive !== undefined && isActive !== notice.isActive;

    const hasMeaningfulChange =
      isTitleChanged ||
      isDescriptionChanged ||
      isAudienceChanged ||
      isPriorityChanged ||
      isExpiryChanged ||
      isStatusChanged;

    if (title !== undefined) notice.title = title;
    if (description !== undefined) notice.description = description;
    if (targetAudience !== undefined) notice.targetAudience = targetAudience;
    if (priority !== undefined) notice.priority = priority;
    if (expiryDate !== undefined) notice.expiryDate = expiryDate;
    if (isActive !== undefined) notice.isActive = isActive;

    const updatedNotice = await notice.save();
    await updatedNotice.populate('postedBy', 'name role');

    // H3, H4, H5, H6, H7: Notify matching target audience users on meaningful update
    if (hasMeaningfulChange && updatedNotice.isActive) {
      try {
        const recipients = await findNoticeRecipients(updatedNotice.targetAudience, req.user._id);
        if (recipients.length > 0) {
          const notifications = recipients.map((user) => ({
            recipient: user._id,
            type: 'NOTICE_UPDATED',
            title: 'Campus Notice Updated',
            message: `Campus notice '${updatedNotice.title}' has been updated.`,
            relatedId: updatedNotice._id,
            relatedType: 'Notice',
            link: getNoticeLinkForRole(user.role)
          }));
          await createManyNotifications(notifications);
        }
      } catch (notifError) {
        console.error('Failed to dispatch notice updated notifications:', notifError.message);
      }
    }

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
