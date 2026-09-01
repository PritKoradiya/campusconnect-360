import api from './api';

export const getEvents = () => {
  return api.get('/events');
};

export const getEventById = (id) => {
  return api.get(`/events/${id}`);
};

export const createEvent = (data) => {
  return api.post('/events', data);
};

export const updateEvent = (id, data) => {
  return api.put(`/events/${id}`, data);
};

export const deleteEvent = (id) => {
  return api.delete(`/events/${id}`);
};
