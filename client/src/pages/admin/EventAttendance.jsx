import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Clock3,
  MapPin,
  QrCode,
  RotateCw,
  ScanLine,
  Search,
  Sparkles,
  User,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { checkInAttendance, getEventAttendance } from '../../services/eventService';

function formatDate(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleDateString();
  } catch {
    return 'Not available';
  }
}

function formatDateTime(dateValue) {
  if (!dateValue) return 'Not available';
  try {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? 'Not available' : d.toLocaleString();
  } catch {
    return 'Not available';
  }
}

function EventAttendance() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Page state
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalCheckedIn: 0,
    notCheckedIn: 0,
    attendanceRate: 0,
    qrCount: 0,
    manualCount: 0
  });
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Active view tab: 'scanner' | 'roster'
  const [activeTab, setActiveTab] = useState('scanner');

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [manualTicketInput, setManualTicketInput] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Roster search and filters
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Scanner instance ref
  const html5QrCodeRef = useRef(null);
  const scannerMountedRef = useRef(false);

  // Fetch Attendance Data
  const fetchData = async (isManualRefresh = false) => {
    if (!eventId) return;

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError('');

      const res = await getEventAttendance(eventId);
      if (res.data?.success) {
        setEvent(res.data.event);
        setStats(res.data.stats);
        setRoster(res.data.roster || []);
      } else {
        setFetchError(res.data?.message || 'Failed to load event attendance');
      }
    } catch (err) {
      setFetchError(err.response?.data?.message || 'Could not fetch attendance records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  // Start QR Camera Scanner
  const startScanner = async () => {
    setScannerError('');
    setScanResult(null);

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('cc360-qr-reader');
      }

      const qrScanner = html5QrCodeRef.current;
      if (qrScanner.isScanning) {
        setScannerActive(true);
        return;
      }

      await qrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Pause camera immediately while processing
          try {
            await qrScanner.pause(true);
          } catch {
            // ignore pause exception
          }
          await handleProcessScan(decodedText);
        },
        () => {
          // ignore continuous scanning frame errors
        }
      );

      setScannerActive(true);
      scannerMountedRef.current = true;
    } catch (err) {
      console.warn('Scanner start error:', err);
      setScannerActive(false);
      setScannerError(
        err?.message || 'Unable to access camera. Please allow camera permissions or use manual check-in below.'
      );
    }
  };

  // Stop QR Camera Scanner
  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch {
      // ignore stop error
    } finally {
      setScannerActive(false);
    }
  };

  // Switch tabs cleanly
  useEffect(() => {
    if (activeTab === 'scanner') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [activeTab]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (html5QrCodeRef.current) {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear().catch(() => {});
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Resume camera scanner after result
  const handleResumeScan = async () => {
    setScanResult(null);
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.resume();
        } else {
          await startScanner();
        }
      } else {
        await startScanner();
      }
    } catch {
      await startScanner();
    }
  };

  // Process Scanned Data from QR
  const handleProcessScan = async (rawPayload) => {
    setScanProcessing(true);
    setScanResult(null);

    try {
      const res = await checkInAttendance(eventId, {
        rawQrPayload: rawPayload,
        checkInMethod: 'QR_SCAN'
      });

      if (res.data?.success) {
        setScanResult({
          status: 'SUCCESS',
          message: 'Attendance Verified & Checked In!',
          student: res.data.student,
          ticketId: res.data.ticketId,
          attendance: res.data.attendance,
          stats: res.data.stats
        });

        // Update stats and roster in local state
        if (res.data.stats) {
          setStats((prev) => ({
            ...prev,
            ...res.data.stats,
            qrCount: prev.qrCount + 1
          }));
        }

        // Update roster list
        setRoster((prev) =>
          prev.map((item) => {
            if (
              item.student?._id === res.data.student?._id ||
              item.ticketId === res.data.ticketId
            ) {
              return {
                ...item,
                isCheckedIn: true,
                attendance: res.data.attendance
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.alreadyCheckedIn) {
        setScanResult({
          status: 'DUPLICATE',
          message: resp.message || 'Already Checked In',
          student: resp.student,
          attendance: resp.attendance
        });
      } else {
        setScanResult({
          status: 'ERROR',
          message: resp?.message || 'Check-in failed. Invalid QR code or wrong event.'
        });
      }
    } finally {
      setScanProcessing(false);
    }
  };

  // Manual Check-In by typed Ticket ID or Registration ID
  const handleManualTicketSubmit = async (e) => {
    e?.preventDefault();
    const query = manualTicketInput.trim();
    if (!query) return;

    setManualSubmitting(true);
    setScanResult(null);

    // Try finding in roster first to extract regId
    const matched = roster.find(
      (r) =>
        r.ticketId?.toLowerCase() === query.toLowerCase() ||
        r.registrationId?.toString() === query ||
        r.student?.enrollmentNo?.toLowerCase() === query.toLowerCase()
    );

    const regIdToSend = matched ? matched.registrationId : query;

    try {
      const res = await checkInAttendance(eventId, {
        regId: regIdToSend,
        checkInMethod: 'MANUAL'
      });

      if (res.data?.success) {
        setScanResult({
          status: 'SUCCESS',
          message: 'Manual Attendance Check-In Confirmed!',
          student: res.data.student,
          ticketId: res.data.ticketId,
          attendance: res.data.attendance,
          stats: res.data.stats
        });

        setManualTicketInput('');

        if (res.data.stats) {
          setStats((prev) => ({
            ...prev,
            ...res.data.stats,
            manualCount: prev.manualCount + 1
          }));
        }

        setRoster((prev) =>
          prev.map((item) => {
            if (
              item.student?._id === res.data.student?._id ||
              item.registrationId?.toString() === regIdToSend?.toString()
            ) {
              return {
                ...item,
                isCheckedIn: true,
                attendance: res.data.attendance
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.alreadyCheckedIn) {
        setScanResult({
          status: 'DUPLICATE',
          message: resp.message || 'Student is already checked in.',
          student: resp.student,
          attendance: resp.attendance
        });
      } else {
        setScanResult({
          status: 'ERROR',
          message: resp?.message || 'Manual check-in failed. Please verify the ID.'
        });
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  // Direct 1-click Check-In from Roster table
  const handleRosterCheckIn = async (item) => {
    if (!item?.registrationId || item.isCheckedIn) return;

    try {
      setActionLoadingId(item.registrationId);
      const res = await checkInAttendance(eventId, {
        regId: item.registrationId,
        checkInMethod: 'MANUAL'
      });

      if (res.data?.success) {
        if (res.data.stats) {
          setStats((prev) => ({
            ...prev,
            ...res.data.stats,
            manualCount: prev.manualCount + 1
          }));
        }

        setRoster((prev) =>
          prev.map((r) => {
            if (r.registrationId === item.registrationId) {
              return {
                ...r,
                isCheckedIn: true,
                attendance: res.data.attendance
              };
            }
            return r;
          })
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((item) => {
      // Status filter
      if (rosterStatusFilter === 'CHECKED_IN' && !item.isCheckedIn) return false;
      if (rosterStatusFilter === 'NOT_CHECKED_IN' && item.isCheckedIn) return false;

      // Search filter
      if (rosterSearch.trim()) {
        const q = rosterSearch.trim().toLowerCase();
        const student = item.student || {};
        const name = (student.name || '').toLowerCase();
        const email = (student.email || '').toLowerCase();
        const roll = (student.enrollmentNo || '').toLowerCase();
        const ticket = (item.ticketId || '').toLowerCase();

        if (!name.includes(q) && !email.includes(q) && !roll.includes(q) && !ticket.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [roster, rosterStatusFilter, rosterSearch]);

  return (
    <AnimatedPage>
      {/* 1. Header with back navigation and event title */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <button
            className="chatbot-clear-btn"
            onClick={() => navigate('/admin/events')}
            style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            type="button"
          >
            <ArrowLeft size={15} />
            <span>Back to Manage Events</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="resource-badge event-badge">Attendance & Check-In</span>
            {event?.department && (
              <span className="track-badge priority-low" style={{ fontSize: '11px' }}>
                {event.department}
              </span>
            )}
          </div>
          <h1 style={{ marginTop: '4px' }}>{event?.title || 'Event Attendance Management'}</h1>
          <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#94a3b8' }}>
            <span>
              <strong style={{ color: '#e2e8f0' }}>Date:</strong> {formatDate(event?.eventDate)} ({event?.eventTime || 'TBD'})
            </span>
            <span>
              <strong style={{ color: '#e2e8f0' }}>Venue:</strong> {event?.venue || 'Campus Venue'}
            </span>
            <span>
              <strong style={{ color: '#e2e8f0' }}>Organizer:</strong> {event?.organizer || 'Campus Team'}
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchData(true)}
            title="Refresh live attendance data"
            type="button"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              style={{ display: 'inline-flex' }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
            >
              <RotateCw size={15} />
            </motion.span>
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Global Alerts */}
      {fetchError && (
        <div className="chatbot-alert chatbot-alert-error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={18} />
          <span>{fetchError}</span>
        </div>
      )}

      {/* 2. Live Statistics Metric Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <Users size={22} />
          </span>
          <div>
            <p>Total Registered</p>
            <strong>{stats.totalRegistrations}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.12}>
          <span className="dashboard-card-icon">
            <UserCheck size={22} />
          </span>
          <div>
            <p>Checked In Attendees</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <strong>{stats.totalCheckedIn}</strong>
              <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>
                ({stats.attendanceRate}%)
              </span>
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.16}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Pending Arrival</p>
            <strong>{stats.notCheckedIn}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-purple" delay={0.2}>
          <span className="dashboard-card-icon">
            <QrCode size={22} />
          </span>
          <div>
            <p>Scan vs Manual</p>
            <strong style={{ fontSize: '16px' }}>
              {stats.qrCount || 0} QR / {stats.manualCount || 0} Manual
            </strong>
          </div>
        </AnimatedCard>
      </div>

      {/* 3. Primary Mode Navigation Tabs */}
      <AnimatedCard className="track-filter-card" delay={0.24} hover={false}>
        <div className="notif-filter-bar" role="tablist">
          <button
            aria-selected={activeTab === 'scanner'}
            className={`notif-filter-pill ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
            role="tab"
            type="button"
          >
            <ScanLine size={15} />
            <span>QR Scanner & Live Check-In</span>
          </button>
          <button
            aria-selected={activeTab === 'roster'}
            className={`notif-filter-pill ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
            role="tab"
            type="button"
          >
            <Users size={15} />
            <span>Participant Roster ({stats.totalRegistrations})</span>
            {stats.totalCheckedIn > 0 && (
              <span className="notif-filter-badge">{stats.totalCheckedIn} Present</span>
            )}
          </button>
        </div>
      </AnimatedCard>

      {/* 4. Tab 1: Live QR Scanner Mode */}
      {activeTab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '16px' }}>
          {/* Scanner Viewport Card */}
          <AnimatedCard className="dashboard-panel" delay={0.28} hover={false} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#22d3ee" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#e0f2fe' }}>Live Camera Scanner</h3>
              </div>
              <span
                className="track-badge"
                style={{
                  fontSize: '11px',
                  background: scannerActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: scannerActive ? '#4ade80' : '#f87171',
                  border: `1px solid ${scannerActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                }}
              >
                {scannerActive ? '● Camera Active' : '○ Standby'}
              </span>
            </div>

            {/* Html5Qrcode Scanner Target Viewport */}
            <div
              id="cc360-qr-reader"
              style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0a0f1d',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                minHeight: '260px'
              }}
            />

            {scannerError && (
              <div className="chatbot-alert chatbot-alert-warning" style={{ marginTop: '14px' }}>
                <CameraOff size={16} />
                <span style={{ fontSize: '13px' }}>{scannerError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                className="admin-btn-primary"
                onClick={startScanner}
                style={{ flex: 1 }}
                type="button"
              >
                <Camera size={15} />
                <span>Restart Camera</span>
              </button>
              <button
                className="complaint-secondary-button"
                onClick={stopScanner}
                style={{ width: 'auto', margin: 0 }}
                type="button"
              >
                Pause
              </button>
            </div>
          </AnimatedCard>

          {/* Real-time Scan Result & Manual Fallback Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Scan Result Feedback Panel */}
            <AnimatedCard className="dashboard-panel" delay={0.3} hover={false} style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#e0f2fe' }}>Scan Status</h3>

              {scanProcessing && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#38bdf8' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    style={{ display: 'inline-block', marginBottom: '8px' }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <RotateCw size={28} />
                  </motion.div>
                  <p style={{ margin: 0, fontSize: '14px' }}>Validating pass security token...</p>
                </div>
              )}

              {!scanProcessing && !scanResult && (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                  <ScanLine size={40} style={{ color: '#22d3ee', margin: '0 auto 10px', opacity: 0.6 }} />
                  <p style={{ margin: '0 0 4px', color: '#e0f2fe', fontWeight: 600 }}>Ready to Scan</p>
                  <p style={{ margin: 0, fontSize: '12px', maxWidth: '280px', marginInline: 'auto' }}>
                    Point camera at attendee&apos;s digital QR event pass to record instantaneous attendance.
                  </p>
                </div>
              )}

              {/* SUCCESS STATE */}
              {!scanProcessing && scanResult?.status === 'SUCCESS' && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="chatbot-confirm-body"
                  initial={{ opacity: 0, scale: 0.95 }}
                  style={{
                    background: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: 0
                  }}
                >
                  <div
                    className="chatbot-confirm-icon-wrap"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderColor: '#4ade80',
                      color: '#4ade80'
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: '#4ade80', margin: '0 0 4px' }}>
                      Check-In Confirmed!
                    </p>
                    <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {scanResult.student?.name}
                    </p>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#94a3b8' }}>
                      {scanResult.student?.enrollmentNo ? `ID: ${scanResult.student.enrollmentNo} • ` : ''}
                      {scanResult.student?.email}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
                      <span className="track-badge status-resolved" style={{ padding: '2px 8px' }}>
                        Ticket #{scanResult.ticketId}
                      </span>
                      <span className="track-badge priority-low" style={{ padding: '2px 8px' }}>
                        Time: {formatDateTime(scanResult.attendance?.checkedInAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* DUPLICATE STATE */}
              {!scanProcessing && scanResult?.status === 'DUPLICATE' && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="chatbot-confirm-body"
                  initial={{ opacity: 0, scale: 0.95 }}
                  style={{
                    background: 'rgba(251, 191, 36, 0.12)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: 0
                  }}
                >
                  <div
                    className="chatbot-confirm-icon-wrap"
                    style={{
                      background: 'rgba(251, 191, 36, 0.2)',
                      borderColor: '#fbbf24',
                      color: '#fbbf24'
                    }}
                  >
                    <AlertCircle size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#fbbf24', margin: '0 0 4px' }}>
                      Already Checked In
                    </p>
                    <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {scanResult.student?.name || 'Student'}
                    </p>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#cbd5e1' }}>
                      Previously recorded on {formatDateTime(scanResult.attendance?.checkedInAt)} via {scanResult.attendance?.checkInMethod || 'QR Scan'}.
                    </p>
                    <span className="track-badge priority-high" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      Duplicate Scan Prevented
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ERROR / REJECTED STATE */}
              {!scanProcessing && scanResult?.status === 'ERROR' && (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="chatbot-confirm-body"
                  initial={{ opacity: 0, scale: 0.95 }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: 0
                  }}
                >
                  <div
                    className="chatbot-confirm-icon-wrap"
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      borderColor: '#f87171',
                      color: '#f87171'
                    }}
                  >
                    <X size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: '#f87171', margin: '0 0 4px' }}>
                      Pass Rejected
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#fca5a5', lineHeight: 1.5 }}>
                      {scanResult.message}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Scan Next Button */}
              {scanResult && (
                <button
                  className="admin-btn-primary"
                  onClick={handleResumeScan}
                  style={{ width: '100%', marginTop: '14px' }}
                  type="button"
                >
                  <ScanLine size={16} />
                  <span>Scan Next Attendee</span>
                </button>
              )}
            </AnimatedCard>

            {/* Manual Ticket Input Fallback Card */}
            <AnimatedCard className="dashboard-panel" delay={0.32} hover={false} style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#e0f2fe' }}>Manual Code Check-In</h3>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#94a3b8' }}>
                If camera is unavailable or code is unreadable, enter the 8-digit Ticket ID or Student Enrollment No.
              </p>

              <form onSubmit={handleManualTicketSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  disabled={manualSubmitting}
                  onChange={(e) => setManualTicketInput(e.target.value)}
                  placeholder="Ticket ID or Enrollment No..."
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                  type="text"
                  value={manualTicketInput}
                />
                <button
                  className="admin-btn-primary"
                  disabled={manualSubmitting || !manualTicketInput.trim()}
                  style={{ padding: '0 16px', minHeight: '38px', fontSize: '13px' }}
                  type="submit"
                >
                  {manualSubmitting ? 'Verifying...' : 'Check In'}
                </button>
              </form>
            </AnimatedCard>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Full Participant Attendance Roster */}
      {activeTab === 'roster' && (
        <AnimatedCard className="dashboard-panel" delay={0.28} hover={false} style={{ padding: '20px', marginTop: '16px' }}>
          {/* Search and Filter Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={`notif-filter-pill ${rosterStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setRosterStatusFilter('ALL')}
                type="button"
              >
                All ({roster.length})
              </button>
              <button
                className={`notif-filter-pill ${rosterStatusFilter === 'CHECKED_IN' ? 'active' : ''}`}
                onClick={() => setRosterStatusFilter('CHECKED_IN')}
                type="button"
              >
                Checked In ({stats.totalCheckedIn})
              </button>
              <button
                className={`notif-filter-pill ${rosterStatusFilter === 'NOT_CHECKED_IN' ? 'active' : ''}`}
                onClick={() => setRosterStatusFilter('NOT_CHECKED_IN')}
                type="button"
              >
                Not Checked In ({stats.notCheckedIn})
              </button>
            </div>

            <div className="track-search-box" style={{ maxWidth: '280px', width: '100%' }}>
              <Search size={16} />
              <input
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search name, enrollment, ticket..."
                type="text"
                value={rosterSearch}
              />
              {rosterSearch && (
                <button
                  onClick={() => setRosterSearch('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Roster Table */}
          {filteredRoster.length === 0 ? (
            <div className="track-empty-state" style={{ padding: '36px 0' }}>
              <Users size={36} style={{ color: '#22d3ee', margin: '0 auto 8px', opacity: 0.6 }} />
              <p style={{ color: '#e0f2fe', fontWeight: 600, margin: '0 0 4px' }}>No participants found</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Try adjusting your search query or status filter.
              </p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Student Name & Info</th>
                    <th>Department / Branch</th>
                    <th>Attendance Status</th>
                    <th>Check-In Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((item) => {
                    const student = item.student || {};
                    const isChecked = item.isCheckedIn;

                    return (
                      <tr key={item.registrationId}>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(56, 189, 248, 0.25)'
                            }}
                          >
                            #{item.ticketId}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: '#f8fafc', display: 'block' }}>{student.name || 'Student'}</strong>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {student.enrollmentNo ? `${student.enrollmentNo} • ` : ''}{student.email}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>
                            {student.department || 'General'} {student.branch ? `(${student.branch})` : ''}
                          </span>
                        </td>
                        <td>
                          {isChecked ? (
                            <span
                              className="track-badge status-resolved"
                              style={{
                                fontSize: '11px',
                                padding: '3px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'rgba(34, 197, 94, 0.16)',
                                color: '#4ade80',
                                border: '1px solid rgba(34, 197, 94, 0.35)'
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Checked In
                            </span>
                          ) : (
                            <span
                              className="track-badge priority-medium"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              Not Checked In
                            </span>
                          )}
                        </td>
                        <td>
                          {isChecked && item.attendance ? (
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                              <span style={{ color: '#e2e8f0', display: 'block' }}>
                                {formatDateTime(item.attendance.checkedInAt)}
                              </span>
                              <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                                Method: {item.attendance.checkInMethod === 'QR_SCAN' ? 'QR Scanner' : 'Manual Entry'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                        <td>
                          {!isChecked ? (
                            <button
                              className="admin-btn-primary"
                              disabled={actionLoadingId === item.registrationId}
                              onClick={() => handleRosterCheckIn(item)}
                              style={{
                                padding: '4px 10px',
                                minHeight: '32px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              type="button"
                            >
                              <UserCheck size={13} />
                              <span>{actionLoadingId === item.registrationId ? 'Marking...' : 'Mark Present'}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
                              ✓ Present
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AnimatedCard>
      )}
    </AnimatedPage>
  );
}

export default EventAttendance;
