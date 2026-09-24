import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  FilePlus,
  PackageSearch,
  Search,
  Timer,
  UserCheck,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getStudentDashboard } from '../../services/dashboardService';
import { getStudentActivityFeed } from '../../services/activityService';

const quickActions = [
  { label: 'Raise Complaint', description: 'Create a new campus service request.', icon: FilePlus },
  { label: 'Track Complaint', description: 'Check status and department remarks.', icon: Search },
  { label: 'View Notices', description: 'Read latest campus announcements.', icon: Bell },
  { label: 'Ask AI Chatbot', description: 'Get quick help for common questions.', icon: Bot }
];

const getItemText = (item, fallback = 'Untitled') => {
  if (typeof item === 'string') {
    return item;
  }

  return item?.title || item?.name || item?.message || item?.description || fallback;
};

const getComplaintStatus = (complaint) => {
  if (typeof complaint === 'string') {
    return 'Submitted';
  }

  return complaint?.status || 'Submitted';
};

const getEventDetail = (event) => {
  if (typeof event === 'string') {
    return '';
  }

  return event?.date || event?.eventDate || event?.time || '';
};

const getCountValue = (value) => {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value ?? 0;
};

function StudentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({});
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStudentDashboard = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [dashRes, actRes] = await Promise.all([
          getStudentDashboard(),
          getStudentActivityFeed({ limit: 4 }).catch(() => ({ data: { data: { activities: [] } } }))
        ]);

        const summaryData = dashRes.data?.summary || dashRes.data?.data || dashRes.data || {};
        setDashboardData(summaryData);

        const feedData = actRes.data?.data?.activities || actRes.data?.activities || [];
        setRecentActivities(feedData);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else {
          setError('Unable to load dashboard data. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadStudentDashboard();
  }, []);

  const recentNotices = Array.isArray(dashboardData.recentNotices) ? dashboardData.recentNotices : [];
  const recentComplaints = Array.isArray(dashboardData.recentComplaints) ? dashboardData.recentComplaints : [];
  const upcomingEvents = Array.isArray(dashboardData.upcomingEvents) ? dashboardData.upcomingEvents : [];

  const summaryCards = [
    { label: 'Total Complaints', value: getCountValue(dashboardData.totalComplaints), icon: ClipboardList, tone: 'blue' },
    { label: 'Pending', value: getCountValue(dashboardData.pendingComplaints), icon: Clock3, tone: 'warning' },
    { label: 'In Progress', value: getCountValue(dashboardData.inProgressComplaints), icon: Timer, tone: 'cyan' },
    { label: 'Resolved', value: getCountValue(dashboardData.resolvedComplaints), icon: CheckCircle2, tone: 'success' }
  ];

  if (dashboardData.rejectedComplaints !== undefined) {
    summaryCards.push({ label: 'Rejected Complaints', value: getCountValue(dashboardData.rejectedComplaints), icon: XCircle, tone: 'danger' });
  }

  if (dashboardData.myLostFoundItems !== undefined) {
    summaryCards.push({ label: 'Lost & Found Items', value: getCountValue(dashboardData.myLostFoundItems), icon: PackageSearch, tone: 'cyan' });
  }

  if (dashboardData.chatbotQuestions !== undefined) {
    summaryCards.push({ label: 'Chatbot Questions', value: getCountValue(dashboardData.chatbotQuestions), icon: Bot, tone: 'blue' });
  }

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Student Portal</p>
          <h1>Student Dashboard</h1>
          <p>Welcome back, {user?.name || 'Student'}. Track campus support, notices, events, and services from one place.</p>
        </div>
        <span className="dashboard-role-pill">Student View</span>
      </AnimatedCard>

      {loading && (
        <AnimatedCard className="dashboard-panel" delay={0.08} hover={false}>
          <p>Loading student dashboard...</p>
        </AnimatedCard>
      )}

      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.08} hover={false}>
          <div className="dashboard-section-heading">
            <h2>{error}</h2>
            <p>Your dashboard will stay available here once the session is active.</p>
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

      <div className="dashboard-section">
        <div className="dashboard-section-heading">
          <h2>Quick Actions</h2>
          <p>Common student tasks for the next feature steps.</p>
        </div>
        <div className="dashboard-grid dashboard-action-grid">
          {quickActions.map((action, index) => {
            const Icon = action.icon;

            return (
              <AnimatedCard className="dashboard-action-card" delay={0.2 + index * 0.08} key={action.label}>
                <span className="dashboard-card-icon">
                  <Icon size={22} />
                </span>
                <h3>{action.label}</h3>
                <p>{action.description}</p>
              </AnimatedCard>
            );
          })}
        </div>
      </div>

      <div className="dashboard-grid dashboard-two-column">
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
          <div className="dashboard-section-heading">
            <h2>Recent Notices</h2>
            <p>Latest campus updates will appear here.</p>
          </div>
          <ul className="dashboard-list">
            {recentNotices.length > 0 ? (
              recentNotices.map((notice, index) => (
                <li key={notice?._id || notice?.id || `${getItemText(notice)}-${index}`}>
                  <Bell size={17} />
                  <span>{getItemText(notice, 'Notice update')}</span>
                </li>
              ))
            ) : (
              <li>
                <Bell size={17} />
                <span>No recent notices available.</span>
              </li>
            )}
          </ul>
        </AnimatedCard>

        <AnimatedCard className="dashboard-panel" delay={0.36} hover={false}>
          <div className="dashboard-section-heading">
            <h2>Recent Complaints</h2>
            <p>Your latest support requests.</p>
          </div>
          <div className="dashboard-table">
            {recentComplaints.length > 0 ? (
              recentComplaints.map((complaint, index) => (
                <div className="dashboard-table-row" key={complaint?._id || complaint?.id || `${getItemText(complaint)}-${index}`}>
                  <span>{getItemText(complaint, 'Complaint request')}</span>
                  <span className="dashboard-status">{getComplaintStatus(complaint)}</span>
                </div>
              ))
            ) : (
              <div className="dashboard-table-row">
                <span>No complaints submitted yet.</span>
                <span className="dashboard-status">Empty</span>
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>

      <div className="dashboard-grid dashboard-two-column">
        <AnimatedCard className="dashboard-panel" delay={0.44} hover={false}>
          <div className="dashboard-section-heading">
            <h2>Upcoming Events</h2>
            <p>Campus events scheduled for students.</p>
          </div>
          <ul className="dashboard-list">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event, index) => (
                <li key={event?._id || event?.id || `${getItemText(event, 'Event')}-${index}`}>
                  <CalendarDays size={17} />
                  <span>
                    {getItemText(event, 'Campus event')}
                    {getEventDetail(event) && ` - ${getEventDetail(event)}`}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <CalendarDays size={17} />
                <span>No upcoming events available.</span>
              </li>
            )}
          </ul>
        </AnimatedCard>

        <AnimatedCard className="dashboard-panel" delay={0.48} hover={false}>
          <div className="dashboard-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Recent Activity</h2>
              <p>Your latest campus actions and history.</p>
            </div>
            <Link to="/student/activity" className="activity-nav-btn" style={{ textDecoration: 'none' }}>
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="dashboard-list">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <li key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Activity size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.title}
                    </span>
                  </span>
                  <span className="dashboard-status" style={{ fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>
                    {act.sourceType === 'complaint'
                      ? 'Complaint'
                      : act.sourceType === 'event'
                      ? 'Event'
                      : act.sourceType === 'lost_found'
                      ? 'Lost & Found'
                      : 'Profile'}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <Activity size={17} />
                <span>No recent activity recorded yet.</span>
              </li>
            )}
          </ul>
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}

export default StudentDashboard;
