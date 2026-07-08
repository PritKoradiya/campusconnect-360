import api from './api';

export const createComplaint = (complaintData) => {
  return api.post('/complaints', complaintData);
};
