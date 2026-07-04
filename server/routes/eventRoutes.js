const express = require('express');
const {
  createEvent,
  getAllActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, authorizeRoles('admin'), createEvent);
router.get('/', protect, authorizeRoles('student', 'admin', 'department'), getAllActiveEvents);
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getEventById);
router.put('/:id', protect, authorizeRoles('admin'), updateEvent);
router.delete('/:id', protect, authorizeRoles('admin'), deleteEvent);

module.exports = router;
