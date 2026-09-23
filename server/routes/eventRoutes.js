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
  getEventRegistrationsAdmin,
  getMyEventPass,
  checkInAttendance,
  getEventAttendance
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

// QR Pass for Student
router.get('/:id/pass', protect, authorizeRoles('student'), getMyEventPass);

// Admin / Department participant management route
router.get('/:id/registrations', protect, authorizeRoles('admin', 'department'), getEventRegistrationsAdmin);

// QR Attendance routes for Admin / Department
router.post('/:id/attendance/check-in', protect, authorizeRoles('admin', 'department'), checkInAttendance);
router.get('/:id/attendance', protect, authorizeRoles('admin', 'department'), getEventAttendance);

module.exports = router;
