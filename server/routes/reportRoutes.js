const express = require('express');
const { getAdminReports } = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, authorizeRoles('admin'), getAdminReports);

module.exports = router;
