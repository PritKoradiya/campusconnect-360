import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Hash, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import loginIllustration from '../../assets/login-illustration.png';
import logo from '../../assets/logo.png';
import { getDashboardPath, useAuth } from '../../context/AuthContext';
import { getDepartments } from '../../services/departmentService';
import '../../styles/auth.css';

const roles = ['student', 'admin', 'department'];

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
    department: ''
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
        } catch (err) {
          console.log('Could not fetch departments for register:', err);
        } finally {
          setDeptLoading(false);
        }
      };

      fetchDepts();
    }
  }, [formData.role, availableDepartments.length]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
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
        department: formData.department.trim() || undefined
      };

      console.log('Register payload:', payload);

      const authData = await register(payload);

      setSuccessMessage(authData.message || 'Registration successful');
      navigate(getDashboardPath(authData.user.role), { replace: true });
    } catch (error) {
      console.log('Register error:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || error.response?.data?.error || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
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
          <p>Register once to access student services, notices, complaints and support tools.</p>
          <div className="campus-illustration-frame">
            <img className="campus-login-illustration" src={loginIllustration} alt="Student working on laptop" />
          </div>
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
              {formData.role === 'department' && availableDepartments.length > 0 ? (
                <select
                  id="department"
                  name="department"
                  onChange={handleChange}
                  value={formData.department}
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
                  id="department"
                  name="department"
                  onChange={handleChange}
                  placeholder={
                    formData.role === 'department' && deptLoading
                      ? 'Loading departments...'
                      : 'Maintenance, Computer, Library'
                  }
                  type="text"
                  value={formData.department}
                />
              )}
            </div>
          </div>

          {errorMessage && <p className="campus-auth-message campus-auth-error">{errorMessage}</p>}
          {successMessage && <p className="campus-auth-message campus-auth-success">{successMessage}</p>}

          <button className="campus-auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Registering...' : 'Register'}
            {!isSubmitting && <ArrowRight size={18} />}
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
