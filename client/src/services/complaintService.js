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

export const getDepartmentComplaints = () => {
  return api.get('/complaints');
};

export const updateDepartmentComplaintStatus = (id, data) => {
  return api.put(`/complaints/${id}/status`, data);
};

