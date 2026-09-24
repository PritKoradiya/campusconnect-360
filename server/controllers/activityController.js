const { getStudentActivities } = require('../services/activityService');

/**
 * Controller to fetch paginated and filtered activity feed for the authenticated student.
 *
 * Route: GET /api/activity OR GET /api/users/me/activity
 * Access: Private (Student)
 */
const getStudentActivityFeed = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { type, category, page, limit } = req.query;

    const result = await getStudentActivities(studentId, {
      category: category || type || 'ALL',
      type: type || category || 'ALL',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });

    return res.status(200).json({
      success: true,
      message: 'Student activity feed fetched successfully',
      count: result.activities.length,
      activities: result.activities,
      pagination: result.pagination,
      counts: result.counts,
      data: {
        activities: result.activities,
        pagination: result.pagination,
        counts: result.counts
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch student activity feed',
      error: error.message
    });
  }
};

module.exports = {
  getStudentActivityFeed
};
