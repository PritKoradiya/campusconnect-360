import api from './api';

export const getAdminLiveAnalytics = (params) => {
  return api.get('/reports/live-analytics', { params });
};
