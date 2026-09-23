const express = require('express');
const {
  createEvent,
  getAllActiveEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelEventRegistration,
  getMyRegistrations,
  getMyEventRegistrationStatus,
  getEventRegistrationsAdmin
} = require('../controllers/eventController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Base Event CRUD routes
router.post('/', protect, authorizeRoles('admin'), createEvent);
router.get('/', protect, authorizeRoles('student', 'admin', 'department'), getAllActiveEvents);

// Student registration routes (note: specific route /my-registrations declared before parameter route /:id)
router.get('/my-registrations', protect, authorizeRoles('student'), getMyRegistrations);

// Parameterized Event routes
router.get('/:id', protect, authorizeRoles('student', 'admin', 'department'), getEventById);
router.put('/:id', protect, authorizeRoles('admin'), updateEvent);
router.delete('/:id', protect, authorizeRoles('admin'), deleteEvent);

// Registration actions
router.post('/:id/register', protect, authorizeRoles('student'), registerForEvent);
router.delete('/:id/register', protect, authorizeRoles('student'), cancelEventRegistration);
router.get('/:id/registration', protect, authorizeRoles('student'), getMyEventRegistrationStatus);

// Admin / Department participant management route
router.get('/:id/registrations', protect, authorizeRoles('admin', 'department'), getEventRegistrationsAdmin);

module.exports = router;
