import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  PackageSearch,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getStudentActivityFeed } from '../../services/activityService';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Activity', icon: Activity },
  { id: 'complaint', label: 'Complaints', icon: FileText },
  { id: 'event', label: 'Events & Attendance', icon: CalendarDays },
  { id: 'lost_found', label: 'Lost & Found', icon: PackageSearch },
  { id: 'profile', label: 'Profile', icon: UserCircle }
];

const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const formatFullDate = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Group items into Today, Yesterday, This Week, Earlier
const getDateGroup = (dateInput) => {
  if (!dateInput) return 'Earlier';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today - itemDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return 'This Week';
  return 'Earlier';
};

const getEventBadgeMeta = (activity) => {
  const { sourceType, eventType } = activity;

  if (sourceType === 'complaint') {
    if (eventType === 'COMPLAINT_RESOLVED') {
      return { label: 'Resolved', tone: 'success' };
    }
    if (eventType === 'COMPLAINT_IN_PROGRESS' || eventType === 'COMPLAINT_STATUS_CHANGED') {
      return { label: 'In Progress', tone: 'cyan' };
    }
    if (eventType === 'COMPLAINT_ASSIGNED') {
      return { label: 'Assigned', tone: 'blue' };
    }
    if (eventType === 'COMPLAINT_REMARK_ADDED') {
      return { label: 'Remark Added', tone: 'purple' };
    }
    return { label: 'Submitted', tone: 'warning' };
  }

  if (sourceType === 'event') {
    if (eventType === 'EVENT_ATTENDED') {
      return { label: 'Attended', tone: 'success' };
    }
    if (eventType === 'EVENT_REGISTRATION_CANCELLED') {
      return { label: 'Cancelled', tone: 'danger' };
    }
    return { label: 'Registered', tone: 'cyan' };
  }

  if (sourceType === 'lost_found') {
    if (eventType === 'LOST_ITEM_RESOLVED' || eventType === 'FOUND_ITEM_RESOLVED') {
      return { label: 'Resolved', tone: 'success' };
    }
    if (eventType === 'FOUND_ITEM_REPORTED') {
      return { label: 'Found Item', tone: 'cyan' };
    }
    return { label: 'Lost Item', tone: 'warning' };
  }

  if (sourceType === 'profile') {
    return { label: 'Profile', tone: 'blue' };
  }

  return { label: 'Update', tone: 'neutral' };
};

const getActivityIcon = (activity) => {
  const { sourceType, eventType } = activity;

  if (sourceType === 'complaint') {
    if (eventType === 'COMPLAINT_RESOLVED') return CheckCircle2;
    return FileText;
  }

  if (sourceType === 'event') {
    if (eventType === 'EVENT_ATTENDED') return UserCheck;
    if (eventType === 'EVENT_REGISTRATION_CANCELLED') return CalendarDays;
    return CalendarCheck;
  }

  if (sourceType === 'lost_found') {
    return PackageSearch;
  }

  if (sourceType === 'profile') {
    return UserCircle;
  }

  return Activity;
};

