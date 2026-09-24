import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  HeartHandshake,
  MessageSquare,
  PackageSearch,
  PieChart,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  XCircle
} from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { getAdminReports } from '../../services/reportService';

const dateRangeOptions = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'This Year', value: '1y' }
];

function AdminReports() {
  const [reportData, setReportData] = useState(null);
  const [selectedRange, setSelectedRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('all');
  const [feedbackResolutionFilter, setFeedbackResolutionFilter] = useState('all');

  const fetchReports = async (range = selectedRange, isManual = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Session expired. Please login again.');
      setLoading(false);
      return;
    }

    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const response = await getAdminReports({ range });
      setReportData(response.data?.data || null);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view reports.');
      } else {
        setError(err.response?.data?.message || 'Failed to load reports');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedRange);
  }, [selectedRange]);

  const handleRangeChange = (rangeValue) => {
    setSelectedRange(rangeValue);
  };

  const complaints = reportData?.complaints || {};
  const users = reportData?.users || {};
  const notices = reportData?.notices || {};
  const events = reportData?.events || {};
  const lostFound = reportData?.lostFound || {};
  const complaintsByDept = reportData?.complaintsByDepartment || [];
  const complaintsByCat = reportData?.complaintsByCategory || [];
  const complaintsByPri = reportData?.complaintsByPriority || [];
  const monthlyTrend = reportData?.monthlyTrend || [];
  const resolutionPerf = complaints?.resolutionPerformance || {};

  const totalComplaints = complaints.total || 0;
  const resolutionRate = totalComplaints > 0 ? Math.round(((complaints.resolved || 0) / totalComplaints) * 100) : 0;

  // Status slices for donut chart
  const statusSlices = [
    { label: 'Pending', count: complaints.pending || 0, color: '#f59e0b' },
    { label: 'In Progress', count: complaints.inProgress || 0, color: '#22d3ee' },
    { label: 'Resolved', count: complaints.resolved || 0, color: '#10b981' },
    { label: 'Rejected', count: complaints.rejected || 0, color: '#ef4444' }
  ];

  // Calculate SVG donut stroke offsets
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const donutSegments = statusSlices.map((slice) => {
    const fraction = totalComplaints > 0 ? slice.count / totalComplaints : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    return { ...slice, strokeDasharray, strokeDashoffset, percentage: Math.round(fraction * 100) };
  });

  // Calculate max values for bar charts
  const maxDeptCount = Math.max(...complaintsByDept.map((d) => d.count), 1);
  const maxCatCount = Math.max(...complaintsByCat.map((c) => c.count), 1);
  const maxPriCount = Math.max(...complaintsByPri.map((p) => p.count), 1);
  const maxTrendCount = Math.max(...monthlyTrend.map((m) => m.count), 1);

  // Student Satisfaction Analytics
  const satisfaction = reportData?.satisfaction || {};
  const totalFeedback = satisfaction.totalFeedback || 0;
  const feedbackRate = satisfaction.feedbackRate || 0;
  const averageRating = satisfaction.averageRating || 0;
  const ratingDistribution = satisfaction.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const resolutionBreakdown = satisfaction.resolutionBreakdown || { Yes: 0, Partially: 0, No: 0 };
  const departmentSatisfaction = satisfaction.departmentSatisfaction || [];
  const recentFeedback = satisfaction.recentFeedback || [];

  const yesCount = resolutionBreakdown.Yes || 0;
  const partiallyCount = resolutionBreakdown.Partially || 0;
  const noCount = resolutionBreakdown.No || 0;
  const positiveResolutionPct = totalFeedback > 0 ? Math.round(((yesCount + partiallyCount * 0.5) / totalFeedback) * 100) : 0;

  const filteredFeedback = recentFeedback.filter((fb) => {
    if (feedbackRatingFilter !== 'all' && fb.rating !== Number(feedbackRatingFilter)) return false;
    if (feedbackResolutionFilter !== 'all' && fb.resolutionStatus !== feedbackResolutionFilter) return false;
    return true;
  });

  const formatFeedbackDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AnimatedPage>
      {/* Page Header */}
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Executive Analytics</p>
          <h1>Reports &amp; Analytics</h1>
          <p>Monitor campus activity, complaints, users, and service performance.</p>
        </div>
        <div className="admin-header-actions" style={{ flexWrap: 'wrap' }}>
          {/* Date Range Selector */}
          <div className="reports-range-selector">
            {dateRangeOptions.map((opt) => (
              <button
                className={`reports-range-btn ${selectedRange === opt.value ? 'active' : ''}`}
                key={opt.value}
                onClick={() => handleRangeChange(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            className="admin-refresh-btn"
            disabled={refreshing || loading}
            onClick={() => fetchReports(selectedRange, true)}
            title="Refresh analytics data"
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

      {/* Global Error Banner with Retry */}
      {error && (
        <AnimatedCard className="dashboard-panel tone-danger" delay={0.08} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle color="#f87171" size={22} />
              <div>
                <strong style={{ color: '#ffffff' }}>{error}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#fca5a5' }}>
                  Please verify server connectivity and try again.
                </p>
              </div>
            </div>
            <button
              className="complaint-submit-button"
              onClick={() => fetchReports(selectedRange)}
              style={{ minHeight: '34px', padding: '0 14px', fontSize: '12.5px' }}
              type="button"
            >
              <RefreshCcw size={14} style={{ marginRight: '6px' }} />
              Retry
            </button>
          </div>
        </AnimatedCard>
      )}

      {/* Top KPI Cards */}
      <div className="dashboard-grid dashboard-admin-grid">
        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.08}>
          <span className="dashboard-card-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <p>Total Complaints</p>
            <strong>{loading ? '—' : totalComplaints}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.12}>
          <span className="dashboard-card-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <p>Pending</p>
            <strong>{loading ? '—' : complaints.pending || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.16}>
          <span className="dashboard-card-icon">
            <Timer size={22} />
          </span>
          <div>
            <p>In Progress</p>
            <strong>{loading ? '—' : complaints.inProgress || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-success" delay={0.2}>
          <span className="dashboard-card-icon">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <p>Resolved</p>
            <strong>{loading ? '—' : complaints.resolved || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-purple" delay={0.24}>
          <span className="dashboard-card-icon">
            <Users size={22} />
          </span>
          <div>
            <p>Total Users</p>
            <strong>{loading ? '—' : users.total || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-blue" delay={0.28}>
          <span className="dashboard-card-icon">
            <Bell size={22} />
          </span>
          <div>
            <p>Active Notices</p>
            <strong>{loading ? '—' : notices.totalActive || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-cyan" delay={0.32}>
          <span className="dashboard-card-icon">
            <CalendarDays size={22} />
          </span>
          <div>
            <p>Upcoming Events</p>
            <strong>{loading ? '—' : events.upcoming || 0}</strong>
          </div>
        </AnimatedCard>

        <AnimatedCard className="dashboard-stat-card tone-warning" delay={0.36}>
          <span className="dashboard-card-icon">
            <PackageSearch size={22} />
          </span>
          <div>
            <p>Open Lost &amp; Found</p>
            <strong>{loading ? '—' : lostFound.open || 0}</strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Resolution Performance Stat Box */}
      {!loading && reportData && (
        <AnimatedCard className="dashboard-panel" delay={0.38} hover={false} style={{ marginTop: '20px' }}>
          <div className="chart-card-header" style={{ marginBottom: '12px' }}>
            <div>
              <h3 className="chart-card-title">
                <Sparkles color="#22d3ee" size={18} />
                Resolution Performance Overview
              </h3>
              <p className="chart-card-subtitle">
                Efficiency and response velocity across resolved campus grievances.
              </p>
            </div>
            <span className="chart-pill-badge">{resolutionRate}% Resolution Rate</span>
          </div>

          <div className="performance-stat-banner">
            <div className="performance-stat-box">
              <h4>Resolved Complaints</h4>
              <strong>{resolutionPerf.resolvedCount || complaints.resolved || 0}</strong>
            </div>
            <div className="performance-stat-box">
              <h4>Average Resolution Time</h4>
              <strong>
                {resolutionPerf.avgResolutionHours > 0
                  ? `${resolutionPerf.avgResolutionHours} hrs`
                  : 'N/A (No timestamps)'}
              </strong>
            </div>
            <div className="performance-stat-box">
              <h4>Resolution Efficiency</h4>
              <strong style={{ color: resolutionRate >= 70 ? '#86efac' : '#fbbf24' }}>
                {resolutionRate}%
              </strong>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Analytics Charts Grid */}
      <div className="reports-charts-grid">
        {/* 1. Complaint Status Distribution Donut Chart */}
        <AnimatedCard className="reports-chart-card" delay={0.4} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <PieChart color="#22d3ee" size={18} />
                Complaint Status Distribution
              </h3>
              <p className="chart-card-subtitle">Current breakdown of complaint lifecycle states</p>
            </div>
            <span className="chart-pill-badge">{totalComplaints} Total</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading status distribution...
            </div>
          ) : totalComplaints === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No complaint data available for this range.</p>
            </div>
          ) : (
            <div className="analytics-donut-container">
              {/* SVG Donut Visualizer */}
              <div className="analytics-donut-svg-wrap">
                <svg height="150" viewBox="0 0 120 120" width="150">
                  <circle
                    cx="60"
                    cy="60"
                    fill="transparent"
                    r={radius}
                    stroke="rgba(30, 41, 59, 0.6)"
                    strokeWidth="14"
                  />
                  {donutSegments.map((segment) => (
                    <circle
                      cx="60"
                      cy="60"
                      fill="transparent"
                      key={segment.label}
                      r={radius}
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
                  <span className="analytics-donut-center-num">{totalComplaints}</span>
                  <span className="analytics-donut-center-label">Cases</span>
                </div>
              </div>

              {/* Legend List */}
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

        {/* 2. Monthly Trend Chart */}
        <AnimatedCard className="reports-chart-card" delay={0.44} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <TrendingUp color="#38bdf8" size={18} />
                Monthly Complaint Trend
              </h3>
              <p className="chart-card-subtitle">Volume of complaints submitted over time</p>
            </div>
            <span className="chart-pill-badge">{monthlyTrend.length} Periods</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading timeline trend...
            </div>
          ) : monthlyTrend.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No monthly timeline data recorded yet.</p>
            </div>
          ) : (
            <div className="analytics-trend-wrap">
              <svg className="trend-svg" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="30" y2="30" />
                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="80" y2="80" />
                <line stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="3 3" x1="20" x2="380" y1="130" y2="130" />

                {/* Generate SVG Path Points */}
                {(() => {
                  const points = monthlyTrend.map((item, idx) => {
                    const x = 30 + (idx * (340 / Math.max(monthlyTrend.length - 1, 1)));
                    const y = 130 - (item.count / maxTrendCount) * 100;
                    return { x, y, item };
                  });

                  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const areaD = `${lineD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

                  return (
                    <>
                      <path d={areaD} fill="url(#trendGradient)" />
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

              {/* X-axis labels */}
              <div className="trend-x-axis">
                {monthlyTrend.map((m, i) => (
                  <span key={i}>{m.month}</span>
                ))}
              </div>
            </div>
          )}
        </AnimatedCard>

        {/* 3. Complaints by Department */}
        <AnimatedCard className="reports-chart-card" delay={0.48} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <Building2 color="#60a5fa" size={18} />
                Complaints by Department
              </h3>
              <p className="chart-card-subtitle">Volume of grievances mapped to campus departments</p>
            </div>
            <span className="chart-pill-badge">{complaintsByDept.length} Depts</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading department statistics...
            </div>
          ) : complaintsByDept.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No department complaint assignments found.</p>
            </div>
          ) : (
            <div className="analytics-bar-list">
              {complaintsByDept.map((item) => {
                const percent = Math.round((item.count / maxDeptCount) * 100);
                return (
                  <div className="analytics-bar-item" key={item.department}>
                    <div className="analytics-bar-label-row">
                      <span className="analytics-bar-label">{item.department}</span>
                      <span className="analytics-bar-value">{item.count} cases</span>
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

        {/* 4. Complaints by Category */}
        <AnimatedCard className="reports-chart-card" delay={0.52} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <BarChart3 color="#a78bfa" size={18} />
                Complaints by Category
              </h3>
              <p className="chart-card-subtitle">Topic categorization of student complaints</p>
            </div>
            <span className="chart-pill-badge">{complaintsByCat.length} Categories</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading category metrics...
            </div>
          ) : complaintsByCat.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No categorized complaints recorded.</p>
            </div>
          ) : (
            <div className="analytics-bar-list">
              {complaintsByCat.map((item) => {
                const percent = Math.round((item.count / maxCatCount) * 100);
                return (
                  <div className="analytics-bar-item" key={item.category}>
                    <div className="analytics-bar-label-row">
                      <span className="analytics-bar-label">{item.category}</span>
                      <span className="analytics-bar-value" style={{ color: '#c084fc' }}>
                        {item.count} cases
                      </span>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: 'linear-gradient(90deg, #7c3aed, #a855f7)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnimatedCard>

        {/* 5. Complaints by Priority */}
        <AnimatedCard className="reports-chart-card" delay={0.56} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <AlertTriangle color="#f87171" size={18} />
                Complaints by Priority
              </h3>
              <p className="chart-card-subtitle">Urgency classification of submitted tickets</p>
            </div>
            <span className="chart-pill-badge">Priority Level</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading priority breakdown...
            </div>
          ) : complaintsByPri.length === 0 ? (
            <div className="track-empty-state">
              <p style={{ margin: 0, color: '#94a3b8' }}>No priority data recorded.</p>
            </div>
          ) : (
            <div className="analytics-bar-list">
              {complaintsByPri.map((item) => {
                const percent = Math.round((item.count / maxPriCount) * 100);
                const priorityColors = {
                  Urgent: 'linear-gradient(90deg, #dc2626, #ef4444)',
                  High: 'linear-gradient(90deg, #d97706, #f59e0b)',
                  Medium: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  Low: 'linear-gradient(90deg, #059669, #10b981)'
                };

                return (
                  <div className="analytics-bar-item" key={item.priority}>
                    <div className="analytics-bar-label-row">
                      <span className="analytics-bar-label">{item.priority} Priority</span>
                      <span className="analytics-bar-value" style={{ color: '#ffffff' }}>
                        {item.count} cases
                      </span>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: priorityColors[item.priority] || 'linear-gradient(90deg, #2563eb, #22d3ee)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AnimatedCard>

        {/* 6. User Distribution by Role */}
        <AnimatedCard className="reports-chart-card" delay={0.6} hover={false}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">
                <UserCheck color="#4ade80" size={18} />
                User Directory Analytics
              </h3>
              <p className="chart-card-subtitle">Registered campus stakeholders and role counts</p>
            </div>
            <span className="chart-pill-badge">{users.total || 0} Total</span>
          </div>

          {loading ? (
            <div className="track-empty-state">
              <div className="chatbot-loading-spinner" style={{ margin: '8px auto' }} />
              Loading user metrics...
            </div>
          ) : (
            <div className="analytics-bar-list">
              {/* Students */}
              <div className="analytics-bar-item">
                <div className="analytics-bar-label-row">
                  <span className="analytics-bar-label">Students</span>
                  <span className="analytics-bar-value" style={{ color: '#93c5fd' }}>
                    {users.students || 0}
                  </span>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      width: `${users.total > 0 ? Math.round(((users.students || 0) / users.total) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)'
                    }}
                  />
                </div>
              </div>

              {/* Department Users */}
              <div className="analytics-bar-item">
                <div className="analytics-bar-label-row">
                  <span className="analytics-bar-label">Department Staff</span>
                  <span className="analytics-bar-value" style={{ color: '#6ee7b7' }}>
                    {users.departmentUsers || 0}
                  </span>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      width: `${users.total > 0 ? Math.round(((users.departmentUsers || 0) / users.total) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, #059669, #34d399)'
                    }}
                  />
                </div>
              </div>

              {/* Administrators */}
              <div className="analytics-bar-item">
                <div className="analytics-bar-label-row">
                  <span className="analytics-bar-label">Administrators</span>
                  <span className="analytics-bar-value" style={{ color: '#e9d5ff' }}>
                    {users.admins || 0}
                  </span>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      width: `${users.total > 0 ? Math.round(((users.admins || 0) / users.total) * 100) : 0}%`,
                      background: 'linear-gradient(90deg, #7c3aed, #c084fc)'
                    }}
                  />
                </div>
              </div>

              {/* Active / Inactive Status pill overview */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(56, 189, 248, 0.12)'
                }}
              >
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Active Accounts: <strong style={{ color: '#86efac' }}>{users.active || 0}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Inactive Accounts: <strong style={{ color: '#f87171' }}>{users.inactive || 0}</strong>
                </span>
              </div>
            </div>
          )}
        </AnimatedCard>
      </div>

      {/* 7. Student Satisfaction & Resolution Feedback Section */}
      {!loading && reportData && (
        <AnimatedCard className="dashboard-panel" delay={0.62} hover={false} style={{ marginTop: '20px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 className="chart-card-title">
                <Star color="#f59e0b" fill="#f59e0b" size={18} />
                Student Satisfaction &amp; Resolution Feedback
              </h3>
              <p className="chart-card-subtitle">
                Direct student feedback, ratings, and resolution perception for resolved complaints.
              </p>
            </div>
            <span className="chart-pill-badge" style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}>
              ★ {averageRating > 0 ? averageRating.toFixed(1) : '0.0'} Avg Rating
            </span>
          </div>

          {/* Satisfaction KPI Row */}
          <div className="satisfaction-stats-grid">
            <div className="satisfaction-kpi-card">
              <span className="satisfaction-kpi-icon tone-amber">
                <Star fill="#fbbf24" size={20} />
              </span>
              <div className="satisfaction-kpi-info">
                <p>Average Rating</p>
                <strong>{averageRating > 0 ? `${averageRating.toFixed(1)} / 5.0` : 'No ratings'}</strong>
              </div>
            </div>

            <div className="satisfaction-kpi-card">
              <span className="satisfaction-kpi-icon tone-cyan">
                <MessageSquare size={20} />
              </span>
              <div className="satisfaction-kpi-info">
                <p>Total Feedback</p>
                <strong>{totalFeedback}</strong>
              </div>
            </div>

            <div className="satisfaction-kpi-card">
              <span className="satisfaction-kpi-icon tone-emerald">
                <ThumbsUp size={20} />
              </span>
              <div className="satisfaction-kpi-info">
                <p>Feedback Rate</p>
                <strong>{feedbackRate}%</strong>
              </div>
            </div>

            <div className="satisfaction-kpi-card">
              <span className="satisfaction-kpi-icon tone-purple">
                <HeartHandshake size={20} />
              </span>
              <div className="satisfaction-kpi-info">
                <p>Resolution Sentiment</p>
                <strong>{positiveResolutionPct}% Positive</strong>
              </div>
            </div>
          </div>

          {/* Rating Breakdown & Issue Resolution Perception */}
          <div className="satisfaction-two-col">
            {/* Rating Distribution */}
            <div className="reports-chart-card" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star color="#f59e0b" size={16} /> Rating Breakdown
              </h4>
              <div className="analytics-bar-list">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingDistribution[stars] || 0;
                  const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0;
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
                      <div className="analytics-bar-track">
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
            </div>

            {/* Issue Resolution Perception */}
            <div className="reports-chart-card" style={{ padding: '16px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 color="#22d3ee" size={16} /> Issue Resolution Perception
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#94a3b8' }}>
                Student answers to "Was your issue resolved?"
              </p>
              <div className="analytics-bar-list">
                {[
                  { label: 'Yes (Fully Resolved)', key: 'Yes', color: 'linear-gradient(90deg, #059669, #34d399)' },
                  { label: 'Partially Resolved', key: 'Partially', color: 'linear-gradient(90deg, #d97706, #fbbf24)' },
                  { label: 'No (Unresolved)', key: 'No', color: 'linear-gradient(90deg, #dc2626, #f87171)' }
                ].map((item) => {
                  const count = resolutionBreakdown[item.key] || 0;
                  const pct = totalFeedback > 0 ? Math.round((count / totalFeedback) * 100) : 0;
                  return (
                    <div className="analytics-bar-item" key={item.key}>
                      <div className="analytics-bar-label-row">
                        <span className="analytics-bar-label">{item.label}</span>
                        <span className="analytics-bar-value" style={{ color: '#ffffff' }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="analytics-bar-track">
                        <div
                          className="analytics-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: item.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Department Satisfaction Overview */}
          <div style={{ marginTop: '10px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 color="#38bdf8" size={16} /> Department Satisfaction Summary
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#94a3b8' }}>
              Feedback averages across campus departments to support continuous improvement.
            </p>

            {departmentSatisfaction.length === 0 ? (
              <div className="track-empty-state" style={{ marginTop: '8px' }}>
                <p style={{ margin: 0, color: '#94a3b8' }}>No department feedback recorded yet.</p>
              </div>
            ) : (
              <div className="track-table-wrap" style={{ marginTop: '8px' }}>
                <table className="track-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Feedback Count</th>
                      <th>Average Rating</th>
                      <th>Satisfaction Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSatisfaction.map((dept) => {
                      const rating = dept.averageRating || 0;
                      let badgeClass = 'status-pending';
                      let label = 'Moderate';
                      if (rating >= 4.0) {
                        badgeClass = 'status-resolved';
                        label = 'High Satisfaction';
                      } else if (rating < 3.0) {
                        badgeClass = 'status-rejected';
                        label = 'Needs Attention';
                      }

                      return (
                        <tr key={dept.department}>
                          <td style={{ fontWeight: 650, color: '#ffffff' }}>{dept.department}</td>
                          <td>{dept.feedbackCount} responses</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontWeight: 700 }}>
                              <Star fill="#fbbf24" size={14} /> {rating.toFixed(1)} / 5.0
                            </span>
                          </td>
                          <td>
                            <span className={`track-badge ${badgeClass}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Student Feedback Review Feed */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare color="#22d3ee" size={16} /> Recent Student Feedback Feed
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Verified reviews and comments from authenticated students.
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="satisfaction-filter-bar">
              <div className="satisfaction-filter-group">
                <span className="satisfaction-filter-label">Rating:</span>
                {['all', '5', '4', '3', '2', '1'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`satisfaction-filter-btn ${feedbackRatingFilter === r ? 'active' : ''}`}
                    onClick={() => setFeedbackRatingFilter(r)}
                  >
                    {r === 'all' ? 'All' : `${r}★`}
                  </button>
                ))}
              </div>

              <div className="satisfaction-filter-group">
                <span className="satisfaction-filter-label">Resolved?:</span>
                {['all', 'Yes', 'Partially', 'No'].map((res) => (
                  <button
                    key={res}
                    type="button"
                    className={`satisfaction-filter-btn ${feedbackResolutionFilter === res ? 'active' : ''}`}
                    onClick={() => setFeedbackResolutionFilter(res)}
                  >
                    {res === 'all' ? 'All' : res}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Cards */}
            {filteredFeedback.length === 0 ? (
              <div className="track-empty-state">
                <p style={{ margin: 0, color: '#94a3b8' }}>
                  {recentFeedback.length === 0
                    ? 'No student feedback submitted yet for this period.'
                    : 'No feedback matches the selected filters.'}
                </p>
              </div>
            ) : (
              <div className="satisfaction-feedback-feed">
                {filteredFeedback.map((fb) => (
                  <div className="satisfaction-feedback-card" key={fb.id}>
                    <div className="satisfaction-card-header">
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '14.5px' }}>{fb.complaintTitle}</strong>
                        <div className="satisfaction-card-meta" style={{ marginTop: '4px' }}>
                          <span className="track-badge status-in-progress" style={{ fontSize: '11px', padding: '1px 8px' }}>
                            {fb.complaintCategory}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Dept: <strong style={{ color: '#cbd5e1' }}>{fb.departmentName}</strong>
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>•</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            By {fb.studentName} on {formatFeedbackDate(fb.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              fill={star <= fb.rating ? '#fbbf24' : 'transparent'}
                              color={star <= fb.rating ? '#fbbf24' : '#475569'}
                            />
                          ))}
                        </div>
                        <span
                          className={`track-badge ${
                            fb.resolutionStatus === 'Yes'
                              ? 'status-resolved'
                              : fb.resolutionStatus === 'Partially'
                              ? 'status-pending'
                              : 'status-rejected'
                          }`}
                          style={{ fontSize: '11.5px', padding: '2px 8px' }}
                        >
                          Resolved: {fb.resolutionStatus}
                        </span>
                      </div>
                    </div>

                    {fb.comment ? (
                      <div className="satisfaction-comment-box">
                        "{fb.comment}"
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                        No written comment provided.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedCard>
      )}

      {/* Additional Ecosystem Breakdown Card */}
      {!loading && reportData && (
        <AnimatedCard className="dashboard-panel" delay={0.64} hover={false} style={{ marginTop: '20px' }}>
          <div className="dashboard-section-heading">
            <h2>Campus Ecosystem Pulse</h2>
            <p>Overall engagement across broadcast announcements, scheduled events, and lost &amp; found items.</p>
          </div>

          <div className="performance-stat-banner" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="performance-stat-box">
              <h4>Announcements Active</h4>
              <strong style={{ color: '#60a5fa' }}>{notices.totalActive || 0}</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {notices.urgent || 0} Urgent • {notices.expired || 0} Expired
              </span>
            </div>

            <div className="performance-stat-box">
              <h4>Campus Events</h4>
              <strong style={{ color: '#22d3ee' }}>{events.totalActive || 0}</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {events.upcoming || 0} Upcoming • {events.past || 0} Past
              </span>
            </div>

            <div className="performance-stat-box">
              <h4>Lost &amp; Found Registry</h4>
              <strong style={{ color: '#f59e0b' }}>{lostFound.total || 0}</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {lostFound.lost || 0} Lost • {lostFound.found || 0} Found • {lostFound.claimed || 0} Claimed
              </span>
            </div>
          </div>
        </AnimatedCard>
      )}
    </AnimatedPage>
  );
}

export default AdminReports;
