import { useEffect, useState } from 'react';
import { AlertCircle, Bot, ImagePlus, RotateCcw, Send, Sparkles } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';
import { createComplaint } from '../../services/complaintService';
import { getDepartments } from '../../services/departmentService';

const initialFormData = {
  title: '',
  category: 'Maintenance',
  department: '',
  priority: 'Medium',
  location: '',
  description: '',
  imageName: ''
};

const categories = ['Maintenance', 'IT Support', 'Library', 'Examination', 'Administration', 'Other'];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];

function SubmitComplaint() {
  const [formData, setFormData] = useState(initialFormData);
  const [departments, setDepartments] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadActiveDepartments = async () => {
    try {
      setDepartmentLoading(true);
      setDepartmentError('');

      const response = await getDepartments();
      const loadedDepts = response.data?.departments || [];
      setDepartments(loadedDepts);

      if (loadedDepts.length > 0) {
        setFormData((prev) => ({
          ...prev,
          department: prev.department && loadedDepts.some((d) => d._id === prev.department)
            ? prev.department
            : loadedDepts[0]._id
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          department: ''
        }));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setDepartmentError('Session expired. Please login again.');
      } else {
        setDepartmentError(
          err.response?.data?.message || 'Unable to load departments. Please try again.'
        );
      }
    } finally {
      setDepartmentLoading(false);
    }
  };

  useEffect(() => {
    loadActiveDepartments();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setFormData((prev) => ({
      ...prev,
      imageName: file ? file.name : ''
    }));
  };

  const handleAiClick = () => {
    setError('');
    setSuccess('AI feature will be connected later.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem('token');

    if (!token) {
      setSuccess('');
      setError('Session expired. Please login again.');
      return;
    }

    if (!formData.department) {
      setError('Please select a valid department.');
      return;
    }

    const descriptionWithLocation = formData.location.trim()
      ? `${formData.description}\n\nLocation: ${formData.location}`
      : formData.description;

    const complaintPayload = {
      title: formData.title,
      description: descriptionWithLocation,
      category: formData.category,
      department: formData.department,
      priority: formData.priority,
      imageUrl: ''
    };

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await createComplaint(complaintPayload);

      setSuccess('Complaint submitted successfully.');
      setFormData({
        title: '',
        category: 'Maintenance',
        department: departments.length > 0 ? departments[0]._id : '',
        priority: 'Medium',
        location: '',
        description: '',
        imageName: ''
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to submit complaint');
      }
    } finally {
      setLoading(false);
    }
  };

  const hasNoDepartments = !departmentLoading && !departmentError && departments.length === 0;

  return (
    <AnimatedPage>
      <AnimatedCard className="dashboard-hero" delay={0.05} hover={false}>
        <div>
          <p className="dashboard-kicker">Student Support</p>
          <h1>Submit Complaint</h1>
          <p>Report campus issues and track support progress easily.</p>
        </div>
        <span className="dashboard-role-pill">New Complaint</span>
      </AnimatedCard>

      <AnimatedCard className="complaint-form-card" delay={0.14} hover={false}>
        <form className="complaint-form" onSubmit={handleSubmit}>
          {departmentError && (
            <div
              className="chatbot-alert chatbot-alert-error"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{departmentError}</span>
              </div>
              <button
                className="complaint-secondary-button"
                onClick={loadActiveDepartments}
                style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                type="button"
              >
                <RotateCcw size={14} />
                Retry
              </button>
            </div>
          )}

          {hasNoDepartments && (
            <div className="chatbot-alert chatbot-alert-error">
              <AlertCircle size={18} />
              <span>No active departments are available. Please contact an administrator.</span>
            </div>
          )}

          <div className="complaint-form-grid">
            <label className="complaint-field">
              <span>Complaint Title</span>
              <input
                name="title"
                onChange={handleChange}
                placeholder="Enter complaint title"
                required
                type="text"
                value={formData.title}
              />
            </label>

            <label className="complaint-field">
              <span>Category</span>
              <select name="category" onChange={handleChange} value={formData.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="complaint-field">
              <span>Department</span>
              <select
                disabled={departmentLoading || hasNoDepartments}
                name="department"
                onChange={handleChange}
                required
                value={formData.department}
              >
                {departmentLoading && <option value="">Loading departments...</option>}
                {!departmentLoading && departments.length === 0 && (
                  <option value="">No active departments</option>
                )}
                {!departmentLoading &&
                  departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="complaint-field">
              <span>Priority</span>
              <select name="priority" onChange={handleChange} value={formData.priority}>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="complaint-field complaint-field-wide">
              <span>Location</span>
              <input
                name="location"
                onChange={handleChange}
                placeholder="B-204 Classroom, Library, Lab 3"
                type="text"
                value={formData.location}
              />
            </label>

            <label className="complaint-field complaint-field-wide">
              <span>Description</span>
              <textarea
                name="description"
                onChange={handleChange}
                placeholder="Describe your issue clearly..."
                required
                rows="5"
                value={formData.description}
              />
            </label>

            <label className="complaint-upload complaint-field-wide">
              <input accept="image/*" onChange={handleImageChange} type="file" />
              <span className="complaint-upload-icon">
                <ImagePlus size={22} />
              </span>
              <strong>Upload image / screenshot</strong>
              <small>{formData.imageName || 'PNG, JPG, or screenshot preview will be added later'}</small>
            </label>
          </div>

          <div className="complaint-ai-actions">
            <button className="complaint-secondary-button" onClick={handleAiClick} type="button">
              <Sparkles size={18} />
              AI Suggest Category
            </button>
            <button className="complaint-secondary-button" onClick={handleAiClick} type="button">
              <Bot size={18} />
              AI Detect Priority
            </button>
          </div>

          {success && <p className="complaint-message">{success}</p>}
          {error && <p className="complaint-message complaint-error-message">{error}</p>}

          <button
            className="complaint-submit-button"
            disabled={loading || departmentLoading || hasNoDepartments || !formData.department}
            type="submit"
          >
            <Send size={18} />
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default SubmitComplaint;
