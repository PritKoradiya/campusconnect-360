const express = require('express');
const {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaintToDepartment,
  deleteComplaint
} = require('../controllers/complaintController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student'), submitComplaint);
router.get('/my', protect, authorizeRoles('student'), getMyComplaints);
router.get('/', protect, authorizeRoles('admin', 'department'), getAllComplaints);
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getComplaintById);
router.put('/:id/status', protect, authorizeRoles('admin', 'department'), updateComplaintStatus);
router.put('/:id/assign', protect, authorizeRoles('admin'), assignComplaintToDepartment);
router.delete('/:id', protect, authorizeRoles('admin'), deleteComplaint);

module.exports = router;
