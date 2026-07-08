import api from './api';

export const getEvents = () => {
  return api.get('/events');
};

export const getEventById = (id) => {
  return api.get(`/events/${id}`);
};
