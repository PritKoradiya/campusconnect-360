import { useState } from 'react';
import { Bot, ImagePlus, Send, Sparkles } from 'lucide-react';
import AnimatedCard from '../../components/ui/AnimatedCard';
import AnimatedPage from '../../components/ui/AnimatedPage';

const initialFormData = {
  title: '',
  category: 'Maintenance',
  department: 'Maintenance Department',
  priority: 'Medium',
  location: '',
  description: '',
  imageName: ''
};

const categories = ['Maintenance', 'IT Support', 'Library', 'Examination', 'Administration', 'Other'];
const departments = [
  'Maintenance Department',
  'IT Support Department',
  'Library Department',
  'Examination Department',
  'Administration Department'
];
const priorities = ['Low', 'Medium', 'High', 'Urgent'];

function SubmitComplaint() {
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setFormData({
      ...formData,
      imageName: file ? file.name : ''
    });
  };

  const handleAiClick = () => {
    setMessage('This AI feature will be connected later.');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Complaint form data:', formData);
    setMessage('Complaint form UI is ready. API connection will be added in next step.');
  };

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
          <div className="complaint-form-grid">
            <label className="complaint-field">
              <span>Complaint Title</span>
              <input
                name="title"
                onChange={handleChange}
                placeholder="Enter complaint title"
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
              <select name="department" onChange={handleChange} value={formData.department}>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
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

          {message && <p className="complaint-message">{message}</p>}

          <button className="complaint-submit-button" type="submit">
            <Send size={18} />
            Submit Complaint
          </button>
        </form>
      </AnimatedCard>
    </AnimatedPage>
  );
}

export default SubmitComplaint;
