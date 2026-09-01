import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  RotateCcw,
  Search,
  Timer,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaintById,
  getDepartmentComplaints
} from '../../services/complaintService';

const statusFilterOptions = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const priorityFilterOptions = ['All', 'Low', 'Medium', 'High', 'Urgent'];

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

function DepartmentComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters, Search & Sort
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

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

  // Dynamically derive categories from loaded complaints
  const derivedCategories = useMemo(() => {
    const cats = new Set();
    complaints.forEach((c) => {
      if (c.category && typeof c.category === 'string' && c.category.trim()) {
        cats.add(c.category.trim());
      }
    });
    return ['All', ...Array.from(cats).sort()];
  }, [complaints]);

  // Real Summary Counts from loaded complaints
  const totalAssigned = complaints.length;
  const pendingCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'pending').length;
  const inProgressCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'in progress').length;
  const resolvedCount = complaints.filter((c) => (c.status || '').toLowerCase() === 'resolved').length;

  // Filtered and Sorted Complaints
  const filteredComplaints = useMemo(() => {
    return complaints
      .filter((complaint) => {
        const title = (complaint.title || '').toLowerCase();
        const description = (complaint.description || '').toLowerCase();
        const student = getStudentName(complaint).toLowerCase();
        const enrollment = getStudentEnrollment(complaint).toLowerCase();
        const category = (complaint.category || '').toLowerCase();
        const priority = (complaint.priority || '').toLowerCase();
        const status = (complaint.status || '').toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          description.includes(query) ||
          student.includes(query) ||
          enrollment.includes(query) ||
          category.includes(query) ||
          priority.includes(query);

        const matchesStatus =
          statusFilter === 'All' || status === statusFilter.toLowerCase();

        const matchesPriority =
          priorityFilter === 'All' || priority === priorityFilter.toLowerCase();

        const matchesCategory =
          categoryFilter === 'All' ||
          (complaint.category && complaint.category.trim() === categoryFilter);

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'priority') {
          const priorityWeights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
          return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        }
        // Default: newest first
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [complaints, searchText, statusFilter, priorityFilter, categoryFilter, sortBy]);

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
        setError('You are not authorized to view these complaints.');
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
          <h1>Assigned Complaints</h1>
          <p>View complaints assigned to your department and review their current status.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchComplaints(true)}
            title="Refresh assigned complaints"
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
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p>Assigned Complaints</p>
            <strong>{totalAssigned}</strong>
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
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-complaints-filter-card" delay={0.24} hover={false}>
        {/* Search Field */}
        <label className="complaint-field admin-filter-field-search">
          <span>Search Complaints</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title, student, category, priority..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Status Filter (Filter Only) */}
        <label className="complaint-field">
          <span>Filter by Status</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            {statusFilterOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </label>

        {/* Priority Filter */}
        <label className="complaint-field">
          <span>Filter by Priority</span>
          <select onChange={(e) => setPriorityFilter(e.target.value)} value={priorityFilter}>
            {priorityFilterOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'All' ? 'All Priorities' : priority}
              </option>
            ))}
          </select>
        </label>

        {/* Category Filter */}
        <label className="complaint-field">
          <span>Filter by Category</span>
          <select onChange={(e) => setCategoryFilter(e.target.value)} value={categoryFilter}>
            {derivedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </label>

        {/* Sorting */}
        <label className="complaint-field">
          <span>Sort By</span>
          <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority (High to Low)</option>
          </select>
        </label>
      </AnimatedCard>

      {/* Global Alerts */}
      <AnimatePresence>
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

      {/* Complaints Table Panel (Assigned Worklist) */}
      <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Assigned Worklist ({filteredComplaints.length})</h2>
          <p>Direct service queue for complaints routed to {user?.department || 'your department'}.</p>
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
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td><div className="admin-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '110px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '160px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '90px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '75px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '85px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
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
              New student requests routed to your department will appear here automatically.
            </p>
          </div>
        )}

        {/* Empty State: Filter / Search Produced 0 Matches */}
        {!loading && complaints.length > 0 && filteredComplaints.length === 0 && (
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              No complaints match your current filters.
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
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((item) => {
                  const id = item._id || item.id || '';
                  const shortId = id.length > 6 ? `#${id.slice(-6).toUpperCase()}` : id;

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
                        <span style={{ color: '#cbd5e1' }}>{item.category || 'General'}</span>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(item.priority)}>
                          {item.priority || 'Low'}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <span className={getStatusBadgeClass(item.status)}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        {/* View Details Only Action */}
                        <button
                          className="admin-action-btn view"
                          onClick={() => handleViewDetails(item)}
                          title="View full complaint details"
                          type="button"
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* View Complaint Details Modal (Strictly Read-Only) */}
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
              {/* Modal Header */}
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

              {/* Modal Footer Controls (View-Only / Close Only) */}
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

export default DepartmentComplaints;
