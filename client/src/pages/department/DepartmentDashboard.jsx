import { AlertTriangle, CheckCircle2, ClipboardList, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';

const summaryCards = [
  { label: 'Assigned Complaints', value: '34', icon: ClipboardList, tone: 'blue' },
  { label: 'In Progress', value: '12', icon: Timer, tone: 'cyan' },
  { label: 'Resolved', value: '19', icon: CheckCircle2, tone: 'success' },
  { label: 'Urgent Complaints', value: '3', icon: AlertTriangle, tone: 'danger' }
];

const assignedComplaints = [
  { id: 'CC-201', title: 'Projector not working', priority: 'High', status: 'In Progress' },
  { id: 'CC-198', title: 'Classroom fan repair', priority: 'Medium', status: 'Assigned' },
  { id: 'CC-196', title: 'Lab chair replacement', priority: 'Low', status: 'Resolved' },
  { id: 'CC-192', title: 'Water leakage near block B', priority: 'High', status: 'Pending' }
];

function DepartmentDashboard() {
  const { user } = useAuth();

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
          <p>Static preview for department workflow screens.</p>
        </div>
        <div className="dashboard-table dashboard-table-wide">
          <div className="dashboard-table-row dashboard-table-head">
            <span>ID</span>
            <span>Complaint</span>
            <span>Priority</span>
            <span>Status</span>
          </div>
          {assignedComplaints.map((complaint) => (
            <div className="dashboard-table-row" key={complaint.id}>
              <span>{complaint.id}</span>
              <span>{complaint.title}</span>
              <span>{complaint.priority}</span>
              <span className="dashboard-status">{complaint.status}</span>
            </div>
          ))}
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default DepartmentDashboard;
