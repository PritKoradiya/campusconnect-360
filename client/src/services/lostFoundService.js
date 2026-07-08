import api from './api';

export const getLostFoundItems = () => {
  return api.get('/lost-found');
};

export const getMyLostFoundItems = () => {
  return api.get('/lost-found/my');
};

export const getLostFoundById = (id) => {
  return api.get(`/lost-found/${id}`);
};

export const createLostFoundItem = (data) => {
  return api.post('/lost-found', data);
};

export const updateLostFoundItem = (id, data) => {
  return api.put(`/lost-found/${id}`, data);
};

export const updateLostFoundStatus = (id, status) => {
  return api.put(`/lost-found/${id}/status`, { status });
};

export const closeLostFoundItem = (id) => {
  return api.delete(`/lost-found/${id}`);
};
