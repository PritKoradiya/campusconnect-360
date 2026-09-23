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
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Current user profile endpoints (accessible to any authenticated user)
router.get('/me', protect, getCurrentUser);
router.put('/me', protect, updateCurrentUserProfile);

// Admin-only user management routes
router.use(protect, authorizeRoles('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;
