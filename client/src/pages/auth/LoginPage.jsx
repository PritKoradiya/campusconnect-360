import { useState } from 'react';
import { ArrowRight, BookOpen, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../styles/auth.css';

const roles = ['student', 'admin', 'department'];

function CampusIllustration() {
  return (
    <svg className="campus-auth-illustration" viewBox="0 0 520 360" role="img" aria-label="Student working on laptop">
      <rect x="72" y="256" width="376" height="38" rx="19" className="illustration-floor" />
      <rect x="298" y="62" width="118" height="150" rx="18" className="illustration-window" />
      <path d="M316 86h82M316 118h82M316 150h82" className="illustration-window-line" />
      <circle cx="194" cy="104" r="38" className="illustration-head" />
      <path d="M150 104c8-38 38-62 76-44 24 12 30 34 28 50-30-18-63-20-104-6Z" className="illustration-hair" />
      <path d="M136 170c12-34 42-54 76-54s64 20 76 54l18 74H118l18-74Z" className="illustration-shirt" />
      <path d="M166 168c18 18 45 18 64 0" className="illustration-smile" />
      <rect x="222" y="184" width="150" height="92" rx="14" className="illustration-laptop" />
      <path d="M244 276h166l28 34H216l28-34Z" className="illustration-keyboard" />
      <circle cx="296" cy="230" r="10" className="illustration-logo" />
      <path d="M126 222c-32-14-48-38-44-72M374 224c30-10 48-34 52-70" className="illustration-arm" />
      <circle cx="92" cy="132" r="18" className="illustration-chip" />
      <circle cx="430" cy="132" r="18" className="illustration-chip" />
    </svg>
  );
}

function LoginPage() {
  const [formData, setFormData] = useState({
    role: 'student',
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Login form data:', formData);
  };

  return (
    <main className="campus-auth-page">
      <header className="campus-auth-header">
        <Link className="campus-auth-brand" to="/login">
          <span className="campus-auth-logo">C</span>
          <span>CampusConnect 360</span>
        </Link>
        <Link className="campus-auth-header-link" to="/register">
          Create Account
        </Link>
      </header>

      <section className="campus-auth-shell">
        <aside className="campus-auth-hero">
          <div className="campus-auth-kicker">
            <BookOpen size={16} />
            University ERP Portal
          </div>
          <h1>Welcome to CampusConnect 360</h1>
          <p>Your smart campus utility and student support platform.</p>
          <CampusIllustration />
          <div className="campus-auth-chips">
            <span>Complaints</span>
            <span>Notices</span>
            <span>Events</span>
            <span>Lost & Found</span>
            <span>AI Helpdesk</span>
          </div>
        </aside>

        <form className="campus-auth-card" onSubmit={handleSubmit}>
          <div className="campus-auth-card-heading">
            <div className="campus-auth-card-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Login to your campus portal</h2>
              <p>Access student services, complaints, notices and support in one place.</p>
            </div>
          </div>

          <div className="campus-form-group">
            <label>Role</label>
            <div className="campus-role-options">
              {roles.map((role) => (
                <label className="campus-role-option" key={role}>
                  <input
                    checked={formData.role === role}
                    name="role"
                    onChange={handleChange}
                    type="radio"
                    value={role}
                  />
                  <span>{role === 'department' ? 'Department' : role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="campus-form-group">
            <label htmlFor="email">Email</label>
            <div className="campus-input-with-icon">
              <Mail size={18} />
              <input
                id="email"
                name="email"
                onChange={handleChange}
                placeholder="student@example.com"
                type="email"
                value={formData.email}
              />
            </div>
          </div>

          <div className="campus-form-group">
            <label htmlFor="password">Password</label>
            <div className="campus-input-with-icon">
              <Lock size={18} />
              <input
                id="password"
                name="password"
                onChange={handleChange}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="campus-icon-button"
                onClick={() => setShowPassword((prevValue) => !prevValue)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="campus-form-row-between">
            <label className="campus-checkbox-field">
              <input checked={formData.rememberMe} name="rememberMe" onChange={handleChange} type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#forgot-password">Forgot password?</a>
          </div>

          <button className="campus-auth-submit" type="submit">
            Login
            <ArrowRight size={18} />
          </button>

          <button className="campus-google-button" type="button">
            <span>G</span>
            Continue with Google
          </button>

          <p className="campus-auth-switch">
            Don&apos;t have an account? <Link to="/register">Create Account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
