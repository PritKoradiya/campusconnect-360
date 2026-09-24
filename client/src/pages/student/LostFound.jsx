import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle2, ClipboardList, ExternalLink, PackageCheck, PackageSearch, Plus, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import {
  createLostFoundItem,
  getLostFoundById,
  getLostFoundItems,
  getLostFoundMatches,
  getMyLostFoundItems,
  updateLostFoundStatus
} from '../../services/lostFoundService';

const initialFormData = {
  type: 'Lost',
  itemName: '',
  description: '',
  location: '',
  itemDate: '',
  contactInfo: '',
  imageUrl: ''
};

const typeOptions = ['All', 'Lost', 'Found'];
const statusOptions = ['All', 'Open', 'Claimed', 'Closed'];
const reportStatusOptions = ['Open', 'Claimed', 'Closed'];

function getList(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData?.items)) {
    return responseData.items;
  }

  if (Array.isArray(responseData?.lostFoundItems)) {
    return responseData.lostFoundItems;
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }

  return [];
}

function getDetails(responseData) {
  return responseData?.item || responseData?.lostFoundItem || responseData?.data || responseData;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not available';
  }

  return new Date(dateValue).toLocaleDateString();
}

function getItemName(item) {
  return item?.itemName || item?.name || item?.title || 'Untitled item';
}

function getPostedBy(item) {
  return item?.postedBy?.name || item?.user?.name || item?.createdBy?.name || item?.postedByName || 'Student';
}

function getPreview(text) {
  if (!text) {
    return 'No description available.';
  }

  return text.length > 110 ? `${text.slice(0, 110)}...` : text;
}

function getBadgeClass(prefix, value) {
  return `lostfound-badge ${prefix}-${(value || '').toLowerCase()}`;
}

