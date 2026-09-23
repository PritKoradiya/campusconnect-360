import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock3,
  Building2,
  FileText,
  MessageSquareText,
  Timer,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  User,
  ShieldCheck
} from 'lucide-react';
import { getComplaintTimeline } from '../../services/complaintService';

function formatTimelineDateTime(dateValue) {
  if (!dateValue) return 'Unknown date';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Unknown date';
    const dateStr = d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} • ${timeStr}`;
  } catch {
    return 'Unknown date';
  }
}

function getEventConfig(event) {
  const type = event.eventType;
  const status = (event.status || '').toLowerCase();

  if (type === 'COMPLAINT_RESOLVED' || status === 'resolved') {
    return {
      icon: CheckCircle2,
      badgeClass: 'status-resolved',
      dotClass: 'timeline-dot-resolved',
      accentColor: '#4ade80',
      label: 'Resolved'
    };
  }

  if (status === 'rejected') {
    return {
      icon: XCircle,
      badgeClass: 'status-rejected',
      dotClass: 'timeline-dot-rejected',
      accentColor: '#f87171',
      label: 'Rejected'
    };
  }

  if (type === 'COMPLAINT_REMARK_ADDED') {
    return {
      icon: MessageSquareText,
      badgeClass: 'status-remark',
      dotClass: 'timeline-dot-remark',
      accentColor: '#a855f7',
      label: 'Remark'
    };
  }

  if (type === 'COMPLAINT_ASSIGNED') {
    return {
      icon: Building2,
      badgeClass: 'status-assigned',
      dotClass: 'timeline-dot-assigned',
      accentColor: '#38bdf8',
      label: 'Assigned'
    };
  }

  if (type === 'COMPLAINT_STATUS_CHANGED' || status === 'in progress') {
    return {
      icon: Timer,
      badgeClass: 'status-in-progress',
      dotClass: 'timeline-dot-progress',
      accentColor: '#22d3ee',
      label: 'Status Updated'
    };
  }

  return {
    icon: FileText,
    badgeClass: 'status-pending',
    dotClass: 'timeline-dot-submitted',
    accentColor: '#fbbf24',
    label: 'Submitted'
  };
}

function getActorLabel(event) {
  const role = (event.actorRole || '').toLowerCase();
  const name = event.actorName || event.actor?.name;

  if (role === 'student') {
    return name ? `Student (${name})` : 'Student';
  }
  if (role === 'department') {
    const dept = event.departmentName || event.department?.name;
    if (dept && name) return `${dept} Staff (${name})`;
    if (dept) return `${dept} Staff`;
    if (name) return `Department Staff (${name})`;
    return 'Department Staff';
  }
  if (role === 'admin') {
    return name ? `Administrator (${name})` : 'Administrator';
  }
  if (role === 'system') {
    return 'System Automation';
  }

  return name || 'System';
}

function WorkflowProgressTracker({ currentStatus }) {
  const status = (currentStatus || 'Pending').toLowerCase();
  const isRejected = status === 'rejected';

  const steps = [
    { key: 'submitted', label: 'Submitted', sub: 'Ticket opened' },
    { key: 'in-progress', label: 'In Progress', sub: 'Department active' },
    { key: 'resolved', label: isRejected ? 'Rejected' : 'Resolved', sub: isRejected ? 'Ticket closed' : 'Issue resolved' }
  ];

  let activeIndex = 0;
  if (status === 'in progress') activeIndex = 1;
  if (status === 'resolved' || status === 'rejected') activeIndex = 2;

  return (
    <div className="timeline-workflow-container">
      <div className="timeline-workflow-header">
        <span className="timeline-workflow-label">CURRENT STATUS</span>
        <span className={`track-badge ${isRejected ? 'status-rejected' : status === 'resolved' ? 'status-resolved' : status === 'in progress' ? 'status-in-progress' : 'status-pending'}`}>
          {currentStatus || 'Pending'}
        </span>
      </div>

      <div className="timeline-stepper">
        {steps.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isStepRejected = isRejected && idx === 2;

          let nodeClass = 'stepper-node-pending';
          if (isDone) nodeClass = 'stepper-node-done';
          if (isCurrent) nodeClass = isStepRejected ? 'stepper-node-rejected' : 'stepper-node-active';

          return (
            <div key={step.key} className="timeline-stepper-step">
              <div className="timeline-stepper-node-row">
                {idx > 0 && (
                  <div
                    className={`timeline-stepper-line ${
                      idx <= activeIndex ? (isRejected && idx === 2 ? 'line-rejected' : 'line-active') : 'line-pending'
                    }`}
                  />
                )}
                <div className={`timeline-stepper-dot ${nodeClass}`}>
                  {isDone ? (
                    <CheckCircle2 size={14} />
                  ) : isStepRejected ? (
                    <XCircle size={14} />
                  ) : isCurrent ? (
                    <div className="stepper-dot-pulse" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`timeline-stepper-line ${
                      idx < activeIndex ? 'line-active' : 'line-pending'
                    }`}
                  />
                )}
              </div>
              <div className="timeline-stepper-text">
                <span className={`timeline-step-title ${isCurrent ? 'title-active' : isDone ? 'title-done' : ''}`}>
                  {step.label}
                </span>
                <span className="timeline-step-sub">{step.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComplaintTimeline({ complaintId, initialTimeline = null, initialComplaint = null }) {
  const [timelineEvents, setTimelineEvents] = useState(initialTimeline || []);
  const [currentStatus, setCurrentStatus] = useState(initialComplaint?.status || 'Pending');
  const [loading, setLoading] = useState(!initialTimeline || initialTimeline.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = earliest to newest (chronological flow)

  const targetId = useMemo(() => {
    if (typeof complaintId === 'string' && complaintId.trim()) return complaintId.trim();
    if (typeof complaintId === 'object' && complaintId !== null) {
      return complaintId._id || complaintId.id || complaintId.complaintId || '';
    }
    return initialComplaint?._id || initialComplaint?.id || '';
  }, [complaintId, initialComplaint]);

  useEffect(() => {
    if (initialTimeline && Array.isArray(initialTimeline) && initialTimeline.length > 0) {
      setTimelineEvents(initialTimeline);
      setLoading(false);
      setError('');
    }
  }, [initialTimeline]);

  useEffect(() => {
    if (initialComplaint?.status) {
      setCurrentStatus(initialComplaint.status);
    }
  }, [initialComplaint?.status]);

  const fetchTimeline = async (isManualRefresh = false) => {
    if (!targetId) {
      if (!initialTimeline?.length) {
        setLoading(false);
      }
      return;
    }

    if (isManualRefresh) {
      setRefreshing(true);
    } else if (!timelineEvents.length && !initialTimeline?.length) {
      setLoading(true);
    }
    setError('');

    try {
      const res = await getComplaintTimeline(targetId);
      const data = res.data;
      if (data?.timeline) {
        setTimelineEvents(data.timeline);
      }
      if (data?.currentStatus) {
        setCurrentStatus(data.currentStatus);
      }
    } catch (err) {
      console.error('Failed to fetch complaint timeline:', err);
      // If we already have timeline data from complaint details, preserve it
      if (timelineEvents.length > 0 || (initialTimeline && initialTimeline.length > 0)) {
        return;
      }
      if (err.response?.status === 403) {
        setError('You do not have authorization to view this complaint timeline.');
      } else if (err.response?.status === 404) {
        setError(err.response?.data?.message || 'Complaint not found.');
      } else {
        setError(err.response?.data?.message || 'Could not load complaint timeline history.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      fetchTimeline();
    }
  }, [targetId]);

  const sortedEvents = useMemo(() => {
    const list = [...timelineEvents];
    list.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [timelineEvents, sortOrder]);

  const hasRemarks = useMemo(() => {
    return timelineEvents.some(
      (e) => (e.remark && e.remark.trim().length > 0) || e.eventType === 'COMPLAINT_REMARK_ADDED'
    );
  }, [timelineEvents]);

  const hasAssignment = useMemo(() => {
    return (
      timelineEvents.some(
        (e) => e.eventType === 'COMPLAINT_ASSIGNED' || (e.department && e.departmentName)
      ) || currentStatus !== 'Pending'
    );
  }, [timelineEvents, currentStatus]);

  return (
    <div className="complaint-timeline-wrapper">
      <WorkflowProgressTracker currentStatus={currentStatus} />

      <div className="timeline-header-bar">
        <div className="timeline-title-group">
          <div className="timeline-title-icon">
            <Clock3 size={18} />
          </div>
          <div>
            <h3 className="timeline-main-heading">Complaint Lifecycle Timeline</h3>
            <p className="timeline-subheading">
              Chronological history of status updates, assignments, and remarks
            </p>
          </div>
        </div>

        <div className="timeline-controls">
          <button
            type="button"
            className="timeline-sort-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Currently: Earliest first' : 'Currently: Newest first'}
          >
            <ArrowUpDown size={14} />
            <span>{sortOrder === 'asc' ? 'Earliest First' : 'Newest First'}</span>
          </button>

          <button
            type="button"
            className={`timeline-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchTimeline(true)}
            disabled={refreshing || loading}
            title="Refresh timeline"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="timeline-loading-container">
          <div className="timeline-skeleton-item">
            <div className="skeleton-dot" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-desc" />
            </div>
          </div>
          <div className="timeline-skeleton-item">
            <div className="skeleton-dot" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-desc" />
            </div>
          </div>
          <div className="timeline-skeleton-item">
            <div className="skeleton-dot" />
            <div className="skeleton-content">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-desc" />
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="timeline-error-card">
          <AlertCircle size={20} />
          <div className="timeline-error-body">
            <strong>Unable to Load Timeline</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="timeline-retry-button"
            onClick={() => fetchTimeline(true)}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sortedEvents.length === 0 && (
        <div className="timeline-empty-notice">
          <Clock3 size={28} />
          <h4>No Timeline Events Yet</h4>
          <p>Timeline history will appear as your complaint progresses through department review.</p>
        </div>
      )}

      {!loading && !error && sortedEvents.length > 0 && (
        <div className="timeline-events-list">
          <AnimatePresence initial={false}>
            {sortedEvents.map((event, index) => {
              const config = getEventConfig(event);
              const EventIcon = config.icon;
              const isLast = index === sortedEvents.length - 1;
              const formattedTime = formatTimelineDateTime(event.timestamp);
              const actorLabel = getActorLabel(event);
              const deptName = event.departmentName || event.department?.name;

              return (
                <motion.div
                  key={event._id || `event-${index}-${event.timestamp}`}
                  className="timeline-item"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                >
                  <div className="timeline-item-spine">
                    <div className={`timeline-event-dot ${config.dotClass}`}>
                      <EventIcon size={14} />
                    </div>
                    {!isLast && <div className="timeline-vertical-line" />}
                  </div>

                  <div className="timeline-item-card">
                    <div className="timeline-item-header">
                      <div className="timeline-item-title-row">
                        <h4 className="timeline-item-title">{event.title}</h4>
                        {event.status && (
                          <span className={`track-badge status-${event.status.toLowerCase().replaceAll(' ', '-')}`}>
                            {event.status}
                          </span>
                        )}
                      </div>
                      <span className="timeline-item-time">{formattedTime}</span>
                    </div>

                    {event.description && event.eventType !== 'COMPLAINT_REMARK_ADDED' && (
                      <p className="timeline-item-description">{event.description}</p>
                    )}

                    {event.remark && (
                      <div className="timeline-remark-box">
                        <div className="timeline-remark-top">
                          <MessageSquareText size={14} />
                          <span>Department Remark</span>
                        </div>
                        <p className="timeline-remark-text">"{event.remark}"</p>
                      </div>
                    )}

                    <div className="timeline-item-meta">
                      <span className="timeline-meta-pill">
                        <User size={12} />
                        <span>{actorLabel}</span>
                      </span>

                      {deptName && event.eventType !== 'COMPLAINT_SUBMITTED' && (
                        <span className="timeline-meta-pill dept-pill">
                          <Building2 size={12} />
                          <span>{deptName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Informative lifecycle context notes */}
      {!loading && !error && sortedEvents.length > 0 && (
        <div className="timeline-context-hints">
          {!hasAssignment && currentStatus === 'Pending' && (
            <div className="timeline-hint-pill">
              <Clock3 size={13} />
              <span>Waiting for department assignment</span>
            </div>
          )}
          {!hasRemarks && currentStatus !== 'Resolved' && (
            <div className="timeline-hint-pill">
              <MessageSquareText size={13} />
              <span>No department remarks added yet</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
