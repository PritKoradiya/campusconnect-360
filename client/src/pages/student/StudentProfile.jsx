import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  GraduationCap,
  Hash,
  Home,
  IdCard,
  Lock,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  RotateCw,
  Sparkles,
  Upload,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser, updateCurrentUserProfile } from '../../services/authService';
import { getStudentDashboard } from '../../services/dashboardService';
import { getDepartments } from '../../services/departmentService';
import { getStudentActivityFeed } from '../../services/activityService';
import '../../styles/profile.css';

// Preset avatar options for quick selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const TRACKED_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'enrollmentNo', label: 'Enrollment No' },
  { key: 'department', label: 'Department' },
  { key: 'branch', label: 'Branch' },
  { key: 'semester', label: 'Semester' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'address', label: 'Address' },
  { key: 'profileImage', label: 'Profile Photo' }
];

function formatDate(dateValue) {
  if (!dateValue) return 'Not added';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return dateValue;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateValue;
  }
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StudentProfile() {
  const { user: authUser, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(authUser || {});
  const [stats, setStats] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load Profile & Stats
  const loadProfileData = async (isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [userRes, dashRes, deptsRes, actRes] = await Promise.all([
        getCurrentUser(),
        getStudentDashboard().catch(() => ({ data: {} })),
        getDepartments().catch(() => ({ data: [] })),
        getStudentActivityFeed({ limit: 5 }).catch(() => ({ data: { data: { activities: [] } } }))
      ]);

      const freshUser = userRes.data?.user || userRes.data;
      if (freshUser) {
        setProfile(freshUser);
        updateUser(freshUser);
      }

      const dashData = dashRes.data?.summary || dashRes.data?.data || dashRes.data || {};
      setStats(dashData);

      const feedActivities = actRes.data?.data?.activities || actRes.data?.activities || [];
      if (feedActivities.length > 0) {
        setRecentActivities(feedActivities);
      } else if (Array.isArray(dashData.recentComplaints)) {
        setRecentActivities(dashData.recentComplaints);
      }

      const depts = deptsRes.data?.departments || deptsRes.data?.data || (Array.isArray(deptsRes.data) ? deptsRes.data : []);
      const deptNames = depts.map((d) => d.name).filter(Boolean);
      setDepartmentOptions(deptNames);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to access this profile.');
      } else {
        setError(err.response?.data?.message || 'Failed to load student profile.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // Calculate Real Profile Completion Percentage
  const { completionPercentage, missingFields } = useMemo(() => {
    let filledCount = 0;
    const missing = [];

    TRACKED_FIELDS.forEach(({ key, label }) => {
      const val = profile[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        filledCount++;
      } else {
        missing.push(label);
      }
    });

    const percent = Math.round((filledCount / TRACKED_FIELDS.length) * 100);
    return { completionPercentage: percent, missingFields: missing };
  }, [profile]);

  // Open Edit Modal
  const handleOpenEditModal = () => {
    setFormData({
      name: profile.name || '',
      phone: profile.phone || '',
      enrollmentNo: profile.enrollmentNo || '',
      department: profile.department || '',
      branch: profile.branch || '',
      semester: profile.semester || '',
      gender: profile.gender || '',
      dateOfBirth: profile.dateOfBirth || '',
      address: profile.address || '',
      academicYear: profile.academicYear || '',
      division: profile.division || '',
      profileImage: profile.profileImage || ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Handle Form Inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Avatar File Upload
  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setFormError('Please select a valid image format (JPEG, PNG, WEBP, or GIF).');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormError('Photo size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }

    setFormError('');
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setFormData((prev) => ({ ...prev, profileImage: loadEvent.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Submit Profile Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name?.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (formData.semester) {
      const semNum = Number(formData.semester);
      if (isNaN(semNum) || semNum < 1 || semNum > 12) {
        setFormError('Semester must be a valid number between 1 and 12.');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        enrollmentNo: formData.enrollmentNo.trim(),
        department: formData.department.trim(),
        branch: formData.branch.trim(),
        semester: formData.semester ? Number(formData.semester) : undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address.trim(),
        academicYear: formData.academicYear.trim(),
        division: formData.division.trim(),
        profileImage: formData.profileImage
      };

      const res = await updateCurrentUserProfile(payload);
      const updated = res.data?.user || payload;

      setProfile(updated);
      updateUser(updated);

      setSuccessMsg('Your profile has been updated successfully.');
      setIsEditModalOpen(false);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      if (err.response?.status === 401) {
        setFormError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setFormError('You are not authorized to perform this action.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to update profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedPage className="profile-page-container">
      {/* Global Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-success"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
            <button
              aria-label="Dismiss alert"
              className="chatbot-alert-close"
              onClick={() => setSuccessMsg('')}
              type="button"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-error"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              aria-label="Dismiss error"
              className="chatbot-alert-close"
              onClick={() => setError('')}
              type="button"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="profile-hero-card">
            <div className="profile-hero-left">
              <div className="profile-avatar-img-wrap" style={{ background: 'rgba(15, 30, 51, 0.6)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '280px' }}>
                <div className="admin-skeleton-line" style={{ width: '70%', height: '28px' }} />
                <div className="admin-skeleton-line" style={{ width: '90%', height: '18px' }} />
              </div>
            </div>
          </div>
          <div className="profile-sections-grid">
            <div className="profile-detail-card">
              <div className="admin-skeleton-line" style={{ width: '50%', marginBottom: '16px' }} />
              <div className="admin-skeleton-line" style={{ height: '50px', marginBottom: '10px' }} />
              <div className="admin-skeleton-line" style={{ height: '50px' }} />
            </div>
            <div className="profile-detail-card">
              <div className="admin-skeleton-line" style={{ width: '50%', marginBottom: '16px' }} />
              <div className="admin-skeleton-line" style={{ height: '50px', marginBottom: '10px' }} />
              <div className="admin-skeleton-line" style={{ height: '50px' }} />
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* 1. HERO SECTION */}
          <AnimatedCard className="profile-hero-card" delay={0.04} hover={false}>
            <div className="profile-hero-left">
              {/* Profile Avatar */}
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-img-wrap">
                  {profile.profileImage ? (
                    <img
                      alt={profile.name || 'Student photo'}
                      className="profile-avatar-img"
                      src={profile.profileImage}
                    />
                  ) : (
                    <div className="profile-avatar-fallback">{getInitials(profile.name)}</div>
                  )}
                </div>
                <button
                  aria-label="Change profile photo"
                  className="profile-avatar-edit-btn"
                  onClick={handleOpenEditModal}
                  title="Update photo"
                  type="button"
                >
                  <Camera size={16} />
                </button>
              </div>

              {/* Student Details */}
              <div className="profile-identity-info">
                <div className="profile-kicker-row">
                  <span className="dashboard-role-pill">Student Portal</span>
                  <span className="profile-status-pill profile-status-active">Active Student</span>
                </div>

                <h1 className="profile-student-name">{profile.name || 'Student User'}</h1>

                <div className="profile-meta-chips">
                  <span className="profile-meta-chip">
                    <Mail size={13} color="#22d3ee" />
                    <span>{profile.email}</span>
                  </span>

                  {profile.enrollmentNo && (
                    <span className="profile-meta-chip">
                      <IdCard size={13} color="#38bdf8" />
                      <span>ID: <strong>{profile.enrollmentNo}</strong></span>
                    </span>
                  )}

                  {profile.department && (
                    <span className="profile-meta-chip">
                      <Building2 size={13} />
                      <span>{profile.department}</span>
                    </span>
                  )}

                  {profile.semester && (
                    <span className="profile-meta-chip">
                      <GraduationCap size={13} color="#22d3ee" />
                      <span>Sem {profile.semester}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="profile-hero-actions">
              <button
                className="cal-btn cal-btn-primary"
                onClick={handleOpenEditModal}
                type="button"
              >
                <Edit2 size={15} />
                <span>Edit Profile</span>
              </button>

              <button
                className="cal-btn cal-btn-secondary"
                disabled={refreshing}
                onClick={() => loadProfileData(true)}
                title="Refresh profile"
                type="button"
              >
                <motion.span
                  animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                  style={{ display: 'inline-flex' }}
                  transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
                >
                  <RotateCw size={15} />
                </motion.span>
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </AnimatedCard>

          {/* 2. PROFILE COMPLETION PROGRESS */}
          <AnimatedCard className="profile-completion-card" delay={0.08} hover={false}>
            <div className="profile-completion-top">
              <div className="profile-completion-title-wrap">
                <Sparkles size={20} color="#22d3ee" />
                <h3>Profile Completion</h3>
              </div>
              <span className="profile-completion-percent">{completionPercentage}% Complete</span>
            </div>

            <div className="profile-progress-track">
              <div
                className="profile-progress-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {missingFields.length > 0 ? (
              <div className="profile-missing-fields-row">
                <span>Missing items:</span>
                {missingFields.map((field) => (
                  <span
                    className="profile-missing-chip"
                    key={field}
                    onClick={handleOpenEditModal}
                    style={{ cursor: 'pointer' }}
                    title={`Click to add ${field}`}
                  >
                    + {field}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6ee7b7' }}>
                <CheckCircle2 size={14} />
                <span>Your student profile is 100% complete!</span>
              </div>
            )}
          </AnimatedCard>

          {/* 3. STUDENT STATISTICS GRID */}
          <div className="profile-stats-grid">
            <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.12}>
              <span className="dashboard-card-icon">
                <FileText size={22} />
              </span>
              <div>
                <p>Total Complaints</p>
                <strong>{stats.totalComplaints ?? 0}</strong>
              </div>
            </AnimatedCard>

            <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.15}>
              <span className="dashboard-card-icon">
                <Clock size={22} />
              </span>
              <div>
                <p>Pending Requests</p>
                <strong>{stats.pendingComplaints ?? 0}</strong>
              </div>
            </AnimatedCard>

            <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.18}>
              <span className="dashboard-card-icon">
                <Activity size={22} />
              </span>
              <div>
                <p>In Progress</p>
                <strong>{stats.inProgressComplaints ?? 0}</strong>
              </div>
            </AnimatedCard>

            <AnimatedCard className="dashboard-stat-card tone-success" delay={0.21}>
              <span className="dashboard-card-icon">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <p>Resolved</p>
                <strong>{stats.resolvedComplaints ?? 0}</strong>
              </div>
            </AnimatedCard>
          </div>

          {/* 4. PERSONAL & ACADEMIC INFORMATION GRIDS */}
          <div className="profile-sections-grid">
            {/* Personal Information */}
            <AnimatedCard className="profile-detail-card" delay={0.24} hover={false}>
              <div className="profile-detail-card-header">
                <div className="profile-detail-title-group">
                  <span className="profile-card-icon-pill">
                    <User size={18} />
                  </span>
                  <h2>Personal Information</h2>
                </div>
                <button
                  className="cal-schedule-view-btn"
                  onClick={handleOpenEditModal}
                  type="button"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="profile-fields-list">
                <div className="profile-field-block">
                  <span className="profile-field-label">Full Name</span>
                  <span className="profile-field-value">{profile.name || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">
                    <span>Email Address</span>
                    <Lock size={11} title="Email is read-only" />
                  </span>
                  <span className="profile-field-value">{profile.email}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Phone Number</span>
                  <span className="profile-field-value">{profile.phone || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Gender</span>
                  <span className="profile-field-value">{profile.gender || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Date of Birth</span>
                  <span className="profile-field-value">{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Account Status</span>
                  <span className="profile-field-value" style={{ color: '#6ee7b7' }}>Active Verified</span>
                </div>

                <div className="profile-field-block profile-field-full-width">
                  <span className="profile-field-label">Residential Address</span>
                  <span className="profile-field-value">{profile.address || <span className="profile-empty-tag">Not added</span>}</span>
                </div>
              </div>
            </AnimatedCard>

            {/* Academic Information */}
            <AnimatedCard className="profile-detail-card" delay={0.28} hover={false}>
              <div className="profile-detail-card-header">
                <div className="profile-detail-title-group">
                  <span className="profile-card-icon-pill">
                    <GraduationCap size={18} />
                  </span>
                  <h2>Academic Information</h2>
                </div>
                <button
                  className="cal-schedule-view-btn"
                  onClick={handleOpenEditModal}
                  type="button"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
              </div>

              <div className="profile-fields-list">
                <div className="profile-field-block">
                  <span className="profile-field-label">Enrollment / Student ID</span>
                  <span className="profile-field-value">{profile.enrollmentNo || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Department</span>
                  <span className="profile-field-value">{profile.department || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Branch / Program</span>
                  <span className="profile-field-value">{profile.branch || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Current Semester</span>
                  <span className="profile-field-value">{profile.semester ? `Semester ${profile.semester}` : <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Academic Year</span>
                  <span className="profile-field-value">{profile.academicYear || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block">
                  <span className="profile-field-label">Division / Class</span>
                  <span className="profile-field-value">{profile.division || <span className="profile-empty-tag">Not added</span>}</span>
                </div>

                <div className="profile-field-block profile-field-full-width">
                  <span className="profile-field-label">Member Since</span>
                  <span className="profile-field-value">{formatDate(profile.createdAt)}</span>
                </div>
              </div>
            </AnimatedCard>
          </div>

          {/* 5. RECENT ACTIVITY FEED */}
          <AnimatedCard className="profile-activity-card" delay={0.32} hover={false}>
            <div className="profile-detail-card-header">
              <div className="profile-detail-title-group">
                <span className="profile-card-icon-pill">
                  <Activity size={18} />
                </span>
                <h2>Recent Student Activity</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="cal-side-count">{recentActivities.length} items</span>
                <Link
                  to="/student/activity"
                  className="activity-nav-btn"
                  style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '12px' }}
                >
                  <span>View All</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <div className="cal-empty-schedule" style={{ padding: '24px' }}>
                <p>No recent student activities or complaints recorded yet.</p>
              </div>
            ) : (
              <div className="profile-activity-list">
                {recentActivities.map((act) => {
                  const id = act.id || act._id;
                  const isResolved =
                    act.status === 'Resolved' ||
                    act.eventType === 'COMPLAINT_RESOLVED' ||
                    act.eventType === 'EVENT_ATTENDED';
                  const isInProgress =
                    act.status === 'In Progress' ||
                    act.eventType === 'COMPLAINT_IN_PROGRESS' ||
                    act.eventType === 'COMPLAINT_STATUS_CHANGED';

                  // Determine appropriate icon based on source
                  const Icon =
                    act.sourceType === 'event'
                      ? CalendarCheck
                      : act.sourceType === 'lost_found'
                      ? PackageSearch
                      : act.sourceType === 'profile'
                      ? UserCheck
                      : FileText;

                  const badgeLabel =
                    act.meta?.status ||
                    act.status ||
                    (act.sourceType === 'event' ? 'Event' : act.sourceType === 'lost_found' ? 'Lost & Found' : 'Submitted');

                  const subLabel =
                    act.meta?.departmentName ||
                    act.department?.name ||
                    act.meta?.eventName ||
                    act.meta?.itemName ||
                    act.department ||
                    'Campus Portal';

                  return (
                    <div className="profile-activity-item" key={id}>
                      <div className="profile-activity-main">
                        <span
                          className="profile-activity-icon-pill"
                          style={{
                            background: isResolved
                              ? 'rgba(16, 185, 129, 0.15)'
                              : isInProgress
                              ? 'rgba(6, 182, 212, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                            color: isResolved ? '#34d399' : isInProgress ? '#22d3ee' : '#60a5fa'
                          }}
                        >
                          <Icon size={16} />
                        </span>

                        <div className="profile-activity-text">
                          <h4 className="profile-activity-title">{act.title || 'Student Action'}</h4>
                          <span className="profile-activity-sub">
                            <span>{subLabel}</span>
                            <span>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              {formatRelativeTime(act.timestamp || act.createdAt)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <span
                        className={`track-badge ${
                          isResolved
                            ? 'status-resolved'
                            : isInProgress
                            ? 'status-in-progress'
                            : 'priority-medium'
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </AnimatedCard>
        </>
      )}

      {/* 6. EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setIsEditModalOpen(false)}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card profile-edit-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Modal Header */}
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Account Settings</p>
                  <h2>Edit Student Profile</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setIsEditModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {/* Form Alerts */}
              {formError && (
                <div className="chatbot-alert chatbot-alert-error" style={{ marginTop: '12px' }}>
                  <AlertCircle size={17} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit}>
                {/* Photo Upload & Presets Section */}
                <div className="profile-photo-edit-section">
                  <div className="profile-photo-preview-wrap">
                    {formData.profileImage ? (
                      <img
                        alt="Preview"
                        className="profile-photo-preview-img"
                        src={formData.profileImage}
                      />
                    ) : (
                      <User size={30} color="#38bdf8" />
                    )}
                  </div>

                  <div className="profile-photo-controls">
                    <span style={{ fontSize: '13px', fontWeight: 750, color: '#f1f5f9' }}>
                      Profile Photo
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      Upload a JPEG, PNG, or WEBP image (max 2MB), or pick an avatar preset.
                    </span>

                    <div className="profile-upload-actions-row">
                      <input
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        type="file"
                      />
                      <button
                        className="profile-file-btn"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <Upload size={13} />
                        <span>Upload File</span>
                      </button>

                      {formData.profileImage && (
                        <button
                          className="profile-remove-photo-btn"
                          onClick={() => setFormData((prev) => ({ ...prev, profileImage: '' }))}
                          type="button"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <div className="profile-avatar-presets">
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Presets:</span>
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          className={`profile-preset-pill ${formData.profileImage === url ? 'selected' : ''}`}
                          key={i}
                          onClick={() => setFormData((prev) => ({ ...prev, profileImage: url }))}
                          type="button"
                        >
                          <img alt={`Avatar ${i + 1}`} className="profile-preset-img" src={url} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="profile-form-grid">
                  {/* Full Name */}
                  <label className="complaint-field">
                    <span>Full Name *</span>
                    <input
                      name="name"
                      onChange={handleInputChange}
                      placeholder="e.g. Alex Johnson"
                      required
                      type="text"
                      value={formData.name}
                    />
                  </label>

                  {/* Email (Read-only) */}
                  <label className="complaint-field">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>Email Address (Account ID)</span>
                      <Lock size={12} color="#94a3b8" />
                    </span>
                    <input
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed', background: 'rgba(7, 16, 28, 0.7)' }}
                      type="email"
                      value={profile.email}
                    />
                  </label>

                  {/* Phone */}
                  <label className="complaint-field">
                    <span>Phone Number</span>
                    <input
                      name="phone"
                      onChange={handleInputChange}
                      placeholder="e.g. +91 98765 43210"
                      type="tel"
                      value={formData.phone}
                    />
                  </label>

                  {/* Enrollment Number */}
                  <label className="complaint-field">
                    <span>Student / Enrollment ID</span>
                    <input
                      name="enrollmentNo"
                      onChange={handleInputChange}
                      placeholder="e.g. 23SE02CE053"
                      type="text"
                      value={formData.enrollmentNo}
                    />
                  </label>

                  {/* Department */}
                  <label className="complaint-field">
                    <span>Department</span>
                    <select
                      name="department"
                      onChange={handleInputChange}
                      value={formData.department}
                    >
                      <option value="">Select department</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                      {!departmentOptions.includes(formData.department) && formData.department && (
                        <option value={formData.department}>{formData.department}</option>
                      )}
                    </select>
                  </label>

                  {/* Branch / Program */}
                  <label className="complaint-field">
                    <span>Branch / Degree Program</span>
                    <input
                      name="branch"
                      onChange={handleInputChange}
                      placeholder="e.g. B.Tech Computer Engineering"
                      type="text"
                      value={formData.branch}
                    />
                  </label>

                  {/* Semester */}
                  <label className="complaint-field">
                    <span>Current Semester</span>
                    <select
                      name="semester"
                      onChange={handleInputChange}
                      value={formData.semester}
                    >
                      <option value="">Select semester</option>
                      {SEMESTER_OPTIONS.map((num) => (
                        <option key={num} value={num}>
                          Semester {num}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Gender */}
                  <label className="complaint-field">
                    <span>Gender</span>
                    <select
                      name="gender"
                      onChange={handleInputChange}
                      value={formData.gender}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Date of Birth */}
                  <label className="complaint-field">
                    <span>Date of Birth</span>
                    <input
                      name="dateOfBirth"
                      onChange={handleInputChange}
                      type="date"
                      value={formData.dateOfBirth}
                    />
                  </label>

                  {/* Academic Year */}
                  <label className="complaint-field">
                    <span>Academic Year</span>
                    <input
                      name="academicYear"
                      onChange={handleInputChange}
                      placeholder="e.g. 2025-2026"
                      type="text"
                      value={formData.academicYear}
                    />
                  </label>

                  {/* Division */}
                  <label className="complaint-field">
                    <span>Division / Class</span>
                    <input
                      name="division"
                      onChange={handleInputChange}
                      placeholder="e.g. Division A"
                      type="text"
                      value={formData.division}
                    />
                  </label>

                  {/* Address */}
                  <label className="complaint-field profile-form-full">
                    <span>Residential Address</span>
                    <textarea
                      name="address"
                      onChange={handleInputChange}
                      placeholder="Enter your current campus or home address..."
                      rows={3}
                      value={formData.address}
                    />
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="cal-modal-actions" style={{ marginTop: '22px' }}>
                  <button
                    className="cal-btn cal-btn-secondary"
                    disabled={saving}
                    onClick={() => setIsEditModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>

                  <button
                    className="cal-btn cal-btn-primary"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? 'Saving Changes...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default StudentProfile;
