import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Eye,
  RotateCcw,
  Search,
  Timer,
  Trash2,
  User,
  X,
  XCircle
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  assignComplaintToDepartment,
  deleteComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus
} from '../../services/adminComplaintService';

const statusFilterOptions = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const priorityFilterOptions = ['All', 'Low', 'Medium', 'High', 'Urgent'];
const statusUpdateOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function getBadgeClass(type, value) {
  return `track-badge ${type}-${(value || 'Pending').toLowerCase().replaceAll(' ', '-')}`;
}

function getStudentName(complaint) {
  return (
    complaint?.student?.name ||
    complaint?.studentName ||
    complaint?.user?.name ||
    complaint?.createdBy?.name ||
    'Unknown Student'
  );
}

function getStudentEmail(complaint) {
  return complaint?.student?.email || complaint?.user?.email || 'Not available';
}

function getStudentEnrollment(complaint) {
  return complaint?.student?.enrollmentNo || complaint?.enrollmentNo || 'Not available';
}

function getDepartmentName(complaint) {
  if (complaint?.department && typeof complaint.department === 'object') {
    return complaint.department.name || 'Unassigned';
  }
  return complaint?.departmentName || complaint?.department || 'Unassigned';
}

function getDepartmentId(complaint) {
  if (complaint?.department && typeof complaint.department === 'object') {
    return complaint.department._id || '';
  }
  return '';
}

