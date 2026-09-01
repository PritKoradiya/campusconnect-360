import api from './api';

export const getAdminReports = (params) => {
  return api.get('/reports/admin', { params });
};
