const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const Notice = require('../models/Notice');
const Event = require('../models/Event');
const LostFound = require('../models/LostFound');
const ComplaintFeedback = require('../models/ComplaintFeedback');

const getDateRangeFilter = (range) => {
  const now = new Date();
  switch (range) {
    case '7d': {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { createdAt: { $gte: past } };
    }
    case '30d': {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { createdAt: { $gte: past } };
    }
    case '6m': {
      const past = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      return { createdAt: { $gte: past } };
    }
    case '1y': {
      const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { createdAt: { $gte: past } };
    }
    default:
      return {};
  }
};

const getAdminReports = async (req, res) => {
  try {
    const range = req.query.range || 'all';
    const dateFilter = getDateRangeFilter(range);

    // Fetch complaints within date range
    const complaints = await Complaint.find(dateFilter)
      .populate('department', 'name code')
      .sort({ createdAt: 1 });

    // 1. Complaint Status Metrics
    const totalComplaints = complaints.length;
    let pendingComplaints = 0;
    let inProgressComplaints = 0;
    let resolvedComplaints = 0;
    let rejectedComplaints = 0;

    // 2. Complaint Priority Breakdown
    const priorityCounts = { Low: 0, Medium: 0, High: 0, Urgent: 0 };

    // 3. Complaint Category Breakdown
    const categoryMap = {};

    // 4. Complaints by Department
    const departmentMap = {};

    // 5. Resolution time calculation
    let totalResolutionTimeMs = 0;
    let resolvedWithTimeCount = 0;

    // 6. Monthly Trend
    const monthlyTrendMap = {};

    complaints.forEach((c) => {
      // Status
      const st = (c.status || 'Pending').toLowerCase();
      if (st === 'pending') pendingComplaints++;
      else if (st === 'in progress') inProgressComplaints++;
      else if (st === 'resolved') resolvedComplaints++;
      else if (st === 'rejected') rejectedComplaints++;

      // Priority
      const pr = c.priority || 'Medium';
      if (priorityCounts[pr] !== undefined) {
        priorityCounts[pr]++;
      } else {
        priorityCounts[pr] = 1;
      }

      // Category
      const cat = c.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;

      // Department
      let deptName = 'Unassigned';
      if (c.department && typeof c.department === 'object' && c.department.name) {
        deptName = c.department.name;
      } else if (typeof c.department === 'string' && c.department.trim()) {
        deptName = c.department.trim();
      }
      departmentMap[deptName] = (departmentMap[deptName] || 0) + 1;

      // Resolution time
      if (c.status === 'Resolved' && c.resolvedAt && c.createdAt) {
        const diffMs = new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime();
        if (diffMs >= 0) {
          totalResolutionTimeMs += diffMs;
          resolvedWithTimeCount++;
        }
      }

      // Monthly Trend (e.g. "Jan 2026")
      if (c.createdAt) {
        const d = new Date(c.createdAt);
        if (!isNaN(d.getTime())) {
          const monthYear = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyTrendMap[sortKey]) {
            monthlyTrendMap[sortKey] = { label: monthYear, count: 0, sortKey };
          }
          monthlyTrendMap[sortKey].count++;
        }
      }
    });

    // Format Department List
    const complaintsByDepartment = Object.entries(departmentMap).map(([department, count]) => ({
      department,
      count
    })).sort((a, b) => b.count - a.count);

    // Format Category List
    const complaintsByCategory = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      count
    })).sort((a, b) => b.count - a.count);

    // Format Priority List
    const complaintsByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count
    }));

    // Format Monthly Trend
    const monthlyTrend = Object.values(monthlyTrendMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, count }) => ({ month: label, count }));

    // Average Resolution Time (in hours)
    let avgResolutionHours = 0;
    if (resolvedWithTimeCount > 0) {
      avgResolutionHours = Number((totalResolutionTimeMs / (resolvedWithTimeCount * 1000 * 60 * 60)).toFixed(1));
    }

    // 7. User Analytics
    const [totalUsers, studentUsers, adminUsers, deptUsers, activeUsers, inactiveUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'department' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false })
    ]);

    // 8. Notice Analytics
    const activeNoticesList = await Notice.find({ isActive: true });
    const now = new Date();
    const urgentNotices = activeNoticesList.filter((n) => n.priority === 'Urgent').length;
    const expiredNotices = activeNoticesList.filter((n) => n.expiryDate && new Date(n.expiryDate) < now).length;

    // 9. Event Analytics
    const activeEventsList = await Event.find({ isActive: true });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const upcomingEvents = activeEventsList.filter((e) => {
      if (!e.eventDate) return false;
      const d = new Date(e.eventDate);
      d.setHours(23, 59, 59, 999);
      return d >= now;
    }).length;

    const pastEvents = activeEventsList.filter((e) => {
      if (!e.eventDate) return false;
      const d = new Date(e.eventDate);
      d.setHours(23, 59, 59, 999);
      return d < now;
    }).length;

    // 10. Lost & Found Analytics
    const [totalLostFound, lostCount, foundCount, openLF, claimedLF, closedLF] = await Promise.all([
      LostFound.countDocuments(),
      LostFound.countDocuments({ type: 'Lost' }),
      LostFound.countDocuments({ type: 'Found' }),
      LostFound.countDocuments({ status: 'Open' }),
      LostFound.countDocuments({ status: 'Claimed' }),
      LostFound.countDocuments({ status: 'Closed' })
    ]);

    // 11. Student Satisfaction & Feedback Analytics
    const feedbacks = await ComplaintFeedback.find(dateFilter)
      .populate('complaint', 'title category priority status')
      .populate('department', 'name code')
      .populate('student', 'name enrollmentNo')
      .sort({ createdAt: -1 });

    const totalFeedback = feedbacks.length;
    let totalRatingSum = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const resolutionBreakdown = { Yes: 0, Partially: 0, No: 0 };
    const deptFbMap = {};

    feedbacks.forEach((fb) => {
      totalRatingSum += fb.rating;
      if (ratingDistribution[fb.rating] !== undefined) {
        ratingDistribution[fb.rating]++;
      }
      if (resolutionBreakdown[fb.resolutionStatus] !== undefined) {
        resolutionBreakdown[fb.resolutionStatus]++;
      }

      const deptName = fb.department?.name || 'Unassigned';
      if (!deptFbMap[deptName]) {
        deptFbMap[deptName] = { department: deptName, feedbackCount: 0, sumRating: 0 };
      }
      deptFbMap[deptName].feedbackCount++;
      deptFbMap[deptName].sumRating += fb.rating;
    });

    const averageRating = totalFeedback > 0 ? Number((totalRatingSum / totalFeedback).toFixed(1)) : 0;
    const feedbackRate = resolvedComplaints > 0 ? Math.round((totalFeedback / resolvedComplaints) * 100) : 0;

    const departmentSatisfaction = Object.values(deptFbMap).map((d) => ({
      department: d.department,
      feedbackCount: d.feedbackCount,
      averageRating: Number((d.sumRating / d.feedbackCount).toFixed(1))
    })).sort((a, b) => b.feedbackCount - a.feedbackCount);

    const recentFeedback = feedbacks.slice(0, 15).map((fb) => ({
      id: fb._id,
      complaintTitle: fb.complaint?.title || 'Complaint',
      complaintCategory: fb.complaint?.category || 'General',
      departmentName: fb.department?.name || 'Unassigned',
      studentName: fb.student?.name || 'Student',
      rating: fb.rating,
      resolutionStatus: fb.resolutionStatus,
      comment: fb.comment,
      createdAt: fb.createdAt
    }));

    return res.status(200).json({
      success: true,
      message: 'Admin reports and analytics fetched successfully',
      data: {
        range,
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          rejected: rejectedComplaints,
          resolutionPerformance: {
            resolvedCount: resolvedComplaints,
            resolvedWithTimeCount,
            avgResolutionHours,
            avgResolutionDays: Number((avgResolutionHours / 24).toFixed(1))
          }
        },
        complaintsByDepartment,
        complaintsByCategory,
        complaintsByPriority,
        monthlyTrend,
        users: {
          total: totalUsers,
          students: studentUsers,
          admins: adminUsers,
          departmentUsers: deptUsers,
          active: activeUsers,
          inactive: inactiveUsers
        },
        notices: {
          totalActive: activeNoticesList.length,
          urgent: urgentNotices,
          expired: expiredNotices
        },
        events: {
          totalActive: activeEventsList.length,
          upcoming: upcomingEvents,
          past: pastEvents
        },
        lostFound: {
          total: totalLostFound,
          lost: lostCount,
          found: foundCount,
          open: openLF,
          claimed: claimedLF,
          closed: closedLF
        },
        satisfaction: {
          totalFeedback,
          feedbackRate,
          averageRating,
          ratingDistribution,
          resolutionBreakdown,
          departmentSatisfaction,
          recentFeedback
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not fetch admin reports',
      error: error.message
    });
  }
};

module.exports = {
  getAdminReports
};
