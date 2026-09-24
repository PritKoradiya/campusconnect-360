import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, ClipboardList, Search, Timer, X, XCircle } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import ComplaintTimeline from '../../components/common/ComplaintTimeline';
import ComplaintFeedbackDisplay from '../../components/common/ComplaintFeedbackDisplay';
import ComplaintFeedbackModal from '../../components/common/ComplaintFeedbackModal';
import {
  getComplaintById,
  getMyComplaints,
  getComplaintFeedback,
  submitComplaintFeedback
} from '../../services/complaintService';

const statusOptions = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const categoryOptions = ['All', 'Maintenance', 'IT Support', 'Library', 'Examination', 'Administration', 'Other'];

const summaryConfig = [
  { label: 'Total Complaints', status: 'All', icon: ClipboardList, tone: 'blue' },
  { label: 'Pending', status: 'Pending', icon: Clock3, tone: 'warning' },
  { label: 'In Progress', status: 'In Progress', icon: Timer, tone: 'cyan' },
  { label: 'Resolved', status: 'Resolved', icon: CheckCircle2, tone: 'success' },
  { label: 'Rejected', status: 'Rejected', icon: XCircle, tone: 'danger' }
];

function getBadgeClass(type, value) {
  return `track-badge ${type}-${(value || 'Pending').toLowerCase().replaceAll(' ', '-')}`;
}

function getComplaintList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.complaints)) {
    return responseData.complaints;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData?.myComplaints)) {
    return responseData.myComplaints;
  }

  return [];
}

function getComplaintDetails(responseData) {
  return responseData?.complaint || responseData?.data || responseData;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available';
  }

  return new Date(dateValue).toLocaleDateString();
}

function getDepartmentName(complaint) {
  return complaint?.department?.name || complaint?.departmentName || complaint?.department || 'Not assigned';
}

function getRemarks(complaint, type) {
  if (type === 'admin') {
    return complaint?.adminRemarks || complaint?.adminRemark || complaint?.remarks || 'No admin remarks yet.';
  }

  return complaint?.departmentRemarks || complaint?.departmentRemark || 'No department remarks yet.';
}

