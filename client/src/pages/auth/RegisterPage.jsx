import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Hash, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import '../../styles/auth.css';

const roles = ['student', 'admin', 'department'];

function CampusIllustration() {
  return (
    <svg className="campus-auth-illustration" viewBox="0 0 520 360" role="img" aria-label="Student account setup illustration">
      <rect x="50" y="302" width="420" height="18" rx="9" className="illustration-floor" />
      <rect x="76" y="208" width="368" height="18" rx="9" className="illustration-desk" />
      <path d="M110 226v80M414 226v80" className="illustration-desk-leg" />
      <rect x="268" y="106" width="124" height="82" rx="12" className="illustration-monitor" />
      <path d="M318 188h26v20h-26zM294 208h74" className="illustration-monitor-stand" />
      <path d="M290 130h78M290 152h54" className="illustration-screen-line" />
      <rect x="232" y="188" width="82" height="20" rx="8" className="illustration-keyboard" />
      <circle cx="184" cy="104" r="30" className="illustration-head" />
      <path d="M154 102c6-30 30-47 56-37 18 7 26 22 27 39-24-14-52-17-83-2Z" className="illustration-hair" />
      <path d="M166 138c12 10 24 10 36 0" className="illustration-face" />
      <path d="M138 168c12-28 34-43 58-43 27 0 48 18 60 48l16 56H122l16-61Z" className="illustration-shirt" />
      <path d="M238 186c22 10 42 18 66 22M150 186c-18 10-36 18-58 20" className="illustration-arm" />
      <rect x="144" y="228" width="104" height="60" rx="16" className="illustration-chair" />
      <path d="M168 226c-8 22-6 48 6 72M226 226c16 24 26 48 30 76" className="illustration-leg" />
      <path d="M400 134v68M382 134h36" className="illustration-lamp" />
      <path d="M374 134h52l-10-30h-32l-10 30Z" className="illustration-lamp-shade" />
      <rect x="404" y="226" width="34" height="32" rx="7" className="illustration-pot" />
      <path d="M421 226c-14-26-2-48 18-60M421 226c16-24 38-28 50-18M421 226c-8-22-26-30-42-22" className="illustration-plant" />
      <path d="M92 184h62M106 168h48" className="illustration-books" />
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
          <span className="campus-auth-logo">
            <img src={logo} alt="CampusConnect 360 logo" />
          </span>
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
