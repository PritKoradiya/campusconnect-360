import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MessageSquare,
  RotateCw,
  Search,
  UserCheck
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getNotifications } from '../../services/notificationService';

const FILTER_TABS = [
  { id: 'All', label: 'All' },
  { id: 'Unread', label: 'Unread' },
  { id: 'Complaints', label: 'Complaints' },
  { id: 'Notices', label: 'Notices' },
  { id: 'Events', label: 'Events' },
  { id: 'System', label: 'System' }
];

const getTypeIcon = (type) => {
  switch (type) {
    case 'COMPLAINT_CREATED':
      return <ClipboardList size={18} className="notif-type-icon notif-type-complaint" />;
    case 'COMPLAINT_ASSIGNED':
      return <UserCheck size={18} className="notif-type-icon notif-type-assigned" />;
    case 'COMPLAINT_STATUS':
      return <Activity size={18} className="notif-type-icon notif-type-status" />;
    case 'COMPLAINT_RESOLVED':
      return <CheckCircle2 size={18} className="notif-type-icon notif-type-resolved" />;
    case 'COMPLAINT_REMARK':
      return <MessageSquare size={18} className="notif-type-icon notif-type-remark" />;
    case 'NOTICE_CREATED':
    case 'NOTICE_UPDATED':
      return <Bell size={18} className="notif-type-icon notif-type-notice" />;
    case 'EVENT_CREATED':
    case 'EVENT_UPDATED':
      return <Calendar size={18} className="notif-type-icon notif-type-event" />;
    case 'LOST_FOUND_UPDATE':
      return <Search size={18} className="notif-type-icon notif-type-lostfound" />;
    case 'SYSTEM':
    default:
      return <Info size={18} className="notif-type-icon notif-type-system" />;
  }
};

