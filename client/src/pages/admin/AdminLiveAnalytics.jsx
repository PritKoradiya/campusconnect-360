import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  PackageSearch,
  PieChart,
  RefreshCcw,
  RotateCcw,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  Check,
  XCircle,
  Radio
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getAdminLiveAnalytics } from '../../services/reportService';
import { getDepartments } from '../../services/departmentService';

const dateRangeOptions = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'This Year', value: '1y' },
  { label: 'All Time', value: 'all' }
];

function AdminLiveAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const autoRefreshTimerRef = useRef(null);

  // Load department list once for filter dropdown
  useEffect(() => {
    let isMounted = true;
    const loadDepartments = async () => {
      try {
        const res = await getDepartments();
        if (isMounted) {
          const list = res.data?.data || res.data || [];
          setDepartments(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to load departments for filter:', err);
      }
    };
    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManual) {
        setRefreshing(true);
      }
      setError('');

      const res = await getAdminLiveAnalytics({
        range: selectedRange,
        department: selectedDepartment
      });

      if (res.data?.success && res.data?.data) {
        setAnalyticsData(res.data.data);
        setLastUpdated(new Date(res.data.data.generatedAt || Date.now()));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Administrator privileges required.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch live analytics');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRange, selectedDepartment]);

  // Initial fetch and on filter changes
  useEffect(() => {
    setLoading(true);
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  // Safe auto-refresh handler (30 seconds interval when toggled on)
  useEffect(() => {
    if (autoRefreshEnabled) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchAnalytics(true);
      }, 30000);
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefreshEnabled, fetchAnalytics]);

  const kpis = analyticsData?.kpis || {};
  const charts = analyticsData?.charts || {};
  const complaintStatus = charts.complaintStatus || {};
  const complaintTrend = charts.complaintTrend || [];
  const departmentWorkload = charts.departmentWorkload || [];
  const eventPerformance = charts.eventPerformance || [];
  const lostFoundStatus = charts.lostFoundStatus || {};
  const studentSatisfaction = charts.studentSatisfaction || {};

  // Formatted last updated time string
  const formattedUpdateTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  // Complaint Status Donut Calculations
  const totalComplaintsInSlice = complaintStatus.total || 0;
  const statusSlices = [
    { label: 'Pending', count: complaintStatus.pending || 0, color: '#f59e0b' },
    { label: 'In Progress', count: complaintStatus.inProgress || 0, color: '#22d3ee' },
    { label: 'Resolved', count: complaintStatus.resolved || 0, color: '#10b981' },
    { label: 'Rejected', count: complaintStatus.rejected || 0, color: '#ef4444' }
  ];

  const donutRadius = 45;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedOffset = 0;
  const donutSegments = statusSlices.map((slice) => {
    const fraction = totalComplaintsInSlice > 0 ? slice.count / totalComplaintsInSlice : 0;
    const strokeDasharray = `${fraction * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * donutCircumference;
    return { ...slice, strokeDasharray, strokeDashoffset, percentage: Math.round(fraction * 100) };
  });

  // Trend Chart Max
  const maxTrendCount = Math.max(...complaintTrend.map((m) => m.count), 1);

  // Department Workload Max
  const maxDeptTotal = Math.max(...departmentWorkload.map((d) => d.total), 1);

  return (
    <AnimatedPage>
      {/* Hero Header with Live Pulse and Controls */}
      <AnimatedCard className="dashboard-hero" delay={0.04} hover={false}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span className="live-status-pill">
              <span className="live-pulse-dot" />
              LIVE
            </span>
            <p className="dashboard-kicker" style={{ margin: 0 }}>Real-time Intelligence</p>
          </div>
          <h1>Live Campus Analytics</h1>
          <p>Real-time campus telemetry across complaints, events, attendance, lost &amp; found, and student satisfaction.</p>
        </div>

        <div className="admin-header-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
          {/* Date Range Selector */}
          <div className="reports-range-selector">
            {dateRangeOptions.map((opt) => (
              <button
                className={`reports-range-btn ${selectedRange === opt.value ? 'active' : ''}`}
                key={opt.value}
                onClick={() => setSelectedRange(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Department Filter Dropdown */}
          <div className="live-filter-select-wrap">
            <Building2 size={15} color="#22d3ee" />
            <select
              className="live-dept-select"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              title="Filter by Department"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            className={`live-auto-refresh-btn ${autoRefreshEnabled ? 'active' : ''}`}
            onClick={() => setAutoRefreshEnabled((prev) => !prev)}
            title="Toggle 30-second live auto-refresh"
          >
            <Radio size={14} className={autoRefreshEnabled ? 'live-icon-pulsing' : ''} />
            <span>{autoRefreshEnabled ? 'Auto: 30s' : 'Auto: Off'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchAnalytics(true)}
            title={`Last updated at ${formattedUpdateTime}. Click to refresh.`}
            type="button"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              style={{ display: 'inline-flex' }}
              transition={{ repeat: refreshing ? Infinity : 0, duration: 1, ease: 'linear' }}
            >
              <RotateCcw size={16} />
            </motion.span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </AnimatedCard>

      {/* Global Error Banner */}
      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.06} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle color="#f87171" size={22} />
              <div>
                <strong style={{ color: '#ffffff' }}>{error}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#fca5a5' }}>
                  Please verify server connectivity and retry.
                </p>
              </div>
            </div>
            <button
              className="complaint-submit-button"
              onClick={() => fetchAnalytics(true)}
              style={{ minHeight: '34px', padding: '0 14px', fontSize: '12.5px' }}
              type="button"
            >
              <RefreshCcw size={14} style={{ marginRight: '6px' }} />
              Retry
            </button>
          </div>
        </AnimatedCard>
      )}

      {/* Live Sync Timestamp Bar */}
      <div className="live-telemetry-meta-bar">
        <span>
          Telemetry Sync: <strong style={{ color: '#22d3ee' }}>{formattedUpdateTime}</strong>
        </span>
        <span style={{ color: '#64748b' }}>•</span>
        <span>
          Range: <strong style={{ color: '#ffffff' }}>{dateRangeOptions.find(o => o.value === selectedRange)?.label}</strong>
        </span>
        <span style={{ color: '#64748b' }}>•</span>
        <span>
          Department: <strong style={{ color: '#ffffff' }}>
            {selectedDepartment === 'all'
              ? 'All Departments'
              : departments.find(d => d._id === selectedDepartment)?.name || selectedDepartment}
          </strong>
        </span>
      </div>

      {/* 10 Top KPI Cards Grid */}
      <div className="dashboard-grid dashboard-admin-grid">
        {/* 1. Total Users */}
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <Users size={22} />
          </span>
          <div>
            <p>Total Users</p>
            <strong>{loading ? '—' : kpis.totalUsers || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 2. Total Students */}
        <AnimatedCard className="dashboard-stat-card tone-purple" delay={0.1}>
          <span className="dashboard-card-icon">
            <UserCheck size={22} />
          </span>
          <div>
            <p>Students</p>
            <strong>{loading ? '—' : kpis.totalStudents || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 3. Total Complaints */}
        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.12}>
          <span className="dashboard-card-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p>Complaints</p>
            <strong>{loading ? '—' : kpis.totalComplaints || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 4. Pending Complaints */}
        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.14}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Pending Issues</p>
            <strong>{loading ? '—' : kpis.pendingComplaints || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 5. Resolved Complaints */}
        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.16}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Resolved</p>
            <strong>{loading ? '—' : kpis.resolvedComplaints || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 6. Active Events */}
        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.18}>
          <span className="dashboard-card-icon">
            <CalendarDays size={22} />
          </span>
          <div>
            <p>Campus Events</p>
            <strong>{loading ? '—' : kpis.totalEvents || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 7. Event Registrations */}
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.2}>
          <span className="dashboard-card-icon">
            <Users size={22} />
          </span>
          <div>
            <p>Registrations</p>
            <strong>{loading ? '—' : kpis.totalRegistrations || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 8. Event Attendance */}
        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.22}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Attendance Checks</p>
            <strong>{loading ? '—' : kpis.totalAttendance || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 9. Open Lost & Found */}
        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.24}>
          <span className="dashboard-card-icon">
            <PackageSearch size={22} />
          </span>
          <div>
            <p>Open Lost &amp; Found</p>
            <strong>{loading ? '—' : kpis.openLostFound || 0}</strong>
          </div>
        </AnimatedCard>

        {/* 10. Avg Feedback Rating */}
        <AnimatedCard className="dashboard-stat-card tone-amber" delay={0.26}>
          <span className="dashboard-card-icon">
            <Star fill="#fbbf24" size={22} />
          </span>
          <div>
            <p>Satisfaction Rating</p>
            <strong>
              {loading
                ? '—'
                : kpis.averageFeedbackRating > 0
                ? `${kpis.averageFeedbackRating.toFixed(1)} / 5.0`
                : 'No ratings'}
            </strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Analytics Charts Grid */}
      <div className="reports-charts-grid" style={{ marginTop: '20px' }}>
        {/* CHART 1: Complaint Status Distribution (Donut) */}
        <AnimatedCard className="reports-chart-card" delay={0.28} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <PieChart color="#22d3ee" size={18} />
                Complaint Status Distribution
              </h3>
              <p className="chart-card-subtitle">Real-time breakdown of current complaint states</p>
            </div>
            <span className="chart-pill-badge">{totalComplaintsInSlice} Total</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading status breakdown...
            </div>
          ) : totalComplaintsInSlice === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No complaint data found for this period.</p>
            </div>
          ) : (
            <div className="analytics-donut-container">
              <div className="analytics-donut-svg-wrap">
                <svg height="150" viewBox="0 0 120 120" width="150">
                  <circle
                    cx="60"
                    cy="60"
                    fill="transparent"
                    r={donutRadius}
                    stroke="rgba(30, 41, 59, 0.6)"
                    strokeWidth="14"
                  />
                  {donutSegments.map((segment) => (
                    <circle
                      cx="60"
                      cy="60"
                      fill="transparent"
                      key={segment.label}
                      r={donutRadius}
                      stroke={segment.color}
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      strokeWidth="14"
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                      transform="rotate(-90 60 60)"
                    />
                  ))}
                </svg>
                <div className="analytics-donut-center-text">
                  <span className="analytics-donut-center-num">{totalComplaintsInSlice}</span>
                  <span className="analytics-donut-center-label">Cases</span>
                </div>
              </div>

              <div className="analytics-legend-list">
                {donutSegments.map((seg) => (
                  <div className="analytics-legend-item" key={seg.label}>
                    <div className="analytics-legend-left">
                      <span className="analytics-legend-dot" style={{ background: seg.color }} />
                      <span>{seg.label}</span>
                    </div>
                    <span className="analytics-legend-count">
                      {seg.count} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({seg.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>

        {/* CHART 2: Complaint Velocity Trend (SVG Line) */}
        <AnimatedCard className="reports-chart-card" delay={0.32} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <TrendingUp color="#38bdf8" size={18} />
                Complaint Velocity Trend
              </h3>
              <p className="chart-card-subtitle">Volume of tickets submitted across the selected window</p>
            </div>
            <span className="chart-pill-badge">{complaintTrend.length} Periods</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading timeline velocity...
            </div>
          ) : complaintTrend.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No ticket velocity recorded in this range.</p>
            </div>
          ) : (
            <div className="analytics-trend-wrap">
              <svg className="trend-svg" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="liveTrendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="30" y2="30" />
                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="80" y2="80" />
                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="130" y2="130" />

                {(() => {
                  const points = complaintTrend.map((item, idx) => {
                    const x = 30 + (idx * (340 / Math.max(complaintTrend.length - 1, 1)));
                    const y = 130 - (item.count / maxTrendCount) * 100;
                    return { x, y, item };
                  });

                  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${lineD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

                  return (
                    <>
                      <path d={areaD} fill="url(#liveTrendGradient)" />
                      <path
                        d={lineD}
                        fill="none"
                        stroke="#22d3ee"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                      />
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            fill="#0f1e33"
                            r="5"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                          />
                          <text
                            fill="#e0f2fe"
                            fontSize="10"
                            fontWeight="800"
                            textAnchor="middle"
                            x={p.x}
                            y={p.y - 10}
                          >
                            {p.item.count}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="trend-x-axis">
                {complaintTrend.map((m, i) => (
                  <span key={i}>{m.label}</span>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>

        {/* CHART 3: Department Workload & Backlog */}
        <AnimatedCard className="reports-chart-card" delay={0.36} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <Building2 color="#60a5fa" size={18} />
                Department Workload &amp; Backlog
              </h3>
              <p className="chart-card-subtitle">Active and resolved grievances assigned per department</p>
            </div>
            <span className="chart-pill-badge">{departmentWorkload.length} Depts</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading department telemetry...
            </div>
          ) : departmentWorkload.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No department workloads to display.</p>
            </div>
          ) : (
            <div className="analytics-bar-list">
              {departmentWorkload.map((dept) => {
                const percent = Math.round((dept.total / maxDeptTotal) * 100);
                return (
                  <div className="analytics-bar-item" key={dept.id || dept.code}>
                    <div className="analytics-bar-label-row">
                      <span className="analytics-bar-label">
                        <strong>{dept.name}</strong> <span style={{ color: '#94a3b8' }}>({dept.code})</span>
                      </span>
                      <span className="analytics-bar-value" style={{ color: '#22d3ee' }}>
                        {dept.total} total • <span style={{ color: '#fbbf24' }}>{dept.pending} pend</span> • <span style={{ color: '#86efac' }}>{dept.resolved} res</span>
                      </span>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: 'linear-gradient(90deg, #2563eb, #22d3ee)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnimatedCard>

        {/* CHART 4: Event Engagement & Turnout */}
        <AnimatedCard className="reports-chart-card" delay={0.4} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <CalendarDays color="#a78bfa" size={18} />
                Event Engagement &amp; QR Turnout
              </h3>
              <p className="chart-card-subtitle">Registrations compared to verified QR attendance check-ins</p>
            </div>
            <span className="chart-pill-badge">Turnout Rate</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading event metrics...
            </div>
          ) : eventPerformance.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No campus events recorded yet.</p>
            </div>
          ) : (
            <div className="live-event-perf-list">
              {eventPerformance.map((ev) => (
                <div className="live-event-perf-card" key={ev.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: '14px' }}>{ev.title}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        {ev.venue} • {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <span
                      className={`track-badge ${ev.turnoutRate >= 60 ? 'status-resolved' : ev.turnoutRate > 0 ? 'status-pending' : 'status-rejected'}`}
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                    >
                      {ev.turnoutRate}% Turnout
                    </span>
                  </div>

                  {/* Comparative Progress Bar */}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                      <span>Registered: <strong>{ev.registrations}</strong></span>
                      <span style={{ color: '#86efac' }}>Checked In: <strong>{ev.attendance}</strong></span>
                    </div>
                    <div className="analytics-bar-track" style={{ height: '8px' }}>
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${Math.min(ev.turnoutRate, 100)}%`,
                          background: 'linear-gradient(90deg, #10b981, #22d3ee)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatedCard>

        {/* CHART 5: Lost & Found Registry Telemetry */}
        <AnimatedCard className="reports-chart-card" delay={0.44} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <PackageSearch color="#f59e0b" size={18} />
                Lost &amp; Found Registry
              </h3>
              <p className="chart-card-subtitle">Real-time status and categorization breakdown</p>
            </div>
            <span className="chart-pill-badge">{lostFoundStatus.total || 0} Total</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading registry stats...
            </div>
          ) : (lostFoundStatus.total || 0) === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No Lost &amp; Found items logged in this period.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Type Split Bar: Lost vs Found */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#fdba74' }}>Lost Items: <strong>{lostFoundStatus.lost || 0}</strong></span>
                  <span style={{ color: '#86efac' }}>Found Items: <strong>{lostFoundStatus.found || 0}</strong></span>
                </div>
                <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(30, 41, 59, 0.6)' }}>
                  <div
                    style={{
                      width: `${lostFoundStatus.total > 0 ? Math.round(((lostFoundStatus.lost || 0) / lostFoundStatus.total) * 100) : 50}%`,
                      background: 'linear-gradient(90deg, #ea580c, #f97316)'
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      background: 'linear-gradient(90deg, #059669, #10b981)'
                    }}
                  />
                </div>
              </div>

              {/* Status Pills Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div className="performance-stat-box" style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Open</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#22d3ee', margin: '4px 0 0' }}>
                    {lostFoundStatus.open || 0}
                  </strong>
                </div>
                <div className="performance-stat-box" style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Claimed</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#86efac', margin: '4px 0 0' }}>
                    {lostFoundStatus.claimed || 0}
                  </strong>
                </div>
                <div className="performance-stat-box" style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Closed</span>
                  <strong style={{ display: 'block', fontSize: '18px', color: '#cbd5e1', margin: '4px 0 0' }}>
                    {lostFoundStatus.closed || 0}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </AnimatedCard>

        {/* CHART 6: Student Satisfaction & Resolution Quality */}
        <AnimatedCard className="reports-chart-card" delay={0.48} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <Star color="#fbbf24" fill="#fbbf24" size={18} />
                Student Satisfaction Telemetry
              </h3>
              <p className="chart-card-subtitle">Verified ratings and resolution answers from authenticated students</p>
            </div>
            <span className="chart-pill-badge" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}>
              ★ {studentSatisfaction.averageRating > 0 ? studentSatisfaction.averageRating.toFixed(1) : '0.0'} / 5.0
            </span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading satisfaction ratings...
            </div>
          ) : (studentSatisfaction.totalFeedback || 0) === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No student feedback submitted for this period.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {/* Star Distribution */}
              <div className="analytics-bar-list">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = studentSatisfaction.ratingDistribution?.[stars] || 0;
                  const total = studentSatisfaction.totalFeedback || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div className="analytics-bar-item" key={stars}>
                      <div className="analytics-bar-label-row">
                        <span className="analytics-bar-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {stars} <Star fill="#fbbf24" color="#fbbf24" size={12} />
                        </span>
                        <span className="analytics-bar-value" style={{ color: '#fbbf24' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="analytics-bar-track" style={{ height: '6px' }}>
                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resolution Responses Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(56, 189, 248, 0.12)' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Resolved: <strong style={{ color: '#86efac' }}>{studentSatisfaction.resolutionBreakdown?.Yes || 0}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Partially: <strong style={{ color: '#fbbf24' }}>{studentSatisfaction.resolutionBreakdown?.Partially || 0}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Unresolved: <strong style={{ color: '#f87171' }}>{studentSatisfaction.resolutionBreakdown?.No || 0}</strong>
                </span>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>
    </AnimatedPage>
  );
}

export default AdminLiveAnalytics;
