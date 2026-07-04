const express = require('express');
const {
  createLostFoundItem,
  getAllActiveLostFoundItems,
  getMyLostFoundItems,
  getLostFoundItemById,
  updateLostFoundItem,
  updateLostFoundStatus,
  closeLostFoundItem
} = require('../controllers/lostFoundController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('student', 'admin', 'department'), createLostFoundItem);
router.get('/', protect, authorizeRoles('student', 'admin', 'department'), getAllActiveLostFoundItems);
router.get('/my', protect, authorizeRoles('student', 'admin', 'department'), getMyLostFoundItems);
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getLostFoundItemById);
router.put('/:id', protect, authorizeRoles('student', 'admin', 'department'), updateLostFoundItem);
router.put('/:id/status', protect, authorizeRoles('student', 'admin', 'department'), updateLostFoundStatus);
router.delete('/:id', protect, authorizeRoles('student', 'admin', 'department'), closeLostFoundItem);

module.exports = router;
