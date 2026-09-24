const { calculateStudentAchievements } = require('../services/achievementService');

/**
 * Fetch achievements and milestones for the authenticated student.
 * Derives user ID strictly from req.user._id (no client-supplied IDs).
 *
 * Route: GET /api/users/me/achievements
 * Access: Private (Student, Admin)
 */
const getMyAchievements = async (req, res) => {
  try {
    const studentId = req.user?._id || req.user?.id;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const data = await calculateStudentAchievements(studentId);

    return res.status(200).json({
      success: true,
      message: 'Student achievements retrieved successfully',
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve achievements',
      error: error.message
    });
  }
};

module.exports = {
  getMyAchievements
};
