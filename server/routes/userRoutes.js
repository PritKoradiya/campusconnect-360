const express = require('express');
const {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
} = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All user management routes are protected and restricted to Admin
router.use(protect, authorizeRoles('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;
