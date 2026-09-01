const express = require('express');
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getDepartments);
router.get('/:id', protect, getDepartmentById);
router.post('/', protect, authorizeRoles('admin'), createDepartment);
router.put('/:id', protect, authorizeRoles('admin'), updateDepartment);
router.put('/:id/status', protect, authorizeRoles('admin'), toggleDepartmentStatus);
router.delete('/:id', protect, authorizeRoles('admin'), deleteDepartment);

module.exports = router;
