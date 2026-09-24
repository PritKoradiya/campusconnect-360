import api from './api';

/**
 * Fetches the paginated and filtered historical activity feed for the current student.
 *
 * @param {Object} [params]
 * @param {string} [params.type] - 'ALL' | 'COMPLAINT' | 'EVENT' | 'LOST_FOUND' | 'PROFILE'
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<Object>}
 */
export const getStudentActivityFeed = (params = {}) => {
  return api.get('/activity', { params });
};

export default {
  getStudentActivityFeed
};
