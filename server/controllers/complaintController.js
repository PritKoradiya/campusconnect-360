const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const { createNotification, createManyNotifications } = require('../services/notificationService');

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

const findDepartmentUsers = async (departmentDoc) => {
  if (!departmentDoc) return [];
  const deptIdStr = departmentDoc._id ? departmentDoc._id.toString() : departmentDoc.toString();
  const deptName = departmentDoc.name ? departmentDoc.name.trim() : '';
  const deptCode = departmentDoc.code ? departmentDoc.code.trim() : '';

  const orConditions = [{ department: deptIdStr }];
  if (deptName) {
    orConditions.push({ department: new RegExp(`^${deptName}$`, 'i') });
    orConditions.push({ department: new RegExp(deptName, 'i') });
  }
  if (deptCode) {
    orConditions.push({ department: new RegExp(`^${deptCode}$`, 'i') });
  }

  const users = await User.find({
    role: 'department',
    isActive: true,
    $or: orConditions
  }).select('_id');

  const uniqueMap = new Map();
  users.forEach((u) => {
    uniqueMap.set(u._id.toString(), u);
  });
  return Array.from(uniqueMap.values());
};

const findComplaintWithDetails = async (id) => {
  return Complaint.findById(id)
    .populate('student', 'name enrollmentNo email')
    .populate('department', 'name code')
    .populate('timeline.actor', 'name email role')
    .populate('timeline.department', 'name code');
};

