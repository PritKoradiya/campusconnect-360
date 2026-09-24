const express = require('express');
const {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  getComplaintTimeline,
  updateComplaintStatus,
  assignComplaintToDepartment,
  deleteComplaint
} = require('../controllers/complaintController');
const {
  submitOrUpdateFeedback,
  getComplaintFeedback,
  getAllFeedbacks,
  getFeedbackStats
} = require('../controllers/feedbackController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student'), submitComplaint);
router.get('/my', protect, authorizeRoles('student'), getMyComplaints);
router.get('/feedback/stats', protect, authorizeRoles('admin', 'department'), getFeedbackStats);
router.get('/feedback/all', protect, authorizeRoles('admin', 'department'), getAllFeedbacks);
router.get('/', protect, authorizeRoles('admin', 'department'), getAllComplaints);
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getComplaintById);
router.get('/:id/timeline', protect, authorizeRoles('student', 'admin', 'department'), getComplaintTimeline);
router.post('/:id/feedback', protect, authorizeRoles('student'), submitOrUpdateFeedback);
router.put('/:id/feedback', protect, authorizeRoles('student'), submitOrUpdateFeedback);
router.get('/:id/feedback', protect, authorizeRoles('student', 'admin', 'department'), getComplaintFeedback);
router.put('/:id/status', protect, authorizeRoles('admin', 'department'), updateComplaintStatus);
router.put('/:id/assign', protect, authorizeRoles('admin'), assignComplaintToDepartment);
router.delete('/:id', protect, authorizeRoles('admin'), deleteComplaint);

module.exports = router;

