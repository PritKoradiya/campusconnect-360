const express = require('express');
const {
  createNotice,
  getAllActiveNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
} = require('../controllers/noticeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('admin'), createNotice);
router.get('/', protect, authorizeRoles('student', 'admin', 'department'), getAllActiveNotices);
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getNoticeById);
router.put('/:id', protect, authorizeRoles('admin'), updateNotice);
router.delete('/:id', protect, authorizeRoles('admin'), deleteNotice);

module.exports = router;
