import api from './api';

export const getStudentDashboard = () => {
  return api.get('/dashboard/student');
};
