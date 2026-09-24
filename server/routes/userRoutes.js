const express = require('express');
const {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
} = require('../controllers/userController');
const {
  getCurrentUser,
  updateCurrentUserProfile
} = require('../controllers/authController');
const { getStudentActivityFeed } = require('../controllers/activityController');
const { getMyAchievements } = require('../controllers/achievementController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Current user profile, activity, and achievements endpoints
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateCurrentUserProfile);
router.get('/me/activity', protect, authorizeRoles('student', 'admin'), getStudentActivityFeed);
router.get('/me/achievements', protect, authorizeRoles('student', 'admin'), getMyAchievements);

// Admin-only user management routes
router.use(protect, authorizeRoles('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;
