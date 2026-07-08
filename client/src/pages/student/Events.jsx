import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Search, X } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getEventById, getEvents } from '../../services/eventService';

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

  return new Date(dateValue).toLocaleDateString();
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

function Events() {
  const [events, setEvents] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
          setError(err.response?.data?.message || 'Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

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
      setSelectedEvent(getDetails(response.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Campus Life</p>
          <h1>Events</h1>
          <p>Explore upcoming campus events, workshops, seminars and activities.</p>
        </div>
        <span className="dashboard-role-pill">Campus Events</span>
      </AnimatedCard>

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

      {loading && <AnimatedCard className="dashboard-panel" delay={0.2} hover={false}>Loading events...</AnimatedCard>}
      {error && <AnimatedCard className="dashboard-panel complaint-error-message" delay={0.2} hover={false}>{error}</AnimatedCard>}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="resource-card-grid">
          {filteredEvents.map((eventItem, index) => (
            <AnimatedCard className="resource-card" delay={0.22 + index * 0.06} key={eventItem._id || eventItem.id || eventItem.title}>
              <div className="resource-card-top">
                <span className="resource-badge event-badge">{getDepartment(eventItem)}</span>
                <CalendarDays size={19} />
              </div>
              <h2>{eventItem.title || 'Untitled event'}</h2>
              <p>{getPreview(eventItem.description)}</p>
              <div className="resource-meta">
                <span>Date: {formatDate(eventItem.eventDate || eventItem.date)}</span>
                <span>Time: {eventItem.eventTime || eventItem.time || 'Not available'}</span>
                <span>Venue: {eventItem.venue || 'Not available'}</span>
                <span>Organizer: {getOrganizer(eventItem)}</span>
              </div>
              <button className="track-action-button" onClick={() => handleViewDetails(eventItem)} type="button">
                View Details
              </button>
            </AnimatedCard>
          ))}
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.22} hover={false}>No upcoming events available right now.</AnimatedCard>
      )}

      {selectedEvent && (
        <motion.div animate={{ opacity: 1 }} className="track-modal-backdrop" initial={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div animate={{ opacity: 1, scale: 1, y: 0 }} className="track-modal-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="track-modal-heading">
              <div>
                <p className="dashboard-kicker">Event Details</p>
                <h2>{selectedEvent.title || 'Untitled event'}</h2>
              </div>
              <button className="track-close-button" onClick={() => setSelectedEvent(null)} type="button">
                <X size={19} />
              </button>
            </div>
            {selectedEvent.imageUrl && <img alt={selectedEvent.title || 'Event'} className="resource-modal-image" src={selectedEvent.imageUrl} />}
            <div className="track-detail-grid">
              {modalLoading && <p><span>Loading</span>Loading event details...</p>}
              <p><span>Description</span>{selectedEvent.description || 'No description available.'}</p>
              <p><span>Date</span>{formatDate(selectedEvent.eventDate || selectedEvent.date)}</p>
              <p><span>Time</span>{selectedEvent.eventTime || selectedEvent.time || 'Not available'}</p>
              <p><span>Venue</span>{selectedEvent.venue || 'Not available'}</p>
              <p><span>Department</span>{getDepartment(selectedEvent)}</p>
              <p><span>Organizer</span>{getOrganizer(selectedEvent)}</p>
            </div>
            <button className="complaint-submit-button" onClick={() => setSelectedEvent(null)} type="button">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatedPage>
  );
}

export default Events;
