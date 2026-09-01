import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  FileText,
  MessageSquareText,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaintById,
  getDepartmentComplaints,
  updateDepartmentComplaintStatus
} from '../../services/complaintService';

const statusFilterOptions = ['All', 'Pending', 'In Progress', 'Resolved'];
const priorityFilterOptions = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const remarksFilterOptions = ['All', 'Remarks Added', 'Remarks Missing'];

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function getPriorityBadgeClass(priority) {
  const p = (priority || 'Low').toLowerCase();
  if (p === 'urgent') return 'track-badge status-rejected';
  if (p === 'high') return 'track-badge priority-high';
  if (p === 'medium') return 'track-badge priority-medium';
  return 'track-badge priority-low';
}

function getStatusBadgeClass(status) {
  const s = (status || 'Pending').toLowerCase();
  if (s === 'resolved') return 'track-badge status-resolved';
  if (s === 'in progress') return 'track-badge status-in-progress';
  if (s === 'rejected') return 'track-badge status-rejected';
  return 'track-badge status-pending';
}

function getStudentName(complaint) {
  return complaint?.student?.name || complaint?.studentName || complaint?.user?.name || 'Student';
}

function getStudentEnrollment(complaint) {
  return complaint?.student?.enrollmentNo || complaint?.enrollmentNo || '';
}

function getDepartmentName(complaint) {
  if (complaint?.department && typeof complaint.department === 'object') {
    return complaint.department.name || 'Assigned Department';
  }
  return complaint?.department || 'Assigned Department';
}

function getComplaintList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.complaints)) return responseData.complaints;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function getComplaintDetails(responseData) {
  return responseData?.complaint || responseData?.data || responseData;
}

