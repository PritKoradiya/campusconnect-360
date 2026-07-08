import { useEffect, useState } from 'react';
import { Bell, Bot, CalendarDays, CheckCircle2, Clock3, ClipboardList, PackageSearch, UserCog, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getAdminDashboard } from '../../services/dashboardService';

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

  return item?.title || item?.name || item?.subject || item?.description || fallback;
};

const getStudentName = (complaint) => {
  return complaint?.student?.name || complaint?.studentName || complaint?.user?.name || complaint?.createdBy?.name || 'Student';
};

const getDepartmentName = (complaint) => {
  return complaint?.department?.name || complaint?.departmentName || complaint?.department || 'Department';
};

function AdminDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAdminDashboard = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await getAdminDashboard();
        setDashboardData(response.data || {});
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response?.status === 403) {
          setError('You are not allowed to access Admin Dashboard.');
        } else {
          setError('Unable to load admin dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadAdminDashboard();
  }, []);

  const recentComplaints = Array.isArray(dashboardData.recentComplaints) ? dashboardData.recentComplaints : [];
  const recentUsers = Array.isArray(dashboardData.recentUsers) ? dashboardData.recentUsers : [];

  const summaryCards = [
    { label: 'Total Users', value: getCountValue(dashboardData.totalUsers), icon: Users, tone: 'blue' },
    { label: 'Total Complaints', value: getCountValue(dashboardData.totalComplaints), icon: ClipboardList, tone: 'cyan' },
    { label: 'Pending Complaints', value: getCountValue(dashboardData.pendingComplaints), icon: Clock3, tone: 'warning' },
    { label: 'Resolved Complaints', value: getCountValue(dashboardData.resolvedComplaints), icon: CheckCircle2, tone: 'success' },
    { label: 'Notices', value: getCountValue(dashboardData.activeNotices ?? dashboardData.totalNotices), icon: Bell, tone: 'blue' },
    { label: 'Events', value: getCountValue(dashboardData.activeEvents ?? dashboardData.totalEvents), icon: CalendarDays, tone: 'cyan' }
  ];

  if (dashboardData.totalStudents !== undefined) {
    summaryCards.push({ label: 'Total Students', value: getCountValue(dashboardData.totalStudents), icon: Users, tone: 'blue' });
  }

  if (dashboardData.totalDepartmentUsers !== undefined) {
    summaryCards.push({ label: 'Department Users', value: getCountValue(dashboardData.totalDepartmentUsers), icon: UserCog, tone: 'cyan' });
  }

  if (dashboardData.openLostFoundItems !== undefined) {
    summaryCards.push({ label: 'Open Lost & Found', value: getCountValue(dashboardData.openLostFoundItems), icon: PackageSearch, tone: 'warning' });
  }

  if (dashboardData.totalChatbotQuestions !== undefined) {
    summaryCards.push({ label: 'Chatbot Questions', value: getCountValue(dashboardData.totalChatbotQuestions), icon: Bot, tone: 'blue' });
  }

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Admin Control</p>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.name || 'Admin'}. Monitor users, complaints, notices, events, and department activity.</p>
        </div>
        <span className="dashboard-role-pill">Admin View</span>
      </AnimatedCard>

      {loading && (
        <AnimatedCard className="dashboard-panel" delay={0.08} hover={false}>
          <p>Loading admin dashboard...</p>
        </AnimatedCard>
      )}

      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.08} hover={false}>
          <div className="dashboard-section-heading">
            <h2>{error}</h2>
            <p>Admin dashboard data will appear here when access is available.</p>
          </div>
        </AnimatedCard>
      )}

      <div className="dashboard-grid dashboard-admin-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedCard className={`dashboard-stat-card tone-${card.tone}`} delay={0.1 + index * 0.07} key={card.label}>
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

      <AnimatedCard className="dashboard-panel" delay={0.32} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Recent Complaints</h2>
          <p>Latest complaint activity across campus departments.</p>
        </div>
        <div className="dashboard-table dashboard-table-wide">
          <div className="dashboard-table-row dashboard-table-head">
            <span>Complaint</span>
            <span>Student</span>
            <span>Department</span>
            <span>Status</span>
          </div>
          {recentComplaints.length > 0 ? (
            recentComplaints.map((complaint, index) => (
              <div className="dashboard-table-row" key={complaint?._id || complaint?.id || `${getItemText(complaint)}-${index}`}>
                <span>{getItemText(complaint, 'Complaint request')}</span>
                <span>{getStudentName(complaint)}</span>
                <span>{getDepartmentName(complaint)}</span>
                <span className="dashboard-status">{complaint?.status || 'Submitted'}</span>
              </div>
            ))
          ) : (
            <div className="dashboard-table-row">
              <span>No recent complaints available.</span>
              <span>-</span>
              <span>-</span>
              <span className="dashboard-status">Empty</span>
            </div>
          )}
        </div>
      </AnimatedCard>

      <AnimatedCard className="dashboard-panel" delay={0.4} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Recent Users</h2>
          <p>Newest accounts added to CampusConnect 360.</p>
        </div>
        <div className="dashboard-table">
          {recentUsers.length > 0 ? (
            recentUsers.map((recentUser, index) => (
              <div className="dashboard-table-row" key={recentUser?._id || recentUser?.id || `${recentUser?.email}-${index}`}>
                <span>
                  {recentUser?.name || 'User'} - {recentUser?.email || 'No email available'}
                </span>
                <span className="dashboard-status">{recentUser?.role || 'User'}</span>
              </div>
            ))
          ) : (
            <div className="dashboard-table-row">
              <span>No recent users available.</span>
              <span className="dashboard-status">Empty</span>
            </div>
          )}
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default AdminDashboard;
