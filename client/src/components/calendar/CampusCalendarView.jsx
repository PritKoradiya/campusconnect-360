import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Calendar as CalendarIcon,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import AnimatedCard from '../ui/AnimatedCard';
import AnimatedPage from '../ui/AnimatedPage';
import { getEventById, getEvents } from '../../services/eventService';
import { getNotices } from '../../services/noticeService';
import {
  CATEGORY_CONFIG,
  formatDisplayDate,
  formatMonthTitle,
  formatShortDate,
  getEventCategory,
  getMonthGrid,
  getTodayKey,
  getWeekDays,
  groupEventsByDate,
  isDateUpcoming,
  parseDateKey
} from '../../utils/calendarUtils';
import '../../styles/calendar.css';

const FILTER_TABS = [
  { id: 'all', label: 'All Activities' },
  { id: 'events', label: 'Events' },
  { id: 'workshops', label: 'Workshops & Seminars' },
  { id: 'notices', label: 'Notices' },
  { id: 'deadlines', label: 'Deadlines' }
];

function extractList(responseData, field = 'events') {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData?.[field])) return responseData[field];
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

function getDetails(responseData) {
  return responseData?.event || responseData?.notice || responseData?.data || responseData;
}

function CampusCalendarView({ role = 'student' }) {
  const navigate = useNavigate();

  // Calendar navigation state
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => getTodayKey());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'agenda'

  // Filtering state
  const [filterType, setFilterType] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Hover Tooltip State for desktop month cells
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const todayKey = getTodayKey();

  // Load Events and Notices
  const loadCalendarData = async (isManual = false) => {
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

      const [eventsRes, noticesRes] = await Promise.all([
        getEvents(),
        getNotices().catch(() => ({ data: [] }))
      ]);

      const rawEvents = extractList(eventsRes.data, 'events');
      const rawNotices = extractList(noticesRes.data, 'notices');

      setEvents(rawEvents);

      // Only include notices that have a valid expiryDate as a calendar item
      const validNotices = rawNotices
        .filter((n) => n.expiryDate && (n.isActive !== false))
        .map((n) => ({
          ...n,
          _isNotice: true,
          _isDeadline: n.priority === 'Urgent',
          eventDate: n.expiryDate,
          eventTime: 'Notice Expiry',
          venue: n.targetAudience ? `Audience: ${n.targetAudience}` : 'Campus Notice'
        }));

      setNotices(validNotices);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to access this calendar.');
      } else {
        setError(err.response?.data?.message || 'Failed to load campus calendar');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  // Department List derived from events
  const departmentOptions = useMemo(() => {
    const depts = new Set();
    events.forEach((e) => {
      const dept = e.department?.name || e.department;
      if (dept && dept !== 'All') depts.add(dept);
    });
    return ['All', ...Array.from(depts).sort()];
  }, [events]);

  // Combined and filtered calendar items
  const filteredItems = useMemo(() => {
    const combined = [...events, ...notices];

    return combined.filter((item) => {
      const cat = getEventCategory(item);

      // Filter by Activity Type
      if (filterType === 'events' && (item._isNotice || cat === 'notice' || cat === 'deadline')) {
        return false;
      }
      if (filterType === 'workshops' && cat !== 'workshop' && cat !== 'seminar') {
        return false;
      }
      if (filterType === 'notices' && !item._isNotice) {
        return false;
      }
      if (filterType === 'deadlines' && cat !== 'deadline') {
        return false;
      }

      // Filter by Department
      if (selectedDepartment !== 'All') {
        const itemDept = item.department?.name || item.department || '';
        if (itemDept.toLowerCase() !== selectedDepartment.toLowerCase()) {
          return false;
        }
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const venue = (item.venue || '').toLowerCase();
        const org = (item.organizer || '').toLowerCase();
        const dept = (item.department?.name || item.department || '').toLowerCase();

        if (
          !title.includes(q) &&
          !desc.includes(q) &&
          !venue.includes(q) &&
          !org.includes(q) &&
          !dept.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [events, notices, filterType, selectedDepartment, searchQuery]);

  // Group filtered items by dateKey: { "YYYY-MM-DD": [item1, item2] }
  const eventsByDate = useMemo(() => {
    return groupEventsByDate(filteredItems);
  }, [filteredItems]);

  // Items for currently selected date
  const selectedDateItems = useMemo(() => {
    return eventsByDate[selectedDateKey] || [];
  }, [eventsByDate, selectedDateKey]);

  // Next 4 Upcoming Events for compact preview card
  const upcomingEventsPreview = useMemo(() => {
    const sorted = [...filteredItems]
      .filter((item) => {
        const key = parseDateKey(item.eventDate || item.date || item.expiryDate);
        return isDateUpcoming(key);
      })
      .sort((a, b) => {
        const keyA = parseDateKey(a.eventDate || a.date || a.expiryDate);
        const keyB = parseDateKey(b.eventDate || b.date || b.expiryDate);
        return keyA.localeCompare(keyB);
      });

    return sorted.slice(0, 4);
  }, [filteredItems]);

  // Agenda view groups: upcoming sorted by date
  const agendaDateGroups = useMemo(() => {
    const dates = Object.keys(eventsByDate).sort();
    return dates.map((dateKey) => ({
      dateKey,
      items: eventsByDate[dateKey]
    }));
  }, [eventsByDate]);

  // Month grid calculation
  const monthGridDays = useMemo(() => {
    return getMonthGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Week days calculation
  const weekDays = useMemo(() => {
    return getWeekDays(selectedDateKey);
  }, [selectedDateKey]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'week') {
      const parts = selectedDateKey.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() - 7);
      const newKey = parseDateKey(d);
      setSelectedDateKey(newKey);
      setViewDate(d);
    } else {
      setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const parts = selectedDateKey.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 7);
      const newKey = parseDateKey(d);
      setSelectedDateKey(newKey);
      setViewDate(d);
    } else {
      setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDateKey(getTodayKey());
  };

  // Open Event Details Modal
  const handleOpenDetails = async (item) => {
    if (!item) return;

    // Notice items don't have separate event route
    if (item._isNotice) {
      setSelectedItem(item);
      return;
    }

    const eventId = item._id || item.id;
    if (!eventId) {
      setSelectedItem(item);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedItem(item);
      const res = await getEventById(eventId);
      setSelectedItem(getDetails(res.data));
    } catch {
      // Fallback to existing item in state
      setSelectedItem(item);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <AnimatedPage className="calendar-page-container">
      {/* 1. Premium Page Header */}
      <AnimatedCard className="dashboard-hero calendar-hero-card" delay={0.04} hover={false}>
        <div>
          <p className="dashboard-kicker">Schedule & Activities</p>
          <h1>Campus Calendar</h1>
          <p>Stay organized with campus events, important dates, and upcoming activities.</p>
        </div>

        <div className="calendar-hero-actions">
          {role === 'admin' && (
            <button
              className="cal-btn cal-btn-primary"
              onClick={() => navigate('/admin/events')}
              type="button"
            >
              <Plus size={16} />
              <span>Manage Events</span>
            </button>
          )}

          <button
            className="cal-btn cal-btn-secondary"
            onClick={handleToday}
            type="button"
          >
            <CalendarCheck2 size={16} />
            <span>Today</span>
          </button>

          <button
            className="cal-btn cal-btn-secondary"
            disabled={refreshing || loading}
            onClick={() => loadCalendarData(true)}
            title="Refresh calendar"
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

      {/* 2. Calendar Toolbar & View Switcher */}
      <div className="cal-toolbar-card">
        {/* Previous, Month/Year Display, Next */}
        <div className="cal-nav-group">
          <button
            aria-label="Previous period"
            className="cal-nav-arrow-btn"
            onClick={handlePrev}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="cal-title-display">
            <span>{formatMonthTitle(currentYear, currentMonth)}</span>
            {selectedDateKey === todayKey && (
              <span className="cal-today-badge">Current Month</span>
            )}
          </div>

          <button
            aria-label="Next period"
            className="cal-nav-arrow-btn"
            onClick={handleNext}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View Switcher: Month | Week | Agenda */}
        <div className="cal-view-toggle" role="tablist" aria-label="Calendar view selector">
          <button
            aria-selected={viewMode === 'month'}
            className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            role="tab"
            type="button"
          >
            <CalendarDays size={15} />
            <span>Month</span>
          </button>

          <button
            aria-selected={viewMode === 'week'}
            className={`cal-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            role="tab"
            type="button"
          >
            <Layers size={15} />
            <span>Week</span>
          </button>

          <button
            aria-selected={viewMode === 'agenda'}
            className={`cal-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
            role="tab"
            type="button"
          >
            <Clock size={15} />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <AnimatedCard className="cal-filter-bar" delay={0.08} hover={false}>
        {/* Category Filter Chips */}
        <div className="cal-filter-chips">
          {FILTER_TABS.map((tab) => {
            const isActive = filterType === tab.id;
            return (
              <button
                className={`cal-chip ${isActive ? 'active' : ''}`}
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                type="button"
              >
                {tab.id === 'events' && <span className="cal-chip-dot" style={{ background: '#38bdf8' }} />}
                {tab.id === 'workshops' && <span className="cal-chip-dot" style={{ background: '#22d3ee' }} />}
                {tab.id === 'notices' && <span className="cal-chip-dot" style={{ background: '#fbbf24' }} />}
                {tab.id === 'deadlines' && <span className="cal-chip-dot" style={{ background: '#f43f5e' }} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Department & Search Inputs */}
        <div className="cal-filter-inputs">
          <select
            aria-label="Filter by department"
            className="cal-dept-select"
            onChange={(e) => setSelectedDepartment(e.target.value)}
            value={selectedDepartment}
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          <div className="cal-search-box">
            <Search size={15} />
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
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
        </div>
      </AnimatedCard>

      {/* Error Message */}
      {error && (
        <AnimatedCard className="dashboard-panel complaint-error-message" hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button
            className="cal-btn cal-btn-secondary"
            onClick={() => loadCalendarData(false)}
            style={{ marginTop: '12px' }}
            type="button"
          >
            <RotateCw size={14} />
            <span>Retry</span>
          </button>
        </AnimatedCard>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="cal-main-layout">
          <div className="cal-calendar-card">
            <div className="cal-skeleton-grid">
              {[...Array(35)].map((_, i) => (
                <div className="cal-skeleton-cell" key={i} />
              ))}
            </div>
          </div>
          <div className="cal-side-card">
            <div className="admin-skeleton-line" style={{ width: '60%', marginBottom: '14px' }} />
            <div className="admin-skeleton-line" style={{ height: '70px', marginBottom: '10px' }} />
            <div className="admin-skeleton-line" style={{ height: '70px' }} />
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {!loading && !error && (
        <div className="cal-main-layout">
          {/* Left / Main Calendar Column */}
          <div className="cal-calendar-card">
            {/* VIEW MODE 1: MONTH VIEW */}
            {viewMode === 'month' && (
              <div className="cal-month-grid">
                {/* Weekday Headers: Mon -> Sun */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                  <div className="cal-weekday-header" key={dayName}>
                    {dayName}
                  </div>
                ))}

                {/* Day Cells */}
                {monthGridDays.map((cell) => {
                  const dayEvents = eventsByDate[cell.dateKey] || [];
                  const isSelected = cell.dateKey === selectedDateKey;
                  const visibleEvents = dayEvents.slice(0, 3);
                  const moreCount = dayEvents.length - visibleEvents.length;

                  return (
                    <div
                      aria-label={`${cell.dateKey}, ${dayEvents.length} events`}
                      className={`cal-date-cell ${
                        !cell.isCurrentMonth ? 'cal-cell-other-month' : ''
                      } ${cell.isToday ? 'cal-cell-today' : ''} ${
                        isSelected ? 'cal-cell-selected' : ''
                      }`}
                      key={cell.dateKey}
                      onClick={() => setSelectedDateKey(cell.dateKey)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="cal-cell-top">
                        <span className="cal-day-num">{cell.dayNumber}</span>
                        {cell.isToday && <span className="cal-today-tag">Today</span>}
                      </div>

                      {/* Desktop Event Pills */}
                      <div className="cal-cell-events">
                        {visibleEvents.map((item, idx) => {
                          const cat = getEventCategory(item);
                          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;

                          return (
                            <div
                              className={`cal-event-pill ${config.badgeClass}`}
                              key={item._id || item.id || idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetails(item);
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                                setHoveredEvent(item);
                              }}
                              onMouseLeave={() => setHoveredEvent(null)}
                              title={item.title}
                            >
                              <span
                                className="cal-event-dot"
                                style={{ background: config.dotColor }}
                              />
                              <span>{item.title}</span>
                            </div>
                          );
                        })}

                        {moreCount > 0 && (
                          <span className="cal-more-badge">+{moreCount} more</span>
                        )}
                      </div>

                      {/* Mobile Dots Row */}
                      {dayEvents.length > 0 && (
                        <div className="cal-cell-dots-row">
                          {dayEvents.slice(0, 4).map((item, idx) => {
                            const cat = getEventCategory(item);
                            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;
                            return (
                              <span
                                className="cal-mini-dot"
                                key={idx}
                                style={{ background: config.dotColor }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 2: WEEK VIEW */}
            {viewMode === 'week' && (
              <div className="cal-week-grid">
                {weekDays.map((day) => {
                  const dayEvents = eventsByDate[day.dateKey] || [];
                  const isSelected = day.dateKey === selectedDateKey;

                  return (
                    <div
                      className={`cal-week-col ${day.isToday ? 'cal-week-today' : ''} ${
                        isSelected ? 'cal-cell-selected' : ''
                      }`}
                      key={day.dateKey}
                    >
                      <div
                        className="cal-week-col-header"
                        onClick={() => setSelectedDateKey(day.dateKey)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="cal-week-day-name">{day.shortDayName}</div>
                        <div className="cal-week-day-num">{day.dayNumber}</div>
                        {day.isToday && <span className="cal-today-tag">Today</span>}
                      </div>

                      <div className="cal-week-events-list">
                        {dayEvents.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '16px 4px', color: '#64748b', fontSize: '11px' }}>
                            No events
                          </div>
                        ) : (
                          dayEvents.map((item, idx) => {
                            const cat = getEventCategory(item);
                            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;

                            return (
                              <div
                                className={`cal-week-card ${config.badgeClass}`}
                                key={item._id || item.id || idx}
                                onClick={() => handleOpenDetails(item)}
                              >
                                <div className="cal-week-card-time">
                                  <Clock size={11} />
                                  <span>{item.eventTime || item.time || 'All Day'}</span>
                                </div>
                                <h4 className="cal-week-card-title">{item.title}</h4>
                                {item.venue && (
                                  <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={11} />
                                    <span>{item.venue}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW MODE 3: AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <div className="cal-agenda-view">
                {agendaDateGroups.length === 0 ? (
                  <div className="cal-empty-schedule" style={{ padding: '40px 20px' }}>
                    <CalendarIcon size={36} style={{ color: '#22d3ee', margin: '0 auto 10px' }} />
                    <p style={{ fontWeight: 750, color: '#e0f2fe', fontSize: '15px' }}>
                      No campus events are scheduled yet.
                    </p>
                    <p>There are no activities matching your current search or filter criteria.</p>
                  </div>
                ) : (
                  agendaDateGroups.map((group) => {
                    const isTodayGroup = group.dateKey === todayKey;
                    return (
                      <div className="cal-agenda-date-group" key={group.dateKey}>
                        <div className="cal-agenda-date-header">
                          <div className="cal-agenda-date-title">
                            <span>{formatDisplayDate(group.dateKey)}</span>
                            {isTodayGroup && <span className="cal-today-badge">TODAY</span>}
                          </div>
                          <span className="cal-side-count">{group.items.length} items</span>
                        </div>

                        <div className="cal-agenda-list">
                          {group.items.map((item, idx) => {
                            const cat = getEventCategory(item);
                            const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;

                            return (
                              <div className="cal-agenda-item" key={item._id || item.id || idx}>
                                <div className="cal-agenda-item-main">
                                  <div className="cal-agenda-item-title-row">
                                    <span className={`cal-chip ${config.badgeClass}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                                      {config.label}
                                    </span>
                                    <h3 className="cal-agenda-item-title">{item.title}</h3>
                                  </div>

                                  <div className="cal-agenda-item-meta">
                                    <span>
                                      <Clock size={13} color="#22d3ee" />
                                      {item.eventTime || item.time || 'Schedule TBD'}
                                    </span>
                                    {item.venue && (
                                      <span>
                                        <MapPin size={13} color="#38bdf8" />
                                        {item.venue}
                                      </span>
                                    )}
                                    {item.department && (
                                      <span>
                                        <Building2 size={13} />
                                        {item.department?.name || item.department}
                                      </span>
                                    )}
                                    {item.organizer && (
                                      <span>
                                        <Users size={13} />
                                        {item.organizer}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  className="cal-btn cal-btn-secondary"
                                  onClick={() => handleOpenDetails(item)}
                                  style={{ padding: '6px 14px', fontSize: '12px' }}
                                  type="button"
                                >
                                  <span>View Details</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Column: Selected Date Schedule & Upcoming Events */}
          <div className="cal-schedule-panel">
            {/* Selected Date Schedule Card */}
            <div className="cal-side-card">
              <div className="cal-side-header">
                <div className="cal-side-title-wrap">
                  <p className="cal-side-kicker">
                    {selectedDateKey === todayKey ? "Today's Schedule" : 'Date Schedule'}
                  </p>
                  <h3 className="cal-side-title">{formatDisplayDate(selectedDateKey)}</h3>
                </div>
                <span className="cal-side-count">
                  {selectedDateItems.length} {selectedDateItems.length === 1 ? 'activity' : 'activities'}
                </span>
              </div>

              {selectedDateItems.length === 0 ? (
                <div className="cal-empty-schedule">
                  <CalendarDays size={28} style={{ color: '#64748b', margin: '0 auto 6px' }} />
                  <p>No events scheduled for this date.</p>
                </div>
              ) : (
                <div className="cal-schedule-list">
                  {selectedDateItems.map((item, idx) => {
                    const cat = getEventCategory(item);
                    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;

                    return (
                      <div className="cal-schedule-card" key={item._id || item.id || idx}>
                        <div className="cal-schedule-top">
                          <span className={`cal-chip ${config.badgeClass}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                            {config.label}
                          </span>
                          <span className="cal-schedule-time">
                            <Clock size={12} />
                            {item.eventTime || item.time || 'All Day'}
                          </span>
                        </div>

                        <h4 className="cal-schedule-name">{item.title}</h4>

                        {item.venue && (
                          <div className="cal-schedule-location">
                            <MapPin size={12} color="#38bdf8" />
                            <span>{item.venue}</span>
                          </div>
                        )}

                        <div className="cal-schedule-footer">
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {item.department?.name || item.department || item.organizer || 'Campus Event'}
                          </span>
                          <button
                            className="cal-schedule-view-btn"
                            onClick={() => handleOpenDetails(item)}
                            type="button"
                          >
                            <span>View Details</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Events Compact Card */}
            <div className="cal-side-card">
              <div className="cal-side-header">
                <div className="cal-side-title-wrap">
                  <p className="cal-side-kicker">Upcoming Highlights</p>
                  <h3 className="cal-side-title">Next Activities</h3>
                </div>
                <Sparkles size={16} color="#22d3ee" />
              </div>

              {upcomingEventsPreview.length === 0 ? (
                <div className="cal-empty-schedule" style={{ padding: '16px' }}>
                  <p>No upcoming events found.</p>
                </div>
              ) : (
                <div className="cal-upcoming-list">
                  {upcomingEventsPreview.map((item, idx) => {
                    const dateKey = parseDateKey(item.eventDate || item.date || item.expiryDate);
                    const cat = getEventCategory(item);
                    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;

                    return (
                      <div
                        className="cal-upcoming-item"
                        key={item._id || item.id || idx}
                        onClick={() => {
                          setSelectedDateKey(dateKey);
                          handleOpenDetails(item);
                        }}
                      >
                        <div className="cal-upcoming-info">
                          <span className="cal-upcoming-title">{item.title}</span>
                          <span className="cal-upcoming-date">
                            <Clock size={11} />
                            {formatShortDate(dateKey)} • {item.eventTime || item.time || 'TBD'}
                          </span>
                        </div>
                        <span
                          className="cal-chip-dot"
                          style={{ background: config.dotColor }}
                          title={config.label}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Event Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '620px' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* Modal Header */}
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Schedule Item Details</p>
                  <h2>{selectedItem.title || 'Untitled Event'}</h2>
                  <div className="cal-modal-badge-group">
                    {(() => {
                      const cat = getEventCategory(selectedItem);
                      const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.event;
                      return (
                        <span className={`cal-chip ${config.badgeClass}`} style={{ padding: '2px 8px', fontSize: '11.5px' }}>
                          {config.label}
                        </span>
                      );
                    })()}
                    {isDateUpcoming(parseDateKey(selectedItem.eventDate || selectedItem.date || selectedItem.expiryDate)) ? (
                      <span className="track-badge status-in-progress">Upcoming</span>
                    ) : (
                      <span className="track-badge priority-low">Past Event</span>
                    )}
                    {selectedItem.isRegistered && (
                      <span className="track-badge status-resolved" style={{ padding: '2px 8px', fontSize: '11.5px' }}>
                        Registered
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="track-close-button"
                  onClick={() => setSelectedItem(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {/* Event Image if available */}
              {selectedItem.imageUrl && (
                <img
                  alt={selectedItem.title || 'Event'}
                  className="resource-modal-image"
                  src={selectedItem.imageUrl}
                  style={{ maxHeight: '220px', objectFit: 'cover', width: '100%', borderRadius: '12px', marginTop: '12px' }}
                />
              )}

              {/* Details Grid */}
              <div className="track-detail-grid" style={{ marginTop: '16px' }}>
                {modalLoading && (
                  <p>
                    <span>Status</span>Loading full event details...
                  </p>
                )}

                <p>
                  <span>Date</span>
                  {formatDisplayDate(parseDateKey(selectedItem.eventDate || selectedItem.date || selectedItem.expiryDate))}
                </p>

                <p>
                  <span>Time</span>
                  {selectedItem.eventTime || selectedItem.time || 'Not specified'}
                </p>

                <p>
                  <span>Venue</span>
                  {selectedItem.venue || 'Campus Venue'}
                </p>

                {selectedItem.department && (
                  <p>
                    <span>Department</span>
                    {selectedItem.department?.name || selectedItem.department}
                  </p>
                )}

                {selectedItem.organizer && (
                  <p>
                    <span>Organizer</span>
                    {selectedItem.organizer}
                  </p>
                )}

                <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    Description
                  </span>
                  <p style={{ color: '#e0f2fe', lineHeight: 1.6, margin: 0 }}>
                    {selectedItem.description || 'No description provided for this activity.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="cal-modal-actions">
                {role === 'admin' && !selectedItem._isNotice && (
                  <button
                    className="cal-btn cal-btn-primary"
                    onClick={() => {
                      setSelectedItem(null);
                      navigate('/admin/events');
                    }}
                    type="button"
                  >
                    <span>Manage in Admin Events</span>
                    <ExternalLink size={14} />
                  </button>
                )}

                {role === 'student' && !selectedItem._isNotice && (
                  <button
                    className="cal-btn cal-btn-secondary"
                    onClick={() => {
                      const isReg = selectedItem.isRegistered;
                      setSelectedItem(null);
                      navigate(isReg ? '/student/my-registrations' : '/student/events');
                    }}
                    type="button"
                  >
                    <span>{selectedItem.isRegistered ? 'View in My Registrations' : 'Browse in Events'}</span>
                    <ExternalLink size={14} />
                  </button>
                )}

                <button
                  className="complaint-submit-button"
                  onClick={() => setSelectedItem(null)}
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
    </AnimatedPage>
  );
}

export default CampusCalendarView;
