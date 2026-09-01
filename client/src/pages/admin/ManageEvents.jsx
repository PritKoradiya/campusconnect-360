import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  Eye,
  MapPin,
  Plus,
  PowerOff,
  RotateCcw,
  Search,
  Sparkles,
  User,
  Users,
  X
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  updateEvent
} from '../../services/eventService';
import { getDepartments } from '../../services/departmentService';

const statusFilterOptions = ['All', 'Upcoming', 'Past'];

const initialFormData = {
  title: '',
  description: '',
  eventDate: '',
  eventTime: '',
  venue: '',
  department: '',
  organizer: '',
  imageUrl: ''
};

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function formatDateInput(dateValue) {
  if (!dateValue) return '';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function isEventUpcoming(dateValue) {
  if (!dateValue) return false;
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;
    // Set to end of day so events today are counted as upcoming/active
    d.setHours(23, 59, 59, 999);
    return d >= new Date();
  } catch {
    return false;
  }
}

function getDepartmentName(event) {
  if (event?.department && typeof event.department === 'object') {
    return event.department.name || 'General';
  }
  return event?.department || 'General';
}

function getOrganizerName(event) {
  return event?.organizer || 'Campus Team';
}

function getEventList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.events)) return responseData.events;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function getEventDetails(responseData) {
  return responseData?.event || responseData?.data || responseData;
}