const getCategoryLabel = (type) => {
  if (!type) return 'System';
  if (type.startsWith('COMPLAINT_')) return 'Complaint';
  if (type.startsWith('NOTICE_')) return 'Notice';
  if (type.startsWith('EVENT_')) return 'Event';
  if (type === 'LOST_FOUND_UPDATE') return 'Lost & Found';
  return 'System';
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return '1 min ago';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const resolveNotificationLink = (item, role) => {
  if (item.link && typeof item.link === 'string' && item.link.trim() !== '') {
    return item.link.trim();
  }

  const type = item.type || '';
  if (type.startsWith('COMPLAINT_')) {
    if (role === 'admin') return '/admin/complaints';
    if (role === 'department') return '/department/complaints';
    return '/student/my-complaints';
  }
  if (type.startsWith('NOTICE_')) {
    if (role === 'admin') return '/admin/notices';
    return '/student/notices';
  }
  if (type.startsWith('EVENT_')) {
    if (role === 'admin') return '/admin/events';
    return '/student/events';
  }
  if (type.startsWith('LOST_FOUND_')) {
    if (role === 'admin') return '/admin/reports';
    return '/student/lost-found';
  }
  return null;
};

const getEmptyStateMessage = (filter) => {
  switch (filter) {
    case 'Unread':
      return {
        title: 'No unread notifications',
        subtitle: "You're all caught up with your campus alerts."
      };
    case 'Complaints':
      return {
        title: 'No complaint notifications',
        subtitle: 'You do not have any complaint updates at this time.'
      };
    case 'Notices':
      return {
        title: 'No notice notifications',
        subtitle: 'No campus notices have been published yet.'
      };
    case 'Events':
      return {
        title: 'No event notifications',
        subtitle: 'No upcoming event announcements at this time.'
      };
    case 'System':
      return {
        title: 'No system notifications',
        subtitle: 'No system messages to show.'
      };
    case 'All':
    default:
      return {
        title: 'No notifications yet',
        subtitle: "You're all caught up."
      };
  }
};

function NotificationsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const {
    unreadCount,
    isMarkingAll,
    latestNewNotification,
    lastReadNotificationId,
    allMarkedReadAt,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [highlightedId, setHighlightedId] = useState(null);

  // Fetch initial notifications
  const fetchPage = useCallback(
    async (pageToLoad = 1, isAppend = false) => {
      if (!token) return;

      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const data = await getNotifications({ page: pageToLoad, limit: 20 });
        if (data?.notifications) {
          if (isAppend) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n._id));
              const uniqueNew = data.notifications.filter((n) => !existingIds.has(n._id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setNotifications(data.notifications);
          }

          if (data.pagination) {
            setPagination(data.pagination);
          }
          if (typeof data.total === 'number') {
            setTotalCount(data.total);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load notifications');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  // Real-time synchronization when socket delivers a new notification
  useEffect(() => {
    if (!latestNewNotification) return;

    setHighlightedId(latestNewNotification._id);
    const timer = setTimeout(() => setHighlightedId(null), 4000);

    setNotifications((prev) => {
      const exists = prev.some((item) => item._id === latestNewNotification._id);
      if (exists) {
        return prev.map((item) => (item._id === latestNewNotification._id ? latestNewNotification : item));
      }
      return [latestNewNotification, ...prev];
    });
    setTotalCount((prev) => prev + 1);

    return () => clearTimeout(timer);
  }, [latestNewNotification]);

  // Synchronize when an individual item is marked read anywhere
  useEffect(() => {
    if (!lastReadNotificationId) return;
    setNotifications((prev) =>
      prev.map((item) => (item._id === lastReadNotificationId ? { ...item, isRead: true } : item))
    );
  }, [lastReadNotificationId]);

  // Synchronize when mark all read occurs anywhere
  useEffect(() => {
    if (!allMarkedReadAt) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }, [allMarkedReadAt]);

  const handleMarkItemRead = async (e, item) => {
    e.stopPropagation();
    if (item.isRead) return;

    await markAsRead(item._id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
    );
  };

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      await markAsRead(item._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
    }

    const destination = resolveNotificationLink(item, user?.role);
    if (destination) {
      navigate(destination);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleLoadMore = () => {
    if (!pagination.hasNextPage || loadingMore) return;
    fetchPage(pagination.page + 1, true);
  };

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Unread') return !item.isRead;
      if (activeFilter === 'Complaints') {
        return [
          'COMPLAINT_CREATED',
          'COMPLAINT_ASSIGNED',
          'COMPLAINT_STATUS',
          'COMPLAINT_RESOLVED',
          'COMPLAINT_REMARK'
        ].includes(item.type);
      }
      if (activeFilter === 'Notices') {
        return ['NOTICE_CREATED', 'NOTICE_UPDATED'].includes(item.type);
      }
      if (activeFilter === 'Events') {
        return ['EVENT_CREATED', 'EVENT_UPDATED'].includes(item.type);
      }
      if (activeFilter === 'System') {
        return ['SYSTEM', 'LOST_FOUND_UPDATE'].includes(item.type);
      }
      return true;
    });
  }, [notifications, activeFilter]);

  const emptyState = getEmptyStateMessage(activeFilter);

  return (
    <AnimatedPage className="dashboard-page notif-page-container">
      {/* Hero Header */}
      <AnimatedCard className="dashboard-hero notif-hero-card" delay={0.04} hover={false}>
        <div className="notif-hero-text">
          <p className="dashboard-kicker">Updates & Alerts</p>
          <h1>Notifications</h1>
          <p>Stay updated with everything relevant to your campus activity.</p>
        </div>
        <div className="notif-hero-actions">
          {unreadCount > 0 && (
            <span className="notif-unread-pill notif-unread-pill-large">
              {unreadCount} unread
            </span>
          )}
          <button
            className="notif-page-mark-all-btn"
            disabled={isMarkingAll || unreadCount === 0}
            onClick={handleMarkAllRead}
            type="button"
          >
            <CheckCheck size={16} />
            <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Filter Bar */}
      <AnimatedCard className="notif-filter-card" delay={0.08} hover={false}>
        <div className="notif-filter-bar" role="tablist" aria-label="Notification filters">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                aria-selected={isActive}
                className={`notif-filter-pill ${isActive ? 'active' : ''}`}
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                role="tab"
                type="button"
              >
                <span>{tab.label}</span>
                {tab.id === 'Unread' && unreadCount > 0 && (
                  <span className="notif-filter-badge">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </AnimatedCard>

      {/* Notification List Content */}
      <div className="notif-page-content">
        {loading ? (
          <div className="notif-page-skeleton-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="notif-page-skeleton-card" key={i}>
                <div className="notif-skeleton-icon notif-skeleton-icon-lg" />
                <div className="notif-skeleton-content">
                  <div className="notif-skeleton-line notif-skeleton-title" style={{ width: '45%' }} />
                  <div className="notif-skeleton-line notif-skeleton-msg" style={{ width: '85%' }} />
                  <div className="notif-skeleton-line notif-skeleton-time" style={{ width: '22%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <AnimatedCard className="notif-page-error-card" hover={false}>
            <AlertCircle className="notif-error-icon" size={32} />
            <h2>Unable to load notifications</h2>
            <p>{error}</p>
            <button className="notif-retry-btn" onClick={() => fetchPage(1, false)} type="button">
              <RotateCw size={14} />
              <span>Retry</span>
            </button>
          </AnimatedCard>
        ) : filteredNotifications.length === 0 ? (
          <AnimatedCard className="notif-page-empty-card" hover={false}>
            <div className="notif-empty-icon-wrap notif-empty-icon-wrap-lg">
              <Bell className="notif-empty-icon" size={28} />
            </div>
            <h2>{emptyState.title}</h2>
            <p>{emptyState.subtitle}</p>
          </AnimatedCard>
        ) : (
          <div className="notif-cards-stack">
            {filteredNotifications.map((item) => {
              const isHighlighted = item._id === highlightedId;
              const link = resolveNotificationLink(item, user?.role);
              const category = getCategoryLabel(item.type);

              return (
                <motion.article
                  aria-label={`${item.title}. ${item.message}. ${formatRelativeTime(item.createdAt)}. ${item.isRead ? 'Read' : 'Unread'}`}
                  className={`notif-card ${item.isRead ? 'read' : 'unread'} ${isHighlighted ? 'highlighted' : ''}`}
                  key={item._id}
                  layout="position"
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="notif-card-icon-wrapper">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="notif-card-main">
                    <div className="notif-card-header-row">
                      <h2 className="notif-card-title">{item.title}</h2>
                      <span className="notif-card-time">
                        <Clock size={12} />
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="notif-card-message">{item.message}</p>

                    <div className="notif-card-footer-row">
                      <div className="notif-card-tags">
                        <span className="notif-category-tag">{category}</span>
                        {link && (
                          <span className="notif-card-link-preview">
                            <span>Open details</span>
                            <ExternalLink size={12} />
                          </span>
                        )}
                      </div>

                      <div className="notif-card-actions">
                        {!item.isRead ? (
                          <button
                            aria-label="Mark notification as read"
                            className="notif-card-read-btn"
                            onClick={(e) => handleMarkItemRead(e, item)}
                            title="Mark as read"
                            type="button"
                          >
                            <span className="notif-unread-dot" />
                            <span>Mark read</span>
                          </button>
                        ) : (
                          <span className="notif-read-status-pill">
                            <Check size={12} />
                            <span>Read</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {link && (
                    <div className="notif-card-nav-arrow" aria-hidden="true">
                      <ChevronRight size={18} />
                    </div>
                  )}
                </motion.article>
              );
            })}

            {/* Pagination Controls */}
            {pagination.hasNextPage && (
              <div className="notif-load-more-section">
                <button
                  className="notif-load-more-btn"
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  type="button"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="notif-spin-icon" size={16} />
                      <span>Loading more notifications...</span>
                    </>
                  ) : (
                    <span>Load more notifications</span>
                  )}
                </button>
                <p className="notif-pagination-counter">
                  Showing {notifications.length} of {totalCount} notifications
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}

export default NotificationsPage;
