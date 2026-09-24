import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Award,
  CalendarCheck,
  CheckCircle2,
  Compass,
  FileText,
  HeartHandshake,
  Lock,
  MessageSquareText,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getMyAchievements } from '../../services/achievementService';

// Icon mapping helper
const ICON_COMPONENTS = {
  FileText,
  CheckCircle2,
  MessageSquareText,
  Compass,
  CalendarCheck,
  Trophy,
  HeartHandshake,
  Search,
  UserCheck,
  Award
};

function formatUnlockDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

function StudentAchievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, UNLOCKED, LOCKED
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  const fetchAchievements = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const res = await getMyAchievements();
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load achievements');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAchievements(false);
  }, []);

  const summary = data?.summary || { total: 0, unlocked: 0, locked: 0 };
  const allAchievements = data?.achievements || [];

  const filteredAchievements = useMemo(() => {
    if (filterTab === 'UNLOCKED') {
      return allAchievements.filter((a) => a.isUnlocked);
    }
    if (filterTab === 'LOCKED') {
      return allAchievements.filter((a) => !a.isUnlocked);
    }
    return allAchievements;
  }, [allAchievements, filterTab]);

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.04} hover={false}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="live-status-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
              <Award size={13} />
              MILESTONES
            </span>
            <p className="dashboard-kicker" style={{ margin: 0 }}>Student Recognition</p>
          </div>
          <h1>Student Achievements</h1>
          <p>Celebrate your milestones across CampusConnect 360.</p>
        </div>

        <div className="admin-header-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Refresh Button */}
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchAchievements(true)}
            title="Refresh achievements"
            type="button"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              style={{ display: 'inline-flex' }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
            >
              <RotateCcw size={16} />
            </motion.span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Global Error Banner */}
      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.06} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle color="#f87171" size={22} />
              <div>
                <strong style={{ color: '#ffffff' }}>{error}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#fca5a5' }}>
                  Please verify connection and retry.
                </p>
              </div>
            </div>
            <button
              className="complaint-submit-button"
              onClick={() => fetchAchievements(true)}
              style={{ minHeight: '34px', padding: '0 14px', fontSize: '12.5px' }}
              type="button"
            >
              <RefreshCcw size={14} style={{ marginRight: '6px' }} />
              Retry
            </button>
          </div>
        </AnimatedCard>
      )}

      {/* Milestone Overview Progress Card */}
      {!loading && (
        <AnimatedCard className="dashboard-panel" delay={0.08} hover={false} style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles color="#22d3ee" size={18} />
                Milestone Progress
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                <strong>{summary.unlocked}</strong> of <strong>{summary.total}</strong> milestones completed
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="track-badge status-resolved" style={{ fontSize: '12px', padding: '3px 10px' }}>
                {summary.unlocked} Unlocked
              </span>
              <span className="track-badge status-pending" style={{ fontSize: '12px', padding: '3px 10px' }}>
                {summary.locked} Locked
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="analytics-bar-track" style={{ height: '8px', marginTop: '14px' }}>
            <div
              className="analytics-bar-fill"
              style={{
                width: `${summary.total > 0 ? Math.round((summary.unlocked / summary.total) * 100) : 0}%`,
                background: 'linear-gradient(90deg, #2563eb, #22d3ee)'
              }}
            />
          </div>
        </AnimatedCard>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
        {[
          { label: `All (${summary.total})`, value: 'ALL' },
          { label: `Unlocked (${summary.unlocked})`, value: 'UNLOCKED' },
          { label: `Locked (${summary.locked})`, value: 'LOCKED' }
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`satisfaction-filter-btn ${filterTab === tab.value ? 'active' : ''}`}
            onClick={() => setFilterTab(tab.value)}
            style={{ padding: '6px 14px', fontSize: '13px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Achievements Cards Grid */}
      {loading ? (
        <div className="dashboard-grid dashboard-admin-grid" style={{ marginTop: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div className="dashboard-stat-card tone-blue" key={idx} style={{ opacity: 0.6 }}>
              <div className="chatbot-loading-spinner" style={{ margin: '20px auto' }} />
            </div>
          ))}
        </div>
      ) : filteredAchievements.length === 0 ? (
        <div className="track-empty-state" style={{ marginTop: '24px', padding: '36px 20px' }}>
          <Award size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#e2e8f0', fontSize: '16px' }}>
            {filterTab === 'UNLOCKED'
              ? 'No achievements unlocked yet.'
              : 'No achievements match this filter.'}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            Complete activities across CampusConnect 360 to unlock milestones.
          </p>
        </div>
      ) : (
        <div className="achievements-card-grid" style={{ marginTop: '20px' }}>
          {filteredAchievements.map((item, index) => {
            const IconComponent = ICON_COMPONENTS[item.icon] || Award;
            const unlockDateFormatted = formatUnlockDate(item.unlockedAt);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <div
                  className={`achievement-badge-card ${item.isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => setSelectedAchievement(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedAchievement(item)}
                >
                  <div className="achievement-card-top">
                    <span className={`achievement-icon-box ${item.isUnlocked ? 'unlocked' : 'locked'}`}>
                      {item.isUnlocked ? <IconComponent size={24} /> : <Lock size={20} />}
                    </span>

                    <span
                      className={`track-badge ${item.isUnlocked ? 'status-resolved' : 'status-pending'}`}
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      {item.isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                    </span>
                  </div>

                  <div className="achievement-card-body">
                    <span className="achievement-category-tag">{item.category}</span>
                    <h3 className="achievement-title">{item.title}</h3>
                    <p className="achievement-desc">{item.description}</p>
                  </div>

                  {/* Progress or Unlock Date Footer */}
                  <div className="achievement-card-footer">
                    {item.isUnlocked ? (
                      <span className="achievement-footer-date">
                        {unlockDateFormatted ? `Unlocked on ${unlockDateFormatted}` : 'Milestone achieved'}
                      </span>
                    ) : item.progress ? (
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                          <span>Progress</span>
                          <span><strong>{item.progress.current}</strong> / {item.progress.required} {item.progress.unit}</span>
                        </div>
                        <div className="analytics-bar-track" style={{ height: '6px' }}>
                          <div
                            className="analytics-bar-fill"
                            style={{
                              width: `${Math.round((item.progress.current / item.progress.required) * 100)}%`,
                              background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="achievement-footer-status">Complete milestone to unlock</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <div className="track-modal-backdrop" onClick={() => setSelectedAchievement(null)}>
            <motion.div
              className="track-modal-card"
              style={{ maxWidth: '480px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="track-modal-heading">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    className={`achievement-icon-box ${selectedAchievement.isUnlocked ? 'unlocked' : 'locked'}`}
                    style={{ width: '42px', height: '42px' }}
                  >
                    {(() => {
                      const IconComp = ICON_COMPONENTS[selectedAchievement.icon] || Award;
                      return selectedAchievement.isUnlocked ? <IconComp size={22} /> : <Lock size={20} />;
                    })()}
                  </span>
                  <div>
                    <span className="achievement-category-tag" style={{ fontSize: '11px' }}>
                      {selectedAchievement.category}
                    </span>
                    <h3 style={{ margin: '2px 0 0', color: '#ffffff', fontSize: '18px' }}>
                      {selectedAchievement.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  className="track-close-button"
                  onClick={() => setSelectedAchievement(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginTop: '16px', display: 'grid', gap: '14px' }}>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px', lineHeight: 1.5 }}>
                  {selectedAchievement.description}
                </p>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(8, 24, 39, 0.7)',
                    border: '1px solid rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Status:</span>
                  <span
                    className={`track-badge ${selectedAchievement.isUnlocked ? 'status-resolved' : 'status-pending'}`}
                    style={{ fontSize: '12px' }}
                  >
                    {selectedAchievement.isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                  </span>
                </div>

                {selectedAchievement.isUnlocked && selectedAchievement.unlockedAt && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(8, 24, 39, 0.7)',
                      border: '1px solid rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Unlocked Date:</span>
                    <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 600 }}>
                      {formatUnlockDate(selectedAchievement.unlockedAt)}
                    </span>
                  </div>
                )}

                {selectedAchievement.progress && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(8, 24, 39, 0.7)',
                      border: '1px solid rgba(56, 189, 248, 0.15)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                      <span>Requirement Progress:</span>
                      <strong style={{ color: '#ffffff' }}>
                        {selectedAchievement.progress.current} / {selectedAchievement.progress.required} {selectedAchievement.progress.unit}
                      </strong>
                    </div>
                    <div className="analytics-bar-track" style={{ height: '7px' }}>
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${Math.round((selectedAchievement.progress.current / selectedAchievement.progress.required) * 100)}%`,
                          background: selectedAchievement.isUnlocked
                            ? 'linear-gradient(90deg, #10b981, #22d3ee)'
                            : 'linear-gradient(90deg, #d97706, #fbbf24)'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="complaint-submit-button"
                  style={{ minHeight: '36px', padding: '0 18px', fontSize: '13px' }}
                  onClick={() => setSelectedAchievement(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default StudentAchievements;
