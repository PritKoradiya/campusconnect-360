const mongoose = require('mongoose');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getDepartments = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = {};

    const allowInactive =
      (includeInactive === 'true' || includeInactive === true) &&
      req.user &&
      req.user.role === 'admin';

    if (!allowInactive) {
      filter.isActive = true;
    }

    const departments = await Department.find(filter).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Departments fetched successfully',
      count: departments.length,
      departments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch departments',
      error: error.message
    });
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Department fetched successfully',
      department
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch department',
      error: error.message
    });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, description, headName, contactEmail, contactPhone, isActive } = req.body;

    if (!name || !name.trim() || !code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department name and code are required'
      });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();

    const existingCode = await Department.findOne({ code: normalizedCode });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Department code already exists'
      });
    }

    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingName = await Department.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: 'Department name already exists'
      });
    }

    const department = await Department.create({
      name: normalizedName,
      code: normalizedCode,
      description: description ? description.trim() : '',
      headName: headName ? headName.trim() : '',
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : '',
      contactPhone: contactPhone ? contactPhone.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    return res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create department',
      error: error.message
    });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, headName, contactEmail, contactPhone, isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    if (name !== undefined) {
      const normalizedName = name.trim();
      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          message: 'Department name cannot be empty'
        });
      }

      const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingName = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      });

      if (existingName) {
        return res.status(400).json({
          success: false,
          message: 'Department name already exists'
        });
      }

      department.name = normalizedName;
    }

    if (code !== undefined) {
      const normalizedCode = code.trim().toUpperCase();
      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: 'Department code cannot be empty'
        });
      }

      const existingCode = await Department.findOne({
        _id: { $ne: id },
        code: normalizedCode
      });

      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: 'Department code already exists'
        });
      }

      department.code = normalizedCode;
    }

    if (description !== undefined) {
      department.description = description ? description.trim() : '';
    }

    if (headName !== undefined) {
      department.headName = headName ? headName.trim() : '';
    }

    if (contactEmail !== undefined) {
      department.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : '';
    }

    if (contactPhone !== undefined) {
      department.contactPhone = contactPhone ? contactPhone.trim() : '';
    }

    if (isActive !== undefined) {
      department.isActive = Boolean(isActive);
    }

    const updatedDepartment = await department.save();

    return res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update department',
      error: error.message
    });
  }
};

const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    department.isActive = Boolean(isActive);
    const updatedDepartment = await department.save();

    return res.status(200).json({
      success: true,
      message: 'Department status updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update department status',
      error: error.message
    });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const hasComplaints = await Complaint.exists({ department: id });

    if (hasComplaints) {
      return res.status(409).json({
        success: false,
        message: 'Department cannot be deleted because complaints are assigned to it. Deactivate it instead.'
      });
    }

    await Department.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete department',
      error: error.message
    });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment
};
