import api from './api';

export const getStudentDashboard = () => {
  return api.get('/dashboard/student');
};

export const getAdminDashboard = () => {
  return api.get('/dashboard/admin');
};
