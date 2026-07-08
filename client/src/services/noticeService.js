import api from './api';

export const getNotices = () => {
  return api.get('/notices');
};

export const getNoticeById = (id) => {
  return api.get(`/notices/${id}`);
};
