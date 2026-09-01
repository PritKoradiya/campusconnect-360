import api from './api';

export const getDepartments = (params) => {
  return api.get('/departments', { params });
};

export const getDepartmentById = (id) => {
  return api.get(`/departments/${id}`);
};

export const createDepartment = (data) => {
  return api.post('/departments', data);
};

export const updateDepartment = (id, data) => {
  return api.put(`/departments/${id}`, data);
};

export const updateDepartmentStatus = (id, isActive) => {
  return api.put(`/departments/${id}/status`, {
    isActive
  });
};

export const deleteDepartment = (id) => {
  return api.delete(`/departments/${id}`);
};
