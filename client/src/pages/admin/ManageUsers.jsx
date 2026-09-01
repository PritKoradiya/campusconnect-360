import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  GraduationCap,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Users,
  UserX,
  X,
  XCircle
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import {
  deleteUser,
  getUserById,
  getUsers,
  updateUserStatus
} from '../../services/userService';

const roleFilterOptions = ['All', 'Student', 'Admin', 'Department'];
const statusFilterOptions = ['All', 'Active', 'Inactive'];

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getRoleBadgeClass(role) {
  const normalized = (role || 'student').toLowerCase();
  if (normalized === 'admin') return 'role-badge role-admin';
  if (normalized === 'department') return 'role-badge role-department';
  return 'role-badge role-student';
}

function getUserList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.users)) return responseData.users;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function getUserDetails(responseData) {
  return responseData?.user || responseData?.data || responseData;
}

function ManageUsers() {
  const { user: currentAuthUser } = useAuth();
  const currentUserId = currentAuthUser?._id || currentAuthUser?.id || '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter, Search, Sort States
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Status Toggle Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async (isManualRefresh = false) => {
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

      const response = await getUsers();
      setUsers(getUserList(response.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Dynamically derive departments from loaded users
  const derivedDepartments = useMemo(() => {
    const departments = new Set();
    users.forEach((u) => {
      if (u.department && typeof u.department === 'string' && u.department.trim()) {
        departments.add(u.department.trim());
      }
    });
    return ['All', ...Array.from(departments).sort()];
  }, [users]);

  // Real Summary Counts
  const totalCount = users.length;
  const studentCount = users.filter((u) => (u.role || '').toLowerCase() === 'student').length;
  const adminCount = users.filter((u) => (u.role || '').toLowerCase() === 'admin').length;
  const deptUserCount = users.filter((u) => (u.role || '').toLowerCase() === 'department').length;
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const inactiveCount = users.filter((u) => u.isActive === false).length;

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const name = (u.name || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        const enrollment = (u.enrollmentNo || '').toLowerCase();
        const department = (u.department || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          name.includes(query) ||
          email.includes(query) ||
          enrollment.includes(query) ||
          department.includes(query);

        const matchesRole =
          roleFilter === 'All' || role === roleFilter.toLowerCase();

        const matchesDepartment =
          departmentFilter === 'All' ||
          (u.department && u.department.trim() === departmentFilter);

        const matchesStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Active' && u.isActive !== false) ||
          (statusFilter === 'Inactive' && u.isActive === false);

        return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [users, searchText, roleFilter, departmentFilter, statusFilter, sortBy]);

  // View User Details
  const handleViewDetails = async (targetUser) => {
    const targetId = targetUser._id || targetUser.id;
    if (!targetId) {
      setSelectedUser(targetUser);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedUser(targetUser);
      setError('');

      const response = await getUserById(targetId);
      const details = getUserDetails(response.data);
      setSelectedUser(details);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load full user details');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Open Status Toggle Confirmation Modal
  const openStatusToggleModal = (targetUser) => {
    const targetId = targetUser._id || targetUser.id;
    if (targetId && targetId.toString() === currentUserId.toString()) {
      setError('You cannot deactivate your own account.');
      return;
    }
    setUserToToggle(targetUser);
    setStatusModalOpen(true);
  };

  // Confirm Status Toggle
  const handleConfirmStatusToggle = async () => {
    if (!userToToggle) return;
    const targetId = userToToggle._id || userToToggle.id;
    if (!targetId) return;

    const newActiveState = userToToggle.isActive === false ? true : false;

    try {
      setTogglingStatus(true);
      setError('');
      setSuccess('');

      const response = await updateUserStatus(targetId, newActiveState);
      const updatedUser = response.data?.user || {
        ...userToToggle,
        isActive: newActiveState
      };

      // Update state locally
      setUsers((prev) =>
        prev.map((u) => ((u._id || u.id) === targetId ? { ...u, ...updatedUser } : u))
      );

      if (selectedUser && (selectedUser._id || selectedUser.id) === targetId) {
        setSelectedUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
      }

      setStatusModalOpen(false);
      setUserToToggle(null);
      setSuccess(
        `User "${updatedUser.name}" ${
          newActiveState ? 'activated' : 'deactivated'
        } successfully.`
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to update user status');
      }
    } finally {
      setTogglingStatus(false);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (targetUser) => {
    const targetId = targetUser._id || targetUser.id;
    if (targetId && targetId.toString() === currentUserId.toString()) {
      setError('You cannot delete your own account.');
      return;
    }
    setUserToDelete(targetUser);
    setDeleteModalOpen(true);
  };

  // Confirm Delete User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete._id || userToDelete.id;
    if (!targetId) return;

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      await deleteUser(targetId);

      // Remove from list
      setUsers((prev) => prev.filter((u) => (u._id || u.id) !== targetId));

      if (selectedUser && (selectedUser._id || selectedUser.id) === targetId) {
        setSelectedUser(null);
      }

      setDeleteModalOpen(false);
      setUserToDelete(null);
      setSuccess(`User "${userToDelete.name}" deleted successfully.`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete user');
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
          <p className="dashboard-kicker">Admin Desk</p>
          <h1>Manage Users</h1>
          <p>View and manage students, administrators, and department users.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchUsers(true)}
            title="Refresh user directory"
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
          <span className="dashboard-role-pill">User Control</span>
        </div>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <Users size={22} />
          </span>
          <div>
            <p>Total Users</p>
            <strong>{totalCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.12}>
          <span className="dashboard-card-icon">
            <GraduationCap size={22} />
          </span>
          <div>
            <p>Students</p>
            <strong>{studentCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-purple" delay={0.16}>
          <span className="dashboard-card-icon">
            <ShieldCheck size={22} />
          </span>
          <div>
            <p>Admins</p>
            <strong>{adminCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.2}>
          <span className="dashboard-card-icon">
            <Building2 size={22} />
          </span>
          <div>
            <p>Department Users</p>
            <strong>{deptUserCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.24}>
          <span className="dashboard-card-icon">
            <UserCheck size={22} />
          </span>
          <div>
            <p>Active Users</p>
            <strong>{activeCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-danger" delay={0.28}>
          <span className="dashboard-card-icon">
            <UserX size={22} />
          </span>
          <div>
            <p>Inactive Users</p>
            <strong>{inactiveCount}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-complaints-filter-card" delay={0.3} hover={false}>
        {/* Search Field */}
        <label className="complaint-field admin-filter-field-search">
          <span>Search Users</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, email, enrollment, department..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Role Filter */}
        <label className="complaint-field">
          <span>Role</span>
          <select onChange={(e) => setRoleFilter(e.target.value)} value={roleFilter}>
            {roleFilterOptions.map((role) => (
              <option key={role} value={role}>
                {role}
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

        {/* Sorting */}
        <label className="complaint-field">
          <span>Sort By</span>
          <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
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

      {/* Users Table Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.34} hover={false}>
        <div className="dashboard-section-heading">
          <h2>All Users ({filteredUsers.length})</h2>
          <p>Verified campus user directory with account status control and role management.</p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Enrollment No</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr key={item}>
                    <td><div className="admin-skeleton-line" style={{ width: '130px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '150px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '90px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '85px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '110px' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State: No Users */}
        {!loading && users.length === 0 && (
          <div className="track-empty-state">
            <Users size={36} style={{ color: '#22d3ee', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>No users found.</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Registered students, faculty, and administrators will appear in this directory.
            </p>
          </div>
        )}

        {/* Empty State: Filters produced 0 */}
        {!loading && users.length > 0 && filteredUsers.length === 0 && (
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              No users match your current search or filters.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Try adjusting your query or resetting active filters.
            </p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && filteredUsers.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Enrollment No</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const id = item._id || item.id || '';
                  const isSelf = id && currentUserId && id.toString() === currentUserId.toString();
                  const isActive = item.isActive !== false;

                  return (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={id}
                      transition={{ duration: 0.2 }}
                    >
                      <td>
                        <div className="admin-user-cell">
                          <div className="user-avatar-circle">
                            {getUserInitials(item.name)}
                          </div>
                          <div className="admin-user-info">
                            <div className="admin-user-name-row">
                              <span>{item.name || 'Unnamed User'}</span>
                              {isSelf && <span className="admin-self-pill">You</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#cbd5e1' }}>{item.email || '—'}</span>
                      </td>
                      <td>
                        <span className={getRoleBadgeClass(item.role)}>
                          {item.role || 'student'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: item.department ? '#e0f2fe' : '#94a3b8' }}>
                          {item.department || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: item.enrollmentNo ? '#e0f2fe' : '#94a3b8' }}>
                          {item.enrollmentNo || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={isActive ? 'track-badge status-resolved' : 'track-badge status-rejected'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <div className="admin-action-btn-group">
                          {/* View Details */}
                          <button
                            className="admin-action-btn view"
                            onClick={() => handleViewDetails(item)}
                            title="View user details"
                            type="button"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            className={isActive ? 'admin-action-btn toggle-active' : 'admin-action-btn toggle-inactive'}
                            disabled={isSelf}
                            onClick={() => openStatusToggleModal(item)}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own account'
                                : isActive
                                ? 'Deactivate user'
                                : 'Activate user'
                            }
                            type="button"
                          >
                            {isActive ? <PowerOff size={14} /> : <Power size={14} />}
                            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>

                          {/* Delete Action */}
                          <button
                            aria-label="Delete user"
                            className="admin-action-btn delete"
                            disabled={isSelf}
                            onClick={() => openDeleteModal(item)}
                            title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                            type="button"
                          >
                            <Trash2 size={15} />
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

      {/* 1. View User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="user-avatar-circle" style={{ width: '42px', height: '42px', fontSize: '16px' }}>
                    {getUserInitials(selectedUser.name)}
                  </div>
                  <div>
                    <p className="dashboard-kicker">User Profile</p>
                    <h2 style={{ margin: 0 }}>{selectedUser.name || 'Unnamed User'}</h2>
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setSelectedUser(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {modalLoading && (
                <div className="track-empty-state" style={{ margin: '14px 0' }}>
                  <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
                  Loading latest user profile...
                </div>
              )}

              {/* Detail Grid */}
              <div className="track-detail-grid admin-detail-grid">
                <p>
                  <span>Full Name</span>
                  {selectedUser.name || 'Not available'}
                </p>
                <p>
                  <span>Email Address</span>
                  {selectedUser.email || 'Not available'}
                </p>
                <p>
                  <span>System Role</span>
                  <span className={getRoleBadgeClass(selectedUser.role)} style={{ width: 'fit-content' }}>
                    {selectedUser.role || 'student'}
                  </span>
                </p>
                <p>
                  <span>Account Status</span>
                  <span
                    className={
                      selectedUser.isActive !== false
                        ? 'track-badge status-resolved'
                        : 'track-badge status-rejected'
                    }
                    style={{ width: 'fit-content' }}
                  >
                    {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p>
                  <span>Department</span>
                  {selectedUser.department || 'Not assigned'}
                </p>
                <p>
                  <span>Enrollment Number</span>
                  {selectedUser.enrollmentNo || 'Not available'}
                </p>
                {selectedUser.branch && (
                  <p>
                    <span>Branch</span>
                    {selectedUser.branch}
                  </p>
                )}
                {selectedUser.semester !== undefined && selectedUser.semester !== null && (
                  <p>
                    <span>Semester</span>
                    {selectedUser.semester}
                  </p>
                )}
                {selectedUser.phone && (
                  <p>
                    <span>Phone Number</span>
                    {selectedUser.phone}
                  </p>
                )}
                <p>
                  <span>Member Since</span>
                  {formatDate(selectedUser.createdAt)}
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="admin-modal-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Status Toggle from within Modal */}
                  <button
                    className={
                      selectedUser.isActive !== false
                        ? 'admin-action-btn toggle-active'
                        : 'admin-action-btn toggle-inactive'
                    }
                    disabled={
                      (selectedUser._id || selectedUser.id)?.toString() === currentUserId.toString()
                    }
                    onClick={() => {
                      const userObj = selectedUser;
                      setSelectedUser(null);
                      openStatusToggleModal(userObj);
                    }}
                    style={{ minHeight: '38px', padding: '0 14px' }}
                    type="button"
                  >
                    {selectedUser.isActive !== false ? <PowerOff size={15} /> : <Power size={15} />}
                    <span>{selectedUser.isActive !== false ? 'Deactivate User' : 'Activate User'}</span>
                  </button>

                  {/* Delete from within Modal */}
                  <button
                    className="chatbot-clear-btn"
                    disabled={
                      (selectedUser._id || selectedUser.id)?.toString() === currentUserId.toString()
                    }
                    onClick={() => {
                      const userObj = selectedUser;
                      setSelectedUser(null);
                      openDeleteModal(userObj);
                    }}
                    type="button"
                  >
                    <Trash2 size={16} />
                    <span>Delete User</span>
                  </button>
                </div>

                <button
                  className="complaint-secondary-button"
                  onClick={() => setSelectedUser(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Status Toggle Confirmation Modal */}
      <AnimatePresence>
        {statusModalOpen && userToToggle && (
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
                  <p className="dashboard-kicker">Status Control</p>
                  <h2>
                    {userToToggle.isActive !== false ? 'Deactivate Account' : 'Activate Account'}
                  </h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setStatusModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={{
                    background:
                      userToToggle.isActive !== false
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(34, 197, 94, 0.15)',
                    borderColor:
                      userToToggle.isActive !== false
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'rgba(34, 197, 94, 0.4)',
                    color: userToToggle.isActive !== false ? '#fbbf24' : '#86efac'
                  }}
                >
                  {userToToggle.isActive !== false ? <PowerOff size={26} /> : <Power size={26} />}
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    {userToToggle.isActive !== false
                      ? `Deactivate user "${userToToggle.name}"?`
                      : `Activate user "${userToToggle.name}"?`}
                  </p>
                  <p className="chatbot-confirm-desc">
                    {userToToggle.isActive !== false
                      ? 'Deactivating this user will prevent them from logging in and accessing campus services.'
                      : 'Activating this account will restore full login access for this user.'}
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={togglingStatus}
                  onClick={() => setStatusModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={
                    userToToggle.isActive !== false
                      ? 'chatbot-danger-btn'
                      : 'complaint-submit-button'
                  }
                  disabled={togglingStatus}
                  onClick={handleConfirmStatusToggle}
                  type="button"
                >
                  {togglingStatus
                    ? 'Updating...'
                    : userToToggle.isActive !== false
                    ? 'Deactivate User'
                    : 'Activate User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && userToDelete && (
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
                  <h2>Delete User</h2>
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
                    Are you sure you want to delete this user?
                  </p>
                  <p className="chatbot-confirm-desc">
                    User &quot;{userToDelete.name}&quot; ({userToDelete.email}) will be permanently deleted from the database. This action cannot be undone.
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
                  {deleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default ManageUsers;
