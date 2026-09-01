import api from './api';

export const getNotices = () => {
  return api.get('/notices');
};

export const getNoticeById = (id) => {
  return api.get(`/notices/${id}`);
};

export const createNotice = (data) => {
  return api.post('/notices', data);
};

export const updateNotice = (id, data) => {
  return api.put(`/notices/${id}`, data);
};

export const deleteNotice = (id) => {
  return api.delete(`/notices/${id}`);
};
