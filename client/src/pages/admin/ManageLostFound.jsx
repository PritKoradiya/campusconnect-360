import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  User,
  X,
  XCircle
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  getLostFoundById,
  getLostFoundItems,
  getLostFoundMatches,
  updateLostFoundStatus
} from '../../services/lostFoundService';

const typeOptions = ['All', 'Lost', 'Found'];
const statusOptions = ['All', 'Open', 'Claimed', 'Closed'];
const managementStatusOptions = ['Open', 'Claimed', 'Closed'];

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function getItemName(item) {
  return item?.itemName || item?.name || item?.title || 'Untitled item';
}

function getPostedByName(item) {
  return (
    item?.user?.name ||
    item?.postedBy?.name ||
    item?.createdBy?.name ||
    item?.postedByName ||
    'Student'
  );
}

function getPostedByEmail(item) {
  return item?.user?.email || item?.postedBy?.email || '';
}

function getPostedByEnrollment(item) {
  return item?.user?.enrollmentNo || item?.postedBy?.enrollmentNo || '';
}

function getPreview(text) {
  if (!text) return 'No description available.';
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
}

function getBadgeClass(prefix, value) {
  return `lostfound-badge ${prefix}-${(value || '').toLowerCase()}`;
}

function ManageLostFound() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Smart Matching states inside modal
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState('');

  const loadAllItems = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await getLostFoundItems({ includeClosed: true });
      const rawList = response.data?.items || response.data || [];
      setItems(Array.isArray(rawList) ? rawList : []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view Lost & Found management.');
      } else {
        setError(err.response?.data?.message || 'Failed to load lost and found records');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllItems();
  }, []);

  const loadMatches = async (itemId) => {
    if (!itemId) {
      setMatches([]);
      return;
    }

    try {
      setMatchesLoading(true);
      setMatchesError('');
      const response = await getLostFoundMatches(itemId);
      setMatches(response.data?.matches || []);
    } catch (err) {
      if (err.response?.status !== 404) {
        setMatchesError(err.response?.data?.message || 'Could not load smart matches at this time.');
      }
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    const itemId = selectedItem?._id || selectedItem?.id;
    if (itemId) {
      loadMatches(itemId);
    } else {
      setMatches([]);
      setMatchesError('');
    }
  }, [selectedItem?._id, selectedItem?.id]);

  // Statistics dynamically calculated from actual items
  const summaryStats = useMemo(() => {
    const total = items.length;
    const lost = items.filter((item) => item.type === 'Lost').length;
    const found = items.filter((item) => item.type === 'Found').length;
    const open = items.filter((item) => (item.status || 'Open') === 'Open').length;
    const claimed = items.filter((item) => item.status === 'Claimed').length;
    const closed = items.filter((item) => item.status === 'Closed').length;

    return { total, lost, found, open, claimed, closed };
  }, [items]);

  const summaryCards = [
    { label: 'Total Items', value: summaryStats.total, icon: ClipboardList, tone: 'blue' },
    { label: 'Lost Items', value: summaryStats.lost, icon: PackageSearch, tone: 'warning' },
    { label: 'Found Items', value: summaryStats.found, icon: PackageCheck, tone: 'success' },
    { label: 'Open Items', value: summaryStats.open, icon: Search, tone: 'cyan' },
    { label: 'Claimed Items', value: summaryStats.claimed, icon: CheckCircle2, tone: 'success' },
    { label: 'Closed Items', value: summaryStats.closed, icon: XCircle, tone: 'blue' }
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchText.toLowerCase().trim();
      const type = item.type || 'Lost';
      const status = item.status || 'Open';

      const matchesSearch =
        !q ||
        getItemName(item).toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        getPostedByName(item).toLowerCase().includes(q) ||
        getPostedByEnrollment(item).toLowerCase().includes(q) ||
        getPostedByEmail(item).toLowerCase().includes(q);

      const matchesType = typeFilter === 'All' || type === typeFilter;
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchText, typeFilter, statusFilter]);

  const handleResetFilters = () => {
    setSearchText('');
    setTypeFilter('All');
    setStatusFilter('All');
  };

  const handleViewDetails = async (item) => {
    const itemId = item._id || item.id;
    if (!itemId) {
      setSelectedItem(item);
      return;
    }

    try {
      setModalLoading(true);
      setSelectedItem(item);

      const response = await getLostFoundById(itemId);
      setSelectedItem(response.data?.item || response.data || item);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load item details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    try {
      setStatusUpdatingId(itemId);
      setError('');
      setSuccess('');

      await updateLostFoundStatus(itemId, newStatus);
      setSuccess(`Report status updated to ${newStatus} successfully.`);

      // Optimistically update local item list
      setItems((prev) =>
        prev.map((i) => ((i._id || i.id) === itemId ? { ...i, status: newStatus } : i))
      );

      // If modal is open for this item, update its status as well
      if (selectedItem && (selectedItem._id || selectedItem.id) === itemId) {
        setSelectedItem((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to update lost and found status');
      }
    } finally {
      setStatusUpdatingId('');
    }
  };

  return (
    <AnimatedPage>
      {/* Header Banner */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Admin Control</p>
          <h1>Lost & Found Management</h1>
          <p>
            Manage campus lost and found reports, review item status, and monitor recovery activity.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="dashboard-role-pill">Admin View</span>
          <button
            className="smart-matches-refresh-btn"
            disabled={loading}
            onClick={loadAllItems}
            title="Refresh reports"
            type="button"
          >
            <RefreshCw className={loading ? 'spin' : ''} size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Summary Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedCard
              className={`dashboard-stat-card tone-${card.tone}`}
              delay={0.08 + index * 0.05}
              key={card.label}
            >
              <span className="dashboard-card-icon">
                <Icon size={22} />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{loading ? '-' : card.value}</strong>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      {/* Search and Filters Card */}
      <AnimatedCard className="track-filter-card" delay={0.18} hover={false}>
        <label className="complaint-field">
          <span>Search reports</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by item name, location, description, or student..."
              type="text"
              value={searchText}
            />
          </div>
        </label>

        <label className="complaint-field">
          <span>Filter by type</span>
          <select onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="complaint-field">
          <span>Filter by status</span>
          <select onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {(searchText || typeFilter !== 'All' || statusFilter !== 'All') && (
          <div style={{ alignSelf: 'flex-end', paddingBottom: '4px' }}>
            <button
              className="complaint-secondary-button"
              onClick={handleResetFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              type="button"
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>
          </div>
        )}
      </AnimatedCard>

      {/* Notifications / Alerts */}
      {success && (
        <AnimatedCard className="dashboard-panel" delay={0.2} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#86efac' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        </AnimatedCard>
      )}

      {error && (
        <AnimatedCard className="dashboard-panel complaint-error-message" delay={0.2} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </AnimatedCard>
      )}

      {loading && (
        <AnimatedCard className="dashboard-panel" delay={0.22} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#a5f3fc' }}>
            <Search className="spin" size={18} />
            <span>Loading Lost & Found reports...</span>
          </div>
        </AnimatedCard>
      )}

      {/* Populated Table */}
      {!loading && filteredItems.length > 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.24} hover={false}>
          <div className="track-table-wrap">
            <table className="track-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Item Date</th>
                  <th>Reported By</th>
                  <th>Status</th>
                  <th>Smart Match</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const itemId = item._id || item.id;

                  return (
                    <motion.tr
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={itemId}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Item Cell */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.imageUrl ? (
                            <img
                              alt={getItemName(item)}
                              src={item.imageUrl}
                              style={{
                                width: '42px',
                                height: '42px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                flexShrink: 0
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '6px',
                                background: 'rgba(15, 30, 51, 0.8)',
                                border: '1px solid rgba(56, 189, 248, 0.18)',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#94a3b8',
                                flexShrink: 0
                              }}
                            >
                              <Search size={18} />
                            </div>
                          )}
                          <div style={{ display: 'grid', gap: '2px', minWidth: '0' }}>
                            <strong style={{ color: '#ffffff', fontSize: '14px' }}>
                              {getItemName(item)}
                            </strong>
                            <span
                              style={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '240px'
                              }}
                            >
                              {getPreview(item.description)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td>
                        <span className={getBadgeClass('lostfound-type', item.type || 'Lost')}>
                          {item.type || 'Lost'}
                        </span>
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                          {item.location || 'Not specified'}
                        </span>
                      </td>

                      {/* Item Date */}
                      <td>
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                          {formatDate(item.itemDate || item.date)}
                        </span>
                      </td>

                      {/* Reported By */}
                      <td>
                        <div style={{ display: 'grid', gap: '2px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 650, fontSize: '13px' }}>
                            {getPostedByName(item)}
                          </span>
                          {getPostedByEnrollment(item) && (
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                              {getPostedByEnrollment(item)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Select */}
                      <td>
                        <select
                          className="lostfound-status-select"
                          disabled={statusUpdatingId === itemId}
                          onChange={(e) => handleStatusChange(itemId, e.target.value)}
                          value={item.status || 'Open'}
                        >
                          {managementStatusOptions.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Smart Match Review Action */}
                      <td>
                        <button
                          className="smart-matches-refresh-btn"
                          onClick={() => handleViewDetails(item)}
                          style={{ fontSize: '12px', padding: '5px 10px' }}
                          title="Review potential recovery matches"
                          type="button"
                        >
                          <Sparkles size={13} style={{ color: '#22d3ee' }} />
                          <span>Review Matches</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td>
                        <button
                          className="track-action-button"
                          onClick={() => handleViewDetails(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '12.5px'
                          }}
                          type="button"
                        >
                          <Eye size={14} />
                          <span>Details</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AnimatedCard>
      )}

      {/* Empty States */}
      {!loading && items.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.24} hover={false}>
          <div className="smart-match-empty-box">
            <h4>No Lost & Found reports available.</h4>
            <p>Reports submitted by students will appear here for review and status management.</p>
          </div>
        </AnimatedCard>
      )}

      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.24} hover={false}>
          <div className="smart-match-empty-box">
            <h4>No reports match your search criteria.</h4>
            <p>Try adjusting your search terms or filters to find records.</p>
            <div style={{ marginTop: '10px' }}>
              <button
                className="complaint-secondary-button"
                onClick={handleResetFilters}
                type="button"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Details & Smart Match Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            animate={{ opacity: 1 }}
            className="track-modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="track-modal-card"
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="track-modal-heading">
                <div>
                  <p className="dashboard-kicker">Admin Review & Details</p>
                  <h2>{getItemName(selectedItem)}</h2>
                </div>
                <button
                  className="track-close-button"
                  onClick={() => setSelectedItem(null)}
                  type="button"
                >
                  <X size={19} />
                </button>
              </div>

              {selectedItem.imageUrl && (
                <img
                  alt={getItemName(selectedItem)}
                  className="resource-modal-image"
                  src={selectedItem.imageUrl}
                />
              )}

              <div className="track-detail-grid">
                {modalLoading && (
                  <p>
                    <span>Loading</span>Loading report details...
                  </p>
                )}
                <p>
                  <span>Type</span>
                  <span
                    className={getBadgeClass('lostfound-type', selectedItem.type || 'Lost')}
                    style={{ justifySelf: 'start' }}
                  >
                    {selectedItem.type || 'Lost'}
                  </span>
                </p>
                <p>
                  <span>Status Management</span>
                  <select
                    className="lostfound-status-select"
                    disabled={statusUpdatingId === (selectedItem._id || selectedItem.id)}
                    onChange={(e) =>
                      handleStatusChange(selectedItem._id || selectedItem.id, e.target.value)
                    }
                    style={{ justifySelf: 'start', marginTop: '4px' }}
                    value={selectedItem.status || 'Open'}
                  >
                    {managementStatusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </p>
                <p>
                  <span>Description</span>
                  {selectedItem.description || 'No description provided.'}
                </p>
                <p>
                  <span>Location</span>
                  {selectedItem.location || 'Not specified'}
                </p>
                <p>
                  <span>Item date</span>
                  {formatDate(selectedItem.itemDate || selectedItem.date)}
                </p>
                <p>
                  <span>Contact info</span>
                  {selectedItem.contactInfo || selectedItem.contact || 'Not available'}
                </p>
                <p>
                  <span>Reported by</span>
                  {getPostedByName(selectedItem)}
                  {getPostedByEmail(selectedItem) ? ` (${getPostedByEmail(selectedItem)})` : ''}
                  {getPostedByEnrollment(selectedItem)
                    ? ` • ${getPostedByEnrollment(selectedItem)}`
                    : ''}
                </p>
                <p>
                  <span>Created date</span>
                  {formatDate(selectedItem.createdAt)}
                </p>
              </div>

              {/* Smart Matching Review Section */}
              <div className="smart-matches-section">
                <div className="smart-matches-header">
                  <div className="smart-matches-title-wrap">
                    <Sparkles className="spark-icon" size={20} />
                    <h3>Smart Matches Review</h3>
                    <span className="dashboard-role-pill">
                      {selectedItem.type === 'Lost' ? 'Matching Found' : 'Matching Lost'}
                    </span>
                  </div>
                  <button
                    className="smart-matches-refresh-btn"
                    disabled={matchesLoading}
                    onClick={() => loadMatches(selectedItem._id || selectedItem.id)}
                    type="button"
                  >
                    <RefreshCw className={matchesLoading ? 'spin' : ''} size={14} />
                    Refresh Matches
                  </button>
                </div>

                {matchesLoading && (
                  <div className="smart-match-loading-box">
                    <Search className="spin" size={18} />
                    <span>Analyzing repository for recovery candidates...</span>
                  </div>
                )}

                {!matchesLoading && matchesError && (
                  <div className="smart-match-empty-box">
                    <h4>{matchesError}</h4>
                  </div>
                )}

                {!matchesLoading && !matchesError && matches.length === 0 && (
                  <div className="smart-match-empty-box">
                    <h4>No strong matches found yet.</h4>
                    <p>
                      The system compares this item against complementary active reports based on
                      name, description, location, and dates.
                    </p>
                  </div>
                )}

                {!matchesLoading && matches.length > 0 && (
                  <div className="smart-match-list">
                    {matches.map((match) => {
                      const candidate = match.item;
                      const candidateId = candidate._id || candidate.id;
                      const scoreClass =
                        match.matchScore >= 85
                          ? 'score-very-strong'
                          : match.matchScore >= 70
                          ? 'score-strong'
                          : 'score-moderate';

                      return (
                        <div className="smart-match-card" key={candidateId}>
                          <div className="smart-match-header">
                            <div className="smart-match-badges">
                              <span className={`smart-match-score-pill ${scoreClass}`}>
                                <Sparkles size={13} />
                                {match.matchScore}% Match
                              </span>
                              <span
                                className={getBadgeClass(
                                  'lostfound-type',
                                  candidate.type || 'Found'
                                )}
                              >
                                {candidate.type || 'Found'}
                              </span>
                              <span className="dashboard-role-pill">{match.confidence} Match</span>
                              <span
                                className={getBadgeClass(
                                  'lostfound-status',
                                  candidate.status || 'Open'
                                )}
                              >
                                {candidate.status || 'Open'}
                              </span>
                            </div>
                          </div>

                          <div className="smart-match-body">
                            <div className="smart-match-info">
                              <h4>{getItemName(candidate)}</h4>
                              <p>{getPreview(candidate.description)}</p>
                              <div className="smart-match-meta">
                                <span>Location: {candidate.location || 'Not available'}</span>
                                <span>
                                  Date: {formatDate(candidate.itemDate || candidate.date)}
                                </span>
                                <span>
                                  Reported by: {candidate.user?.name || 'Student'}
                                </span>
                              </div>
                            </div>
                            {candidate.imageUrl && (
                              <img
                                alt={getItemName(candidate)}
                                className="smart-match-thumb"
                                src={candidate.imageUrl}
                              />
                            )}
                          </div>

                          {match.reasons && match.reasons.length > 0 && (
                            <div className="smart-match-reasons-box">
                              <p className="smart-match-reasons-title">Score Factors & Reasons:</p>
                              <ul className="smart-match-reasons-list">
                                {match.reasons.map((reason, rIdx) => (
                                  <li key={rIdx}>
                                    <Check className="check-icon" size={14} />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="smart-match-actions">
                            <button
                              className="smart-match-view-btn"
                              onClick={() => handleViewDetails(candidate)}
                              type="button"
                            >
                              <span>View Matched Report</span>
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="complaint-submit-button"
                  onClick={() => setSelectedItem(null)}
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

export default ManageLostFound;
