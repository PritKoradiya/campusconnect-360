import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Hash, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../styles/auth.css';

const roles = ['student', 'admin', 'department'];

function CampusIllustration() {
  return (
    <svg className="campus-auth-illustration" viewBox="0 0 520 360" role="img" aria-label="Student account setup illustration">
      <rect x="80" y="282" width="360" height="20" rx="10" className="illustration-floor" />
      <rect x="126" y="196" width="270" height="18" rx="9" className="illustration-desk" />
      <path d="M158 214v72M368 214v72" className="illustration-desk-leg" />
      <rect x="268" y="92" width="118" height="82" rx="12" className="illustration-monitor" />
      <path d="M316 174h24v22h-24zM294 196h68" className="illustration-monitor-stand" />
      <path d="M290 118h74M290 140h48" className="illustration-screen-line" />
      <circle cx="184" cy="112" r="28" className="illustration-head" />
      <path d="M156 108c7-31 32-42 56-28 14 8 18 20 17 34-24-13-47-13-73-6Z" className="illustration-hair" />
      <path d="M146 168c9-28 29-44 52-44s43 16 52 44l12 50H134l12-50Z" className="illustration-shirt" />
      <path d="M212 174c20 8 38 18 54 32M168 174c-18 14-32 28-42 42" className="illustration-arm" />
      <rect x="178" y="214" width="78" height="64" rx="12" className="illustration-chair" />
      <rect x="218" y="180" width="68" height="20" rx="8" className="illustration-keyboard" />
      <path d="M414 178v34M398 212h32" className="illustration-plant" />
      <circle cx="414" cy="170" r="10" className="illustration-plant-dot" />
    </svg>
  );
}

function RegisterPage() {
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
    department: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Register form data:', formData);
  };

  return (
    <main className="campus-auth-page">
      <header className="campus-auth-header">
        <Link className="campus-auth-brand" to="/login">
          <span className="campus-auth-logo">C</span>
          <span>CampusConnect 360</span>
        </Link>
        <Link className="campus-auth-header-link" to="/login">
          Login
        </Link>
      </header>

      <section className="campus-auth-shell campus-register-shell">
        <aside className="campus-auth-hero">
          <h1>Create your CampusConnect profile</h1>
          <p>Register once to prepare access for student services, notices and support tools.</p>
          <CampusIllustration />
        </aside>

        <form className="campus-auth-card campus-register-card" onSubmit={handleSubmit}>
          <div className="campus-auth-card-heading">
            <div className="campus-auth-card-icon">
              <UserRound size={24} />
            </div>
            <div>
              <h2>Create Account</h2>
              <p>Fill in your details to prepare your campus portal profile.</p>
            </div>
          </div>

          <div className="campus-form-grid">
            <div className="campus-form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="campus-input-with-icon">
                <UserRound size={18} />
                <input
                  id="fullName"
                  name="fullName"
                  onChange={handleChange}
                  placeholder="Enter full name"
                  type="text"
                  value={formData.fullName}
                />
              </div>
            </div>

            <div className="campus-form-group">
              <label htmlFor="enrollmentNo">Enrollment Number</label>
              <div className="campus-input-with-icon">
                <Hash size={18} />
                <input
                  id="enrollmentNo"
                  name="enrollmentNo"
                  onChange={handleChange}
                  placeholder="ENR001"
                  type="text"
                  value={formData.enrollmentNo}
                />
              </div>
            </div>

            <div className="campus-form-group">
              <label htmlFor="registerEmail">Email</label>
              <div className="campus-input-with-icon">
                <Mail size={18} />
                <input
                  id="registerEmail"
                  name="email"
                  onChange={handleChange}
                  placeholder="student@example.com"
                  type="email"
                  value={formData.email}
                />
              </div>
            </div>

            <div className="campus-form-group">
              <label htmlFor="phone">Phone</label>
              <div className="campus-input-with-icon">
                <Phone size={18} />
                <input
                  id="phone"
                  name="phone"
                  onChange={handleChange}
                  placeholder="9876543210"
                  type="tel"
                  value={formData.phone}
                />
              </div>
            </div>

            <div className="campus-form-group">
              <label htmlFor="registerPassword">Password</label>
              <div className="campus-input-with-icon">
                <Lock size={18} />
                <input
                  id="registerPassword"
                  name="password"
                  onChange={handleChange}
                  placeholder="Create password"
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

            <div className="campus-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="campus-input-with-icon">
                <Lock size={18} />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  onChange={handleChange}
                  placeholder="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                />
                <button
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="campus-icon-button"
                  onClick={() => setShowConfirmPassword((prevValue) => !prevValue)}
                  type="button"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="campus-form-group campus-form-grid-full">
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
              <label htmlFor="branch">Branch</label>
              <input
                id="branch"
                name="branch"
                onChange={handleChange}
                placeholder="Computer Engineering"
                type="text"
                value={formData.branch}
              />
            </div>

            <div className="campus-form-group">
              <label htmlFor="semester">Semester</label>
              <input
                id="semester"
                name="semester"
                onChange={handleChange}
                placeholder="6"
                type="number"
                value={formData.semester}
              />
            </div>

            <div className="campus-form-group campus-form-grid-full">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                name="department"
                onChange={handleChange}
                placeholder="Maintenance, Computer, Library"
                type="text"
                value={formData.department}
              />
            </div>
          </div>

          <button className="campus-auth-submit" type="submit">
            Register
            <ArrowRight size={18} />
          </button>

          <p className="campus-auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default RegisterPage;
