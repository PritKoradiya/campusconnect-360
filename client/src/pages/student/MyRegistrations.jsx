import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock3,
  ExternalLink,
  MapPin,
  RotateCw,
  Search,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { cancelEventRegistration, getMyRegistrations } from '../../services/eventService';

const FILTER_TABS = [
  { id: 'all', label: 'All Registrations' },
  { id: 'upcoming', label: 'Upcoming Events' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' }
];

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function formatDateTime(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleString();
  } catch {
    return 'Not available';
  }
}

function isEventUpcoming(dateValue) {
  if (!dateValue) return false;
  try {
    const d = new Date(dateValue);
    d.setHours(23, 59, 59, 999);
    return d >= new Date();
  } catch {
    return false;
  }
}

function MyRegistrations() {
  const navigate = useNavigate();

  const [registrations, setRegistrations] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    registered: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedReg, setSelectedReg] = useState(null);
  const [regToCancel, setRegToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const fetchRegistrations = async (isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const res = await getMyRegistrations();
      if (res.data) {
        setRegistrations(res.data.registrations || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load your registrations');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  // Filter and Search logic
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const event = reg.event || {};
      const isUpcoming = isEventUpcoming(event.eventDate);
      const isCancelled = reg.status === 'CANCELLED';
      const isActive = reg.status === 'REGISTERED';

      // Tab filter
      if (activeTab === 'upcoming' && (!isActive || !isUpcoming)) {
        return false;
      }
      if (activeTab === 'completed' && (!isActive || isUpcoming)) {
        return false;
      }
      if (activeTab === 'cancelled' && !isCancelled) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (event.title || '').toLowerCase();
        const venue = (event.venue || '').toLowerCase();
        const dept = (event.department || '').toLowerCase();
        const org = (event.organizer || '').toLowerCase();

        if (!title.includes(q) && !venue.includes(q) && !dept.includes(q) && !org.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [registrations, activeTab, searchQuery]);

  // Open Cancel Modal
  const handleOpenCancelModal = (reg) => {
    setCancelError('');
    setRegToCancel(reg);
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!regToCancel) return;
    const eventId = regToCancel.event?._id || regToCancel.event?.id || regToCancel.event;
    if (!eventId) return;

    try {
      setCancelling(true);
      setCancelError('');

      await cancelEventRegistration(eventId);

      // Immediately update local state
      setRegistrations((prev) =>
        prev.map((r) => {
          if (r._id === regToCancel._id) {
            return {
              ...r,
              status: 'CANCELLED',
              cancelledAt: new Date().toISOString()
            };
          }
          return r;
        })
      );

      // Re-calculate summary
      setSummary((prev) => ({
        ...prev,
        registered: Math.max(0, prev.registered - 1),
        upcoming: isEventUpcoming(regToCancel.event?.eventDate) ? Math.max(0, prev.upcoming - 1) : prev.upcoming,
        cancelled: prev.cancelled + 1
      }));

      if (selectedReg && selectedReg._id === regToCancel._id) {
        setSelectedReg((prev) => ({
          ...prev,
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString()
        }));
      }

      setSuccess(`Registration for "${regToCancel.event?.title || 'Event'}" has been cancelled.`);
      setRegToCancel(null);
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AnimatedPage>
      {/* 1. Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">My Activity</p>
          <h1>My Registrations</h1>
          <p>View and manage all your registered campus events, workshops, and schedules.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="admin-btn-primary"
            onClick={() => navigate('/student/events')}
            type="button"
          >
            <CalendarDays size={16} />
            <span>Browse Events</span>
          </button>
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchRegistrations(true)}
            title="Refresh registrations"
            type="button"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              style={{ display: 'inline-flex' }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
            >
              <RotateCw size={15} />
            </motion.span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* 2. Global Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-success"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
            style={{ marginBottom: '16px' }}
          >
            <CheckCircle2 size={18} />
            <span>{success}</span>
            <button className="chatbot-alert-close" onClick={() => setSuccess('')} type="button">
              <X size={15} />
            </button>
          </motion.div>
        )}

        {error && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-error"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
            style={{ marginBottom: '16px' }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="chatbot-alert-close" onClick={() => setError('')} type="button">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Summary Statistics Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <CalendarCheck size={22} />
          </span>
          <div>
            <p>Active Registrations</p>
            <strong>{summary.registered}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.12}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Upcoming Events</p>
            <strong>{summary.upcoming}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.16}>
          <span className="dashboard-card-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <p>Completed Events</p>
            <strong>{summary.completed}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.2}>
          <span className="dashboard-card-icon">
            <X size={22} />
          </span>
          <div>
            <p>Cancelled</p>
            <strong>{summary.cancelled}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* 4. Filter Tabs and Search Bar */}
      <AnimatedCard className="track-filter-card" delay={0.24} hover={false}>
        {/* Tabs */}
        <div className="notif-filter-bar" role="tablist" aria-label="Registration status filters">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                aria-selected={isActive}
                className={`notif-filter-pill ${isActive ? 'active' : ''}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                {tab.id === 'upcoming' && summary.upcoming > 0 && (
                  <span className="notif-filter-badge">{summary.upcoming}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="track-search-box" style={{ maxWidth: '320px', marginLeft: 'auto' }}>
          <Search size={17} />
          <input
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, venue, organizer..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </AnimatedCard>

      {/* 5. Main Registration List */}
      {loading && (
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
          Loading your registrations...
        </AnimatedCard>
      )}

      {!loading && registrations.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
          <div className="track-empty-state">
            <CalendarCheck size={40} style={{ color: '#22d3ee', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', color: '#e0f2fe', margin: '0 0 6px' }}>No Event Registrations Yet</h2>
            <p style={{ color: '#94a3b8', maxWidth: '420px', margin: '0 auto 16px' }}>
              You haven&apos;t registered for any campus events yet. Explore upcoming technical workshops, hackathons, and cultural fests!
            </p>
            <button
              className="admin-btn-primary"
              onClick={() => navigate('/student/events')}
              type="button"
            >
              <CalendarDays size={16} />
              <span>Explore Events</span>
            </button>
          </div>
        </AnimatedCard>
      )}

      {!loading && registrations.length > 0 && filteredRegistrations.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ fontWeight: 700, color: '#e0f2fe', margin: '0 0 4px' }}>
              No registrations found matching this filter.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              Try switching tabs or clearing your search keywords.
            </p>
          </div>
        </AnimatedCard>
      )}

      {!loading && filteredRegistrations.length > 0 && (
        <div className="resource-card-grid">
          {filteredRegistrations.map((reg, index) => {
            const event = reg.event || {};
            const isUpcoming = isEventUpcoming(event.eventDate);
            const isCancelled = reg.status === 'CANCELLED';

            return (
              <AnimatedCard
                className="resource-card"
                delay={0.26 + index * 0.05}
                key={reg._id}
              >
                <div className="resource-card-top">
                  <span className="resource-badge event-badge">
                    {event.department || 'Campus Event'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isCancelled ? (
                      <span className="track-badge priority-high" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Cancelled
                      </span>
                    ) : isUpcoming ? (
                      <span className="track-badge status-in-progress" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Upcoming
                      </span>
                    ) : (
                      <span className="track-badge priority-low" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                <h2>{event.title || 'Untitled Event'}</h2>
                <p>{event.description ? (event.description.length > 110 ? `${event.description.slice(0, 110)}...` : event.description) : 'No description available.'}</p>

                <div className="resource-meta">
                  <span>
                    <strong>Event Date:</strong> {formatDate(event.eventDate)}
                  </span>
                  <span>
                    <strong>Time:</strong> {event.eventTime || 'TBD'}
                  </span>
                  <span>
                    <strong>Venue:</strong> {event.venue || 'Campus Venue'}
                  </span>
                  <span>
                    <strong>Registered On:</strong> {formatDate(reg.registeredAt || reg.createdAt)}
                  </span>
                  {isCancelled && reg.cancelledAt && (
                    <span style={{ color: '#f87171' }}>
                      <strong>Cancelled On:</strong> {formatDate(reg.cancelledAt)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button
                    className="track-action-button"
                    onClick={() => setSelectedReg(reg)}
                    style={{ flex: 1, minWidth: '100px' }}
                    type="button"
                  >
                    View Details
                  </button>

                  {!isCancelled && isUpcoming && (
                    <button
                      className="chatbot-clear-btn"
                      onClick={() => handleOpenCancelModal(reg)}
                      style={{ padding: '0 12px', minHeight: '38px' }}
                      title="Cancel this registration"
                      type="button"
                    >
                      <X size={15} />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      )}

      {/* 6. Registration Details Modal */}
      <AnimatePresence>
        {selectedReg && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setSelectedReg(null)}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Registration Summary</p>
                  <h2>{selectedReg.event?.title || 'Event Registration'}</h2>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                    <span
                      className={`track-badge ${
                        selectedReg.status === 'CANCELLED'
                          ? 'priority-high'
                          : isEventUpcoming(selectedReg.event?.eventDate)
                          ? 'status-resolved'
                          : 'priority-low'
                      }`}
                    >
                      {selectedReg.status === 'CANCELLED'
                        ? 'Registration Cancelled'
                        : isEventUpcoming(selectedReg.event?.eventDate)
                        ? 'Confirmed / Upcoming'
                        : 'Event Completed'}
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setSelectedReg(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {selectedReg.event?.imageUrl && (
                <img
                  alt={selectedReg.event?.title || 'Event'}
                  className="resource-modal-image"
                  src={selectedReg.event.imageUrl}
                />
              )}

              <div className="track-detail-grid">
                <p>
                  <span>Event Date</span>
                  {formatDate(selectedReg.event?.eventDate)}
                </p>
                <p>
                  <span>Event Time</span>
                  {selectedReg.event?.eventTime || 'Not specified'}
                </p>
                <p>
                  <span>Venue</span>
                  {selectedReg.event?.venue || 'Campus Venue'}
                </p>
                <p>
                  <span>Department</span>
                  {selectedReg.event?.department || 'General'}
                </p>
                <p>
                  <span>Organizer</span>
                  {selectedReg.event?.organizer || 'Campus Team'}
                </p>
                <p>
                  <span>Registration Status</span>
                  <strong style={{ color: selectedReg.status === 'REGISTERED' ? '#4ade80' : '#f87171' }}>
                    {selectedReg.status}
                  </strong>
                </p>
                <p>
                  <span>Registered At</span>
                  {formatDateTime(selectedReg.registeredAt || selectedReg.createdAt)}
                </p>
                {selectedReg.cancelledAt && (
                  <p>
                    <span>Cancelled At</span>
                    {formatDateTime(selectedReg.cancelledAt)}
                  </p>
                )}
                <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    Event Description
                  </span>
                  <p style={{ color: '#e0f2fe', lineHeight: 1.6, margin: 0 }}>
                    {selectedReg.event?.description || 'No description available for this event.'}
                  </p>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '20px',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  {selectedReg.status === 'REGISTERED' && isEventUpcoming(selectedReg.event?.eventDate) && (
                    <button
                      className="chatbot-clear-btn"
                      onClick={() => {
                        const r = selectedReg;
                        setSelectedReg(null);
                        handleOpenCancelModal(r);
                      }}
                      type="button"
                    >
                      <X size={15} />
                      <span>Cancel Registration</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="admin-btn-primary"
                    onClick={() => {
                      setSelectedReg(null);
                      navigate('/student/events');
                    }}
                    type="button"
                  >
                    <span>Browse All Events</span>
                    <ExternalLink size={14} />
                  </button>

                  <button
                    className="complaint-secondary-button"
                    onClick={() => setSelectedReg(null)}
                    style={{ width: 'auto', minWidth: '90px', margin: 0 }}
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Cancel Registration Confirmation Modal */}
      <AnimatePresence>
        {regToCancel && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => !cancelling && setRegToCancel(null)}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card chatbot-confirm-modal"
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Confirmation</p>
                  <h2>Cancel Event Registration</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  disabled={cancelling}
                  onClick={() => setRegToCancel(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {cancelError && (
                <div
                  className="chatbot-alert chatbot-alert-error"
                  style={{ margin: '12px 0 6px' }}
                >
                  <AlertCircle size={17} />
                  <span>{cancelError}</span>
                </div>
              )}

              <div className="chatbot-confirm-body" style={{ margin: '16px 0' }}>
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171'
                  }}
                >
                  <X size={28} />
                </div>
                <div>
                  <p className="chatbot-confirm-title" style={{ fontSize: '16px' }}>
                    Cancel registration for &quot;{regToCancel.event?.title}&quot;?
                  </p>
                  <p className="chatbot-confirm-desc" style={{ fontSize: '13px', marginTop: '6px' }}>
                    Your seat will be released. You will receive a cancellation notification and can view this record under your Cancelled tab.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={cancelling}
                  onClick={() => setRegToCancel(null)}
                  type="button"
                >
                  Keep Registration
                </button>
                <button
                  className="chatbot-danger-btn"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  type="button"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel Registration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default MyRegistrations;
