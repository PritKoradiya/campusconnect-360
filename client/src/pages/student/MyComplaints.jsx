import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock3, ClipboardList, Search, Timer, X } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';

const sampleComplaints = [
  {
    id: 'CC-1001',
    title: 'Classroom projector not working',
    category: 'IT Support',
    priority: 'High',
    date: '2026-07-02',
    status: 'In Progress',
    description: 'The projector in B-204 is not turning on during lectures.',
    adminRemarks: 'Complaint assigned to IT Support Department.',
    departmentRemarks: 'Technician visit scheduled for tomorrow morning.'
  },
  {
    id: 'CC-1002',
    title: 'Library AC cooling issue',
    category: 'Library',
    priority: 'Medium',
    date: '2026-07-01',
    status: 'Pending',
    description: 'The reading room AC is not cooling properly in the afternoon.',
    adminRemarks: 'Request received and under review.',
    departmentRemarks: 'No department remarks yet.'
  },
  {
    id: 'CC-1003',
    title: 'Water leakage near staircase',
    category: 'Maintenance',
    priority: 'Urgent',
    date: '2026-06-29',
    status: 'Resolved',
    description: 'Water leakage near block B staircase made the floor slippery.',
    adminRemarks: 'Marked urgent due to safety concern.',
    departmentRemarks: 'Leakage repaired and area cleaned.'
  },
  {
    id: 'CC-1004',
    title: 'Exam hall seating confusion',
    category: 'Examination',
    priority: 'Low',
    date: '2026-06-25',
    status: 'Rejected',
    description: 'Seating chart was unclear outside the exam hall.',
    adminRemarks: 'Duplicate complaint. Updated notice has already been shared.',
    departmentRemarks: 'No further action needed.'
  }
];

const statusOptions = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const categoryOptions = ['All', 'Maintenance', 'IT Support', 'Library', 'Examination', 'Administration', 'Other'];

const summaryConfig = [
  { label: 'Total Complaints', status: 'All', icon: ClipboardList, tone: 'blue' },
  { label: 'Pending', status: 'Pending', icon: Clock3, tone: 'warning' },
  { label: 'In Progress', status: 'In Progress', icon: Timer, tone: 'cyan' },
  { label: 'Resolved', status: 'Resolved', icon: CheckCircle2, tone: 'success' }
];

function getBadgeClass(type, value) {
  return `track-badge ${type}-${value.toLowerCase().replaceAll(' ', '-')}`;
}

function MyComplaints() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const filteredComplaints = useMemo(() => {
    return sampleComplaints.filter((complaint) => {
      const matchesSearch = complaint.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesStatus = statusFilter === 'All' || complaint.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || complaint.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchText, statusFilter, categoryFilter]);

  const getSummaryCount = (status) => {
    if (status === 'All') {
      return sampleComplaints.length;
    }

    return sampleComplaints.filter((complaint) => complaint.status === status).length;
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
          <p>Static tracking preview for your submitted complaint history.</p>
        </div>

        {filteredComplaints.length > 0 ? (
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
                  <tr key={complaint.id}>
                    <td>{complaint.id}</td>
                    <td>{complaint.title}</td>
                    <td>{complaint.category}</td>
                    <td>
                      <span className={getBadgeClass('priority', complaint.priority)}>{complaint.priority}</span>
                    </td>
                    <td>{complaint.date}</td>
                    <td>
                      <span className={getBadgeClass('status', complaint.status)}>{complaint.status}</span>
                    </td>
                    <td>
                      <button className="track-action-button" onClick={() => setSelectedComplaint(complaint)} type="button">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
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
                <h2>{selectedComplaint.title}</h2>
              </div>
              <button className="track-close-button" onClick={() => setSelectedComplaint(null)} type="button">
                <X size={19} />
              </button>
            </div>

            <div className="track-detail-grid">
              <p><span>Description</span>{selectedComplaint.description}</p>
              <p><span>Category</span>{selectedComplaint.category}</p>
              <p><span>Priority</span>{selectedComplaint.priority}</p>
              <p><span>Status</span>{selectedComplaint.status}</p>
              <p><span>Submitted date</span>{selectedComplaint.date}</p>
              <p><span>Admin remarks</span>{selectedComplaint.adminRemarks}</p>
              <p><span>Department remarks</span>{selectedComplaint.departmentRemarks}</p>
            </div>

            <button className="complaint-submit-button" onClick={() => setSelectedComplaint(null)} type="button">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatedPage>
  );
}

export default MyComplaints;
