import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import loginIllustration from '../../assets/login-illustration.png';
import logo from '../../assets/logo.png';
import '../../styles/auth.css';

const roles = ['student', 'admin', 'department'];

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
          <span className="campus-auth-logo">
            <img src={logo} alt="CampusConnect 360 logo" />
          </span>
          <span>CampusConnect 360</span>
        </Link>
        <Link className="campus-auth-header-link" to="/register">
          Create Account
        </Link>
      </header>

      <section className="campus-auth-shell">
        <aside className="campus-auth-hero">
          <h1>Welcome to CampusConnect 360</h1>
          <p>Smart campus services, complaints, notices, events and student support in one place.</p>
          <div className="campus-illustration-frame">
            <img className="campus-login-illustration" src={loginIllustration} alt="Student working on laptop" />
          </div>
        </aside>

        <form className="campus-auth-card" onSubmit={handleSubmit}>
          <div className="campus-auth-card-heading">
            <div className="campus-auth-card-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2>Login</h2>
              <p>Access your campus portal</p>
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
