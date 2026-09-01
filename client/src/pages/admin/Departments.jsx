import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit2,
  Mail,
  Phone,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  Trash2,
  User,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
  updateDepartmentStatus
} from '../../services/departmentService';

const initialFormData = {
  name: '',
  code: '',
  description: '',
  headName: '',
  contactEmail: '',
  contactPhone: '',
  isActive: true
};

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Toggle Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deptToToggle, setDeptToToggle] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartmentList = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getDepartments({ includeInactive: 'true' });
      setDepartments(response.data?.departments || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load departments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentList();
  }, []);

  // Summary counts
  const totalCount = departments.length;
  const activeCount = departments.filter((d) => d.isActive).length;
  const inactiveCount = departments.filter((d) => !d.isActive).length;

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const name = (dept.name || '').toLowerCase();
      const code = (dept.code || '').toLowerCase();
      const head = (dept.headName || '').toLowerCase();
      const query = searchText.toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || code.includes(query) || head.includes(query);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && dept.isActive) ||
        (statusFilter === 'Inactive' && !dept.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchText, statusFilter]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentDeptId(null);
    setFormData(initialFormData);
    setFormError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (dept) => {
    setIsEditing(true);
    setCurrentDeptId(dept._id);
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      headName: dept.headName || '',
      contactEmail: dept.contactEmail || '',
      contactPhone: dept.contactPhone || '',
      isActive: dept.isActive !== undefined ? dept.isActive : true
    });
    setFormError('');
    setModalOpen(true);
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setFormError('');
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Department name and code are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');
      setError('');
      setSuccess('');

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        headName: formData.headName.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        isActive: formData.isActive
      };

      if (isEditing) {
        const response = await updateDepartment(currentDeptId, payload);
        const updated = response.data?.department;
        setDepartments((prev) =>
          prev.map((d) => (d._id === currentDeptId ? { ...d, ...updated } : d))
        );
        setSuccess('Department updated successfully.');
      } else {
        const response = await createDepartment(payload);
        const created = response.data?.department;
        if (created) {
          setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          await fetchDepartmentList();
        }
        setSuccess('Department created successfully.');
      }

      setModalOpen(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setFormError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setFormError('You are not authorized to perform this action.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to save department');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Toggle Status Modal
  const handleOpenToggleModal = (dept) => {
    setDeptToToggle(dept);
    setStatusModalOpen(true);
  };

  // Confirm Status Toggle
  const handleConfirmToggleStatus = async () => {
    if (!deptToToggle) return;
    const newStatus = !deptToToggle.isActive;

    try {
      setTogglingStatus(true);
      setError('');
      setSuccess('');

      const response = await updateDepartmentStatus(deptToToggle._id, newStatus);
      const updated = response.data?.department;

      setDepartments((prev) =>
        prev.map((d) => (d._id === deptToToggle._id ? { ...d, isActive: newStatus, ...updated } : d))
      );

      setStatusModalOpen(false);
      setDeptToToggle(null);
      setSuccess(`Department ${newStatus ? 'activated' : 'deactivated'} successfully.`);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to update department status');
      }
    } finally {
      setTogglingStatus(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (dept) => {
    setDeptToDelete(dept);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccess('');

      await deleteDepartment(deptToDelete._id);

      setDepartments((prev) => prev.filter((d) => d._id !== deptToDelete._id));
      setDeleteModalOpen(false);
      setDeptToDelete(null);
      setSuccess('Department deleted successfully.');
    } catch (err) {
      if (err.response?.status === 409) {
        // Show exact backend error message for referenced complaints
        setError(
          err.response?.data?.message ||
            'Department cannot be deleted because complaints are assigned to it. Deactivate it instead.'
        );
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete department');
      }
      setDeleteModalOpen(false);
      setDeptToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div className="dept-header-actions" style={{ width: '100%' }}>
          <div>
            <p className="dashboard-kicker">Admin Department Management</p>
            <h1>Departments</h1>
            <p>Manage campus departments, contacts, and department availability.</p>
          </div>
          <button className="dept-add-btn" onClick={handleOpenCreateModal} type="button">
            <Plus size={18} />
            <span>Add Department</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <Building2 size={22} />
          </span>
          <div>
            <p>Total Departments</p>
            <strong>{totalCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.12}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Active Departments</p>
            <strong>{activeCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.16}>
          <span className="dashboard-card-icon">
            <PowerOff size={22} />
          </span>
          <div>
            <p>Inactive Departments</p>
            <strong>{inactiveCount}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Search & Filter */}
      <AnimatedCard className="dept-filter-card" delay={0.2} hover={false}>
        <label className="complaint-field">
          <span>Search Departments</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, code, head name..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        <label className="complaint-field">
          <span>Status Filter</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            <option value="All">All Departments</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </label>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            className="complaint-secondary-button"
            onClick={fetchDepartmentList}
            style={{ width: '100%', minHeight: '48px' }}
            type="button"
          >
            <RotateCcw size={16} />
            Refresh
          </button>
        </div>
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

      {/* Main Department Table Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.25} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Campus Departments ({filteredDepartments.length})</h2>
          <p>Active and inactive department directory for campus complaint routing.</p>
        </div>

        {loading && (
          <div className="track-empty-state">
            <div className="chatbot-loading-spinner" style={{ margin: '12px auto' }} />
            <p>Loading departments...</p>
          </div>
        )}

        {!loading && departments.length === 0 && (
          <div className="track-empty-state">
            <p style={{ marginBottom: '12px' }}>No departments found in the system.</p>
            <button className="dept-add-btn" onClick={handleOpenCreateModal} type="button">
              <Plus size={16} />
              Add First Department
            </button>
          </div>
        )}

        {!loading && departments.length > 0 && filteredDepartments.length === 0 && (
          <div className="track-empty-state">
            No departments match your current search or filter.
          </div>
        )}

        {!loading && filteredDepartments.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Head</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '15px' }}>{dept.name}</strong>
                        {dept.description && (
                          <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="dept-code-pill">{dept.code}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User color="#22d3ee" size={15} />
                        <span>{dept.headName || 'Not specified'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dept-contact-stack">
                        {dept.contactEmail ? (
                          <div className="dept-contact-item">
                            <Mail size={14} />
                            <span>{dept.contactEmail}</span>
                          </div>
                        ) : null}
                        {dept.contactPhone ? (
                          <div className="dept-contact-item">
                            <Phone size={14} />
                            <span>{dept.contactPhone}</span>
                          </div>
                        ) : null}
                        {!dept.contactEmail && !dept.contactPhone && (
                          <span style={{ color: '#64748b' }}>No contact info</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {dept.isActive ? (
                        <span className="status-badge-active">
                          <CheckCircle2 size={13} />
                          Active
                        </span>
                      ) : (
                        <span className="status-badge-inactive">
                          <PowerOff size={13} />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="dept-action-group">
                        <button
                          className="dept-edit-btn"
                          onClick={() => handleOpenEditModal(dept)}
                          title="Edit department details"
                          type="button"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          className={`dept-toggle-status-btn ${dept.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => handleOpenToggleModal(dept)}
                          title={dept.isActive ? 'Deactivate department' : 'Activate department'}
                          type="button"
                        >
                          {dept.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                          {dept.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          aria-label="Delete department"
                          className="admin-delete-icon-btn"
                          onClick={() => handleOpenDeleteModal(dept)}
                          title="Delete department"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* Add / Edit Department Modal */}
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
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">
                    {isEditing ? 'Update Details' : 'Create New Department'}
                  </p>
                  <h2>{isEditing ? 'Edit Department' : 'Add Department'}</h2>
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

              <form className="complaint-form" onSubmit={handleFormSubmit} style={{ marginTop: '16px' }}>
                <div className="complaint-form-grid">
                  <label className="complaint-field">
                    <span>Department Name *</span>
                    <input
                      name="name"
                      onChange={handleFormChange}
                      placeholder="e.g. Maintenance Department"
                      required
                      type="text"
                      value={formData.name}
                    />
                  </label>

                  <label className="complaint-field">
                    <span>Department Code *</span>
                    <input
                      name="code"
                      onChange={handleFormChange}
                      placeholder="e.g. MAINT"
                      required
                      style={{ textTransform: 'uppercase' }}
                      type="text"
                      value={formData.code}
                    />
                  </label>

                  <label className="complaint-field">
                    <span>Head of Department</span>
                    <input
                      name="headName"
                      onChange={handleFormChange}
                      placeholder="e.g. Dr. Robert Vance"
                      type="text"
                      value={formData.headName}
                    />
                  </label>

                  <label className="complaint-field">
                    <span>Contact Email</span>
                    <input
                      name="contactEmail"
                      onChange={handleFormChange}
                      placeholder="e.g. maintenance@campus.edu"
                      type="email"
                      value={formData.contactEmail}
                    />
                  </label>

                  <label className="complaint-field">
                    <span>Contact Phone</span>
                    <input
                      name="contactPhone"
                      onChange={handleFormChange}
                      placeholder="e.g. +1 234 567 8900"
                      type="tel"
                      value={formData.contactPhone}
                    />
                  </label>

                  <div className="complaint-field" style={{ justifyContent: 'center' }}>
                    <span>Department Status</span>
                    <label className="dept-checkbox-label">
                      <input
                        checked={formData.isActive}
                        name="isActive"
                        onChange={handleFormChange}
                        type="checkbox"
                      />
                      <span>Active &amp; Available for Student Complaints</span>
                    </label>
                  </div>

                  <label className="complaint-field complaint-field-wide">
                    <span>Description</span>
                    <textarea
                      name="description"
                      onChange={handleFormChange}
                      placeholder="Brief description of department responsibilities and services..."
                      rows="3"
                      value={formData.description}
                    />
                  </label>
                </div>

                <div className="admin-modal-footer">
                  <button
                    className="complaint-secondary-button"
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
                        ? 'Saving Changes...'
                        : 'Creating Department...'
                      : isEditing
                      ? 'Save Changes'
                      : 'Create Department'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activate / Deactivate Confirmation Modal */}
      <AnimatePresence>
        {statusModalOpen && deptToToggle && (
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
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Confirm Status Change</p>
                  <h2>
                    {deptToToggle.isActive ? 'Deactivate Department' : 'Activate Department'}
                  </h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setDeptToToggle(null);
                  }}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={
                    !deptToToggle.isActive
                      ? {
                          borderColor: 'rgba(34, 197, 94, 0.4)',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#86efac'
                        }
                      : {}
                  }
                >
                  {deptToToggle.isActive ? <PowerOff size={22} /> : <Power size={22} />}
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    {deptToToggle.isActive
                      ? `Deactivate "${deptToToggle.name}"?`
                      : `Activate "${deptToToggle.name}"?`}
                  </p>
                  <p className="chatbot-confirm-desc">
                    {deptToToggle.isActive
                      ? 'Inactive departments will no longer be visible to students when submitting complaints.'
                      : 'Active departments will immediately be available for students to select during complaint submission.'}
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setDeptToToggle(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={deptToToggle.isActive ? 'chatbot-danger-btn' : 'complaint-submit-button'}
                  disabled={togglingStatus}
                  onClick={handleConfirmToggleStatus}
                  type="button"
                >
                  {togglingStatus
                    ? 'Updating...'
                    : deptToToggle.isActive
                    ? 'Confirm Deactivation'
                    : 'Confirm Activation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && deptToDelete && (
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
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Delete Department</p>
                  <h2>Delete Confirmation</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeptToDelete(null);
                  }}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div className="chatbot-confirm-icon-wrap">
                  <Trash2 size={22} />
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    Are you sure you want to delete &quot;{deptToDelete.name}&quot;?
                  </p>
                  <p className="chatbot-confirm-desc">
                    This action will permanently delete this department if no complaints are
                    assigned to it. If complaints exist, deletion will be blocked safely.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeptToDelete(null);
                  }}
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
                  {deleting ? 'Deleting...' : 'Delete Department'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default Departments;