function getRemarks(complaint, type) {
  if (type === 'admin') {
    return (
      complaint?.adminRemarks ||
      complaint?.adminRemark ||
      complaint?.remarks ||
      'No admin remarks yet.'
    );
  }
  return (
    complaint?.departmentRemarks ||
    complaint?.departmentRemark ||
    'No department remarks yet.'
  );
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

function ManageComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter & Search & Sort States
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Details Modal States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('Pending');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');

  // Department Assign States
  const [assigningDept, setAssigningDept] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchComplaints = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getAllComplaints();
      setComplaints(getComplaintList(response.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load complaints');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Dynamically derive unique categories from real data
  const derivedCategories = useMemo(() => {
    const categories = new Set();
    complaints.forEach((c) => {
      if (c.category) categories.add(c.category);
    });
    return ['All', ...Array.from(categories).sort()];
  }, [complaints]);

  // Dynamically derive unique departments from real data
  const derivedDepartments = useMemo(() => {
    const departments = new Set();
    complaints.forEach((c) => {
      const name = getDepartmentName(c);
      if (name && name !== 'Unassigned') departments.add(name);
    });
    return ['All', ...Array.from(departments).sort()];
  }, [complaints]);

  // Extract available department objects with real IDs for assignment
  const availableDepartments = useMemo(() => {
    const map = new Map();
    complaints.forEach((c) => {
      if (
        c.department &&
        typeof c.department === 'object' &&
        c.department._id &&
        c.department.name
      ) {
        map.set(c.department._id.toString(), {
          _id: c.department._id.toString(),
          name: c.department.name
        });
      }
    });
    return Array.from(map.values());
  }, [complaints]);

  // Summary counts
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'Pending').length;
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const rejectedCount = complaints.filter((c) => c.status === 'Rejected').length;
  const hasRejected = complaints.some((c) => c.status === 'Rejected');

  // Filtered & Sorted Complaints
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((complaint) => {
        const title = (complaint.title || '').toLowerCase();
        const student = getStudentName(complaint).toLowerCase();
        const category = (complaint.category || '').toLowerCase();
        const department = getDepartmentName(complaint).toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          student.includes(query) ||
          category.includes(query) ||
          department.includes(query);

        const matchesStatus =
          statusFilter === 'All' || complaint.status === statusFilter;
        const matchesPriority =
          priorityFilter === 'All' || complaint.priority === priorityFilter;
        const matchesCategory =
          categoryFilter === 'All' || complaint.category === categoryFilter;
        const matchesDepartment =
          departmentFilter === 'All' || getDepartmentName(complaint) === departmentFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesCategory &&
          matchesDepartment
        );
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [
    complaints,
    searchText,
    statusFilter,
    priorityFilter,
    categoryFilter,
    departmentFilter,
    sortBy
  ]);

  // View Details Modal
  const handleViewDetails = async (complaint) => {
    const complaintId = complaint._id || complaint.id;
    if (!complaintId) {
      setSelectedComplaint(complaint);
      setNewStatus(complaint.status || 'Pending');
      setAdminRemarksInput(complaint.adminRemarks || '');
      setSelectedDeptId(getDepartmentId(complaint) || '');
      return;
    }

    try {
      setModalLoading(true);
      setSelectedComplaint(complaint);
      setNewStatus(complaint.status || 'Pending');
      setAdminRemarksInput(complaint.adminRemarks || '');
      setSelectedDeptId(getDepartmentId(complaint) || '');
      setError('');

      const response = await getComplaintById(complaintId);
      const details = getComplaintDetails(response.data);
      setSelectedComplaint(details);
      setNewStatus(details.status || 'Pending');
      setAdminRemarksInput(details.adminRemarks || '');
      setSelectedDeptId(getDepartmentId(details) || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load full complaint details');
    } finally {
      setModalLoading(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    const complaintId = selectedComplaint._id || selectedComplaint.id;
    if (!complaintId) return;

    try {
      setUpdatingStatus(true);
      setError('');
      setSuccess('');

      const payload = {
        status: newStatus,
        adminRemarks: adminRemarksInput
      };

      const response = await updateComplaintStatus(complaintId, payload);
      const updated = response.data?.complaint || {
        ...selectedComplaint,
        status: newStatus,
        adminRemarks: adminRemarksInput
      };

      // Update in complaints state
      setComplaints((prev) =>
        prev.map((c) => ((c._id || c.id) === complaintId ? { ...c, ...updated } : c))
      );
      setSelectedComplaint((prev) => (prev ? { ...prev, ...updated } : updated));
      setSuccess('Complaint status updated successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to update complaint status');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Assign Department
  const handleAssignDepartment = async (e) => {
    e.preventDefault();
    if (!selectedComplaint || !selectedDeptId) return;
    const complaintId = selectedComplaint._id || selectedComplaint.id;
    if (!complaintId) return;

    try {
      setAssigningDept(true);
      setError('');
      setSuccess('');

      const response = await assignComplaintToDepartment(complaintId, selectedDeptId);
      const updated = response.data?.complaint;

      if (updated) {
        setComplaints((prev) =>
          prev.map((c) => ((c._id || c.id) === complaintId ? updated : c))
        );
        setSelectedComplaint(updated);
      } else {
        // Fallback update
        const assignedObj = availableDepartments.find((d) => d._id === selectedDeptId);
        setComplaints((prev) =>
          prev.map((c) =>
            (c._id || c.id) === complaintId
              ? { ...c, department: assignedObj || selectedDeptId, status: 'In Progress' }
              : c
          )
        );
        setSelectedComplaint((prev) =>
          prev
            ? { ...prev, department: assignedObj || selectedDeptId, status: 'In Progress' }
            : null
        );
      }
      setSuccess('Complaint assigned to department successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to assign complaint to department');
      }
    } finally {
      setAssigningDept(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (complaint) => {
    setComplaintToDelete(complaint);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!complaintToDelete) return;
    const complaintId = complaintToDelete._id || complaintToDelete.id;
    if (!complaintId) return;

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      await deleteComplaint(complaintId);

      // Remove from list
      setComplaints((prev) => prev.filter((c) => (c._id || c.id) !== complaintId));
      if (selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === complaintId) {
        setSelectedComplaint(null);
      }

      setDeleteModalOpen(false);
      setComplaintToDelete(null);
      setSuccess('Complaint deleted successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete complaint');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Admin Complaint Management</p>
          <h1>Manage Complaints</h1>
          <p>
            Review, assign, update, and manage student complaints from one place.
          </p>
        </div>
        <span className="dashboard-role-pill">Admin Control</span>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p>Total Complaints</p>
            <strong>{totalCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.12}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Pending</p>
            <strong>{pendingCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.16}>
          <span className="dashboard-card-icon">
            <Timer size={22} />
          </span>
          <div>
            <p>In Progress</p>
            <strong>{inProgressCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.2}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Resolved</p>
            <strong>{resolvedCount}</strong>
          </div>
        </AnimatedCard>

        {hasRejected && (
          <AnimatedCard className="dashboard-stat-card tone-danger" delay={0.24}>
            <span className="dashboard-card-icon">
              <XCircle size={22} />
            </span>
            <div>
              <p>Rejected</p>
              <strong>{rejectedCount}</strong>
            </div>
          </AnimatedCard>
        )}
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-complaints-filter-card" delay={0.26} hover={false}>
        {/* Search */}
        <label className="complaint-field admin-filter-field-search">
          <span>Search Complaints</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title, student, category, department..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Status Filter */}
        <label className="complaint-field">
          <span>Status</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            {statusFilterOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        {/* Priority Filter */}
        <label className="complaint-field">
          <span>Priority</span>
          <select onChange={(e) => setPriorityFilter(e.target.value)} value={priorityFilter}>
            {priorityFilterOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        {/* Category Filter */}
        <label className="complaint-field">
          <span>Category</span>
          <select onChange={(e) => setCategoryFilter(e.target.value)} value={categoryFilter}>
            {derivedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        {/* Department Filter */}
        <label className="complaint-field">
          <span>Department</span>
          <select onChange={(e) => setDepartmentFilter(e.target.value)} value={departmentFilter}>
            {derivedDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </label>

        {/* Date Sorting */}
        <label className="complaint-field">
          <span>Sort by Date</span>
          <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
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

      {/* Main Complaints Table Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.3} hover={false}>
        <div className="dashboard-section-heading">
          <h2>All Complaints ({filteredComplaints.length})</h2>
          <p>Complete complaint registry with status management and department routing.</p>
        </div>

        {loading && (
          <div className="track-empty-state">
            <div className="chatbot-loading-spinner" style={{ margin: '12px auto' }} />
            <p>Loading complaints...</p>
          </div>
        )}

        {!loading && complaints.length === 0 && (
          <div className="track-empty-state">No complaints available.</div>
        )}

        {!loading && complaints.length > 0 && filteredComplaints.length === 0 && (
          <div className="track-empty-state">
            No complaints match your current search or filters.
          </div>
        )}

        {!loading && filteredComplaints.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((complaint) => {
                  const id = complaint._id || complaint.id || '';
                  const shortId = id ? `#${id.slice(-6).toUpperCase()}` : 'N/A';

                  return (
                    <tr key={id}>
                      <td title={id} style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {shortId}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={15} color="#22d3ee" />
                          <span>{getStudentName(complaint)}</span>
                        </div>
                      </td>
                      <td>
                        <strong>{complaint.title || 'Untitled complaint'}</strong>
                      </td>
                      <td>{complaint.category || 'Other'}</td>
                      <td>
                        <span style={{ color: complaint.department ? '#e0f2fe' : '#94a3b8' }}>
                          {getDepartmentName(complaint)}
                        </span>
                      </td>
                      <td>
                        <span className={getBadgeClass('priority', complaint.priority)}>
                          {complaint.priority || 'Medium'}
                        </span>
                      </td>
                      <td>{formatDate(complaint.createdAt)}</td>
                      <td>
                        <span className={getBadgeClass('status', complaint.status)}>
                          {complaint.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="track-action-button"
                            onClick={() => handleViewDetails(complaint)}
                            title="View full details and manage"
                            type="button"
                          >
                            <Eye size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            View Details
                          </button>
                          <button
                            aria-label="Delete complaint"
                            className="admin-delete-icon-btn"
                            onClick={() => openDeleteModal(complaint)}
                            title="Delete complaint"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* View Details & Management Modal */}
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
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Modal Header */}
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Complaint Information &amp; Management</p>
                  <h2>{selectedComplaint.title || 'Untitled complaint'}</h2>
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
                  Loading latest complaint details...
                </div>
              )}

              {/* Optional Complaint Image */}
              {selectedComplaint.imageUrl && (
                <img
                  alt={selectedComplaint.title}
                  className="resource-modal-image"
                  src={selectedComplaint.imageUrl}
                />
              )}

              {/* Detail Grid */}
              <div className="track-detail-grid admin-detail-grid">
                <p>
                  <span>Student Name</span>
                  {getStudentName(selectedComplaint)}
                </p>
                <p>
                  <span>Student Email</span>
                  {getStudentEmail(selectedComplaint)}
                </p>
                <p>
                  <span>Enrollment No</span>
                  {getStudentEnrollment(selectedComplaint)}
                </p>
                <p>
                  <span>Category</span>
                  {selectedComplaint.category || 'Other'}
                </p>
                <p>
                  <span>Assigned Department</span>
                  {getDepartmentName(selectedComplaint)}
                </p>
                <p>
                  <span>Priority</span>
                  <span className={getBadgeClass('priority', selectedComplaint.priority)} style={{ width: 'fit-content' }}>
                    {selectedComplaint.priority || 'Medium'}
                  </span>
                </p>
                <p>
                  <span>Current Status</span>
                  <span className={getBadgeClass('status', selectedComplaint.status)} style={{ width: 'fit-content' }}>
                    {selectedComplaint.status || 'Pending'}
                  </span>
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
                  <span>Description</span>
                  {selectedComplaint.description || 'No description provided.'}
                </p>
                <p className="admin-detail-fullwidth">
                  <span>Admin Remarks</span>
                  {getRemarks(selectedComplaint, 'admin')}
                </p>
                <p className="admin-detail-fullwidth">
                  <span>Department Remarks</span>
                  {getRemarks(selectedComplaint, 'department')}
                </p>
              </div>

              {/* Action Section: Update Status & Admin Remarks */}
              <div className="admin-modal-action-box">
                <h3>Update Complaint Status</h3>
                <form className="admin-action-form" onSubmit={handleUpdateStatus}>
                  <div className="admin-form-row">
                    <label className="complaint-field" style={{ minWidth: '180px' }}>
                      <span>New Status</span>
                      <select
                        disabled={updatingStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        value={newStatus}
                      >
                        {statusUpdateOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="complaint-field" style={{ flex: 1 }}>
                      <span>Admin Remarks</span>
                      <input
                        disabled={updatingStatus}
                        onChange={(e) => setAdminRemarksInput(e.target.value)}
                        placeholder="Add official admin remark or feedback..."
                        type="text"
                        value={adminRemarksInput}
                      />
                    </label>

                    <button
                      className="complaint-submit-button"
                      disabled={updatingStatus}
                      style={{ alignSelf: 'flex-end', minHeight: '48px' }}
                      type="submit"
                    >
                      {updatingStatus ? 'Updating...' : 'Save Status'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Action Section: Assign to Department */}
              <div className="admin-modal-action-box" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Building2 size={18} color="#22d3ee" />
                  <h3 style={{ margin: 0 }}>Assign to Department</h3>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '0 0 12px' }}>
                  Current Department:{' '}
                  <strong style={{ color: '#a5f3fc' }}>{getDepartmentName(selectedComplaint)}</strong>
                </p>

                {availableDepartments.length > 0 ? (
                  <form className="admin-action-form" onSubmit={handleAssignDepartment}>
                    <div className="admin-form-row">
                      <label className="complaint-field" style={{ flex: 1 }}>
                        <span>Select Target Department</span>
                        <select
                          disabled={assigningDept}
                          onChange={(e) => setSelectedDeptId(e.target.value)}
                          value={selectedDeptId}
                        >
                          <option value="">-- Choose Department --</option>
                          {availableDepartments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        className="complaint-secondary-button"
                        disabled={assigningDept || !selectedDeptId}
                        style={{ alignSelf: 'flex-end', minHeight: '48px' }}
                        type="submit"
                      >
                        {assigningDept ? 'Assigning...' : 'Assign Department'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                    No department profiles found in active complaints to assign.
                  </p>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="admin-modal-footer">
                <button
                  className="chatbot-clear-btn"
                  onClick={() => openDeleteModal(selectedComplaint)}
                  type="button"
                >
                  <Trash2 size={16} />
                  <span>Delete Complaint</span>
                </button>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && complaintToDelete && (
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
                  <h2>Delete Complaint</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setDeleteModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div className="chatbot-confirm-icon-wrap">
                  <Trash2 size={26} />
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    Are you sure you want to delete this complaint?
                  </p>
                  <p className="chatbot-confirm-desc">
                    Complaint &quot;{complaintToDelete.title || 'Untitled'}&quot; will be permanently deleted from the database. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={deleting}
                  onClick={() => setDeleteModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="chatbot-danger-btn"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  type="button"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default ManageComplaints;
