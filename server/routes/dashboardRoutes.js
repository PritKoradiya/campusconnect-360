const express = require('express');
const {
  getStudentDashboard,
  getAdminDashboard,
  getDepartmentDashboard,
  getDashboardOverview
} = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/student', protect, authorizeRoles('student'), getStudentDashboard);
router.get('/admin', protect, authorizeRoles('admin'), getAdminDashboard);
router.get('/department', protect, authorizeRoles('department'), getDepartmentDashboard);
router.get('/overview', protect, authorizeRoles('student', 'admin', 'department'), getDashboardOverview);

module.exports = router;
