import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Search,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  cancelEventRegistration,
  getEventById,
  getEvents,
  registerForEvent
} from '../../services/eventService';

const departmentOptions = ['All', 'Computer Engineering', 'IT', 'Library', 'Administration', 'Other'];

function getList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.events)) {
    return responseData.events;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function getDetails(responseData) {
  return responseData?.event || responseData?.data || responseData;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available';
  }

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

function getDepartment(event) {
  return event?.department?.name || event?.departmentName || event?.department || 'Other';
}

function getOrganizer(event) {
  return event?.organizer?.name || event?.organizerName || event?.organizer || 'Campus Team';
}

function getPreview(text) {
  if (!text) {
    return 'No description available.';
  }

  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function getEventRegistrationState(event) {
  const isPast = (() => {
    if (!event?.eventDate) return false;
    try {
      const d = new Date(event.eventDate);
      d.setHours(23, 59, 59, 999);
      return d < new Date();
    } catch {
      return false;
    }
  })();

  if (isPast) {
    return { status: 'ENDED', label: 'Event Ended', canRegister: false, badgeClass: 'priority-low' };
  }

  if (event?.isRegistrationEnabled === false) {
    return { status: 'UNAVAILABLE', label: 'Registration Unavailable', canRegister: false, badgeClass: 'priority-low' };
  }

  if (event?.registrationDeadline) {
    try {
      const deadline = new Date(event.registrationDeadline);
      if (new Date() > deadline) {
        return { status: 'CLOSED', label: 'Registration Closed', canRegister: false, badgeClass: 'priority-low' };
      }
    } catch {
      // If parsing fails, fall through
    }
  }

  if (event?.isRegistered) {
    return { status: 'REGISTERED', label: 'Registered', canRegister: false, badgeClass: 'status-resolved' };
  }

  if (event?.maxParticipants && (event?.registeredCount || 0) >= event.maxParticipants) {
    return { status: 'FULL', label: 'Event Full', canRegister: false, badgeClass: 'priority-high' };
  }

  return { status: 'AVAILABLE', label: 'Register Now', canRegister: true, badgeClass: 'status-in-progress' };
}

function Events() {
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register confirmation modal state
  const [eventToRegister, setEventToRegister] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Cancel confirmation modal state
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const loadEvents = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await getEvents();
      setEvents(getList(response.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchValue = searchText.toLowerCase();
      const matchesSearch =
        (event.title || '').toLowerCase().includes(searchValue) ||
        (event.venue || '').toLowerCase().includes(searchValue) ||
        getOrganizer(event).toLowerCase().includes(searchValue) ||
        getDepartment(event).toLowerCase().includes(searchValue);
      const matchesDepartment = departmentFilter === 'All' || getDepartment(event) === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [events, searchText, departmentFilter]);

  const handleViewDetails = async (eventItem) => {
    const eventId = eventItem._id || eventItem.id;

    if (!eventId) {
      setSelectedEvent(eventItem);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedEvent(eventItem);

      const response = await getEventById(eventId);
      const details = getDetails(response.data);
      setSelectedEvent(details);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load event details');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Registration Modal
  const handleOpenRegisterModal = (eventItem) => {
    setRegisterError('');
    setEventToRegister(eventItem);
  };

  // Confirm Registration
  const handleConfirmRegister = async () => {
    if (!eventToRegister) return;
    const eventId = eventToRegister._id || eventToRegister.id;
    if (!eventId) return;

    try {
      setRegistering(true);
      setRegisterError('');

      await registerForEvent(eventId);

      // Immediately update local state
      setEvents((prev) =>
        prev.map((e) => {
          if ((e._id || e.id) === eventId) {
            return {
              ...e,
              isRegistered: true,
              registeredCount: (e.registeredCount || 0) + 1
            };
          }
          return e;
        })
      );

      if (selectedEvent && (selectedEvent._id || selectedEvent.id) === eventId) {
        setSelectedEvent((prev) => ({
          ...prev,
          isRegistered: true,
          registeredCount: (prev.registeredCount || 0) + 1
        }));
      }

      setSuccess(`Successfully registered for "${eventToRegister.title}"!`);
      setEventToRegister(null);
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setRegistering(false);
    }
  };

  // Open Cancel Registration Modal
  const handleOpenCancelModal = (eventItem) => {
    setCancelError('');
    setEventToCancel(eventItem);
  };

  // Confirm Cancellation
  const handleConfirmCancel = async () => {
    if (!eventToCancel) return;
    const eventId = eventToCancel._id || eventToCancel.id;
    if (!eventId) return;

    try {
      setCancelling(true);
      setCancelError('');

      await cancelEventRegistration(eventId);

      // Immediately update local state
      setEvents((prev) =>
        prev.map((e) => {
          if ((e._id || e.id) === eventId) {
            return {
              ...e,
              isRegistered: false,
              registeredCount: Math.max(0, (e.registeredCount || 1) - 1)
            };
          }
          return e;
        })
      );

      if (selectedEvent && (selectedEvent._id || selectedEvent.id) === eventId) {
        setSelectedEvent((prev) => ({
          ...prev,
          isRegistered: false,
          registeredCount: Math.max(0, (prev.registeredCount || 1) - 1)
        }));
      }

      setSuccess(`Registration for "${eventToCancel.title}" was cancelled.`);
      setEventToCancel(null);
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Campus Life</p>
          <h1>Campus Events</h1>
          <p>Explore upcoming campus events, workshops, seminars and register to attend.</p>
        </div>
        <span className="dashboard-role-pill">Events & Activities</span>
      </AnimatedCard>

      {/* Global Alerts */}
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

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card" delay={0.14} hover={false}>
        <label className="complaint-field">
          <span>Search events</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by title, venue, organizer, or department..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        <label className="complaint-field">
          <span>Filter by department</span>
          <select onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>
      </AnimatedCard>

      {loading && <AnimatedCard className="dashboard-panel" delay={0.2} hover={false}>Loading campus events...</AnimatedCard>}

      {!loading && filteredEvents.length > 0 && (
        <div className="resource-card-grid">
          {filteredEvents.map((eventItem, index) => {
            const regState = getEventRegistrationState(eventItem);
            const remainingSeats =
              eventItem.maxParticipants !== null && eventItem.maxParticipants !== undefined
                ? Math.max(0, eventItem.maxParticipants - (eventItem.registeredCount || 0))
                : null;

            return (
              <AnimatedCard
                className="resource-card"
                delay={0.22 + index * 0.05}
                key={eventItem._id || eventItem.id || eventItem.title}
              >
                <div className="resource-card-top">
                  <span className="resource-badge event-badge">{getDepartment(eventItem)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {eventItem.isRegistered && (
                      <span className="track-badge status-resolved" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Registered
                      </span>
                    )}
                    <CalendarDays size={19} />
                  </div>
                </div>

                <h2>{eventItem.title || 'Untitled event'}</h2>
                <p>{getPreview(eventItem.description)}</p>

                <div className="resource-meta">
                  <span>
                    <strong>Date:</strong> {formatDate(eventItem.eventDate || eventItem.date)}
                  </span>
                  <span>
                    <strong>Time:</strong> {eventItem.eventTime || eventItem.time || 'Not available'}
                  </span>
                  <span>
                    <strong>Venue:</strong> {eventItem.venue || 'Not available'}
                  </span>
                  <span>
                    <strong>Organizer:</strong> {getOrganizer(eventItem)}
                  </span>
                  {remainingSeats !== null && (
                    <span style={{ color: remainingSeats <= 5 ? '#f87171' : '#38bdf8' }}>
                      <strong>Seats:</strong> {remainingSeats} of {eventItem.maxParticipants} available
                    </span>
                  )}
                </div>

                {/* Event Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                  <button
                    className="track-action-button"
                    onClick={() => handleViewDetails(eventItem)}
                    style={{ flex: 1, minWidth: '100px' }}
                    type="button"
                  >
                    View Details
                  </button>

                  {/* Dynamic Registration State Button */}
                  {regState.status === 'REGISTERED' ? (
                    <button
                      className="admin-action-btn view"
                      onClick={() => handleViewDetails(eventItem)}
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                        fontWeight: 700,
                        padding: '0 14px',
                        minHeight: '38px'
                      }}
                      title="You are registered for this event"
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      <span>Registered</span>
                    </button>
                  ) : regState.canRegister ? (
                    <button
                      className="admin-btn-primary"
                      onClick={() => handleOpenRegisterModal(eventItem)}
                      style={{
                        padding: '0 14px',
                        minHeight: '38px',
                        fontWeight: 700
                      }}
                      type="button"
                    >
                      <CalendarCheck size={15} />
                      <span>Register Now</span>
                    </button>
                  ) : (
                    <span
                      className={`track-badge ${regState.badgeClass}`}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 650,
                        alignSelf: 'center'
                      }}
                    >
                      {regState.label}
                    </span>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      )}

      {!loading && filteredEvents.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.22} hover={false}>
          No campus events matching your criteria right now.
        </AnimatedCard>
      )}

      {/* 1. View Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
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
                  <p className="dashboard-kicker">Event Information</p>
                  <h2>{selectedEvent.title || 'Untitled event'}</h2>
                  <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {(() => {
                      const regState = getEventRegistrationState(selectedEvent);
                      return (
                        <span className={`track-badge ${regState.badgeClass}`}>
                          {regState.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setSelectedEvent(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {selectedEvent.imageUrl && (
                <img
                  alt={selectedEvent.title || 'Event'}
                  className="resource-modal-image"
                  src={selectedEvent.imageUrl}
                />
              )}

              <div className="track-detail-grid">
                {modalLoading && (
                  <p>
                    <span>Loading</span>Loading event details...
                  </p>
                )}
                <p>
                  <span>Description</span>{selectedEvent.description || 'No description available.'}
                </p>
                <p>
                  <span>Date</span>{formatDate(selectedEvent.eventDate || selectedEvent.date)}
                </p>
                <p>
                  <span>Time</span>{selectedEvent.eventTime || selectedEvent.time || 'Not available'}
                </p>
                <p>
                  <span>Venue</span>{selectedEvent.venue || 'Not available'}
                </p>
                <p>
                  <span>Department</span>{getDepartment(selectedEvent)}
                </p>
                <p>
                  <span>Organizer</span>{getOrganizer(selectedEvent)}
                </p>

                {selectedEvent.maxParticipants && (
                  <p>
                    <span>Capacity</span>
                    {selectedEvent.registeredCount || 0} / {selectedEvent.maxParticipants} seats filled (
                    {Math.max(0, selectedEvent.maxParticipants - (selectedEvent.registeredCount || 0))} available)
                  </p>
                )}

                {selectedEvent.registrationDeadline && (
                  <p>
                    <span>Registration Deadline</span>
                    {formatDateTime(selectedEvent.registrationDeadline)}
                  </p>
                )}
              </div>

              {/* Modal Action Controls */}
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
                  {selectedEvent.isRegistered ? (
                    <button
                      className="chatbot-clear-btn"
                      onClick={() => handleOpenCancelModal(selectedEvent)}
                      type="button"
                    >
                      <X size={15} />
                      <span>Cancel Registration</span>
                    </button>
                  ) : getEventRegistrationState(selectedEvent).canRegister ? (
                    <button
                      className="admin-btn-primary"
                      onClick={() => handleOpenRegisterModal(selectedEvent)}
                      type="button"
                    >
                      <CalendarCheck size={16} />
                      <span>Register for this Event</span>
                    </button>
                  ) : null}
                </div>

                <button
                  className="complaint-secondary-button"
                  onClick={() => setSelectedEvent(null)}
                  style={{ width: 'auto', minWidth: '100px', margin: 0 }}
                  type="button"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Register Confirmation Modal */}
      <AnimatePresence>
        {eventToRegister && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => !registering && setEventToRegister(null)}
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
                  <p className="dashboard-kicker">Event Registration</p>
                  <h2>Confirm Registration</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  disabled={registering}
                  onClick={() => setEventToRegister(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {registerError && (
                <div
                  className="chatbot-alert chatbot-alert-error"
                  style={{ margin: '12px 0 6px' }}
                >
                  <AlertCircle size={17} />
                  <span>{registerError}</span>
                </div>
              )}

              <div className="chatbot-confirm-body" style={{ margin: '16px 0' }}>
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={{
                    background: 'rgba(34, 211, 238, 0.15)',
                    borderColor: 'rgba(34, 211, 238, 0.4)',
                    color: '#22d3ee'
                  }}
                >
                  <CalendarCheck size={28} />
                </div>
                <div>
                  <p className="chatbot-confirm-title" style={{ fontSize: '16px' }}>
                    Register for &quot;{eventToRegister.title}&quot;?
                  </p>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', lineHeight: 1.6 }}>
                    <div>
                      <Clock size={12} style={{ display: 'inline', marginRight: '6px' }} />
                      {formatDate(eventToRegister.eventDate)} at {eventToRegister.eventTime}
                    </div>
                    <div>
                      <MapPin size={12} style={{ display: 'inline', marginRight: '6px' }} />
                      {eventToRegister.venue}
                    </div>
                    {eventToRegister.maxParticipants && (
                      <div style={{ color: '#22d3ee', marginTop: '4px' }}>
                        Seats remaining: {Math.max(0, eventToRegister.maxParticipants - (eventToRegister.registeredCount || 0))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={registering}
                  onClick={() => setEventToRegister(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="admin-btn-primary"
                  disabled={registering}
                  onClick={handleConfirmRegister}
                  style={{ minWidth: '160px' }}
                  type="button"
                >
                  {registering ? 'Confirming...' : 'Confirm Registration'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Cancel Registration Confirmation Modal */}
      <AnimatePresence>
        {eventToCancel && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => !cancelling && setEventToCancel(null)}
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
                  <p className="dashboard-kicker">Manage Registration</p>
                  <h2>Cancel Registration</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  disabled={cancelling}
                  onClick={() => setEventToCancel(null)}
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
                    Cancel registration for &quot;{eventToCancel.title}&quot;?
                  </p>
                  <p className="chatbot-confirm-desc" style={{ fontSize: '13px', marginTop: '6px' }}>
                    Your reserved seat will be released for other students. You can register again later if registration remains open.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={cancelling}
                  onClick={() => setEventToCancel(null)}
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

export default Events;
