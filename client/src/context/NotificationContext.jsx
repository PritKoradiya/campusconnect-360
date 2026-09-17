import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, offNotification, onNotification } from '../services/socket';
import {
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../services/notificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isBellAnimating, setIsBellAnimating] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [latestNewNotification, setLatestNewNotification] = useState(null);
  const [lastReadNotificationId, setLastReadNotificationId] = useState(null);
  const [allMarkedReadAt, setAllMarkedReadAt] = useState(null);

  // Sync unread count and socket connection with auth state
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
        if (isMounted && typeof data?.count === 'number') {
          setUnreadCount(data.count);
        }
      } catch (err) {
        // Safe fallback; app continues without crashing
      }
    };

    fetchCount();
    connectSocket(token);

    const handleNewNotification = (newNotif) => {
      if (!isMounted) return;

      if (!newNotif.isRead) {
        setUnreadCount((prev) => prev + 1);
      }

      // Bell ring animation trigger
      setIsBellAnimating(true);
      setTimeout(() => {
        if (isMounted) setIsBellAnimating(false);
      }, 900);

      setLatestNewNotification(newNotif);
    };

    onNotification(handleNewNotification);

    return () => {
      isMounted = false;
      offNotification(handleNewNotification);
    };
  }, [user, token]);

  const markAsRead = useCallback(async (id) => {
    if (!id) return false;
    try {
      await markNotificationAsRead(id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setLastReadNotificationId(id);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (isMarkingAll || unreadCount === 0) return false;
    setIsMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setAllMarkedReadAt(Date.now());
      return true;
    } catch (err) {
      return false;
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, unreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getUnreadCount();
      if (typeof data?.count === 'number') {
        setUnreadCount(data.count);
      }
    } catch {
      // Safe fallback
    }
  }, [token]);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
      isBellAnimating,
      isMarkingAll,
      latestNewNotification,
      lastReadNotificationId,
      allMarkedReadAt,
      markAsRead,
      markAllAsRead,
      refreshUnreadCount
    }),
    [
      unreadCount,
      isBellAnimating,
      isMarkingAll,
      latestNewNotification,
      lastReadNotificationId,
      allMarkedReadAt,
      markAsRead,
      markAllAsRead,
      refreshUnreadCount
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }

  return context;
};

export default NotificationContext;
