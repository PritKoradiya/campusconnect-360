const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'COMPLAINT_CREATED',
  'COMPLAINT_ASSIGNED',
  'COMPLAINT_STATUS',
  'COMPLAINT_RESOLVED',
  'COMPLAINT_REMARK',
  'NOTICE_CREATED',
  'NOTICE_UPDATED',
  'EVENT_CREATED',
  'EVENT_UPDATED',
  'LOST_FOUND_UPDATE',
  'SYSTEM'
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPES,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    relatedType: {
      type: String,
      trim: true,
      default: null
    },
    link: {
      type: String,
      trim: true,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for frequent query patterns
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
Notification.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

module.exports = Notification;
