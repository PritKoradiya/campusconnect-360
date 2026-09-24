const express = require('express');
const { getMyAchievements } = require('../controllers/achievementController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/achievements/me or /api/achievements
router.get('/me', protect, authorizeRoles('student', 'admin'), getMyAchievements);
router.get('/', protect, authorizeRoles('student', 'admin'), getMyAchievements);

module.exports = router;