function LostFound() {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formOpen, setFormOpen] = useState(false);
  const [showingMyReports, setShowingMyReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState('');

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

  const loadItems = async (onlyMine = showingMyReports) => {
    const token = localStorage.getItem('token');

    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = onlyMine ? await getMyLostFoundItems() : await getLostFoundItems();
      setItems(getList(response.data));
      setShowingMyReports(onlyMine);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load lost and found data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(false);
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchValue = searchText.toLowerCase();
      const type = item.type || 'Lost';
      const status = item.status || 'Open';
      const matchesSearch =
        getItemName(item).toLowerCase().includes(searchValue) ||
        (item.location || '').toLowerCase().includes(searchValue) ||
        (item.description || '').toLowerCase().includes(searchValue);
      const matchesType = typeFilter === 'All' || type === typeFilter;
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchText, typeFilter, statusFilter]);

  const summaryCards = [
    { label: 'Total Items', value: items.length, icon: ClipboardList, tone: 'blue' },
    { label: 'Lost Items', value: items.filter((item) => item.type === 'Lost').length, icon: PackageSearch, tone: 'warning' },
    { label: 'Found Items', value: items.filter((item) => item.type === 'Found').length, icon: PackageCheck, tone: 'success' },
    { label: 'Open Items', value: items.filter((item) => (item.status || 'Open') === 'Open').length, icon: Search, tone: 'cyan' },
    { label: 'Claimed Items', value: items.filter((item) => item.status === 'Claimed').length, icon: CheckCircle2, tone: 'success' }
  ];

  const openReportForm = (type) => {
    setFormData({ ...initialFormData, type });
    setError('');
    setSuccess('');
    setFormOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmitReport = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await createLostFoundItem(formData);
      const createdItem = response.data?.item;
      setSuccess('Item report submitted successfully. Checking for potential matches...');
      setFormOpen(false);
      setFormData(initialFormData);
      await loadItems(showingMyReports);
      if (createdItem) {
        handleViewDetails(createdItem);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load lost and found data');
      }
    } finally {
      setSubmitting(false);
    }
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
      setSelectedItem(getDetails(response.data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lost and found data');
    } finally {
      setModalLoading(false);
    }
  };

  const handleStatusChange = async (itemId, status) => {
    try {
      setStatusUpdatingId(itemId);
      setError('');
      setSuccess('');

      await updateLostFoundStatus(itemId, status);
      setSuccess('Lost and found status updated successfully.');
      await loadItems(showingMyReports);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to load lost and found data');
      }
    } finally {
      setStatusUpdatingId('');
    }
  };

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Student Services</p>
          <h1>Lost & Found</h1>
          <p>Report lost items, found items, and help students recover belongings.</p>
        </div>
        <span className="dashboard-role-pill">{showingMyReports ? 'My Reports' : 'All Items'}</span>
      </AnimatedCard>

      <div className="dashboard-grid dashboard-admin-grid">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <AnimatedCard className={`dashboard-stat-card tone-${card.tone}`} delay={0.1 + index * 0.06} key={card.label}>
              <span className="dashboard-card-icon">
                <Icon size={22} />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      <AnimatedCard className="lostfound-actions-card" delay={0.18} hover={false}>
        <button className="complaint-submit-button" onClick={() => openReportForm('Lost')} type="button">
          <Plus size={18} />
          Report Lost Item
        </button>
        <button className="complaint-submit-button" onClick={() => openReportForm('Found')} type="button">
          <Plus size={18} />
          Report Found Item
        </button>
        <button className="complaint-secondary-button" onClick={() => loadItems(true)} type="button">
          My Reports
        </button>
        {showingMyReports && (
          <button className="complaint-secondary-button" onClick={() => loadItems(false)} type="button">
            Show All Items
          </button>
        )}
      </AnimatedCard>

      <AnimatedCard className="track-filter-card" delay={0.22} hover={false}>
        <label className="complaint-field">
          <span>Search items</span>
          <div className="track-search-box">
            <Search size={18} />
            <input
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by item name, location, or description..."
              type="text"
              value={searchText}
            />
          </div>
        </label>
        <label className="complaint-field">
          <span>Filter by type</span>
          <select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="complaint-field">
          <span>Filter by status</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </AnimatedCard>

      {success && <AnimatedCard className="dashboard-panel" delay={0.24} hover={false}>{success}</AnimatedCard>}
      {error && <AnimatedCard className="dashboard-panel complaint-error-message" delay={0.24} hover={false}>{error}</AnimatedCard>}
      {loading && <AnimatedCard className="dashboard-panel" delay={0.26} hover={false}>Loading lost and found items...</AnimatedCard>}

      {!loading && filteredItems.length > 0 && (
        <div className="resource-card-grid">
          {filteredItems.map((item, index) => {
            const itemId = item._id || item.id;

            return (
              <AnimatedCard className="resource-card" delay={0.28 + index * 0.05} key={itemId || getItemName(item)}>
                <div className="resource-card-top">
                  <span className={getBadgeClass('lostfound-type', item.type || 'Lost')}>{item.type || 'Lost'}</span>
                  <span className={getBadgeClass('lostfound-status', item.status || 'Open')}>{item.status || 'Open'}</span>
                </div>
                <h2>{getItemName(item)}</h2>
                <p>{getPreview(item.description)}</p>
                <div className="resource-meta">
                  <span>Location: {item.location || 'Not available'}</span>
                  <span>Item date: {formatDate(item.itemDate || item.date)}</span>
                  <span>Contact: {item.contactInfo || item.contact || 'Not available'}</span>
                  <span>Posted by: {getPostedBy(item)}</span>
                </div>
                <div className="lostfound-card-actions">
                  <button className="track-action-button" onClick={() => handleViewDetails(item)} type="button">
                    View Details
                  </button>
                  {itemId && (
                    <select
                      className="lostfound-status-select"
                      disabled={statusUpdatingId === itemId}
                      onChange={(event) => handleStatusChange(itemId, event.target.value)}
                      value={item.status || 'Open'}
                    >
                      {reportStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false}>No lost or found items available right now.</AnimatedCard>
      )}

      {formOpen && (
        <motion.div animate={{ opacity: 1 }} className="track-modal-backdrop" initial={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div animate={{ opacity: 1, scale: 1, y: 0 }} className="track-modal-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="track-modal-heading">
              <div>
                <p className="dashboard-kicker">Report Item</p>
                <h2>{formData.type} Item</h2>
              </div>
              <button className="track-close-button" onClick={() => setFormOpen(false)} type="button">
                <X size={19} />
              </button>
            </div>
            <form className="complaint-form lostfound-form" onSubmit={handleSubmitReport}>
              <label className="complaint-field">
                <span>Type</span>
                <select name="type" onChange={handleFormChange} value={formData.type}>
                  <option value="Lost">Lost</option>
                  <option value="Found">Found</option>
                </select>
              </label>
              <label className="complaint-field">
                <span>Item Name</span>
                <input name="itemName" onChange={handleFormChange} placeholder="Wallet, ID card, keys..." type="text" value={formData.itemName} />
              </label>
              <label className="complaint-field">
                <span>Location</span>
                <input name="location" onChange={handleFormChange} placeholder="Library, Lab 3, Canteen..." type="text" value={formData.location} />
              </label>
              <label className="complaint-field">
                <span>Item Date</span>
                <input name="itemDate" onChange={handleFormChange} type="date" value={formData.itemDate} />
              </label>
              <label className="complaint-field">
                <span>Contact Info</span>
                <input name="contactInfo" onChange={handleFormChange} placeholder="Email or phone number" type="text" value={formData.contactInfo} />
              </label>
              <label className="complaint-field">
                <span>Image URL optional</span>
                <input name="imageUrl" onChange={handleFormChange} placeholder="https://example.com/item.jpg" type="text" value={formData.imageUrl} />
              </label>
              <label className="complaint-field complaint-field-wide">
                <span>Description</span>
                <textarea name="description" onChange={handleFormChange} placeholder="Describe the item clearly..." rows="4" value={formData.description} />
              </label>
              <button className="complaint-submit-button" disabled={submitting} type="submit">
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}

      {selectedItem && (
        <motion.div animate={{ opacity: 1 }} className="track-modal-backdrop" initial={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div animate={{ opacity: 1, scale: 1, y: 0 }} className="track-modal-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="track-modal-heading">
              <div>
                <p className="dashboard-kicker">Item Details</p>
                <h2>{getItemName(selectedItem)}</h2>
              </div>
              <button className="track-close-button" onClick={() => setSelectedItem(null)} type="button">
                <X size={19} />
              </button>
            </div>
            {selectedItem.imageUrl && <img alt={getItemName(selectedItem)} className="resource-modal-image" src={selectedItem.imageUrl} />}
            <div className="track-detail-grid">
              {modalLoading && <p><span>Loading</span>Loading item details...</p>}
              <p><span>Type</span>{selectedItem.type || 'Lost'}</p>
              <p><span>Status</span>{selectedItem.status || 'Open'}</p>
              <p><span>Description</span>{selectedItem.description || 'No description available.'}</p>
              <p><span>Location</span>{selectedItem.location || 'Not available'}</p>
              <p><span>Item date</span>{formatDate(selectedItem.itemDate || selectedItem.date)}</p>
              <p><span>Contact info</span>{selectedItem.contactInfo || selectedItem.contact || 'Not available'}</p>
              <p><span>Posted by</span>{getPostedBy(selectedItem)}</p>
              <p><span>Created date</span>{formatDate(selectedItem.createdAt)}</p>
            </div>

            {/* Smart Lost & Found Matching Section */}
            <div className="smart-matches-section">
              <div className="smart-matches-header">
                <div className="smart-matches-title-wrap">
                  <Sparkles className="spark-icon" size={20} />
                  <h3>Possible Matches</h3>
                  <span className="dashboard-role-pill">
                    {selectedItem.type === 'Lost' ? 'Found Items' : 'Lost Items'}
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
                  <span>Analyzing reports for smart matches...</span>
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
                  <p>We'll compare this item with new Lost & Found reports as they are added.</p>
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
                            <span className={getBadgeClass('lostfound-type', candidate.type || 'Found')}>
                              {candidate.type || 'Found'}
                            </span>
                            <span className="dashboard-role-pill">
                              {match.confidence} Match
                            </span>
                          </div>
                        </div>

                        <div className="smart-match-body">
                          <div className="smart-match-info">
                            <h4>{getItemName(candidate)}</h4>
                            <p>{getPreview(candidate.description)}</p>
                            <div className="smart-match-meta">
                              <span>Location: {candidate.location || 'Not available'}</span>
                              <span>Date: {formatDate(candidate.itemDate || candidate.date)}</span>
                              <span>Contact: {candidate.contactInfo || 'Available on request'}</span>
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
                            <p className="smart-match-reasons-title">Why this may match:</p>
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
                            <span>View Item</span>
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="complaint-submit-button" onClick={() => setSelectedItem(null)} type="button">
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatedPage>
  );
}

export default LostFound;
