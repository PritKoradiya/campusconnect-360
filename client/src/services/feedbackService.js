import api from './api';

/**
 * Submit or update satisfaction feedback for a resolved complaint.
 * @param {string} complaintId
 * @param {Object} feedbackData - { rating, resolutionStatus, comment }
 */
export const submitComplaintFeedback = (complaintId, feedbackData) => {
  return api.post(`/complaints/${complaintId}/feedback`, feedbackData);
};

/**
 * Get feedback for a specific complaint.
 * @param {string} complaintId
 */
export const getComplaintFeedback = (complaintId) => {
  return api.get(`/complaints/${complaintId}/feedback`);
};

/**
 * Get all feedbacks with filtering (for Admin/Department).
 * @param {Object} params - { rating, resolutionStatus, department, page, limit }
 */
export const getAllFeedbacks = (params = {}) => {
  return api.get('/complaints/feedback/all', { params });
};

/**
 * Get aggregated satisfaction overview statistics.
 */
export const getFeedbackStats = () => {
  return api.get('/complaints/feedback/stats');
};

export default {
  submitComplaintFeedback,
  getComplaintFeedback,
  getAllFeedbacks,
  getFeedbackStats
};
