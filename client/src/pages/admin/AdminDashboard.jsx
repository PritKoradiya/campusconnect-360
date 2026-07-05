import { Bell, CalendarDays, CheckCircle2, Clock3, ClipboardList, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';

const summaryCards = [
  { label: 'Total Users', value: '248', icon: Users, tone: 'blue' },
  { label: 'Total Complaints', value: '86', icon: ClipboardList, tone: 'cyan' },
  { label: 'Pending Complaints', value: '21', icon: Clock3, tone: 'warning' },
  { label: 'Resolved Complaints', value: '52', icon: CheckCircle2, tone: 'success' },
  { label: 'Notices', value: '18', icon: Bell, tone: 'blue' },
  { label: 'Events', value: '7', icon: CalendarDays, tone: 'cyan' }
];

const recentComplaints = [
  { id: 'CC-1024', title: 'Lab network outage', department: 'Computer', status: 'Pending' },
  { id: 'CC-1023', title: 'Hostel light repair', department: 'Maintenance', status: 'In Progress' },
  { id: 'CC-1022', title: 'Canteen hygiene feedback', department: 'Admin', status: 'Resolved' },
  { id: 'CC-1021', title: 'Library seat request', department: 'Library', status: 'Pending' }
];

function AdminDashboard() {
  const { user } = useAuth();

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
          <p>Static preview for the upcoming complaint management module.</p>
        </div>
        <div className="dashboard-table dashboard-table-wide">
          <div className="dashboard-table-row dashboard-table-head">
            <span>ID</span>
            <span>Complaint</span>
            <span>Department</span>
            <span>Status</span>
          </div>
          {recentComplaints.map((complaint) => (
            <div className="dashboard-table-row" key={complaint.id}>
              <span>{complaint.id}</span>
              <span>{complaint.title}</span>
              <span>{complaint.department}</span>
              <span className="dashboard-status">{complaint.status}</span>
            </div>
          ))}
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default AdminDashboard;
