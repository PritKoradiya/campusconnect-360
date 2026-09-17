import { useEffect, useState } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Hash,
  Lock,
  Mail,
  Phone,
  UserRound,
  Sparkles,
  GraduationCap,
  Building2,
  UserCog,
  MessageSquareWarning,
  Bell,
  Search,
  CalendarDays,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { getDashboardPath, useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../services/departmentService';
import '../../styles/auth.css';

/* ─── data ─────────────────────────────────────────────── */

const roles = ['student', 'admin', 'department'];

const roleConfig = {
  student: {
    label: 'Student',
    sub: 'Enrolled learner',
    icon: <GraduationCap size={18} />,
  },
  admin: {
    label: 'Admin',
    sub: 'Platform administrator',
    icon: <UserCog size={18} />,
  },
  department: {
    label: 'Department',
    sub: 'Dept. staff member',
    icon: <Building2 size={18} />,
  },
};

const INFO_FEATURES = [
  { icon: <MessageSquareWarning size={16} />, text: 'Easy complaint submission & tracking' },
  { icon: <Bell size={16} />, text: 'Official campus notices & announcements' },
  { icon: <CalendarDays size={16} />, text: 'Campus events discovery' },
  { icon: <Search size={16} />, text: 'Lost & Found + AI student assistant' },
];

/* ─── animation variants ────────────────────────────────── */

// On REGISTER: form is on LEFT → slides in from left
const formPanelVariants = {
  initial: { x: '-60px', opacity: 0 },
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

// On REGISTER: info panel is on RIGHT → slides in from right
const infoPanelVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.4, ease: [0.55, 0, 1, 0.45] },
  },
};

