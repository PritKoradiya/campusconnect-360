import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Timer, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getDepartmentDashboard } from '../../services/dashboardService';

const getCountValue = (value) => {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value ?? 0;
};

const getItemText = (item, fallback = 'Untitled') => {
  if (typeof item === 'string') {
    return item;
  }

  return item?.title || item?.subject || item?.description || item?.name || fallback;
};

const getStudentName = (complaint) => {
  return complaint?.student?.name || complaint?.studentName || complaint?.user?.name || complaint?.createdBy?.name || 'Student';
};

const getCreatedDate = (complaint) => {
  const dateValue = complaint?.createdAt || complaint?.createdDate || complaint?.date;

  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toLocaleDateString();
};

function DepartmentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDepartmentDashboard = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await getDepartmentDashboard();
        const summaryData = response.data?.summary || response.data?.data || response.data || {};
        setDashboardData({ ...response.data, ...summaryData });
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You are not allowed to access Department Dashboard.');
        } else {
          setError('Unable to load department dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDepartmentDashboard();
  }, []);

  const recentAssignedComplaints = Array.isArray(dashboardData.recentAssignedComplaints) ? dashboardData.recentAssignedComplaints : [];
  const departmentMessage = dashboardData.message === 'Department is not assigned to this user yet.' ? dashboardData.message : '';

  const summaryCards = [
    { label: 'Assigned Complaints', value: getCountValue(dashboardData.assignedComplaints), icon: ClipboardList, tone: 'blue' },
    { label: 'Pending Complaints', value: getCountValue(dashboardData.pendingComplaints), icon: Clock3, tone: 'warning' },
    { label: 'In Progress', value: getCountValue(dashboardData.inProgressComplaints), icon: Timer, tone: 'cyan' },
    { label: 'Resolved', value: getCountValue(dashboardData.resolvedComplaints), icon: CheckCircle2, tone: 'success' },
    { label: 'Rejected', value: getCountValue(dashboardData.rejectedComplaints), icon: XCircle, tone: 'danger' },
    { label: 'Urgent Complaints', value: getCountValue(dashboardData.urgentComplaints), icon: AlertTriangle, tone: 'danger' }
  ];

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Department Desk</p>
          <h1>Department Dashboard</h1>
          <p>Welcome back, {user?.name || 'Department User'}. Review assigned complaints, update progress, and prepare remarks.</p>
        </div>
        <span className="dashboard-role-pill">Department View</span>
      </AnimatedCard>

      {loading && (
        <AnimatedCard className="dashboard-panel" delay={0.08} hover={false}>
          <p>Loading department dashboard...</p>
        </AnimatedCard>
      )}

      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.08} hover={false}>
          <div className="dashboard-section-heading">
            <h2>{error}</h2>
            <p>Department dashboard data will appear here when access is available.</p>
          </div>
        </AnimatedCard>
      )}

      {departmentMessage && (
        <AnimatedCard className="dashboard-panel tone-warning" delay={0.12} hover={false}>
          <div className="dashboard-section-heading">
            <h2>{departmentMessage}</h2>
            <p>Please contact an admin to assign your department.</p>
          </div>
        </AnimatedCard>
      )}

      <div className="dashboard-grid dashboard-summary-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedCard className={`dashboard-stat-card tone-${card.tone}`} delay={0.1 + index * 0.08} key={card.label}>
              <span className="dashboard-card-icon">
                <Icon size={22} />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      <AnimatedCard className="dashboard-panel" delay={0.3} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Recent Assigned Complaints</h2>
          <p>Latest complaints assigned to your department.</p>
        </div>
        <div className="dashboard-table dashboard-table-wide">
          <div className="dashboard-table-row dashboard-table-head">
            <span>Complaint</span>
            <span>Student</span>
            <span>Priority</span>
            <span>Status</span>
          </div>
          {recentAssignedComplaints.length > 0 ? (
            recentAssignedComplaints.map((complaint, index) => (
              <div className="dashboard-table-row" key={complaint?._id || complaint?.id || `${getItemText(complaint)}-${index}`}>
                <span>
                  {getItemText(complaint, 'Complaint request')}
                  {getCreatedDate(complaint) && ` - ${getCreatedDate(complaint)}`}
                </span>
                <span>{getStudentName(complaint)}</span>
                <span>{complaint?.priority || 'Normal'}</span>
                <span className="dashboard-status">{complaint?.status || 'Assigned'}</span>
              </div>
            ))
          ) : (
            <div className="dashboard-table-row">
              <span>No assigned complaints available.</span>
              <span>-</span>
              <span>-</span>
              <span className="dashboard-status">Empty</span>
            </div>
          )}
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default DepartmentDashboard;
