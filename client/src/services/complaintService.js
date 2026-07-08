import api from './api';

export const createComplaint = (complaintData) => {
  return api.post('/complaints', complaintData);
};

export const getMyComplaints = () => {
  return api.get('/complaints/my');
};

export const getComplaintById = (id) => {
  return api.get(`/complaints/${id}`);
};
