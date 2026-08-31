import api from './api';

export const getAllComplaints = () => {
  return api.get('/complaints');
};

export const getComplaintById = (id) => {
  return api.get(`/complaints/${id}`);
};

export const updateComplaintStatus = (id, data) => {
  return api.put(`/complaints/${id}/status`, data);
};

export const assignComplaintToDepartment = (id, department) => {
  return api.put(`/complaints/${id}/assign`, { department });
};

export const deleteComplaint = (id) => {
  return api.delete(`/complaints/${id}`);
};
