import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  Info,
  MessageSquare,
  RotateCw,
  Search,
  UserCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, offNotification, onNotification } from '../../services/socket';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../../services/notificationService';

const getTypeIcon = (type) => {
  switch (type) {
    case 'COMPLAINT_CREATED':
      return <ClipboardList size={16} className="notif-type-icon notif-type-complaint" />;
    case 'COMPLAINT_ASSIGNED':
      return <UserCheck size={16} className="notif-type-icon notif-type-assigned" />;
    case 'COMPLAINT_STATUS':
      return <Activity size={16} className="notif-type-icon notif-type-status" />;
    case 'COMPLAINT_RESOLVED':
      return <CheckCircle2 size={16} className="notif-type-icon notif-type-resolved" />;
    case 'COMPLAINT_REMARK':
      return <MessageSquare size={16} className="notif-type-icon notif-type-remark" />;
    case 'NOTICE_CREATED':
    case 'NOTICE_UPDATED':
      return <Bell size={16} className="notif-type-icon notif-type-notice" />;
    case 'EVENT_CREATED':
    case 'EVENT_UPDATED':
      return <Calendar size={16} className="notif-type-icon notif-type-event" />;
    case 'LOST_FOUND_UPDATE':
      return <Search size={16} className="notif-type-icon notif-type-lostfound" />;
    case 'SYSTEM':
    default:
      return <Info size={16} className="notif-type-icon notif-type-system" />;
  }
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function NotificationBell() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);

  const containerRef = useRef(null);

  // Fetch initial unread count on mount or when token/user changes
  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      disconnectSocket();
      return;
    }

    let isMounted = true;

    const fetchCount = async () => {
      try {
        const data = await getUnreadCount();
        if (isMounted && typeof data.count === 'number') {
          setUnreadCount(data.count);
        }
      } catch (err) {
        // Safe fallback; app continues without crashing
      }
    };

    fetchCount();

    // Connect Socket.IO
    connectSocket(token);

    const handleNewNotification = (newNotif) => {
      if (!isMounted) return;

      if (!newNotif.isRead) {
        setUnreadCount((prev) => prev + 1);
      }

      // Trigger subtle bell pulse animation
      setIsAnimating(true);
      setTimeout(() => {
        if (isMounted) setIsAnimating(false);
      }, 900);

      // Highlight new notification item briefly
      setHighlightedId(newNotif._id);
      setTimeout(() => {
        if (isMounted) setHighlightedId(null);
      }, 4000);

      // Prepend to open preview list without duplicates
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === newNotif._id);
        if (exists) {
          return prev.map((item) => (item._id === newNotif._id ? newNotif : item));
        }
        return [newNotif, ...prev.slice(0, 6)];
      });
    };

    onNotification(handleNewNotification);

    return () => {
      isMounted = false;
      offNotification(handleNewNotification);
    };
  }, [user, token]);

  const loadRecent = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(false);
    try {
      const data = await getNotifications({ limit: 7 });
      if (data?.notifications) {
        setNotifications(data.notifications);
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load preview notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadRecent();
    }
  }, [isOpen, loadRecent]);

  // Handle outside click & Escape key to close preview
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (e, notification) => {
    e.stopPropagation();
    if (notification.isRead) return;

    try {
      await markNotificationAsRead(notification._id);

      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // API error handled safely
    }
  };

  const handleItemClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Safe fallback
      }
    }

    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      // Handled safely
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  if (!user) {
    return null;
  }

  const badgeText = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <div className="notif-bell-wrapper" ref={containerRef}>
      <motion.button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications (${unreadCount} unread)`}
        className={`notif-bell-button ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          animate={
            isAnimating
              ? {
                  rotate: [0, -14, 14, -10, 10, -4, 4, 0],
                  scale: [1, 1.15, 1.1, 1]
                }
              : { rotate: 0, scale: 1 }
          }
          className="notif-bell-icon"
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <Bell size={18} />
        </motion.span>

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              animate={{ scale: 1, opacity: 1 }}
              className="notif-unread-badge"
              exit={{ scale: 0, opacity: 0 }}
              initial={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {badgeText}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="Notifications"
            className="notif-preview-panel"
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            role="dialog"
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="notif-preview-header">
              <div className="notif-header-title-row">
                <span className="notif-title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="notif-unread-pill">{unreadCount} unread</span>
                )}
              </div>
              <div className="notif-header-actions-row">
                {unreadCount > 0 && (
                  <button
                    className="notif-mark-all-btn"
                    disabled={isMarkingAll}
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    type="button"
                  >
                    <CheckCheck size={14} />
                    <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
                  </button>
                )}
                <button
                  aria-label="Close notifications panel"
                  className="notif-close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="notif-preview-list">
              {loading ? (
                <div className="notif-preview-skeleton-list">
                  {[1, 2, 3].map((i) => (
                    <div className="notif-skeleton-item" key={i}>
                      <div className="notif-skeleton-icon" />
                      <div className="notif-skeleton-content">
                        <div className="notif-skeleton-line notif-skeleton-title" />
                        <div className="notif-skeleton-line notif-skeleton-msg" />
                        <div className="notif-skeleton-line notif-skeleton-time" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="notif-preview-error">
                  <AlertCircle className="notif-error-icon" size={26} />
                  <p className="notif-error-title">Unable to load notifications</p>
                  <p className="notif-error-desc">Please check your connection and try again.</p>
                  <button
                    className="notif-retry-btn"
                    onClick={loadRecent}
                    type="button"
                  >
                    <RotateCw size={13} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notif-preview-empty">
                  <div className="notif-empty-icon-wrap">
                    <Bell className="notif-empty-icon" size={24} />
                  </div>
                  <p className="notif-empty-title">No notifications yet</p>
                  <p className="notif-empty-desc">You're all caught up.</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isHighlighted = item._id === highlightedId;
                  return (
                    <motion.div
                      aria-label={`${item.title}. ${item.message}. ${formatRelativeTime(item.createdAt)}. ${item.isRead ? 'Read' : 'Unread'}`}
                      className={`notif-item ${item.isRead ? 'read' : 'unread'} ${isHighlighted ? 'highlighted' : ''}`}
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
                      <div className="notif-item-icon-col">{getTypeIcon(item.type)}</div>
                      <div className="notif-item-body">
                        <div className="notif-item-top">
                          <span className="notif-item-title">{item.title}</span>
                          <span className="notif-item-time">
                            <Clock size={11} />
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="notif-item-message">{item.message}</p>
                        {item.link && (
                          <span className="notif-item-link-hint">
                            <span>View details</span>
                            <ExternalLink size={11} />
                          </span>
                        )}
                      </div>
                      {!item.isRead && (
                        <button
                          aria-label="Mark notification as read"
                          className="notif-item-read-indicator"
                          onClick={(e) => handleMarkAsRead(e, item)}
                          title="Mark as read"
                          type="button"
                        >
                          <span className="notif-unread-dot" />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="notif-preview-footer">
              <button
                className="notif-view-all-btn"
                onClick={handleViewAll}
                type="button"
              >
                <span>View all notifications</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
