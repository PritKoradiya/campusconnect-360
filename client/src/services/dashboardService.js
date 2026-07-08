import api from './api';

export const getStudentDashboard = () => {
  return api.get('/dashboard/student');
};

export const getAdminDashboard = () => {
  return api.get('/dashboard/admin');
};

export const getDepartmentDashboard = () => {
  return api.get('/dashboard/department');
};