function getDepartmentList(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.departments)) return responseData.departments;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [activeDepts, setActiveDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters, Search & Sort
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('upcoming');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // View Details Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Deactivate Confirmation Modal State
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [eventToDeactivate, setEventToDeactivate] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const fetchEventsAndDepts = async (isManualRefresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [eventsRes, deptsRes] = await Promise.all([
        getEvents(),
        getDepartments().catch(() => ({ data: [] }))
      ]);

      setEvents(getEventList(eventsRes.data));
      setActiveDepts(getDepartmentList(deptsRes.data));
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventsAndDepts();
  }, []);

  // Dynamically derive departments from loaded events and active departments
  const derivedDepartments = useMemo(() => {
    const depts = new Set();
    activeDepts.forEach((d) => {
      if (d.name) depts.add(d.name);
    });
    events.forEach((e) => {
      const deptName = getDepartmentName(e);
      if (deptName && deptName !== 'General') depts.add(deptName);
    });
    return ['All', ...Array.from(depts).sort()];
  }, [events, activeDepts]);

  // Real Summary counts
  const totalCount = events.length;
  const upcomingCount = events.filter((e) => isEventUpcoming(e.eventDate)).length;
  const pastCount = events.filter((e) => !isEventUpcoming(e.eventDate)).length;
  const activeCount = events.filter((e) => e.isActive !== false).length;

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => {
        const title = (event.title || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const venue = (event.venue || '').toLowerCase();
        const organizer = getOrganizerName(event).toLowerCase();
        const department = getDepartmentName(event).toLowerCase();
        const query = searchText.toLowerCase().trim();

        const matchesSearch =
          !query ||
          title.includes(query) ||
          description.includes(query) ||
          venue.includes(query) ||
          organizer.includes(query) ||
          department.includes(query);

        const matchesDepartment =
          departmentFilter === 'All' ||
          getDepartmentName(event) === departmentFilter;

        const isUpcoming = isEventUpcoming(event.eventDate);
        const matchesStatus =
          statusFilter === 'All' ||
          (statusFilter === 'Upcoming' && isUpcoming) ||
          (statusFilter === 'Past' && !isUpcoming);

        return matchesSearch && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        // Default: Upcoming First (sort by eventDate ascending)
        const timeA = new Date(a.eventDate || 0).getTime();
        const timeB = new Date(b.eventDate || 0).getTime();
        return timeA - timeB;
      });
  }, [events, searchText, departmentFilter, statusFilter, sortBy]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setCurrentEventId(null);
    setFormData(initialFormData);
    setFormError('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event) => {
    setIsEditing(true);
    setCurrentEventId(event._id || event.id);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      eventDate: formatDateInput(event.eventDate),
      eventTime: event.eventTime || '',
      venue: event.venue || '',
      department: event.department || '',
      organizer: event.organizer || '',
      imageUrl: event.imageUrl || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  // Handle Form Input Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Event title is required.');
      return;
    }

    if (!formData.description.trim()) {
      setFormError('Event description is required.');
      return;
    }

    if (!formData.eventDate) {
      setFormError('Event date is required.');
      return;
    }

    if (!formData.eventTime.trim()) {
      setFormError('Event time is required.');
      return;
    }

    if (!formData.venue.trim()) {
      setFormError('Event venue is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError('');
      setSuccess('');

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        eventDate: formData.eventDate,
        eventTime: formData.eventTime.trim(),
        venue: formData.venue.trim(),
        department: formData.department.trim() || undefined,
        organizer: formData.organizer.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined
      };

      if (isEditing) {
        const response = await updateEvent(currentEventId, payload);
        const updatedEvent = response.data?.event || { ...payload, _id: currentEventId };

        setEvents((prev) =>
          prev.map((e) =>
            (e._id || e.id) === currentEventId ? { ...e, ...updatedEvent } : e
          )
        );

        if (selectedEvent && (selectedEvent._id || selectedEvent.id) === currentEventId) {
          setSelectedEvent((prev) => ({ ...prev, ...updatedEvent }));
        }

        setSuccess('Event updated successfully.');
      } else {
        const response = await createEvent(payload);
        const created = response.data?.event;

        if (created) {
          setEvents((prev) => [created, ...prev]);
        } else {
          fetchEventsAndDepts();
        }

        setSuccess('Event created successfully.');
      }

      setModalOpen(false);
      setFormData(initialFormData);
    } catch (err) {
      if (err.response?.status === 401) {
        setFormError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setFormError('You are not authorized to perform this action.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to save event.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // View Details Trigger
  const handleViewDetails = async (event) => {
    const eventId = event._id || event.id;
    if (!eventId) {
      setSelectedEvent(event);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedEvent(event);
      setError('');

      const response = await getEventById(eventId);
      const details = getEventDetails(response.data);
      setSelectedEvent(details);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to load event details');
      }
    } finally {
      setModalLoading(false);
    }
  };

  // Open Deactivate Confirmation Modal
  const openDeactivateModal = (event) => {
    setEventToDeactivate(event);
    setDeactivateModalOpen(true);
  };

  // Confirm Deactivate
  const handleConfirmDeactivate = async () => {
    if (!eventToDeactivate) return;
    const eventId = eventToDeactivate._id || eventToDeactivate.id;
    if (!eventId) return;

    try {
      setDeactivating(true);
      setError('');
      setSuccess('');

      await deleteEvent(eventId);

      // Remove from active list
      setEvents((prev) => prev.filter((e) => (e._id || e.id) !== eventId));

      if (selectedEvent && (selectedEvent._id || selectedEvent.id) === eventId) {
        setSelectedEvent(null);
      }

      setDeactivateModalOpen(false);
      setEventToDeactivate(null);
      setSuccess('Event deactivated successfully.');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to perform this action.');
      } else {
        setError(err.response?.data?.message || 'Failed to deactivate event');
      }
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Admin Desk</p>
          <h1>Manage Events</h1>
          <p>Create and manage campus events, workshops, seminars, and activities.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="admin-btn-primary"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <Plus size={17} />
            <span>Create Event</span>
          </button>
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchEventsAndDepts(true)}
            title="Refresh events"
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

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <CalendarDays size={22} />
          </span>
          <div>
            <p>Total Events</p>
            <strong>{totalCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.12}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Upcoming Events</p>
            <strong>{upcomingCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.16}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Past Events</p>
            <strong>{pastCount}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.2}>
          <span className="dashboard-card-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <p>Active Events</p>
            <strong>{activeCount}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Filter and Search Section */}
      <AnimatedCard className="track-filter-card admin-events-filter-card" delay={0.24} hover={false}>
        {/* Search Field */}
        <label className="complaint-field">
          <span>Search Events</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by title, venue, organizer, department..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        {/* Department Filter */}
        <label className="complaint-field">
          <span>Department</span>
          <select onChange={(e) => setDepartmentFilter(e.target.value)} value={departmentFilter}>
            {derivedDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </label>

        {/* Status Filter */}
        <label className="complaint-field">
          <span>Event Status</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            {statusFilterOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </label>

        {/* Sorting */}
        <label className="complaint-field">
          <span>Sort By</span>
          <select onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
            <option value="upcoming">Upcoming First</option>
            <option value="newest">Newest Created</option>
            <option value="oldest">Oldest Created</option>
          </select>
        </label>
      </AnimatedCard>

      {/* Global Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="chatbot-alert chatbot-alert-success"
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: -10 }}
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
          >
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="chatbot-alert-close" onClick={() => setError('')} type="button">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events Table Panel */}
      <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>
        <div className="dashboard-section-heading">
          <h2>Campus Events ({filteredEvents.length})</h2>
          <p>Scheduled campus workshops, fests, conferences, and technical activities.</p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Department</th>
                  <th>Organizer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td><div className="admin-skeleton-line" style={{ width: '180px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '80px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '70px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '100px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '90px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '75px' }} /></td>
                    <td><div className="admin-skeleton-line" style={{ width: '140px' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State: No Events */}
        {!loading && events.length === 0 && (
          <div className="track-empty-state">
            <CalendarDays size={36} style={{ color: '#22d3ee', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>No events available.</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Click &quot;Create Event&quot; to publish your first campus event or workshop.
            </p>
          </div>
        )}

        {/* Empty State: Filter produced 0 */}
        {!loading && events.length > 0 && filteredEvents.length === 0 && (
          <div className="track-empty-state">
            <Search size={36} style={{ color: '#fbbf24', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontWeight: 750, color: '#e0f2fe' }}>
              No events match your current filters.
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Try clearing some filters or searching with different keywords.
            </p>
          </div>
        )}

        {/* Populated Table */}
        {!loading && filteredEvents.length > 0 && (
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Department</th>
                  <th>Organizer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const id = event._id || event.id || '';
                  const isUpcoming = isEventUpcoming(event.eventDate);

                  return (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={id}
                      transition={{ duration: 0.2 }}
                    >
                      <td>
                        <div className="admin-notice-title-cell">
                          <strong>{event.title || 'Untitled Event'}</strong>
                          <span className="admin-notice-desc-preview">
                            {event.description || 'No description provided.'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e0f2fe' }}>
                          <Calendar size={14} color="#22d3ee" />
                          <span>{formatDate(event.eventDate)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="event-time-cell">
                          <Clock3 size={14} />
                          <span>{event.eventTime || 'TBD'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="event-venue-cell">
                          <MapPin size={14} />
                          <span>{event.venue || 'Campus Venue'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: '#cbd5e1' }}>{getDepartmentName(event)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} color="#22d3ee" />
                          <span style={{ color: '#cbd5e1' }}>{getOrganizerName(event)}</span>
                        </div>
                      </td>
                      <td>
                        <span className={isUpcoming ? 'track-badge status-in-progress' : 'track-badge priority-low'}>
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-action-btn-group">
                          {/* View Details */}
                          <button
                            className="admin-action-btn view"
                            onClick={() => handleViewDetails(event)}
                            title="View full event details"
                            type="button"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          {/* Edit Event */}
                          <button
                            className="admin-action-btn assign"
                            onClick={() => handleOpenEditModal(event)}
                            title="Edit event"
                            type="button"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>

                          {/* Deactivate Event */}
                          <button
                            aria-label="Deactivate event"
                            className="admin-action-btn delete"
                            onClick={() => openDeactivateModal(event)}
                            title="Deactivate event"
                            type="button"
                          >
                            <PowerOff size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedCard>

      {/* 1. Create / Edit Event Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card admin-details-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              style={{ maxWidth: '680px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Event Coordinator</p>
                  <h2>{isEditing ? 'Edit Campus Event' : 'Create Campus Event'}</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {formError && (
                <div
                  className="chatbot-alert chatbot-alert-error"
                  style={{ margin: '14px 0 6px' }}
                >
                  <AlertCircle size={17} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ marginTop: '16px' }}>
                <div className="notice-form-grid">
                  {/* Title */}
                  <label className="complaint-field full-width">
                    <span>Event Title *</span>
                    <input
                      disabled={formSubmitting}
                      name="title"
                      onChange={handleFormChange}
                      placeholder="e.g. Annual Tech Symposium 2026"
                      required
                      type="text"
                      value={formData.title}
                    />
                  </label>

                  {/* Event Date */}
                  <label className="complaint-field">
                    <span>Event Date *</span>
                    <input
                      disabled={formSubmitting}
                      name="eventDate"
                      onChange={handleFormChange}
                      required
                      type="date"
                      value={formData.eventDate}
                    />
                  </label>

                  {/* Event Time */}
                  <label className="complaint-field">
                    <span>Event Time *</span>
                    <input
                      disabled={formSubmitting}
                      name="eventTime"
                      onChange={handleFormChange}
                      placeholder="e.g. 10:00 AM - 04:00 PM"
                      required
                      type="text"
                      value={formData.eventTime}
                    />
                  </label>

                  {/* Venue */}
                  <label className="complaint-field full-width">
                    <span>Venue Location *</span>
                    <input
                      disabled={formSubmitting}
                      name="venue"
                      onChange={handleFormChange}
                      placeholder="e.g. Main Auditorium, Block C"
                      required
                      type="text"
                      value={formData.venue}
                    />
                  </label>

                  {/* Department */}
                  <label className="complaint-field">
                    <span>Department</span>
                    {activeDepts.length > 0 ? (
                      <select
                        disabled={formSubmitting}
                        name="department"
                        onChange={handleFormChange}
                        value={formData.department}
                      >
                        <option value="">-- General / All Departments --</option>
                        {activeDepts.map((d) => (
                          <option key={d._id} value={d.name}>
                            {d.name} {d.code ? `(${d.code})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        disabled={formSubmitting}
                        name="department"
                        onChange={handleFormChange}
                        placeholder="e.g. Computer Engineering"
                        type="text"
                        value={formData.department}
                      />
                    )}
                  </label>

                  {/* Organizer */}
                  <label className="complaint-field">
                    <span>Organizer / Club</span>
                    <input
                      disabled={formSubmitting}
                      name="organizer"
                      onChange={handleFormChange}
                      placeholder="e.g. IEEE Student Branch"
                      type="text"
                      value={formData.organizer}
                    />
                  </label>

                  {/* Image URL */}
                  <label className="complaint-field full-width">
                    <span>Event Banner Image URL (Optional)</span>
                    <input
                      disabled={formSubmitting}
                      name="imageUrl"
                      onChange={handleFormChange}
                      placeholder="https://images.unsplash.com/photo-..."
                      type="url"
                      value={formData.imageUrl}
                    />
                  </label>

                  {/* Description */}
                  <label className="complaint-field full-width">
                    <span>Event Description *</span>
                    <textarea
                      disabled={formSubmitting}
                      name="description"
                      onChange={handleFormChange}
                      placeholder="Provide comprehensive details about the event, registration guidelines, speakers, and schedule..."
                      required
                      rows={5}
                      value={formData.description}
                    />
                  </label>
                </div>

                <div className="chatbot-confirm-actions" style={{ marginTop: '22px' }}>
                  <button
                    className="complaint-secondary-button"
                    disabled={formSubmitting}
                    onClick={() => setModalOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="complaint-submit-button"
                    disabled={formSubmitting}
                    type="submit"
                  >
                    {formSubmitting
                      ? isEditing
                        ? 'Updating Event...'
                        : 'Creating Event...'
                      : isEditing
                      ? 'Save Changes'
                      : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. View Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card admin-details-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              style={{ maxWidth: '680px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Modal Header */}
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Event Information</p>
                  <h2>{selectedEvent.title || 'Untitled Event'}</h2>
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

              {modalLoading && (
                <div className="track-empty-state" style={{ margin: '14px 0' }}>
                  <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
                  Loading latest event details...
                </div>
              )}

              {/* Banner Image Preview */}
              {selectedEvent.imageUrl && (
                <img
                  alt={selectedEvent.title}
                  className="event-modal-hero-image"
                  src={selectedEvent.imageUrl}
                />
              )}

              {/* Detail Grid */}
              <div className="track-detail-grid admin-detail-grid">
                <p>
                  <span>Event Date</span>
                  {formatDate(selectedEvent.eventDate)}
                </p>
                <p>
                  <span>Event Time</span>
                  {selectedEvent.eventTime || 'Not specified'}
                </p>
                <p>
                  <span>Venue</span>
                  {selectedEvent.venue || 'Not specified'}
                </p>
                <p>
                  <span>Department</span>
                  {getDepartmentName(selectedEvent)}
                </p>
                <p>
                  <span>Organizer</span>
                  {getOrganizerName(selectedEvent)}
                </p>
                <p>
                  <span>Status</span>
                  <span
                    className={
                      isEventUpcoming(selectedEvent.eventDate)
                        ? 'track-badge status-in-progress'
                        : 'track-badge priority-low'
                    }
                    style={{ width: 'fit-content' }}
                  >
                    {isEventUpcoming(selectedEvent.eventDate) ? 'Upcoming' : 'Past'}
                  </span>
                </p>
                <p>
                  <span>Published Date</span>
                  {formatDate(selectedEvent.createdAt)}
                </p>
                <p className="admin-detail-fullwidth">
                  <span>Full Event Description</span>
                  <span style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: 1.6 }}>
                    {selectedEvent.description || 'No description provided.'}
                  </span>
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="admin-modal-footer">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="admin-action-btn assign"
                    onClick={() => {
                      const obj = selectedEvent;
                      setSelectedEvent(null);
                      handleOpenEditModal(obj);
                    }}
                    style={{ minHeight: '38px', padding: '0 14px' }}
                    type="button"
                  >
                    <Edit2 size={15} />
                    <span>Edit Event</span>
                  </button>

                  <button
                    className="chatbot-clear-btn"
                    onClick={() => {
                      const obj = selectedEvent;
                      setSelectedEvent(null);
                      openDeactivateModal(obj);
                    }}
                    type="button"
                  >
                    <PowerOff size={15} />
                    <span>Deactivate</span>
                  </button>
                </div>

                <button
                  className="complaint-secondary-button"
                  onClick={() => setSelectedEvent(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Deactivate Confirmation Modal */}
      <AnimatePresence>
        {deactivateModalOpen && eventToDeactivate && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card chatbot-confirm-modal"
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Confirmation</p>
                  <h2>Deactivate Event</h2>
                </div>
                <button
                  aria-label="Close modal"
                  className="track-close-button"
                  onClick={() => setDeactivateModalOpen(false)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="chatbot-confirm-body">
                <div
                  className="chatbot-confirm-icon-wrap"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    color: '#f87171'
                  }}
                >
                  <PowerOff size={26} />
                </div>
                <div>
                  <p className="chatbot-confirm-title">
                    Deactivate &quot;{eventToDeactivate.title || 'Untitled'}&quot;?
                  </p>
                  <p className="chatbot-confirm-desc">
                    This event will be deactivated and will no longer appear on active student and department schedules.
                  </p>
                </div>
              </div>

              <div className="chatbot-confirm-actions">
                <button
                  className="complaint-secondary-button"
                  disabled={deactivating}
                  onClick={() => setDeactivateModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="chatbot-danger-btn"
                  disabled={deactivating}
                  onClick={handleConfirmDeactivate}
                  type="button"
                >
                  {deactivating ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}

export default ManageEvents;