const getSafelyDerivedTimeline = (complaint) => {
  if (Array.isArray(complaint.timeline) && complaint.timeline.length > 0) {
    return [...complaint.timeline].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  // Reliably derive timeline for legacy complaints created prior to timeline implementation
  const derived = [];
  const createdAt = complaint.createdAt ? new Date(complaint.createdAt) : new Date();

  // 1. Complaint Submitted event (guaranteed by createdAt timestamp)
  derived.push({
    eventType: 'COMPLAINT_SUBMITTED',
    title: 'Complaint Submitted',
    description: `Complaint submitted under ${complaint.category || 'Support'} category with ${complaint.priority || 'Medium'} priority.`,
    status: 'Pending',
    actor: complaint.student?._id || complaint.student || null,
    actorRole: 'student',
    actorName: complaint.student?.name || 'Student',
    department: complaint.department?._id || complaint.department || null,
    departmentName: complaint.department?.name || '',
    remark: '',
    timestamp: createdAt
  });

  // 2. Department Assigned event if complaint has department and moved past Pending
  if (complaint.department && complaint.status !== 'Pending') {
    derived.push({
      eventType: 'COMPLAINT_ASSIGNED',
      title: 'Assigned to Department',
      description: `Assigned to ${complaint.department?.name || 'department'}.`,
      status: 'In Progress',
      actor: null,
      actorRole: 'system',
      actorName: 'System',
      department: complaint.department?._id || complaint.department || null,
      departmentName: complaint.department?.name || '',
      remark: '',
      timestamp: createdAt
    });
  }

  // 3. Department remarks if present
  if (complaint.departmentRemarks) {
    derived.push({
      eventType: 'COMPLAINT_REMARK_ADDED',
      title: 'Department Remark Added',
      description: complaint.departmentRemarks,
      status: complaint.status,
      actor: null,
      actorRole: 'department',
      actorName: 'Department Staff',
      department: complaint.department?._id || complaint.department || null,
      departmentName: complaint.department?.name || '',
      remark: complaint.departmentRemarks,
      timestamp: complaint.updatedAt || createdAt
    });
  }

  // 4. Admin remarks if present
  if (complaint.adminRemarks) {
    derived.push({
      eventType: 'COMPLAINT_REMARK_ADDED',
      title: 'Admin Remark Added',
      description: complaint.adminRemarks,
      status: complaint.status,
      actor: null,
      actorRole: 'admin',
      actorName: 'Administrator',
      department: complaint.department?._id || complaint.department || null,
      departmentName: complaint.department?.name || '',
      remark: complaint.adminRemarks,
      timestamp: complaint.updatedAt || createdAt
    });
  }

  // 5. Resolved event if resolved
  if (complaint.status === 'Resolved' || complaint.resolvedAt) {
    derived.push({
      eventType: 'COMPLAINT_RESOLVED',
      title: 'Complaint Resolved',
      description: `Complaint was resolved${complaint.department?.name ? ` by ${complaint.department.name}` : ''}.`,
      status: 'Resolved',
      actor: null,
      actorRole: 'department',
      actorName: complaint.department?.name || 'Department Staff',
      department: complaint.department?._id || complaint.department || null,
      departmentName: complaint.department?.name || '',
      remark: complaint.departmentRemarks || complaint.adminRemarks || '',
      timestamp: complaint.resolvedAt ? new Date(complaint.resolvedAt) : (complaint.updatedAt ? new Date(complaint.updatedAt) : createdAt)
    });
  }

  return derived.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
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
      status: 'Pending',
      timeline: [
        {
          eventType: 'COMPLAINT_SUBMITTED',
          title: 'Complaint Submitted',
          description: `Complaint submitted under ${category} category with ${priority} priority.`,
          status: 'Pending',
          actor: req.user._id,
          actorRole: 'student',
          actorName: req.user.name || 'Student',
          department: departmentExists._id,
          departmentName: departmentExists.name,
          timestamp: new Date()
        }
      ]
    });

    // G1: Notify Admins of new complaint submission
    try {
      const studentName = req.user.name || 'a student';
      const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id');
      if (adminUsers.length > 0) {
        const notifications = adminUsers.map((admin) => ({
          recipient: admin._id,
          type: 'COMPLAINT_CREATED',
          title: 'New Complaint Submitted',
          message: `New complaint submitted by ${studentName}.`,
          relatedId: complaint._id,
          relatedType: 'Complaint',
          link: '/admin/complaints'
        }));
        await createManyNotifications(notifications);
      }
    } catch (notifError) {
      console.error('Failed to dispatch complaint created notifications:', notifError.message);
    }

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

    const processedComplaints = complaints.map((complaint) => {
      const obj = complaint.toObject ? complaint.toObject() : { ...complaint };
      obj.timeline = getSafelyDerivedTimeline(complaint);
      return obj;
    });

    return res.status(200).json({
      success: true,
      message: 'My complaints fetched successfully',
      count: processedComplaints.length,
      complaints: processedComplaints
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

    const complaintObj = complaint.toObject ? complaint.toObject() : { ...complaint };
    complaintObj.timeline = getSafelyDerivedTimeline(complaint);

    return res.status(200).json({
      success: true,
      message: 'Complaint details fetched successfully',
      complaint: complaintObj
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

    const oldStatus = complaint.status;
    const newStatus = status;
    const statusChanged = oldStatus !== newStatus;

    const oldDeptRemarks = (complaint.departmentRemarks || '').trim();
    const newDeptRemarks = departmentRemarks !== undefined ? departmentRemarks.trim() : null;
    const deptRemarksChanged = newDeptRemarks !== null && newDeptRemarks !== oldDeptRemarks && newDeptRemarks.length > 0;

    const oldAdminRemarks = (complaint.adminRemarks || '').trim();
    const newAdminRemarks = adminRemarks !== undefined ? adminRemarks.trim() : null;
    const adminRemarksChanged = newAdminRemarks !== null && newAdminRemarks !== oldAdminRemarks && newAdminRemarks.length > 0;

    complaint.status = status;

    if (adminRemarks !== undefined) {
      complaint.adminRemarks = adminRemarks;
    }

    if (departmentRemarks !== undefined) {
      complaint.departmentRemarks = departmentRemarks;
    }

    complaint.resolvedAt = status === 'Resolved' ? new Date() : undefined;

    if (!complaint.timeline || complaint.timeline.length === 0) {
      complaint.timeline = getSafelyDerivedTimeline(complaint);
    }

    const actorName = req.user.name || (req.user.role === 'admin' ? 'Admin' : 'Department Staff');
    const deptDoc = complaint.department;
    const deptId = deptDoc?._id || deptDoc || null;
    const deptName = deptDoc?.name || '';

    if (statusChanged) {
      if (newStatus === 'Resolved') {
        complaint.timeline.push({
          eventType: 'COMPLAINT_RESOLVED',
          title: 'Complaint Resolved',
          description: `Complaint was resolved by ${actorName}.`,
          status: 'Resolved',
          actor: req.user._id,
          actorRole: req.user.role,
          actorName,
          department: deptId,
          departmentName: deptName,
          remark: (req.user.role === 'department' ? newDeptRemarks : newAdminRemarks) || '',
          timestamp: new Date()
        });
      } else {
        complaint.timeline.push({
          eventType: 'COMPLAINT_STATUS_CHANGED',
          title: `Status Updated to ${newStatus}`,
          description: `Status changed from ${oldStatus} to ${newStatus}.`,
          status: newStatus,
          actor: req.user._id,
          actorRole: req.user.role,
          actorName,
          department: deptId,
          departmentName: deptName,
          remark: '',
          timestamp: new Date()
        });
      }
    }

    if (deptRemarksChanged) {
      complaint.timeline.push({
        eventType: 'COMPLAINT_REMARK_ADDED',
        title: 'Department Remark Added',
        description: newDeptRemarks,
        remark: newDeptRemarks,
        status: newStatus,
        actor: req.user._id,
        actorRole: 'department',
        actorName,
        department: deptId,
        departmentName: deptName,
        timestamp: new Date()
      });
    }

    if (adminRemarksChanged) {
      complaint.timeline.push({
        eventType: 'COMPLAINT_REMARK_ADDED',
        title: 'Admin Remark Added',
        description: newAdminRemarks,
        remark: newAdminRemarks,
        status: newStatus,
        actor: req.user._id,
        actorRole: 'admin',
        actorName,
        department: deptId,
        departmentName: deptName,
        timestamp: new Date()
      });
    }

    const updatedComplaint = await complaint.save();
    await updatedComplaint.populate('student', 'name enrollmentNo email');
    await updatedComplaint.populate('department', 'name code');

    // G4, G5, G6, G7: Notify student of status change / resolution / remarks
    try {
      const studentId = updatedComplaint.student?._id || updatedComplaint.student;
      if (studentId) {
        // G5: Resolution notification (preferred single notification for resolution)
        if (statusChanged && newStatus === 'Resolved') {
          const deptName = updatedComplaint.department?.name || 'the department';
          await createNotification({
            recipient: studentId,
            type: 'COMPLAINT_RESOLVED',
            title: 'Complaint Resolved',
            message: `Your complaint has been resolved by ${deptName}.`,
            relatedId: updatedComplaint._id,
            relatedType: 'Complaint',
            link: '/student/my-complaints'
          });
        } else if (statusChanged) {
          // G4: Status change notification
          await createNotification({
            recipient: studentId,
            type: 'COMPLAINT_STATUS',
            title: 'Complaint Status Updated',
            message: `Your complaint status changed from ${oldStatus} to ${newStatus}.`,
            relatedId: updatedComplaint._id,
            relatedType: 'Complaint',
            link: '/student/my-complaints'
          });
        }

        // G6: Department remark notification
        if (deptRemarksChanged) {
          await createNotification({
            recipient: studentId,
            type: 'COMPLAINT_REMARK',
            title: 'Department Remark Added',
            message: 'New department remark was added to your complaint.',
            relatedId: updatedComplaint._id,
            relatedType: 'Complaint',
            link: '/student/my-complaints'
          });
        }

        // G7: Admin remark notification
        if (adminRemarksChanged) {
          await createNotification({
            recipient: studentId,
            type: 'COMPLAINT_REMARK',
            title: 'Admin Remark Added',
            message: 'New admin remark was added to your complaint.',
            relatedId: updatedComplaint._id,
            relatedType: 'Complaint',
            link: '/student/my-complaints'
          });
        }
      }
    } catch (notifError) {
      console.error('Failed to dispatch complaint status/remark notifications:', notifError.message);
    }

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

    if (!complaint.timeline || complaint.timeline.length === 0) {
      complaint.timeline = getSafelyDerivedTimeline(complaint);
    }

    complaint.department = department;
    complaint.status = 'In Progress';

    complaint.timeline.push({
      eventType: 'COMPLAINT_ASSIGNED',
      title: 'Assigned to Department',
      description: `Assigned to ${departmentExists.name} by Admin.`,
      status: 'In Progress',
      actor: req.user._id,
      actorRole: 'admin',
      actorName: req.user.name || 'Admin',
      department: departmentExists._id,
      departmentName: departmentExists.name,
      remark: '',
      timestamp: new Date()
    });

    const updatedComplaint = await complaint.save();
    await updatedComplaint.populate('student', 'name enrollmentNo email');
    await updatedComplaint.populate('department', 'name code');

    // G2 / G3: Notify assigned department and student
    try {
      const deptUsers = await findDepartmentUsers(departmentExists);
      if (deptUsers.length > 0) {
        const deptNotifications = deptUsers.map((u) => ({
          recipient: u._id,
          type: 'COMPLAINT_ASSIGNED',
          title: 'New Complaint Assigned',
          message: 'New complaint assigned to your department.',
          relatedId: updatedComplaint._id,
          relatedType: 'Complaint',
          link: '/department/complaints'
        }));
        await createManyNotifications(deptNotifications);
      }

      const studentId = updatedComplaint.student?._id || updatedComplaint.student;
      if (studentId) {
        await createNotification({
          recipient: studentId,
          type: 'COMPLAINT_ASSIGNED',
          title: 'Complaint Assigned',
          message: `Your complaint has been assigned to ${departmentExists.name}.`,
          relatedId: updatedComplaint._id,
          relatedType: 'Complaint',
          link: '/student/my-complaints'
        });
      }
    } catch (notifError) {
      console.error('Failed to dispatch complaint assignment notifications:', notifError.message);
    }

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

const getComplaintTimeline = async (req, res) => {
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
        message: 'You are not allowed to view this complaint timeline'
      });
    }

    const timeline = getSafelyDerivedTimeline(complaint);

    return res.status(200).json({
      success: true,
      message: 'Complaint timeline fetched successfully',
      complaintId: complaint._id,
      title: complaint.title,
      category: complaint.category,
      priority: complaint.priority,
      currentStatus: complaint.status,
      department: complaint.department,
      createdAt: complaint.createdAt,
      resolvedAt: complaint.resolvedAt,
      timeline
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch complaint timeline',
      error: error.message
    });
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getAllComplaints,
  getComplaintById,
  getComplaintTimeline,
  updateComplaintStatus,
  assignComplaintToDepartment,
  deleteComplaint
};
