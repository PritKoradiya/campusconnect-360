import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  Eye,
  Plus,
  PowerOff,
  RotateCcw,
  Search,
  User,
  Users,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  createNotice,
  deleteNotice,
  getNoticeById,
  getNotices,
  updateNotice
} from '../../services/noticeService';

const priorityOptions = ['All', 'Normal', 'Important', 'Urgent'];
const audienceOptions = ['All', 'Students', 'Faculty', 'Department'];
const formPriorityOptions = ['Normal', 'Important', 'Urgent'];
const formAudienceOptions = ['All', 'Students', 'Faculty', 'Department'];

const initialFormData = {
  title: '',
  description: '',
  targetAudience: 'All',
  priority: 'Normal',
  expiryDate: ''
};

function formatDate(dateValue) {
  if (!dateValue) return 'No expiry';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'No expiry' : d.toLocaleDateString();
  } catch {
    return 'No expiry';
  }
}

function formatDateInput(dateValue) {
  if (!dateValue) return '';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function isNoticeExpired(dateValue) {
  if (!dateValue) return false;
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    // Set to end of day for fair expiry comparison
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  } catch {
    return false;
  }
}

function getPriorityBadgeClass(priority) {
  const p = (priority || 'Normal').toLowerCase();
  if (p === 'urgent') return 'track-badge status-rejected';
  if (p === 'important') return 'track-badge priority-high';
  return 'track-badge status-in-progress';
}

function getAudienceBadgeClass(audience) {
  const a = (audience || 'All').toLowerCase();
  if (a === 'students') return 'audience-badge audience-students';
  if (a === 'faculty') return 'audience-badge audience-faculty';
  if (a === 'department') return 'audience-badge audience-department';
  return 'audience-badge audience-all';
}

function getPostedByName(notice) {
  return notice?.postedBy?.name || notice?.createdBy?.name || notice?.postedByName || 'Admin';
}

function getNoticeList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.notices)) return responseData.notices;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function getNoticeDetails(responseData) {
  return responseData?.notice || responseData?.data || responseData;
}

function ManageNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters, Search & Sort
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNoticeId, setCurrentNoticeId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // View Details Modal State
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Deactivate Confirmation Modal State
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [noticeToDeactivate, setNoticeToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchNotices = async (isManualRefresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await getNotices();
      setNotices(getNoticeList(response.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load notices');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Summary counts calculated from real backend notices
  const totalCount = notices.length;
  const activeCount = notices.filter((n) => !isNoticeExpired(n.expiryDate)).length;
  const expiredCount = notices.filter((n) => isNoticeExpired(n.expiryDate)).length;
  const urgentCount = notices.filter((n) => n.priority === 'Urgent').length;

  // Filtered and Sorted Notices
  const filteredNotices = useMemo(() => {
    return notices
      .filter((notice) => {
        const title = (notice.title || '').toLowerCase();
        const description = (notice.description || '').toLowerCase();
        const audience = (notice.targetAudience || 'All').toLowerCase();
        const postedBy = getPostedByName(notice).toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          description.includes(query) ||
          audience.includes(query) ||
          postedBy.includes(query);

        const matchesPriority =
          priorityFilter === 'All' || notice.priority === priorityFilter;

        const matchesAudience =
          audienceFilter === 'All' ||
          notice.targetAudience === audienceFilter;

        return matchesSearch && matchesPriority && matchesAudience;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'priority') {
          const priorityWeights = { Urgent: 3, Important: 2, Normal: 1 };
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        }
        // Default: newest first
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [notices, searchText, priorityFilter, audienceFilter, sortBy]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentNoticeId(null);
    setFormData(initialFormData);
    setFormError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (notice) => {
    setIsEditing(true);
    setCurrentNoticeId(notice._id || notice.id);
    setFormData({
      title: notice.title || '',
      description: notice.description || '',
      targetAudience: notice.targetAudience || 'All',
      priority: notice.priority || 'Normal',
      expiryDate: formatDateInput(notice.expiryDate)
    });
    setFormError('');
    setModalOpen(true);
  };

  // Handle Form Inputs
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Create / Edit Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Notice title is required.');
      return;
    }

    if (!formData.description.trim()) {
      setFormError('Notice description is required.');
      return;
    }

    if (!formData.targetAudience) {
      setFormError('Target audience is required.');
      return;
    }

    if (!formData.priority) {
      setFormError('Priority is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        targetAudience: formData.targetAudience,
        priority: formData.priority,
        expiryDate: formData.expiryDate ? formData.expiryDate : undefined
      };

      if (isEditing) {
        const response = await updateNotice(currentNoticeId, payload);
        const updatedNotice = response.data?.notice || { ...payload, _id: currentNoticeId };

        setNotices((prev) =>
          prev.map((n) =>
            (n._id || n.id) === currentNoticeId ? { ...n, ...updatedNotice } : n
          )
        );

        if (selectedNotice && (selectedNotice._id || selectedNotice.id) === currentNoticeId) {
          setSelectedNotice((prev) => ({ ...prev, ...updatedNotice }));
        }

        setSuccess('Notice updated successfully.');
      } else {
        const response = await createNotice(payload);
        const created = response.data?.notice;

        if (created) {
          setNotices((prev) => [created, ...prev]);
        } else {
          fetchNotices();
        }

        setSuccess('Notice created successfully.');
      }

      setModalOpen(false);
      setFormData(initialFormData);
    } catch (err) {
      if (err.response?.status === 401) {
        setFormError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setFormError('You are not authorized to perform this action.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to save notice.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // View Details Trigger
  const handleViewDetails = async (notice) => {
    const noticeId = notice._id || notice.id;
    if (!noticeId) {
      setSelectedNotice(notice);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedNotice(notice);
      setError('');

      const response = await getNoticeById(noticeId);
      const details = getNoticeDetails(response.data);
      setSelectedNotice(details);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load notice details');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Open Deactivate Confirmation Modal
  const openDeactivateModal = (notice) => {
    setNoticeToDeactivate(notice);
    setDeactivateModalOpen(true);
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!noticeToDeactivate) return;
    const noticeId = noticeToDeactivate._id || noticeToDeactivate.id;
    if (!noticeId) return;

    try {
      setDeactivating(true);
      setError('');
      setSuccess('');

      await deleteNotice(noticeId);

      // Remove from active list
      setNotices((prev) => prev.filter((n) => (n._id || n.id) !== noticeId));

      if (selectedNotice && (selectedNotice._id || selectedNotice.id) === noticeId) {
        setSelectedNotice(null);
      }

      setDeactivateModalOpen(false);
      setNoticeToDeactivate(null);
      setSuccess('Notice deactivated successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to deactivate notice');
      }
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Admin Desk</p>
          <h1>Manage Notices</h1>
          <p>Create, update, and manage important campus announcements.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-btn-primary"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <Plus size={17} />
            <span>Create Notice</span>
          </button>
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchNotices(true)}
            title="Refresh notices"
            type="button"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              style={{ display: 'inline-flex' }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
            >
              <RotateCcw size={16} />
            </motion.span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <Bell size={22} />
          </span>
          <div>
            <p>Total Notices</p>
            <strong>{totalCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.12}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Active Notices</p>
            <strong>{activeCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.16}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Expired Notices</p>
            <strong>{expiredCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-danger" delay={0.2}>
          <span className="dashboard-card-icon">
            <AlertTriangle size={22} />
          </span>
          <div>
            <p>Urgent Notices</p>
            <strong>{urgentCount}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-notices-filter-card" delay={0.24} hover={false}>
        {/* Search Field */}
        <label className="complaint-field">
          <span>Search Notices</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title, description, audience, author..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Priority Filter */}
        <label className="complaint-field">
          <span>Priority</span>
          <select onChange={(e) => setPriorityFilter(e.target.value)} value={priorityFilter}>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'All' ? 'All Priorities' : priority}
              </option>
            ))}
          </select>
        </label>

        {/* Target Audience Filter */}
        <label className="complaint-field">
          <span>Target Audience</span>
          <select onChange={(e) => setAudienceFilter(e.target.value)} value={audienceFilter}>
            {audienceOptions.map((audience) => (
              <option key={audience} value={audience}>
                {audience === 'All' ? 'All Audiences' : audience}
              </option>
            ))}
          </select>
        </label>
      </AnimatedCard>

      {/* Global Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-success"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
          >
            <CheckCircle2 size={18} />
            <span>{success}</span>
            <button className="chatbot-alert-close" onClick={() => setSuccess('')} type="button">
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
            <button className="chatbot-alert-close" onClick={() => setError('')} type="button">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notices Table Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Active Announcements ({filteredNotices.length})</h2>
          <p>Campus bulletin registry with real-time broadcasting and audience routing.</p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Priority</th>
                  <th>Target Audience</th>
                  <th>Posted By</th>
                  <th>Posted Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td><div className="admin-skeleton-line" style={{ width: '180px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '75px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '90px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '140px' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State: No Notices */}
        {!loading && notices.length === 0 && (
          <div className="track-empty-state">
            <Bell size={36} style={{ color: '#22d3ee', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>No active notices available.</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Click &quot;Create Notice&quot; to broadcast your first campus announcement.
            </p>
          </div>
        )}

        {/* Empty State: Filter produced 0 */}
        {!loading && notices.length > 0 && filteredNotices.length === 0 && (
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              No notices match your current filters.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Try clearing some filters or searching for different keywords.
            </p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && filteredNotices.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Priority</th>
                  <th>Target Audience</th>
                  <th>Posted By</th>
                  <th>Posted Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotices.map((notice) => {
                  const id = notice._id || notice.id || '';
                  const isExpired = isNoticeExpired(notice.expiryDate);

                  return (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={id}
                      transition={{ duration: 0.2 }}
                    >
                      <td>
                        <div className="admin-notice-title-cell">
                          <strong>{notice.title || 'Untitled Notice'}</strong>
                          <span className="admin-notice-desc-preview">
                            {notice.description || 'No description provided.'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(notice.priority)}>
                          {notice.priority || 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span className={getAudienceBadgeClass(notice.targetAudience)}>
                          {notice.targetAudience || 'All'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User color="#22d3ee" size={14} />
                          <span style={{ color: '#e0f2fe' }}>{getPostedByName(notice)}</span>
                        </div>
                      </td>
                      <td>{formatDate(notice.createdAt)}</td>
                      <td>
                        <span style={{ color: isExpired ? '#fca5a5' : '#94a3b8' }}>
                          {formatDate(notice.expiryDate)}
                        </span>
                      </td>
                      <td>
                        <span className={isExpired ? 'track-badge status-rejected' : 'track-badge status-resolved'}>
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-action-btn-group">
                          {/* View Details */}
                          <button
                            className="admin-action-btn view"
                            onClick={() => handleViewDetails(notice)}
                            title="View full notice details"
                            type="button"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          {/* Edit Notice */}
                          <button
                            className="admin-action-btn assign"
                            onClick={() => handleOpenEditModal(notice)}
                            title="Edit notice"
                            type="button"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          {/* Deactivate Notice */}
                          <button
                            aria-label="Deactivate notice"
                            className="admin-action-btn delete"
                            onClick={() => openDeactivateModal(notice)}
                            title="Deactivate notice"
                            type="button"
                          >
                            <PowerOff size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* 1. Create / Edit Notice Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card admin-details-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              style={{ maxWidth: '660px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Announcement Control</p>
                  <h2>{isEditing ? 'Edit Campus Notice' : 'Create Campus Notice'}</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {formError && (
                <div
                  className="chatbot-alert chatbot-alert-error"
                  style={{ margin: '14px 0 6px' }}
                >
                  <AlertCircle size={17} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ marginTop: '16px' }}>
                <div className="notice-form-grid">
                  {/* Title */}
                  <label className="complaint-field full-width">
                    <span>Notice Title *</span>
                    <input
                      disabled={formSubmitting}
                      name="title"
                      onChange={handleFormChange}
                      placeholder="Enter announcement headline..."
                      required
                      type="text"
                      value={formData.title}
                    />
                  </label>

                  {/* Target Audience */}
                  <label className="complaint-field">
                    <span>Target Audience *</span>
                    <select
                      disabled={formSubmitting}
                      name="targetAudience"
                      onChange={handleFormChange}
                      value={formData.targetAudience}
                    >
                      {formAudienceOptions.map((aud) => (
                        <option key={aud} value={aud}>
                          {aud}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Priority */}
                  <label className="complaint-field">
                    <span>Priority *</span>
                    <select
                      disabled={formSubmitting}
                      name="priority"
                      onChange={handleFormChange}
                      value={formData.priority}
                    >
                      {formPriorityOptions.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Expiry Date */}
                  <label className="complaint-field full-width">
                    <span>Expiry Date (Optional)</span>
                    <input
                      disabled={formSubmitting}
                      name="expiryDate"
                      onChange={handleFormChange}
                      type="date"
                      value={formData.expiryDate}
                    />
                  </label>

                  {/* Description */}
                  <label className="complaint-field full-width">
                    <span>Full Notice Description *</span>
                    <textarea
                      disabled={formSubmitting}
                      name="description"
                      onChange={handleFormChange}
                      placeholder="Write the complete announcement details, instructions, or deadlines..."
                      required
                      rows={5}
                      value={formData.description}
                    />
                  </label>
                </div>

                <div className="chatbot-confirm-actions" style={{ marginTop: '22px' }}>
                  <button
                    className="complaint-secondary-button"
                    disabled={formSubmitting}
                    onClick={() => setModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="complaint-submit-button"
                    disabled={formSubmitting}
                    type="submit"
                  >
                    {formSubmitting
                      ? isEditing
                        ? 'Updating Notice...'
                        : 'Publishing Notice...'
                      : isEditing
                      ? 'Save Changes'
                      : 'Publish Notice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. View Notice Details Modal */}
      <AnimatePresence>
        {selectedNotice && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card admin-details-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              style={{ maxWidth: '640px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Modal Header */}
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Announcement Details</p>
                  <h2>{selectedNotice.title || 'Untitled Notice'}</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setSelectedNotice(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {modalLoading && (
                <div className="track-empty-state" style={{ margin: '14px 0' }}>
                  <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
                  Loading latest notice details...
                </div>
              )}

              {/* Detail Grid */}
              <div className="track-detail-grid admin-detail-grid">
                <p>
                  <span>Priority</span>
                  <span className={getPriorityBadgeClass(selectedNotice.priority)} style={{ width: 'fit-content' }}>
                    {selectedNotice.priority || 'Normal'}
                  </span>
                </p>
                <p>
                  <span>Target Audience</span>
                  <span className={getAudienceBadgeClass(selectedNotice.targetAudience)} style={{ width: 'fit-content' }}>
                    {selectedNotice.targetAudience || 'All'}
                  </span>
                </p>
                <p>
                  <span>Posted By</span>
                  {getPostedByName(selectedNotice)}
                </p>
                <p>
                  <span>Posted Date</span>
                  {formatDate(selectedNotice.createdAt)}
                </p>
                <p>
                  <span>Expiry Date</span>
                  {formatDate(selectedNotice.expiryDate)}
                </p>
                <p>
                  <span>Status</span>
                  <span
                    className={
                      isNoticeExpired(selectedNotice.expiryDate)
                        ? 'track-badge status-rejected'
                        : 'track-badge status-resolved'
                    }
                    style={{ width: 'fit-content' }}
                  >
                    {isNoticeExpired(selectedNotice.expiryDate) ? 'Expired' : 'Active'}
                  </span>
                </p>
                <p className="admin-detail-fullwidth">
                  <span>Full Announcement Content</span>
                  <span style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: 1.6 }}>
                    {selectedNotice.description || 'No description provided.'}
                  </span>
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="admin-modal-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="admin-action-btn assign"
                    onClick={() => {
                      const obj = selectedNotice;
                      setSelectedNotice(null);
                      handleOpenEditModal(obj);
                    }}
                    style={{ minHeight: '38px', padding: '0 14px' }}
                    type="button"
                  >
                    <Edit2 size={15} />
                    <span>Edit Notice</span>
                  </button>

                  <button
                    className="chatbot-clear-btn"
                    onClick={() => {
                      const obj = selectedNotice;
                      setSelectedNotice(null);
                      openDeactivateModal(obj);
                    }}
                    type="button"
                  >
                    <PowerOff size={15} />
                    <span>Deactivate</span>
                  </button>
                </div>

                <button
                  className="complaint-secondary-button"
                  onClick={() => setSelectedNotice(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Deactivate Confirmation Modal */}
      <AnimatePresence>
        {deactivateModalOpen && noticeToDeactivate && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card chatbot-confirm-modal"
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Confirmation</p>
                  <h2>Deactivate Notice</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setDeactivateModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171'
                  }}
                >
                  <PowerOff size={26} />
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    Deactivate &quot;{noticeToDeactivate.title || 'Untitled'}&quot;?
                  </p>
                  <p className="chatbot-confirm-desc">
                    This announcement will be deactivated and removed from active student, faculty, and department boards.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={deactivating}
                  onClick={() => setDeactivateModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="chatbot-danger-btn"
                  disabled={deactivating}
                  onClick={handleConfirmDeactivate}
                  type="button"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default ManageNotices;