function DepartmentRemarks() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [remarksFilter, setRemarksFilter] = useState('All');

  // Remarks Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [complaintToEdit, setComplaintToEdit] = useState(null);
  const [remarksText, setRemarksText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState('');

  // View Details Modal State (Read-Only)
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchComplaints = async (isManualRefresh = false) => {
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

      const response = await getDepartmentComplaints();
      setComplaints(getComplaintList(response.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view these complaints.');
      } else {
        setError(err.response?.data?.message || 'Failed to load assigned complaints');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Summary counts derived from real loaded complaints
  const totalAssigned = complaints.length;
  const withRemarksCount = complaints.filter(
    (c) => Boolean(c.departmentRemarks && c.departmentRemarks.trim())
  ).length;
  const missingRemarksCount = complaints.filter(
    (c) => !c.departmentRemarks || !c.departmentRemarks.trim()
  ).length;

  // Filtered Complaints for Remarks Management
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((complaint) => {
        const title = (complaint.title || '').toLowerCase();
        const description = (complaint.description || '').toLowerCase();
        const student = getStudentName(complaint).toLowerCase();
        const category = (complaint.category || '').toLowerCase();
        const priority = (complaint.priority || '').toLowerCase();
        const status = (complaint.status || '').toLowerCase();
        const remarks = (complaint.departmentRemarks || '').toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          description.includes(query) ||
          student.includes(query) ||
          category.includes(query) ||
          priority.includes(query) ||
          remarks.includes(query);

        const matchesStatus =
          statusFilter === 'All' || status === statusFilter.toLowerCase();

        const matchesPriority =
          priorityFilter === 'All' || priority === priorityFilter.toLowerCase();

        const hasRemarks = Boolean(complaint.departmentRemarks && complaint.departmentRemarks.trim());
        let matchesRemarks = true;
        if (remarksFilter === 'Remarks Added') {
          matchesRemarks = hasRemarks;
        } else if (remarksFilter === 'Remarks Missing') {
          matchesRemarks = !hasRemarks;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesRemarks;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [complaints, searchText, statusFilter, priorityFilter, remarksFilter]);

  // Open Remarks Editor Modal
  const openRemarksModal = (complaint) => {
    setComplaintToEdit(complaint);
    setRemarksText(complaint.departmentRemarks || '');
    setEditorError('');
    setEditorModalOpen(true);
  };

  // Submit Remarks Update
  const handleSaveRemarks = async (e) => {
    e.preventDefault();
    if (!complaintToEdit) return;
    const id = complaintToEdit._id || complaintToEdit.id;
    if (!id) return;

    const trimmed = remarksText.trim();
    if (!trimmed) {
      setEditorError('Please enter a remark before saving.');
      return;
    }

    try {
      setSaving(true);
      setEditorError('');
      setError('');
      setSuccess('');

      // Preserve current status, update departmentRemarks
      const payload = {
        status: complaintToEdit.status || 'Pending',
        departmentRemarks: trimmed
      };

      const response = await updateDepartmentComplaintStatus(id, payload);
      const updated = response.data?.complaint || {
        ...complaintToEdit,
        departmentRemarks: trimmed
      };

      setComplaints((prev) =>
        prev.map((c) => ((c._id || c.id) === id ? { ...c, ...updated } : c))
      );

      if (selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === id) {
        setSelectedComplaint((prev) => ({ ...prev, ...updated }));
      }

      const hadExisting = Boolean(complaintToEdit.departmentRemarks && complaintToEdit.departmentRemarks.trim());
      setEditorModalOpen(false);
      setComplaintToEdit(null);

      if (hadExisting) {
        setSuccess('Department remarks updated successfully.');
      } else {
        setSuccess('Department remarks saved successfully.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setEditorError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setEditorError('You are not authorized to update remarks for this complaint.');
      } else if (err.response?.status === 404) {
        setEditorError('Complaint not found.');
      } else {
        setEditorError(err.response?.data?.message || 'Failed to save department remarks.');
      }
    } finally {
      setSaving(false);
    }
  };

  // View Details Handler (Read-Only)
  const handleViewDetails = async (complaint) => {
    const id = complaint._id || complaint.id;
    if (!id) {
      setSelectedComplaint(complaint);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedComplaint(complaint);
      setError('');

      const response = await getComplaintById(id);
      const details = getComplaintDetails(response.data);
      setSelectedComplaint(details);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view this complaint.');
      } else {
        setError(err.response?.data?.message || 'Failed to load complaint details');
      }
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Page Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">DEPARTMENT DESK</p>
          <h1>Department Remarks</h1>
          <p>Add investigation notes, progress remarks, and resolution details for complaints assigned to your department.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchComplaints(true)}
            title="Refresh complaints"
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
          <span className="dashboard-role-pill">
            <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
            {user?.department ? `${user.department}` : 'Department User'}
          </span>
        </div>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-summary-grid">
        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.08}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Complaints with Remarks</p>
            <strong>{withRemarksCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.12}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Pending Remarks</p>
            <strong>{missingRemarksCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.16}>
          <span className="dashboard-card-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p>Total Assigned</p>
            <strong>{totalAssigned}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-complaints-filter-card" delay={0.2} hover={false}>
        {/* Search Field */}
        <label className="complaint-field admin-filter-field-search">
          <span>Search Complaints</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title, student, category, remarks..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Remarks Filter */}
        <label className="complaint-field">
          <span>Remarks Filter</span>
          <select onChange={(e) => setRemarksFilter(e.target.value)} value={remarksFilter}>
            {remarksFilterOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        {/* Status Filter */}
        <label className="complaint-field">
          <span>Status</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            {statusFilterOptions.map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All Statuses' : st}
              </option>
            ))}
          </select>
        </label>

        {/* Priority Filter */}
        <label className="complaint-field">
          <span>Priority</span>
          <select onChange={(e) => setPriorityFilter(e.target.value)} value={priorityFilter}>
            {priorityFilterOptions.map((pr) => (
              <option key={pr} value={pr}>
                {pr === 'All' ? 'All Priorities' : pr}
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

      {/* Remarks Management Worklist Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.24} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Remarks Management Worklist ({filteredComplaints.length})</h2>
          <p>Add investigation findings, progress notes, and resolution commentary.</p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Remarks Status</th>
                  <th>Remarks Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td><div className="admin-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '110px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '160px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '75px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '85px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '150px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '140px' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State: No Complaints Assigned */}
        {!loading && complaints.length === 0 && (
          <div className="track-empty-state">
            <CheckCircle2 size={36} style={{ color: '#22d3ee', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              No complaints are currently assigned to your department.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Complaints routed to your department will appear here for remarks recording.
            </p>
          </div>
        )}

        {/* Empty State: Filter produced 0 matches */}
        {!loading && complaints.length > 0 && filteredComplaints.length === 0 && (
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              {remarksFilter !== 'All'
                ? 'No complaints match the selected remarks filter.'
                : 'No complaints match your current filters.'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Try adjusting your search criteria or resetting filters.
            </p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && filteredComplaints.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Remarks Status</th>
                  <th>Remarks Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((item) => {
                  const id = item._id || item.id || '';
                  const shortId = id.length > 6 ? `#${id.slice(-6).toUpperCase()}` : id;
                  const hasRemarks = Boolean(item.departmentRemarks && item.departmentRemarks.trim());
                  const previewText = hasRemarks
                    ? item.departmentRemarks.length > 55
                      ? `${item.departmentRemarks.slice(0, 55)}...`
                      : item.departmentRemarks
                    : 'No remarks yet';

                  return (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={id}
                      transition={{ duration: 0.2 }}
                    >
                      <td>
                        <span className="admin-complaint-id">{shortId}</span>
                      </td>
                      <td>
                        <div className="admin-student-cell">
                          <strong>{getStudentName(item)}</strong>
                          {getStudentEnrollment(item) && (
                            <span className="admin-student-enrollment">
                              {getStudentEnrollment(item)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-notice-title-cell">
                          <strong>{item.title || 'Untitled Complaint'}</strong>
                          <span className="admin-notice-desc-preview">
                            {item.description || 'No description provided.'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(item.priority)}>
                          {item.priority || 'Low'}
                        </span>
                      </td>
                      <td>
                        {/* Read-Only Current Status */}
                        <span className={getStatusBadgeClass(item.status)}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        {hasRemarks ? (
                          <span className="track-badge status-resolved" style={{ fontSize: '11.5px' }}>
                            Remarks Added
                          </span>
                        ) : (
                          <span className="track-badge status-pending" style={{ fontSize: '11.5px' }}>
                            No Remarks
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            color: hasRemarks ? '#86efac' : '#94a3b8',
                            fontSize: '13px',
                            fontStyle: hasRemarks ? 'normal' : 'italic'
                          }}
                        >
                          {previewText}
                        </span>
                      </td>
                      <td>
                        <div className="admin-action-btn-group">
                          {/* Add / Edit Remarks Button */}
                          <button
                            className="admin-action-btn assign"
                            onClick={() => openRemarksModal(item)}
                            title={hasRemarks ? 'Edit department remarks' : 'Add department remarks'}
                            type="button"
                          >
                            {hasRemarks ? <Edit3 size={14} /> : <MessageSquareText size={14} />}
                            <span>{hasRemarks ? 'Edit Remarks' : 'Add Remarks'}</span>
                          </button>

                          {/* View Details Action */}
                          <button
                            className="admin-action-btn view"
                            onClick={() => handleViewDetails(item)}
                            title="View full complaint details"
                            type="button"
                          >
                            <Eye size={14} />
                            <span>Details</span>
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

      {/* 1. Department Remarks Editor Modal */}
      <AnimatePresence>
        {editorModalOpen && complaintToEdit && (
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
              style={{ maxWidth: '620px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Remarks Management</p>
                  <h2>
                    {complaintToEdit.departmentRemarks && complaintToEdit.departmentRemarks.trim()
                      ? 'Edit Department Remarks'
                      : 'Add Department Remarks'}
                  </h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setEditorModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {/* Complaint Summary Box */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(15, 30, 51, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.18)'
                }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#ffffff', fontWeight: 800 }}>
                  {complaintToEdit.title}
                </h3>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {complaintToEdit.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', fontSize: '13px' }}>
                  <span style={{ color: '#cbd5e1' }}>
                    <strong style={{ color: '#94a3b8' }}>Student: </strong>
                    {getStudentName(complaintToEdit)}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>
                    <strong style={{ color: '#94a3b8' }}>Category: </strong>
                    {complaintToEdit.category || 'General'}
                  </span>
                  <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: '#94a3b8' }}>Priority: </strong>
                    <span className={getPriorityBadgeClass(complaintToEdit.priority)}>
                      {complaintToEdit.priority || 'Low'}
                    </span>
                  </span>
                  <span style={{ color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: '#94a3b8' }}>Status (Read-Only): </strong>
                    <span className={getStatusBadgeClass(complaintToEdit.status)}>
                      {complaintToEdit.status || 'Pending'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Optional Admin Remarks (Context Reference) */}
              {complaintToEdit.adminRemarks && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    fontSize: '13px',
                    color: '#93c5fd'
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: '3px', color: '#67e8f9' }}>
                    Admin Remarks (Read-Only):
                  </strong>
                  <span style={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                    {complaintToEdit.adminRemarks}
                  </span>
                </div>
              )}

              {editorError && (
                <div className="chatbot-alert chatbot-alert-error" style={{ margin: '14px 0 6px' }}>
                  <AlertCircle size={17} />
                  <span>{editorError}</span>
                </div>
              )}

              <form onSubmit={handleSaveRemarks} style={{ marginTop: '16px' }}>
                <label className="complaint-field">
                  <span>Department Remarks *</span>
                  <textarea
                    disabled={saving}
                    onChange={(e) => {
                      setRemarksText(e.target.value);
                      if (editorError) setEditorError('');
                    }}
                    placeholder="Enter investigation notes, action taken, progress details, or resolution remarks..."
                    rows={5}
                    value={remarksText}
                  />
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '12.5px',
                    color: '#94a3b8'
                  }}
                >
                  <span>{remarksText.length} characters</span>
                  <span>Notes will be saved to the grievance record.</span>
                </div>

                <div className="chatbot-confirm-actions" style={{ marginTop: '22px' }}>
                  <button
                    className="complaint-secondary-button"
                    disabled={saving}
                    onClick={() => setEditorModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="complaint-submit-button"
                    disabled={saving}
                    type="submit"
                  >
                    {saving
                      ? 'Saving...'
                      : complaintToEdit.departmentRemarks && complaintToEdit.departmentRemarks.trim()
                      ? 'Update Remarks'
                      : 'Save Remarks'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. View Complaint Details Modal (Strictly Read-Only) */}
      <AnimatePresence>
        {selectedComplaint && (
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
              style={{ maxWidth: '680px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Complaint Details</p>
                  <h2>{selectedComplaint.title || 'Untitled Complaint'}</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setSelectedComplaint(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {modalLoading && (
                <div className="track-empty-state" style={{ margin: '14px 0' }}>
                  <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
                  Loading latest complaint record...
                </div>
              )}

              {/* Optional Complaint Image */}
              {selectedComplaint.imageUrl && (
                <img
                  alt="Complaint attachment"
                  className="event-modal-hero-image"
                  src={selectedComplaint.imageUrl}
                />
              )}

              {/* Read-Only Detail Grid */}
              <div className="track-detail-grid admin-detail-grid">
                <p>
                  <span>Student Name</span>
                  {getStudentName(selectedComplaint)}
                </p>
                <p>
                  <span>Enrollment Number</span>
                  {getStudentEnrollment(selectedComplaint) || 'Not provided'}
                </p>
                <p>
                  <span>Category</span>
                  {selectedComplaint.category || 'General'}
                </p>
                <p>
                  <span>Priority</span>
                  <span className={getPriorityBadgeClass(selectedComplaint.priority)} style={{ width: 'fit-content' }}>
                    {selectedComplaint.priority || 'Low'}
                  </span>
                </p>
                <p>
                  <span>Current Status</span>
                  <span className={getStatusBadgeClass(selectedComplaint.status)} style={{ width: 'fit-content' }}>
                    {selectedComplaint.status || 'Pending'}
                  </span>
                </p>
                <p>
                  <span>Assigned Department</span>
                  {getDepartmentName(selectedComplaint)}
                </p>
                <p>
                  <span>Submitted Date</span>
                  {formatDate(selectedComplaint.createdAt)}
                </p>
                {selectedComplaint.resolvedAt && (
                  <p>
                    <span>Resolved Date</span>
                    {formatDate(selectedComplaint.resolvedAt)}
                  </p>
                )}
                <p className="admin-detail-fullwidth">
                  <span>Full Description</span>
                  <span style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: 1.6 }}>
                    {selectedComplaint.description || 'No description provided.'}
                  </span>
                </p>
                {selectedComplaint.adminRemarks && (
                  <p className="admin-detail-fullwidth">
                    <span>Admin Remarks</span>
                    <span style={{ color: '#93c5fd', fontStyle: 'italic' }}>
                      {selectedComplaint.adminRemarks}
                    </span>
                  </p>
                )}
                {selectedComplaint.departmentRemarks && (
                  <p className="admin-detail-fullwidth">
                    <span>Department Remarks</span>
                    <span style={{ color: '#86efac', fontStyle: 'italic' }}>
                      {selectedComplaint.departmentRemarks}
                    </span>
                  </p>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="admin-modal-footer" style={{ justifyContent: 'flex-end' }}>
                <button
                  className="complaint-secondary-button"
                  onClick={() => setSelectedComplaint(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default DepartmentRemarks;
