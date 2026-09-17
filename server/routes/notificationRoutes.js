const express = require('express');
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Specific routes must precede parameterized (/:id) routes
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadNotificationCount);
router.put('/read-all', protect, markAllNotificationsAsRead);
router.put('/:id/read', protect, markNotificationAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
