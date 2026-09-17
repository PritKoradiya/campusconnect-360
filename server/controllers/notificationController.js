const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/notifications
 * Fetch paginated notifications for the authenticated user with optional filtering.
 */
const getNotifications = async (req, res) => {
  try {
    const { page, limit, isRead, type } = req.query;

    const options = {};

    if (page !== undefined) {
      const parsedPage = parseInt(page, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "page" must be a positive integer'
        });
      }
      options.page = parsedPage;
    }

    if (limit !== undefined) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "limit" must be a positive integer'
        });
      }
      options.limit = parsedLimit;
    }

    if (isRead !== undefined) {
      if (isRead === 'true' || isRead === true) {
        options.isRead = true;
      } else if (isRead === 'false' || isRead === false) {
        options.isRead = false;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Query parameter "isRead" must be either "true" or "false"'
        });
      }
    }

    if (type !== undefined) {
      if (!Notification.NOTIFICATION_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid notification type filter. Allowed types: ${Notification.NOTIFICATION_TYPES.join(', ')}`
        });
      }
      options.type = type;
    }

    const result = await notificationService.getUserNotifications(req.user._id, options);

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully',
      count: result.notifications.length,
      total: result.total,
      unreadCount: result.unreadCount,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      },
      notifications: result.notifications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch notifications',
      error: error.message
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Return the unread notification count for the authenticated user.
 */
const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Unread notification count fetched successfully',
      count
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch unread notification count',
      error: error.message
    });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read for the authenticated user.
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification id'
      });
    }

    const notification = await notificationService.markAsRead(id, req.user._id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not mark notification as read',
      error: error.message
    });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification belonging to the authenticated user.
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification id'
      });
    }

    const deleted = await notificationService.deleteNotification(id, req.user._id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete notification',
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
