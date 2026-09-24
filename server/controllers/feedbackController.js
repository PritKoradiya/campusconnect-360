const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const ComplaintFeedback = require('../models/ComplaintFeedback');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const isDepartmentUserAssigned = (user, complaint) => {
  if (!complaint.department || !user.department) return false;
  const dept = complaint.department;
  const userDept = user.department.toString().trim().toLowerCase();
  if (typeof dept === 'string') {
    return dept.trim().toLowerCase() === userDept;
  }
  return (
    dept._id?.toString().trim().toLowerCase() === userDept ||
    dept.name?.trim().toLowerCase() === userDept ||
    dept.code?.trim().toLowerCase() === userDept
  );
};

/**
 * Submit or update satisfaction feedback for a resolved complaint.
 *
 * Route: POST /api/complaints/:id/feedback
 * Access: Private (Student only)
 */
const submitOrUpdateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user?._id || req.user?.id;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await Complaint.findById(id).populate('department', 'name code');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Ownership check: Student can only submit feedback for their own complaint
    if (complaint.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are only authorized to provide feedback for your own complaints'
      });
    }

    // Business rule: Feedback is available ONLY after complaint is marked Resolved
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({
        success: false,
        message: `Feedback can only be submitted for resolved complaints. Current status: ${complaint.status}`
      });
    }

    // Input validation
    const { rating, resolutionStatus, comment } = req.body;

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5'
      });
    }

    const validResolutions = ['Yes', 'Partially', 'No'];
    if (!resolutionStatus || !validResolutions.includes(resolutionStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Resolution response must be "Yes", "Partially", or "No"'
      });
    }

    const sanitizedComment = typeof comment === 'string' ? comment.trim().slice(0, 1000) : '';

    // Check if feedback already exists
    let feedback = await ComplaintFeedback.findOne({ complaint: complaint._id });
    const isUpdate = Boolean(feedback);

    if (isUpdate) {
      feedback.rating = parsedRating;
      feedback.resolutionStatus = resolutionStatus;
      feedback.comment = sanitizedComment;
      feedback.department = complaint.department?._id || complaint.department || null;
      await feedback.save();

      // Add feedback update timeline event
      complaint.timeline.push({
        eventType: 'COMPLAINT_FEEDBACK_SUBMITTED',
        title: 'Student Feedback Updated',
        description: `Rating: ${parsedRating}/5 • Resolved: ${resolutionStatus}${sanitizedComment ? ` • "${sanitizedComment.substring(0, 75)}"` : ''}`,
        status: 'Resolved',
        actor: studentId,
        actorRole: 'student',
        actorName: req.user.name || 'Student',
        department: complaint.department?._id || complaint.department || null,
        departmentName: complaint.department?.name || '',
        remark: sanitizedComment,
        timestamp: new Date()
      });
      await complaint.save();

      return res.status(200).json({
        success: true,
        message: 'Feedback updated successfully.',
        feedback,
        isUpdate: true
      });
    }

    // Create new feedback
    feedback = await ComplaintFeedback.create({
      complaint: complaint._id,
      student: studentId,
      department: complaint.department?._id || complaint.department || null,
      rating: parsedRating,
      resolutionStatus,
      comment: sanitizedComment
    });

    complaint.feedback = feedback._id;
    complaint.timeline.push({
      eventType: 'COMPLAINT_FEEDBACK_SUBMITTED',
      title: 'Student Feedback Submitted',
      description: `Rating: ${parsedRating}/5 • Resolved: ${resolutionStatus}${sanitizedComment ? ` • "${sanitizedComment.substring(0, 75)}"` : ''}`,
      status: 'Resolved',
      actor: studentId,
      actorRole: 'student',
      actorName: req.user.name || 'Student',
      department: complaint.department?._id || complaint.department || null,
      departmentName: complaint.department?.name || '',
      remark: sanitizedComment,
      timestamp: new Date()
    });
    await complaint.save();

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback,
      isUpdate: false
    });
  } catch (error) {
    // Handle database duplicate key error cleanly
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Feedback has already been submitted for this complaint.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to process complaint feedback',
      error: error.message
    });
  }
};

/**
 * Fetch feedback for a specific complaint.
 *
 * Route: GET /api/complaints/:id/feedback
 * Access: Private (Student owner, Admin, or Assigned Department)
 */
const getComplaintFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await Complaint.findById(id).populate('department', 'name code');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Authorization check
    const userIdStr = (req.user?._id || req.user?.id || '').toString();
    const isStudentOwner = req.user.role === 'student' && complaint.student.toString() === userIdStr;
    const isAdmin = req.user.role === 'admin';
    const isAssignedDept = req.user.role === 'department' && isDepartmentUserAssigned(req.user, complaint);

    if (!isStudentOwner && !isAdmin && !isAssignedDept) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view feedback for this complaint'
      });
    }

    const feedback = await ComplaintFeedback.findOne({ complaint: complaint._id })
      .populate('student', 'name enrollmentNo email');

    return res.status(200).json({
      success: true,
      complaintId: complaint._id,
      isEligibleForFeedback: complaint.status === 'Resolved',
      hasFeedback: Boolean(feedback),
      feedback: feedback || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch complaint feedback',
      error: error.message
    });
  }
};

/**
 * List all feedbacks with filtering and pagination (for Admin and Department).
 *
 * Route: GET /api/complaints/feedback/all
 * Access: Private (Admin, Department)
 */
const getAllFeedbacks = async (req, res) => {
  try {
    const { rating, resolutionStatus, department, page = 1, limit = 15 } = req.query;

    const query = {};

    if (rating && !isNaN(Number(rating))) {
      query.rating = Number(rating);
    }

    if (resolutionStatus && ['Yes', 'Partially', 'No'].includes(resolutionStatus)) {
      query.resolutionStatus = resolutionStatus;
    }

    if (department && isValidId(department)) {
      query.department = department;
    }

    // Role-based scoping: Department users only see feedbacks for their department
    if (req.user.role === 'department') {
      if (!req.user.department) {
        return res.status(200).json({
          success: true,
          feedbacks: [],
          pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 }
        });
      }
      query.department = req.user.department;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, feedbacks] = await Promise.all([
      ComplaintFeedback.countDocuments(query),
      ComplaintFeedback.find(query)
        .populate('complaint', 'title category priority status createdAt resolvedAt')
        .populate('student', 'name enrollmentNo email')
        .populate('department', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      feedbacks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback records',
      error: error.message
    });
  }
};

/**
 * Get aggregated satisfaction overview statistics.
 *
 * Route: GET /api/complaints/feedback/stats
 * Access: Private (Admin, Department)
 */
const getFeedbackStats = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'department') {
      if (!req.user.department) {
        return res.status(200).json({
          success: true,
          stats: {
            totalFeedback: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            resolutionBreakdown: { Yes: 0, Partially: 0, No: 0 }
          }
        });
      }
      filter.department = req.user.department;
    }

    const feedbacks = await ComplaintFeedback.find(filter)
      .populate('department', 'name code')
      .lean();

    const totalFeedback = feedbacks.length;
    let totalRatingSum = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const resolutionBreakdown = { Yes: 0, Partially: 0, No: 0 };
    const deptMap = {};

    feedbacks.forEach((fb) => {
      totalRatingSum += fb.rating;
      if (ratingDistribution[fb.rating] !== undefined) {
        ratingDistribution[fb.rating]++;
      }
      if (resolutionBreakdown[fb.resolutionStatus] !== undefined) {
        resolutionBreakdown[fb.resolutionStatus]++;
      }

      const deptName = fb.department?.name || 'Unassigned';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { department: deptName, count: 0, sumRating: 0 };
      }
      deptMap[deptName].count++;
      deptMap[deptName].sumRating += fb.rating;
    });

    const averageRating = totalFeedback > 0 ? Number((totalRatingSum / totalFeedback).toFixed(1)) : 0;

    const departmentSatisfaction = Object.values(deptMap).map((d) => ({
      department: d.department,
      feedbackCount: d.count,
      averageRating: Number((d.sumRating / d.count).toFixed(1))
    })).sort((a, b) => b.feedbackCount - a.feedbackCount);

    const statsData = {
      totalFeedback,
      averageRating,
      ratingDistribution,
      resolutionBreakdown,
      departmentSatisfaction
    };

    return res.status(200).json({
      success: true,
      stats: statsData,
      data: statsData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate feedback statistics',
      error: error.message
    });
  }
};

module.exports = {
  submitOrUpdateFeedback,
  getComplaintFeedback,
  getAllFeedbacks,
  getFeedbackStats
};
