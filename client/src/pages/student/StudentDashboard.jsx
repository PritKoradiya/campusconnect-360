import { Bell, Bot, CheckCircle2, Clock3, ClipboardList, FilePlus, Search, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const summaryCards = [
  { label: 'Total Complaints', value: '12', icon: ClipboardList, tone: 'blue' },
  { label: 'Pending', value: '4', icon: Clock3, tone: 'warning' },
  { label: 'In Progress', value: '5', icon: Timer, tone: 'cyan' },
  { label: 'Resolved', value: '3', icon: CheckCircle2, tone: 'success' }
];

const quickActions = [
  { label: 'Raise Complaint', description: 'Create a new campus service request.', icon: FilePlus },
  { label: 'Track Complaint', description: 'Check status and department remarks.', icon: Search },
  { label: 'View Notices', description: 'Read latest campus announcements.', icon: Bell },
  { label: 'Ask AI Chatbot', description: 'Get quick help for common questions.', icon: Bot }
];

const recentNotices = ['Library timing updated for exam week', 'Tech fest registration opens soon', 'Hostel maintenance window on Friday'];

const recentComplaints = [
  { title: 'Classroom projector issue', status: 'In Progress' },
  { title: 'Water cooler repair', status: 'Pending' },
  { title: 'ID card reprint request', status: 'Resolved' }
];

function StudentDashboard() {
  const { user } = useAuth();

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Student Portal</p>
          <h1>Student Dashboard</h1>
          <p>Welcome back, {user?.name || 'Student'}. Track campus support, notices, events, and services from one place.</p>
        </div>
        <span className="dashboard-role-pill">Student View</span>
      </div>

      <div className="dashboard-grid dashboard-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article className={`dashboard-stat-card tone-${card.tone}`} key={card.label}>
              <span className="dashboard-card-icon">
                <Icon size={22} />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section-heading">
          <h2>Quick Actions</h2>
          <p>Common student tasks for the next feature steps.</p>
        </div>
        <div className="dashboard-grid dashboard-action-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <article className="dashboard-action-card" key={action.label}>
                <span className="dashboard-card-icon">
                  <Icon size={22} />
                </span>
                <h3>{action.label}</h3>
                <p>{action.description}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="dashboard-grid dashboard-two-column">
        <article className="dashboard-panel">
          <div className="dashboard-section-heading">
            <h2>Recent Notices</h2>
            <p>Latest campus updates will appear here.</p>
          </div>
          <ul className="dashboard-list">
            {recentNotices.map((notice) => (
              <li key={notice}>
                <Bell size={17} />
                <span>{notice}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-section-heading">
            <h2>Recent Complaints</h2>
            <p>Your latest support requests.</p>
          </div>
          <div className="dashboard-table">
            {recentComplaints.map((complaint) => (
              <div className="dashboard-table-row" key={complaint.title}>
                <span>{complaint.title}</span>
                <span className="dashboard-status">{complaint.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export default StudentDashboard;
