const express = require('express');
const {
  registerUser,
  loginUser,
  getCurrentUser
} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);

router.get('/student-test', protect, authorizeRoles('student'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student role route working'
  });
});

router.get('/admin-test', protect, authorizeRoles('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin role route working'
  });
});

router.get('/department-test', protect, authorizeRoles('department'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Department role route working'
  });
});

module.exports = router;
