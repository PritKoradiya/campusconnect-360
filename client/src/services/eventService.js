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

// ==========================================
// Event Registration Services
// ==========================================

export const registerForEvent = (eventId) => {
  return api.post(`/events/${eventId}/register`);
};

export const cancelEventRegistration = (eventId) => {
  return api.delete(`/events/${eventId}/register`);
};

export const getMyRegistrations = () => {
  return api.get('/events/my-registrations');
};

export const getMyEventRegistrationStatus = (eventId) => {
  return api.get(`/events/${eventId}/registration`);
};

export const getEventRegistrationsAdmin = (eventId, params = {}) => {
  return api.get(`/events/${eventId}/registrations`, { params });
};