/* ─── component ─────────────────────────────────────────── */

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    enrollmentNo: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    branch: '',
    semester: '',
    department: '',
  });
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (formData.role === 'department' && availableDepartments.length === 0) {
      const fetchDepts = async () => {
        try {
          setDeptLoading(true);
          const response = await getDepartments();
          setAvailableDepartments(response.data?.departments || []);
        } catch {
          // fail silently — user can type department name
        } finally {
          setDeptLoading(false);
        }
      };
      fetchDepts();
    }
  }, [formData.role, availableDepartments.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Password and confirm password do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        enrollmentNo: formData.enrollmentNo.trim() || undefined,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        role: formData.role.toLowerCase(),
        branch: formData.branch.trim() || undefined,
        semester: formData.semester ? Number(formData.semester) : undefined,
        department: formData.department.trim() || undefined,
      };

      const authData = await register(payload);
      setSuccessMessage(authData.message || 'Registration successful');
      navigate(getDashboardPath(authData.user.role), { replace: true });
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Registration failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cc-auth-root">
      {/*
        REGISTER layout: cc-register-mode → CSS grid-template-areas swaps
        form to LEFT grid-area, info to RIGHT grid-area
      */}
      <div className="cc-auth-layout cc-register-mode">

        {/* ──────────── LEFT (grid-area: form) ──────────── */}
        <div className="cc-form-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key="register-card"
              className="cc-auth-card"
              style={{ width: 'min(500px, 100%)' }}
              variants={formPanelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Card top bar */}
              <div className="cc-card-topbar">
                <div className="cc-card-title-block">
                  <h2 className="cc-card-title">
                    <span className="cc-card-title-icon">
                      <UserRound size={18} />
                    </span>
                    Create your account
                  </h2>
                  <p className="cc-card-subtitle">
                    Join CampusConnect 360
                  </p>
                </div>
              </div>

              {/* Scrollable card body */}
              <form
                className="cc-card-body-scroll"
                onSubmit={handleSubmit}
                noValidate
              >
                {/* 2-col grid */}
                <div className="cc-grid2">

                  {/* Full Name */}
                  <div className="cc-fg">
                    <label htmlFor="reg-fullName">
                      Full Name<span className="cc-required">*</span>
                    </label>
                    <div className="cc-iw">
                      <UserRound size={15} />
                      <input
                        id="reg-fullName"
                        name="fullName"
                        type="text"
                        placeholder="e.g. Prit Koradiya"
                        value={formData.fullName}
                        onChange={handleChange}
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  {/* Enrollment No */}
                  <div className="cc-fg">
                    <label htmlFor="reg-enrollmentNo">Enrollment No.</label>
                    <div className="cc-iw">
                      <Hash size={15} />
                      <input
                        id="reg-enrollmentNo"
                        name="enrollmentNo"
                        type="text"
                        placeholder="ENR001"
                        value={formData.enrollmentNo}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="cc-fg">
                    <label htmlFor="reg-email">
                      Email Address<span className="cc-required">*</span>
                    </label>
                    <div className="cc-iw">
                      <Mail size={15} />
                      <input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder="student@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="cc-fg">
                    <label htmlFor="reg-phone">Phone</label>
                    <div className="cc-iw">
                      <Phone size={15} />
                      <input
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="cc-fg">
                    <label htmlFor="reg-password">
                      Password<span className="cc-required">*</span>
                    </label>
                    <div className="cc-iw">
                      <Lock size={15} />
                      <input
                        id="reg-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="cc-pw-btn"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="cc-fg">
                    <label htmlFor="reg-confirmPassword">
                      Confirm Password<span className="cc-required">*</span>
                    </label>
                    <div className="cc-iw">
                      <Lock size={15} />
                      <input
                        id="reg-confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="cc-pw-btn"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword
                            ? 'Hide confirm password'
                            : 'Show confirm password'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Branch */}
                  <div className="cc-fg">
                    <label htmlFor="reg-branch">Branch</label>
                    <input
                      id="reg-branch"
                      name="branch"
                      type="text"
                      placeholder="Computer Engineering"
                      value={formData.branch}
                      onChange={handleChange}
                      className="cc-pi"
                    />
                  </div>

                  {/* Semester */}
                  <div className="cc-fg">
                    <label htmlFor="reg-semester">Semester</label>
                    <input
                      id="reg-semester"
                      name="semester"
                      type="number"
                      placeholder="6"
                      value={formData.semester}
                      onChange={handleChange}
                      className="cc-pi"
                    />
                  </div>

                  {/* Department — full width */}
                  <div className="cc-fg cc-grid-full">
                    <label htmlFor="reg-department">Department</label>
                    {formData.role === 'department' &&
                    availableDepartments.length > 0 ? (
                      <select
                        id="reg-department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="cc-pi"
                      >
                        <option value="">Select Department</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept._id} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="reg-department"
                        name="department"
                        type="text"
                        placeholder={
                          formData.role === 'department' && deptLoading
                            ? 'Loading departments…'
                            : 'Maintenance, Computer, Library'
                        }
                        value={formData.department}
                        onChange={handleChange}
                        className="cc-pi"
                      />
                    )}
                  </div>

                </div>{/* end cc-grid2 */}

                {/* Role selector — full width below grid */}
                <div style={{ marginTop: 16 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#cbd5e1',
                      marginBottom: 10,
                    }}
                  >
                    I am joining as<span className="cc-required">*</span>
                  </label>
                  <div className="cc-role-cards">
                    {roles.map((r) => {
                      const cfg = roleConfig[r];
                      const isActive = formData.role === r;
                      return (
                        <label
                          key={r}
                          className={`cc-role-card${isActive ? ' cc-role-card-active' : ''}`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={r}
                            checked={isActive}
                            onChange={handleChange}
                          />
                          {/* Checkmark */}
                          <span className="cc-role-card-check">
                            {isActive && <Check size={11} strokeWidth={3} />}
                          </span>
                          <span className="cc-role-card-icon">{cfg.icon}</span>
                          <span className="cc-role-card-title">{cfg.label}</span>
                          <span className="cc-role-card-sub">{cfg.sub}</span>
                        </label>
                      );
                    })}
                  </div>
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
                  {isSubmitting ? 'Creating account…' : 'Create Account'}
                  {!isSubmitting && <ArrowRight size={16} />}
                </motion.button>

                {/* Switch — already have account */}
                <p className="cc-switch-text">
                  Already have an account?
                </p>
                <div className="cc-login-links-row">
                  <Link to="/login" className="cc-login-role-btn">
                    <GraduationCap size={13} style={{ marginRight: 5 }} />
                    Student / Admin Login
                  </Link>
                  <Link to="/login" className="cc-login-role-btn">
                    <Building2 size={13} style={{ marginRight: 5 }} />
                    Department Login
                  </Link>
                </div>

              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ──────────── RIGHT (grid-area: info) ──────────── */}
        <AnimatePresence mode="wait">
          <motion.aside
            key="register-info"
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
                <Sparkles size={12} />
                Join the Campus Community
              </div>

              <h1 className="cc-info-heading">
                Join the campus community today
              </h1>

              <p className="cc-info-desc">
                Create your profile once and unlock access to every campus
                service, support tool, and student resource.
              </p>

              <div className="cc-info-features">
                {INFO_FEATURES.map((f) => (
                  <div key={f.text} className="cc-info-feature">
                    <div className="cc-info-feature-icon">{f.icon}</div>
                    <div className="cc-info-feature-content">
                      <span>{f.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/login" className="cc-info-cta">
                Already registered? Sign In
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

      </div>
    </div>
  );
}

export default RegisterPage;
