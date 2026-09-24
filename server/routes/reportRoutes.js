const express = require('express');
const { getAdminReports, getAdminLiveAnalytics } = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, authorizeRoles('admin'), getAdminReports);
router.get('/live-analytics', protect, authorizeRoles('admin'), getAdminLiveAnalytics);
router.get('/analytics', protect, authorizeRoles('admin'), getAdminLiveAnalytics);

module.exports = router;
