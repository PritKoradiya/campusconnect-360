const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');

const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent'];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isDepartmentUserAssigned = (user, complaint) => {
  if (!complaint.department || !user.department) {
    return false;
  }

  const department = complaint.department;
  const userDepartment = user.department.toString().trim().toLowerCase();

  if (typeof department === 'string') {
    return department.trim().toLowerCase() === userDepartment;
  }

  return (
    department._id?.toString().trim().toLowerCase() === userDepartment ||
    department.name?.trim().toLowerCase() === userDepartment ||
    department.code?.trim().toLowerCase() === userDepartment
  );
};

const findComplaintWithDetails = async (id) => {
  return Complaint.findById(id)
    .populate('student', 'name enrollmentNo email')
    .populate('department', 'name code');
};

const submitComplaint = async (req, res) => {
  try {
    const { title, description, category, department, priority, imageUrl } = req.body;

    if (!title || !description || !category || !department || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, category, department, and priority are required'
      });
    }

    if (!isValidId(department)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be Low, Medium, High, or Urgent'
      });
    }

    const departmentExists = await Department.findById(department);

    if (!departmentExists) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const complaint = await Complaint.create({
      student: req.user._id,
      title,
      description,
      category,
      department,
      priority,
      imageUrl: imageUrl || '',
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not submit complaint',
      error: error.message
    });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ student: req.user._id })
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'My complaints fetched successfully',
      count: complaints.length,
      complaints
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch my complaints',
      error: error.message
    });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    let complaints = await Complaint.find()
      .populate('student', 'name enrollmentNo email')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    if (req.user.role === 'department') {
      if (!req.user.department) {
        complaints = [];
      } else {
        complaints = complaints.filter((complaint) =>
          isDepartmentUserAssigned(req.user, complaint)
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: req.user.role === 'department'
        ? 'Assigned complaints fetched successfully'
        : 'All complaints fetched successfully',
      count: complaints.length,
      complaints
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch complaints',
      error: error.message
    });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint id'
      });
    }

    const complaint = await findComplaintWithDetails(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const isStudentOwner =
      req.user.role === 'student' && complaint.student._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedDepartment =
      req.user.role === 'department' && isDepartmentUserAssigned(req.user, complaint);

    if (!isStudentOwner && !isAdmin && !isAssignedDepartment) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this complaint'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Complaint details fetched successfully',
      complaint
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch complaint details',
      error: error.message
    });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks, departmentRemarks } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint id'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Pending, In Progress, Resolved, or Rejected'
      });
    }

    const complaint = await findComplaintWithDetails(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    if (req.user.role === 'department' && !isDepartmentUserAssigned(req.user, complaint)) {
      return res.status(403).json({
        success: false,
        message: 'You can update only complaints assigned to your department'
      });
    }

    complaint.status = status;

    if (adminRemarks !== undefined) {
      complaint.adminRemarks = adminRemarks;
    }

    if (departmentRemarks !== undefined) {
      complaint.departmentRemarks = departmentRemarks;
    }

    complaint.resolvedAt = status === 'Resolved' ? new Date() : undefined;

    const updatedComplaint = await complaint.save();
    await updatedComplaint.populate('student', 'name enrollmentNo email');
    await updatedComplaint.populate('department', 'name code');

    return res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint: updatedComplaint
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not update complaint status',
      error: error.message
    });
  }
};

const assignComplaintToDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint id'
      });
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    if (!isValidId(department)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid department id'
      });
    }

    const departmentExists = await Department.findById(department);

    if (!departmentExists) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    complaint.department = department;
    complaint.status = 'In Progress';

    const updatedComplaint = await complaint.save();
    await updatedComplaint.populate('student', 'name enrollmentNo email');
    await updatedComplaint.populate('department', 'name code');

    return res.status(200).json({
      success: true,
      message: 'Complaint assigned to department successfully',
      complaint: updatedComplaint
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not assign complaint',
      error: error.message
    });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint id'
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await Complaint.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not delete complaint',
      error: error.message
    });
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  assignComplaintToDepartment,
  deleteComplaint
};
