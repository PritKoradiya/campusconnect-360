import { useState } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  GraduationCap,
  Building2,
  UserCog,
  MessageSquareWarning,
  Bell,
  CalendarDays,
  Search,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { getDashboardPath, useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

/* ─── data ─────────────────────────────────────────────── */

const roles = ['student', 'admin', 'department'];

const roleLabels = {
  student: 'Student',
  admin: 'Admin',
  department: 'Department',
};

const FEATURES = [
  {
    icon: <MessageSquareWarning size={18} />,
    title: 'Smart Complaint Tracking',
    desc: 'Submit and track campus complaints with real-time department updates.',
  },
  {
    icon: <Bell size={18} />,
    title: 'Campus Notices & Events',
    desc: 'Stay informed with official notices and discover upcoming events.',
  },
  {
    icon: <Search size={18} />,
    title: 'Lost & Found + AI Support',
    desc: 'Report lost items and get instant answers from our AI chatbot.',
  },
];

/* ─── animation variants ────────────────────────────────── */

// Info panel slides in from left on login
const infoPanelVariants = {
  initial: { x: '-100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.4, ease: [0.55, 0, 1, 0.45] },
  },
};

// Card slides in from right on login
const cardVariants = {
  initial: { x: '60px', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1], delay: 0.05 },
  },
  exit: {
    x: '-40px',
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeIn' },
  },
};

/* ─── component ─────────────────────────────────────────── */

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    role: 'student',
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const authData = await login({
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      setSuccessMessage(authData.message || 'Login successful');
      navigate(getDashboardPath(authData.user.role), { replace: true });
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Active tab label for the card title */
  const activeRoleLabel = roleLabels[formData.role];

  return (
    <div className="cc-auth-root">
      {/* LOGIN layout: info LEFT, form RIGHT */}
      <div className="cc-auth-layout">

        {/* ──────────── LEFT: Info Panel ──────────── */}
        <AnimatePresence mode="wait">
          <motion.aside
            key="login-info"
            className="cc-info-panel"
            variants={infoPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Brand */}
            <div className="cc-info-brand">
              <div className="cc-info-brand-icon">
                <img src={logo} alt="CampusConnect 360" />
              </div>
              <span className="cc-info-brand-name">CampusConnect 360</span>
            </div>

            {/* Body */}
            <div className="cc-info-body">
              <div className="cc-info-badge">
                <ShieldCheck size={12} />
                Campus Portal
              </div>

              <h1 className="cc-info-heading">
                Smart campus. Better student experience.
              </h1>

              <p className="cc-info-desc">
                Manage complaints, browse notices, discover events, and
                access campus services — all in one place.
              </p>

              <div className="cc-info-features">
                {FEATURES.map((f) => (
                  <div key={f.title} className="cc-info-feature">
                    <div className="cc-info-feature-icon">{f.icon}</div>
                    <div className="cc-info-feature-content">
                      <strong>{f.title}</strong>
                      <span>{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/register" className="cc-info-cta">
                Need an account? Register now
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Footer */}
            <footer className="cc-info-footer">
              <span>© 2026 CampusConnect 360</span>
              <span>Smart Campus Platform</span>
            </footer>
          </motion.aside>
        </AnimatePresence>

        {/* ──────────── RIGHT: Form Panel ──────────── */}
        <div className="cc-form-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key="login-card"
              className="cc-auth-card"
              variants={cardVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Card top bar */}
              <div className="cc-card-topbar">
                <Link to="/" className="cc-card-back-btn">
                  <ChevronLeft size={14} />
                  Back
                </Link>
                <div className="cc-card-title-block">
                  <h2 className="cc-card-title">
                    <span className="cc-card-title-icon">
                      {formData.role === 'student' ? (
                        <GraduationCap size={18} />
                      ) : formData.role === 'admin' ? (
                        <UserCog size={18} />
                      ) : (
                        <Building2 size={18} />
                      )}
                    </span>
                    {activeRoleLabel} Login
                  </h2>
                  <p className="cc-card-subtitle">
                    Sign in to your {activeRoleLabel.toLowerCase()} account
                  </p>
                </div>
              </div>

              {/* Card body */}
              <form className="cc-card-body" onSubmit={handleSubmit} noValidate>

                {/* Role tabs */}
                <div className="cc-portal-tabs" role="radiogroup" aria-label="Select role">
                  {roles.map((r) => (
                    <label
                      key={r}
                      className={`cc-portal-tab${formData.role === r ? ' cc-tab-active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={formData.role === r}
                        onChange={handleChange}
                      />
                      {r === 'student' ? (
                        <GraduationCap size={13} />
                      ) : r === 'admin' ? (
                        <UserCog size={13} />
                      ) : (
                        <Building2 size={13} />
                      )}
                      {roleLabels[r]}
                    </label>
                  ))}
                </div>

                {/* Email */}
                <div className="cc-fg">
                  <label htmlFor="login-email">
                    Email Address<span className="cc-required">*</span>
                  </label>
                  <div className="cc-iw">
                    <Mail size={16} />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="cc-fg">
                  <label htmlFor="login-password">
                    Password<span className="cc-required">*</span>
                  </label>
                  <div className="cc-iw">
                    <Lock size={16} />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="cc-pw-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember / Forgot */}
                <div className="cc-meta-row">
                  <label className="cc-remember-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>Remember me</span>
                  </label>
                  <a href="#forgot-password" className="cc-forgot-link">
                    Forgot password?
                  </a>
                </div>

                {/* Messages */}
                {errorMessage && (
                  <p className="cc-msg cc-msg-error" role="alert">
                    {errorMessage}
                  </p>
                )}
                {successMessage && (
                  <p className="cc-msg cc-msg-success" role="status">
                    {successMessage}
                  </p>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  className="cc-submit"
                  disabled={isSubmitting}
                  whileHover={!isSubmitting ? { scale: 1.012 } : {}}
                  whileTap={!isSubmitting ? { scale: 0.988 } : {}}
                >
                  {isSubmitting ? 'Signing in…' : `Sign In as ${activeRoleLabel}`}
                  {!isSubmitting && <ArrowRight size={16} />}
                </motion.button>

                {/* Divider + create account */}
                <div className="cc-divider">New to CampusConnect 360?</div>

                <Link to="/register" className="cc-ghost-btn">
                  Create an Account
                </Link>

                <p className="cc-switch-text" style={{ marginTop: 12 }}>
                  Already have an account?{' '}
                  <Link to="/register">Register here</Link>
                </p>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;
