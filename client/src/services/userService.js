import api from './api';

export const getUsers = (params) => {
  return api.get('/users', { params });
};

export const getUserById = (id) => {
  return api.get(`/users/${id}`);
};

export const updateUserStatus = (id, isActive) => {
  return api.put(`/users/${id}/status`, { isActive });
};

export const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};