export default function StudentActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [counts, setCounts] = useState({ all: 0, complaint: 0, event: 0, lost_found: 0, profile: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1, hasMore: false });
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchActivities = async (tab = 'all', page = 1, isRefresh = false) => {
    try {
      if (page === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError('');

      const params = {
        category: tab,
        page,
        limit: 15
      };

      const res = await getStudentActivityFeed(params);
      const data = res.data?.data || res.data || {};

      const fetchedList = Array.isArray(data.activities) ? data.activities : [];
      const fetchedCounts = data.counts || { all: 0, complaint: 0, event: 0, lost_found: 0, profile: 0 };
      const fetchedPagination = data.pagination || { page, limit: 15, total: fetchedList.length, totalPages: 1, hasMore: false };

      if (page === 1) {
        setActivities(fetchedList);
      } else {
        setActivities((prev) => {
          // Deduplicate by ID
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNew = fetchedList.filter((item) => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
      }

      setCounts(fetchedCounts);
      setPagination(fetchedPagination);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load activity feed. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities(activeTab, 1);
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
  };

  const handleRefresh = () => {
    fetchActivities(activeTab, 1, true);
  };

  const handleLoadMore = () => {
    if (!pagination.hasMore || loadingMore) return;
    fetchActivities(activeTab, pagination.page + 1);
  };

  // Client-side text filter on title or description or meta
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const query = searchQuery.toLowerCase().trim();

    return activities.filter((act) => {
      const matchTitle = act.title?.toLowerCase().includes(query);
      const matchDesc = act.description?.toLowerCase().includes(query);
      const matchMetaDept = act.meta?.departmentName?.toLowerCase().includes(query);
      const matchMetaEvent = act.meta?.eventName?.toLowerCase().includes(query);
      const matchMetaItem = act.meta?.itemName?.toLowerCase().includes(query);
      const matchMetaLoc = act.meta?.location?.toLowerCase().includes(query);

      return matchTitle || matchDesc || matchMetaDept || matchMetaEvent || matchMetaItem || matchMetaLoc;
    });
  }, [activities, searchQuery]);

  // Group filtered activities by time bucket
  const groupedActivities = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: []
    };

    filteredActivities.forEach((act) => {
      const groupKey = getDateGroup(act.timestamp);
      if (groups[groupKey]) {
        groups[groupKey].push(act);
      } else {
        groups.Earlier.push(act);
      }
    });

    return groups;
  }, [filteredActivities]);

  return (
    <AnimatedPage>
      {/* 1. Header Banner */}
      <AnimatedCard className="dashboard-hero activity-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Student Portal</p>
          <h1>Activity Feed</h1>
          <p>
            Your comprehensive, real-time audit log of campus services, event participation,
            complaint updates, and lost &amp; found activities.
          </p>
        </div>
        <div className="activity-hero-actions">
          <button
            type="button"
            className="activity-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh activity feed"
          >
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <span className="dashboard-role-pill">Live Timeline</span>
        </div>
      </AnimatedCard>

      {/* 2. Controls & Filter Bar */}
      <div className="activity-toolbar-wrapper">
        <div className="activity-category-pills" role="tablist">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.id] ?? 0;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`activity-tab-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className="activity-pill-badge">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="activity-search-box">
          <Search size={16} className="activity-search-icon" />
          <input
            type="text"
            placeholder="Search in activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="activity-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="activity-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.1} hover={false}>
          <div className="activity-error-message">
            <AlertCircle size={20} />
            <div>
              <h3>Error Loading Feed</h3>
              <p>{error}</p>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* 4. Loading Skeleton */}
      {loading && (
        <div className="activity-skeleton-list">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="activity-skeleton-card">
              <div className="activity-skeleton-icon" />
              <div className="activity-skeleton-content">
                <div className="activity-skeleton-line short" />
                <div className="activity-skeleton-line medium" />
                <div className="activity-skeleton-line tiny" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Activity Feed List */}
      {!loading && filteredActivities.length === 0 && (
        <AnimatedCard className="activity-empty-card" delay={0.15} hover={false}>
          <div className="activity-empty-illustration">
            <Activity size={42} />
          </div>
          <h3>No Activity Found</h3>
          <p>
            {searchQuery
              ? `No activities match your search query "${searchQuery}".`
              : activeTab === 'all'
              ? 'You have not performed any campus activities yet. Submit complaints, register for events, or report lost items to see your history here.'
              : `No activity recorded in "${CATEGORY_TABS.find((t) => t.id === activeTab)?.label}".`}
          </p>
          {searchQuery ? (
            <button
              type="button"
              className="activity-clear-filter-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          ) : activeTab !== 'all' ? (
            <button
              type="button"
              className="activity-clear-filter-btn"
              onClick={() => setActiveTab('all')}
            >
              View All Activities
            </button>
          ) : null}
        </AnimatedCard>
      )}

      {!loading && filteredActivities.length > 0 && (
        <div className="activity-feed-container">
          {Object.entries(groupedActivities).map(([groupTitle, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={groupTitle} className="activity-group-section">
                <div className="activity-group-heading">
                  <span className="activity-group-title">{groupTitle}</span>
                  <span className="activity-group-count">{items.length}</span>
                  <div className="activity-group-divider" />
                </div>

                <div className="activity-group-items">
                  {items.map((act) => {
                    const IconComponent = getActivityIcon(act);
                    const badge = getEventBadgeMeta(act);

                    return (
                      <div key={act.id} className="activity-card-item">
                        {/* Timeline Icon Column */}
                        <div className="activity-icon-column">
                          <span className={`activity-icon-bubble tone-${badge.tone}`}>
                            <IconComponent size={18} />
                          </span>
                          <span className="activity-timeline-line" />
                        </div>

                        {/* Content Area */}
                        <div className="activity-card-body">
                          <div className="activity-card-top">
                            <div className="activity-title-row">
                              <h3 className="activity-item-title">{act.title}</h3>
                              <span className={`activity-badge tone-${badge.tone}`}>
                                {badge.label}
                              </span>
                            </div>

                            <span
                              className="activity-timestamp"
                              title={formatFullDate(act.timestamp)}
                            >
                              <Clock size={12} />
                              {formatRelativeTime(act.timestamp)}
                            </span>
                          </div>

                          {/* Description */}
                          {act.description && (
                            <p className="activity-item-desc">{act.description}</p>
                          )}

                          {/* Metadata Row / Chips */}
                          <div className="activity-meta-row">
                            {act.meta?.departmentName && (
                              <span className="activity-meta-chip">
                                Dept: <strong>{act.meta.departmentName}</strong>
                              </span>
                            )}
                            {act.meta?.eventName && (
                              <span className="activity-meta-chip">
                                Event: <strong>{act.meta.eventName}</strong>
                              </span>
                            )}
                            {act.meta?.checkInMethod && (
                              <span className="activity-meta-chip">
                                Check-in: <strong>{act.meta.checkInMethod}</strong>
                              </span>
                            )}
                            {act.meta?.itemName && (
                              <span className="activity-meta-chip">
                                Item: <strong>{act.meta.itemName}</strong>
                              </span>
                            )}
                            {act.meta?.location && (
                              <span className="activity-meta-chip">
                                Location: <strong>{act.meta.location}</strong>
                              </span>
                            )}
                            {act.meta?.status && (
                              <span className="activity-meta-chip">
                                Status: <strong>{act.meta.status}</strong>
                              </span>
                            )}

                            {/* Full formatted timestamp tooltip / subtitle */}
                            <span className="activity-full-date">
                              {formatFullDate(act.timestamp)}
                            </span>
                          </div>

                          {/* Action Button */}
                          {act.actionLink?.path && (
                            <div className="activity-action-footer">
                              <Link
                                to={act.actionLink.path}
                                className="activity-nav-btn"
                              >
                                <span>{act.actionLink.label || 'View Details'}</span>
                                <ExternalLink size={14} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 6. Pagination & Load More */}
          <div className="activity-pagination-footer">
            <span className="activity-pagination-info">
              Showing {filteredActivities.length} of {pagination.total || activities.length} activities
            </span>

            {pagination.hasMore && (
              <button
                type="button"
                className="activity-load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <>
                    <span>Load Earlier Activities</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </AnimatedPage>
  );
}
