import api from './api';

/**
 * Fetch achievements and milestones for current authenticated student
 */
export const getMyAchievements = () => {
  return api.get('/users/me/achievements');
};