function MyComplaints() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccessToast, setFeedbackSuccessToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMyComplaints = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await getMyComplaints();
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

    loadMyComplaints();
  }, []);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const title = complaint.title || '';
      const matchesSearch = title.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'All' || complaint.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || complaint.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [complaints, searchText, statusFilter, categoryFilter]);

  const getSummaryCount = (status) => {
    if (status === 'All') {
      return complaints.length;
    }

    return complaints.filter((complaint) => complaint.status === status).length;
  };

  const handleViewDetails = async (complaint) => {
    const complaintId = complaint._id || complaint.id;

    if (!complaintId) {
      setSelectedComplaint(complaint);
      setSelectedFeedback(null);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedComplaint(complaint);
      setSelectedFeedback(null);
      setFeedbackError('');

      const [complaintRes, feedbackRes] = await Promise.all([
        getComplaintById(complaintId),
        complaint.status === 'Resolved'
          ? getComplaintFeedback(complaintId).catch(() => ({ data: { feedback: null } }))
          : Promise.resolve({ data: { feedback: null } })
      ]);

      const details = getComplaintDetails(complaintRes.data);
      setSelectedComplaint(details);

      if (feedbackRes?.data?.feedback) {
        setSelectedFeedback(feedbackRes.data.feedback);
      } else if (details.status === 'Resolved' && details.status !== complaint.status) {
        const freshFb = await getComplaintFeedback(complaintId).catch(() => null);
        if (freshFb?.data?.feedback) {
          setSelectedFeedback(freshFb.data.feedback);
        }
      }
    } catch (err) {
      setSelectedComplaint(complaint);
      setError(err.response?.data?.message || 'Failed to load complaint details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSubmitFeedback = async (feedbackData) => {
    const complaintId = selectedComplaint?._id || selectedComplaint?.id;
    if (!complaintId) return;

    try {
      setFeedbackSubmitting(true);
      setFeedbackError('');

      const res = await submitComplaintFeedback(complaintId, feedbackData);
      const savedFb = res.data?.feedback;
      setSelectedFeedback(savedFb);
      setFeedbackModalOpen(false);
      setFeedbackSuccessToast('Feedback submitted successfully.');

      // Refresh complaint details to show the updated timeline event
      const updatedComplaintRes = await getComplaintById(complaintId);
      setSelectedComplaint(getComplaintDetails(updatedComplaintRes.data));

      setTimeout(() => {
        setFeedbackSuccessToast('');
      }, 4000);
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Student Support</p>
          <h1>My Complaints</h1>
          <p>Track your submitted complaints and view current progress.</p>
        </div>
        <span className="dashboard-role-pill">Track Complaint</span>
      </AnimatedCard>

      <div className="dashboard-grid dashboard-summary-grid">
        {summaryConfig.map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedCard className={`dashboard-stat-card tone-${card.tone}`} delay={0.1 + index * 0.08} key={card.label}>
              <span className="dashboard-card-icon">
                <Icon size={22} />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{getSummaryCount(card.status)}</strong>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      <AnimatedCard className="track-filter-card" delay={0.22} hover={false}>
        <label className="complaint-field">
          <span>Search by complaint title</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search complaints..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        <label className="complaint-field">
          <span>Filter by status</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="complaint-field">
          <span>Filter by category</span>
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </AnimatedCard>

      <AnimatedCard className="dashboard-panel" delay={0.3} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Complaints</h2>
          <p>Your submitted complaint history from the support system.</p>
        </div>

        {loading && <div className="track-empty-state">Loading complaints...</div>}

        {error && <div className="track-empty-state complaint-error-message">{error}</div>}

        {!loading && !error && filteredComplaints.length > 0 ? (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((complaint) => (
                  <tr key={complaint._id || complaint.id}>
                    <td>{complaint._id || complaint.id}</td>
                    <td>{complaint.title || 'Untitled complaint'}</td>
                    <td>{complaint.category || 'Other'}</td>
                    <td>
                      <span className={getBadgeClass('priority', complaint.priority)}>{complaint.priority || 'Medium'}</span>
                    </td>
                    <td>{formatDate(complaint.createdAt || complaint.date)}</td>
                    <td>
                      <span className={getBadgeClass('status', complaint.status)}>{complaint.status || 'Pending'}</span>
                    </td>
                    <td>
                      <button className="track-action-button" onClick={() => handleViewDetails(complaint)} type="button">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && filteredComplaints.length === 0 && (
          <div className="track-empty-state">No complaints found. Submit your first complaint to get support.</div>
        )}
      </AnimatedCard>

      {selectedComplaint && (
        <motion.div
          animate={{ opacity: 1 }}
          className="track-modal-backdrop"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="track-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="track-modal-heading">
              <div>
                <p className="dashboard-kicker">Complaint Details</p>
                <h2>{selectedComplaint.title || 'Untitled complaint'}</h2>
              </div>
              <button className="track-close-button" onClick={() => setSelectedComplaint(null)} type="button">
                <X size={19} />
              </button>
            </div>

            <div className="track-detail-grid">
              {modalLoading && <p><span>Loading</span>Loading complaint details...</p>}
              <p><span>Description</span>{selectedComplaint.description || 'No description available.'}</p>
              <p><span>Category</span>{selectedComplaint.category || 'Other'}</p>
              <p><span>Department</span>{getDepartmentName(selectedComplaint)}</p>
              <p><span>Priority</span>{selectedComplaint.priority || 'Medium'}</p>
              <p><span>Status</span>{selectedComplaint.status || 'Pending'}</p>
              <p><span>Submitted date</span>{formatDate(selectedComplaint.createdAt || selectedComplaint.date)}</p>
              <p><span>Admin remarks</span>{getRemarks(selectedComplaint, 'admin')}</p>
              <p><span>Department remarks</span>{getRemarks(selectedComplaint, 'department')}</p>
              <p><span>Resolved date</span>{formatDate(selectedComplaint.resolvedAt || selectedComplaint.resolvedDate)}</p>
            </div>

            <ComplaintFeedbackDisplay
              complaint={selectedComplaint}
              feedback={selectedFeedback}
              loading={modalLoading || feedbackLoading}
              isStudent={true}
              onOpenFeedbackModal={() => setFeedbackModalOpen(true)}
            />

            <ComplaintTimeline
              complaintId={selectedComplaint._id || selectedComplaint.id}
              initialTimeline={selectedComplaint.timeline}
              initialComplaint={selectedComplaint}
            />

            <button className="complaint-submit-button" onClick={() => setSelectedComplaint(null)} type="button">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Student Satisfaction Feedback Modal */}
      <ComplaintFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        onSubmit={handleSubmitFeedback}
        complaintTitle={selectedComplaint?.title}
        initialFeedback={selectedFeedback}
        loading={feedbackSubmitting}
        error={feedbackError}
      />

      {/* Success Toast */}
      {feedbackSuccessToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
            fontWeight: 500,
            zIndex: 1200
          }}
        >
          <CheckCircle2 size={18} />
          <span>{feedbackSuccessToast}</span>
        </div>
      )}
    </AnimatedPage>
  );
}

export default MyComplaints;
