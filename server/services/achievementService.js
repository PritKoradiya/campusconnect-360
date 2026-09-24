const Complaint = require('../models/Complaint');
const EventRegistration = require('../models/EventRegistration');
const EventAttendance = require('../models/EventAttendance');
const LostFound = require('../models/LostFound');
const ComplaintFeedback = require('../models/ComplaintFeedback');
const User = require('../models/User');

/**
 * Calculates all milestone achievements for a student based on real activity.
 * Strict YES/NO milestone model. Zero points, zero XP, zero ranking.
 *
 * @param {string|ObjectId} studentId - Authenticated student ObjectId
 * @returns {Promise<Object>} Formatted achievements list and milestone summary
 */
const calculateStudentAchievements = async (studentId) => {
  // Query source collections in parallel
  const [
    complaintCount,
    firstComplaint,
    resolvedComplaintCount,
    firstResolvedComplaint,
    eventRegistrationCount,
    fifthRegistration,
    attendanceCount,
    thirdAttendance,
    fifthAttendance,
    foundItemCount,
    firstFoundItem,
    lostItemCount,
    firstLostItem,
    feedbackCount,
    firstFeedback,
    userDoc
  ] = await Promise.all([
    // 1. Complaints
    Complaint.countDocuments({ student: studentId }),
    Complaint.findOne({ student: studentId }).sort({ createdAt: 1 }).select('createdAt').lean(),

    // 2. Resolved Complaints
    Complaint.countDocuments({ student: studentId, status: 'Resolved' }),
    Complaint.findOne({ student: studentId, status: 'Resolved' }).sort({ resolvedAt: 1, updatedAt: 1 }).select('resolvedAt updatedAt').lean(),

    // 3. Event Registrations (Active)
    EventRegistration.countDocuments({ student: studentId, status: 'REGISTERED' }),
    EventRegistration.find({ student: studentId, status: 'REGISTERED' }).sort({ registeredAt: 1 }).skip(4).limit(1).select('registeredAt').lean(),

    // 4. Event Attendance (QR / Manual Check-ins)
    EventAttendance.countDocuments({ student: studentId, checkedIn: true }),
    EventAttendance.find({ student: studentId, checkedIn: true }).sort({ checkedInAt: 1 }).skip(2).limit(1).select('checkedInAt').lean(),
    EventAttendance.find({ student: studentId, checkedIn: true }).sort({ checkedInAt: 1 }).skip(4).limit(1).select('checkedInAt').lean(),

    // 5. Lost & Found
    LostFound.countDocuments({ user: studentId, type: 'Found' }),
    LostFound.findOne({ user: studentId, type: 'Found' }).sort({ createdAt: 1 }).select('createdAt').lean(),
    LostFound.countDocuments({ user: studentId, type: 'Lost' }),
    LostFound.findOne({ user: studentId, type: 'Lost' }).sort({ createdAt: 1 }).select('createdAt').lean(),

    // 6. Complaint Feedback
    ComplaintFeedback.countDocuments({ student: studentId }),
    ComplaintFeedback.findOne({ student: studentId }).sort({ createdAt: 1 }).select('createdAt').lean(),

    // 7. User Profile
    User.findById(studentId).select('name email phone enrollmentNo department branch semester gender dateOfBirth address updatedAt').lean()
  ]);

  // Profile completion check
  const requiredProfileFields = [
    'name',
    'email',
    'phone',
    'enrollmentNo',
    'department',
    'branch',
    'semester',
    'gender',
    'dateOfBirth',
    'address'
  ];

  let completedFieldsCount = 0;
  if (userDoc) {
    requiredProfileFields.forEach((field) => {
      const val = userDoc[field];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        completedFieldsCount++;
      }
    });
  }
  const isProfileComplete = completedFieldsCount === requiredProfileFields.length;

  // Build centralized achievement definitions
  const achievements = [
    {
      id: 'FIRST_COMPLAINT',
      title: 'First Complaint',
      description: 'Submitted your first campus grievance or maintenance request.',
      category: 'Campus Voice',
      icon: 'FileText',
      isUnlocked: complaintCount >= 1,
      unlockedAt: complaintCount >= 1 ? firstComplaint?.createdAt || null : null,
      progress: null
    },
    {
      id: 'COMPLAINT_RESOLVED',
      title: 'Resolution Achieved',
      description: 'Had your first campus complaint successfully resolved.',
      category: 'Campus Voice',
      icon: 'CheckCircle2',
      isUnlocked: resolvedComplaintCount >= 1,
      unlockedAt: resolvedComplaintCount >= 1 ? firstResolvedComplaint?.resolvedAt || firstResolvedComplaint?.updatedAt || null : null,
      progress: null
    },
    {
      id: 'FEEDBACK_VOICE',
      title: 'Feedback Voice',
      description: 'Shared student satisfaction feedback on a resolved complaint.',
      category: 'Campus Voice',
      icon: 'MessageSquareText',
      isUnlocked: feedbackCount >= 1,
      unlockedAt: feedbackCount >= 1 ? firstFeedback?.createdAt || null : null,
      progress: null
    },
    {
      id: 'EVENT_EXPLORER',
      title: 'Event Explorer',
      description: 'Registered for 5 campus workshops, seminars, or events.',
      category: 'Events & Engagement',
      icon: 'Compass',
      isUnlocked: eventRegistrationCount >= 5,
      unlockedAt: eventRegistrationCount >= 5 ? fifthRegistration[0]?.registeredAt || null : null,
      progress: {
        current: Math.min(eventRegistrationCount, 5),
        required: 5,
        unit: 'registrations'
      }
    },
    {
      id: 'CAMPUS_PARTICIPANT',
      title: 'Campus Participant',
      description: 'Attended and verified check-in for 3 campus events.',
      category: 'Events & Engagement',
      icon: 'CalendarCheck',
      isUnlocked: attendanceCount >= 3,
      unlockedAt: attendanceCount >= 3 ? thirdAttendance[0]?.checkedInAt || null : null,
      progress: {
        current: Math.min(attendanceCount, 3),
        required: 3,
        unit: 'check-ins'
      }
    },
    {
      id: 'EVENT_REGULAR',
      title: 'Event Regular',
      description: 'Attended and verified check-in for 5 campus events.',
      category: 'Events & Engagement',
      icon: 'Trophy',
      isUnlocked: attendanceCount >= 5,
      unlockedAt: attendanceCount >= 5 ? fifthAttendance[0]?.checkedInAt || null : null,
      progress: {
        current: Math.min(attendanceCount, 5),
        required: 5,
        unit: 'check-ins'
      }
    },
    {
      id: 'FOUND_HELPER',
      title: 'Found Item Helper',
      description: 'Reported a found item to help return lost belongings to peers.',
      category: 'Community Support',
      icon: 'HeartHandshake',
      isUnlocked: foundItemCount >= 1,
      unlockedAt: foundItemCount >= 1 ? firstFoundItem?.createdAt || null : null,
      progress: null
    },
    {
      id: 'LOST_REPORTER',
      title: 'Lost Item Registry',
      description: 'Reported a lost personal item through the Lost & Found system.',
      category: 'Community Support',
      icon: 'Search',
      isUnlocked: lostItemCount >= 1,
      unlockedAt: lostItemCount >= 1 ? firstLostItem?.createdAt || null : null,
      progress: null
    },
    {
      id: 'PROFILE_COMPLETE',
      title: 'Profile Complete',
      description: 'Filled in all academic and personal details in your student profile.',
      category: 'Campus Citizen',
      icon: 'UserCheck',
      isUnlocked: isProfileComplete,
      unlockedAt: isProfileComplete ? userDoc?.updatedAt || null : null,
      progress: {
        current: completedFieldsCount,
        required: requiredProfileFields.length,
        unit: 'fields'
      }
    }
  ];

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const lockedCount = achievements.length - unlockedCount;

  return {
    summary: {
      total: achievements.length,
      unlocked: unlockedCount,
      locked: lockedCount
    },
    achievements
  };
};

module.exports = {
  calculateStudentAchievements
};
