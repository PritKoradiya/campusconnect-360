import { Building2, Clock3, MessageSquareText } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';

function DepartmentRemarks() {
  const { user } = useAuth();

  return (
    <AnimatedPage>
      {/* Page Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">DEPARTMENT DESK</p>
          <h1>Department Remarks</h1>
          <p>Record notes, progress updates, and resolution explanations for students and administrators.</p>
        </div>
        <div className="admin-header-actions">
          <span className="dashboard-role-pill">
            <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
            {user?.department ? `${user.department}` : 'Department User'}
          </span>
        </div>
      </AnimatedCard>

      {/* Section Placeholder Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.1} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Remarks & Feedback Workflow</h2>
          <p>Add official department notes and resolution commentary.</p>
        </div>

        <div className="track-empty-state" style={{ padding: '48px 24px', margin: '24px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '16px',
              background: 'rgba(34, 211, 238, 0.12)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              color: '#22d3ee'
            }}
          >
            <MessageSquareText size={32} />
          </div>
          <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe', fontSize: '17px' }}>
            Department Remarks Module
          </p>
          <p style={{ margin: '8px auto 0', maxWidth: '480px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
            This section will contain the dedicated remarks and commentary workflow for department complaints.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Clock3 size={14} />
            <span>Scheduled for dedicated implementation step</span>
          </div>
        </div>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default DepartmentRemarks;
