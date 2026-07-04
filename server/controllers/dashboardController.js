const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const Event = require('../models/Event');
const LostFound = require('../models/LostFound');
const ChatbotLog = require('../models/ChatbotLog');

const getStatusCount = (items, status) => {
  return items.filter((item) => item.status === status).length;
};

const doesComplaintBelongToDepartment = (complaint, userDepartment) => {
  if (!complaint.department || !userDepartment) {
    return false;
  }

  const department = complaint.department;
  const normalizedUserDepartment = userDepartment.toString().toLowerCase();

  return (
    department._id?.toString().toLowerCase() === normalizedUserDepartment ||
    department.name?.toLowerCase() === normalizedUserDepartment ||
    department.code?.toLowerCase() === normalizedUserDepartment
  );
};

const getStudentDashboard = async (req, res) => {
  try {
    const studentFilter = { student: req.user._id };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      rejectedComplaints,
      myLostFoundItems,
      chatbotQuestions,
      recentComplaints,
      recentNotices,
      upcomingEvents
    ] = await Promise.all([
      Complaint.countDocuments(studentFilter),
      Complaint.countDocuments({ ...studentFilter, status: 'Pending' }),
      Complaint.countDocuments({ ...studentFilter, status: 'In Progress' }),
      Complaint.countDocuments({ ...studentFilter, status: 'Resolved' }),
      Complaint.countDocuments({ ...studentFilter, status: 'Rejected' }),
      LostFound.countDocuments({ user: req.user._id }),
      ChatbotLog.countDocuments({ user: req.user._id }),
      Complaint.find(studentFilter).sort({ createdAt: -1 }).limit(5),
      Notice.find({ isActive: true }).populate('postedBy', 'name role').sort({ createdAt: -1 }).limit(5),
      Event.find({ isActive: true, eventDate: { $gte: today } }).sort({ eventDate: 1 }).limit(5)
    ]);

    return res.status(200).json({
      success: true,
      message: 'Student dashboard summary fetched successfully',
      summary: {
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        rejectedComplaints,
        myLostFoundItems,
        chatbotQuestions,
        recentComplaints,
        recentNotices,
        upcomingEvents
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch student dashboard summary',
      error: error.message
    });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalAdmins,
      totalDepartmentUsers,
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      rejectedComplaints,
      totalNotices,
      activeNotices,
      totalEvents,
      activeEvents,
      openLostFoundItems,
      totalChatbotQuestions,
      recentComplaints,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'department' }),
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'In Progress' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Rejected' }),
      Notice.countDocuments(),
      Notice.countDocuments({ isActive: true }),
      Event.countDocuments(),
      Event.countDocuments({ isActive: true }),
      LostFound.countDocuments({ status: 'Open' }),
      ChatbotLog.countDocuments(),
      Complaint.find()
        .populate('student', 'name enrollmentNo email')
        .populate('department', 'name code')
        .sort({ createdAt: -1 })
        .limit(5),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5)
    ]);

    return res.status(200).json({
      success: true,
      message: 'Admin dashboard summary fetched successfully',
      summary: {
        totalUsers,
        totalStudents,
        totalAdmins,
        totalDepartmentUsers,
        totalComplaints,
        pendingComplaints,
        inProgressComplaints,
        resolvedComplaints,
        rejectedComplaints,
        totalNotices,
        activeNotices,
        totalEvents,
        activeEvents,
        openLostFoundItems,
        totalChatbotQuestions,
        recentComplaints,
        recentUsers
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch admin dashboard summary',
      error: error.message
    });
  }
};

const getDepartmentDashboard = async (req, res) => {
  try {
    if (!req.user.department) {
      return res.status(200).json({
        success: true,
        message: 'Department is not assigned to this user yet.',
        summary: {
          assignedComplaints: 0,
          pendingComplaints: 0,
          inProgressComplaints: 0,
          resolvedComplaints: 0,
          rejectedComplaints: 0,
          urgentComplaints: 0,
          recentAssignedComplaints: []
        }
      });
    }

    const complaints = await Complaint.find()
      .populate('student', 'name enrollmentNo email')
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    const assignedComplaintsList = complaints.filter((complaint) =>
      doesComplaintBelongToDepartment(complaint, req.user.department)
    );

    return res.status(200).json({
      success: true,
      message: 'Department dashboard summary fetched successfully',
      summary: {
        assignedComplaints: assignedComplaintsList.length,
        pendingComplaints: getStatusCount(assignedComplaintsList, 'Pending'),
        inProgressComplaints: getStatusCount(assignedComplaintsList, 'In Progress'),
        resolvedComplaints: getStatusCount(assignedComplaintsList, 'Resolved'),
        rejectedComplaints: getStatusCount(assignedComplaintsList, 'Rejected'),
        urgentComplaints: assignedComplaintsList.filter((complaint) => complaint.priority === 'Urgent').length,
        recentAssignedComplaints: assignedComplaintsList.slice(0, 5)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch department dashboard summary',
      error: error.message
    });
  }
};

const getDashboardOverview = async (req, res) => {
  try {
    const roleMessages = {
      student: 'Welcome to Student Dashboard',
      admin: 'Welcome to Admin Dashboard',
      department: 'Welcome to Department Dashboard'
    };

    return res.status(200).json({
      success: true,
      message: roleMessages[req.user.role] || 'Welcome to Dashboard',
      user: {
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch dashboard overview',
      error: error.message
    });
  }
};

module.exports = {
  getStudentDashboard,
  getAdminDashboard,
  getDepartmentDashboard,
  getDashboardOverview
};
