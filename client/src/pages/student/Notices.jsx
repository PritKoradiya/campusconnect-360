import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CalendarDays, Search, X } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getNoticeById, getNotices } from '../../services/noticeService';

const priorityOptions = ['All', 'Normal', 'Important', 'Urgent'];

function getList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.notices)) {
    return responseData.notices;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function getDetails(responseData) {
  return responseData?.notice || responseData?.data || responseData;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available';
  }

  return new Date(dateValue).toLocaleDateString();
}

function getPostedBy(notice) {
  return notice?.postedBy?.name || notice?.createdBy?.name || notice?.postedByName || 'Campus Admin';
}

function getTargetAudience(notice) {
  return notice?.targetAudience || notice?.audience || notice?.target || 'All';
}

function getPreview(text) {
  if (!text) {
    return 'No description available.';
  }

  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function Notices() {
  const [notices, setNotices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotices = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Session expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await getNotices();
        setNotices(getList(response.data));
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

    loadNotices();
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      const title = notice.title || '';
      const description = notice.description || '';
      const priority = notice.priority || 'Normal';
      const searchValue = searchText.toLowerCase();
      const matchesSearch = title.toLowerCase().includes(searchValue) || description.toLowerCase().includes(searchValue);
      const matchesPriority = priorityFilter === 'All' || priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [notices, searchText, priorityFilter]);

  const handleViewDetails = async (notice) => {
    const noticeId = notice._id || notice.id;

    if (!noticeId) {
      setSelectedNotice(notice);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedNotice(notice);

      const response = await getNoticeById(noticeId);
      setSelectedNotice(getDetails(response.data));
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
          <p className="dashboard-kicker">Campus Updates</p>
          <h1>Notices</h1>
          <p>Stay updated with important campus announcements and academic information.</p>
        </div>
        <span className="dashboard-role-pill">Student Notices</span>
      </AnimatedCard>

      <AnimatedCard className="track-filter-card" delay={0.14} hover={false}>
        <label className="complaint-field">
          <span>Search notices</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by title or description..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        <label className="complaint-field">
          <span>Filter by priority</span>
          <select onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
      </AnimatedCard>

      {loading && <AnimatedCard className="dashboard-panel" delay={0.2} hover={false}>Loading notices...</AnimatedCard>}
      {error && <AnimatedCard className="dashboard-panel complaint-error-message" delay={0.2} hover={false}>{error}</AnimatedCard>}

      {!loading && !error && filteredNotices.length > 0 && (
        <div className="resource-card-grid">
          {filteredNotices.map((notice, index) => (
            <AnimatedCard className="resource-card" delay={0.22 + index * 0.06} key={notice._id || notice.id || notice.title}>
              <div className="resource-card-top">
                <span className={`resource-badge notice-${(notice.priority || 'Normal').toLowerCase()}`}>
                  {notice.priority || 'Normal'}
                </span>
                <Bell size={19} />
              </div>
              <h2>{notice.title || 'Untitled notice'}</h2>
              <p>{getPreview(notice.description)}</p>
              <div className="resource-meta">
                <span>Audience: {getTargetAudience(notice)}</span>
                <span>Posted: {formatDate(notice.createdAt || notice.postedAt)}</span>
                <span>Expires: {notice.expiryDate ? formatDate(notice.expiryDate) : 'Not available'}</span>
                <span>Posted by: {getPostedBy(notice)}</span>
              </div>
              <button className="track-action-button" onClick={() => handleViewDetails(notice)} type="button">
                View Details
              </button>
            </AnimatedCard>
          ))}
        </div>
      )}

      {!loading && !error && filteredNotices.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.22} hover={false}>No notices available right now.</AnimatedCard>
      )}

      {selectedNotice && (
        <motion.div animate={{ opacity: 1 }} className="track-modal-backdrop" initial={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div animate={{ opacity: 1, scale: 1, y: 0 }} className="track-modal-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="track-modal-heading">
              <div>
                <p className="dashboard-kicker">Notice Details</p>
                <h2>{selectedNotice.title || 'Untitled notice'}</h2>
              </div>
              <button className="track-close-button" onClick={() => setSelectedNotice(null)} type="button">
                <X size={19} />
              </button>
            </div>
            <div className="track-detail-grid">
              {modalLoading && <p><span>Loading</span>Loading notice details...</p>}
              <p><span>Description</span>{selectedNotice.description || 'No description available.'}</p>
              <p><span>Priority</span>{selectedNotice.priority || 'Normal'}</p>
              <p><span>Target audience</span>{getTargetAudience(selectedNotice)}</p>
              <p><span>Expiry date</span>{selectedNotice.expiryDate ? formatDate(selectedNotice.expiryDate) : 'Not available'}</p>
              <p><span>Posted by</span>{getPostedBy(selectedNotice)}</p>
              <p><span>Created date</span>{formatDate(selectedNotice.createdAt || selectedNotice.postedAt)}</p>
            </div>
            <button className="complaint-submit-button" onClick={() => setSelectedNotice(null)} type="button">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatedPage>
  );
}

export default Notices;
