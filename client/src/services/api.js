import axios from 'axios';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return 'http://localhost:5000/api';
  }
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend is unreachable or connection fails
    if (!error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
      error.response = {
        status: 0,
        data: {
          message: 'Unable to connect to the server. Please try again.'
        }
      };
    }
    return Promise.reject(error);
  }
);

export default api;
