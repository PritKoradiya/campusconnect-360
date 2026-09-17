const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Creates a single notification for a recipient user.
 * Designed for clean decoupling from real-time transports (Socket.IO will hook here in Part B).
 *
 * @param {Object} data
 * @param {string|mongoose.Types.ObjectId} data.recipient - Recipient user ID
 * @param {string} data.type - Notification type from controlled NOTIFICATION_TYPES
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message content
 * @param {string|mongoose.Types.ObjectId} [data.relatedId] - Optional related document ID
 * @param {string} [data.relatedType] - Optional related document type (e.g. 'Complaint')
 * @param {string} [data.link] - Optional frontend navigation link
 * @param {Date} [data.expiresAt] - Optional expiration date
 * @returns {Promise<Object>} Created notification document
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
  link = '',
  expiresAt = null
}) => {
  if (!recipient || !isValidId(recipient)) {
    throw new Error('Valid recipient user ID is required');
  }

  if (!type || !Notification.NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type. Supported types: ${Notification.NOTIFICATION_TYPES.join(', ')}`);
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('Notification title is required');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Notification message is required');
  }

  if (relatedId && !isValidId(relatedId)) {
    throw new Error('Invalid relatedId format');
  }

  const notification = await Notification.create({
    recipient,
    type,
    title: title.trim(),
    message: message.trim(),
    relatedId: relatedId || null,
    relatedType: relatedType ? relatedType.trim() : null,
    link: link ? link.trim() : '',
    expiresAt: expiresAt || null
  });

  // Emit real-time notification to recipient's private room
  try {
    const { emitToUser } = require('../socket');
    emitToUser(recipient, 'notification:new', {
      _id: notification._id,
      recipient: notification.recipient,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId,
      relatedType: notification.relatedType,
      link: notification.link,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });
  } catch (socketError) {
    // MongoDB persistence remains the source of truth if socket emission fails
  }

  return notification;
};

/**
 * Bulk creates notifications for multiple recipients (e.g., system announcements, notices).
 *
 * @param {Array<Object>} notifications - Array of notification payloads
 * @returns {Promise<Array<Object>>} Inserted notification documents
 */
const createManyNotifications = async (notifications) => {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return [];
  }

  for (const item of notifications) {
    if (!item.recipient || !isValidId(item.recipient)) {
      throw new Error('Valid recipient user ID is required for each notification');
    }
    if (!item.type || !Notification.NOTIFICATION_TYPES.includes(item.type)) {
      throw new Error(`Invalid notification type for notification: ${item.title || 'untitled'}`);
    }
    if (!item.title || !item.message) {
      throw new Error('Title and message are required for each notification');
    }
    if (item.relatedId && !isValidId(item.relatedId)) {
      throw new Error('Invalid relatedId format in bulk notification');
    }
  }

  const prepared = notifications.map((n) => ({
    recipient: n.recipient,
    type: n.type,
    title: n.title.trim(),
    message: n.message.trim(),
    relatedId: n.relatedId || null,
    relatedType: n.relatedType ? n.relatedType.trim() : null,
    link: n.link ? n.link.trim() : '',
    expiresAt: n.expiresAt || null,
    isRead: false
  }));

  const createdDocs = await Notification.insertMany(prepared);

  // Emit real-time notifications to each recipient's private room
  try {
    const { emitToUser } = require('../socket');
    createdDocs.forEach((doc) => {
      emitToUser(doc.recipient, 'notification:new', {
        _id: doc._id,
        recipient: doc.recipient,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        relatedId: doc.relatedId,
        relatedType: doc.relatedType,
        link: doc.link,
        isRead: doc.isRead,
        createdAt: doc.createdAt
      });
    });
  } catch (socketError) {
    // MongoDB persistence remains intact if socket emission encounters an issue
  }

  return createdDocs;
};

/**
 * Retrieves paginated notifications for an authenticated user with optional filters.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {boolean} [options.isRead]
 * @param {string} [options.type]
 * @returns {Promise<Object>} Paginated result with metadata
 */
const getUserNotifications = async (userId, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { recipient: userId };

  if (typeof options.isRead === 'boolean') {
    filter.isRead = options.isRead;
  }

  if (options.type && Notification.NOTIFICATION_TYPES.includes(options.type)) {
    filter.type = options.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false })
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Counts unread notifications for a specific user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<number>} Unread count
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};

/**
 * Marks a single notification as read if it belongs to the authenticated user.
 *
 * @param {string|mongoose.Types.ObjectId} notificationId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object|null>} Updated notification or null if not found / unauthorized
 */
const markAsRead = async (notificationId, userId) => {
  if (!isValidId(notificationId)) {
    return null;
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  });

  if (!notification) {
    return null;
  }

  if (notification.isRead) {
    return notification;
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

/**
 * Marks all notifications as read for a specific user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>} Modification summary
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return {
    modifiedCount: result.modifiedCount
  };
};

/**
 * Deletes a single notification if it belongs to the authenticated user.
 *
 * @param {string|mongoose.Types.ObjectId} notificationId
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object|null>} Deleted notification or null if not found / unauthorized
 */
const deleteNotification = async (notificationId, userId) => {
  if (!isValidId(notificationId)) {
    return null;
  }

  return Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId
  });
};

module.exports = {
  createNotification,
  createManyNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
