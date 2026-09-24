const express = require('express');
const { getStudentActivityFeed } = require('../controllers/activityController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/activity - Fetch current student's historical activity feed
router.get('/', protect, authorizeRoles('student', 'admin'), getStudentActivityFeed);

module.exports = router;
