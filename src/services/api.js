import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    // You can add auth token here when implementing authentication
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log the error for debugging
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Handle 401 Unauthorized errors here when implementing authentication
    if (error.response?.status === 401) {
      // Handle token refresh or redirect to login
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    return error.response.data;
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API Error Request:', error.request);
    return { error: 'No response from server' };
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('API Error:', error.message);
    return { error: error.message };
  }
};

export const teacherAideAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/teacher-aides');
      return { ...response, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getById: (id) => api.get(`/teacher-aides/${id}`).catch(handleApiError),
  create: (data) => api.post('/teacher-aides', data).catch(handleApiError),
  update: (id, data) => api.put(`/teacher-aides/${id}`, data).catch(handleApiError),
  delete: (id) => api.delete(`/teacher-aides/${id}`).catch(handleApiError),
};

export const taskAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/tasks');
      return { ...response, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getById: (id) => api.get(`/tasks/${id}`).catch(handleApiError),
  create: (data) => api.post('/tasks', data).catch(handleApiError),
  update: (id, data) => api.put(`/tasks/${id}`, data).catch(handleApiError),
  delete: (id) => api.delete(`/tasks/${id}`).catch(handleApiError),
};

export const assignmentAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/assignments');
      return { ...response, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getById: (id) => api.get(`/assignments/${id}`).catch(handleApiError),
  create: (data) => api.post('/assignments', data).catch(handleApiError),
  update: (id, data) => api.put(`/assignments/${id}`, data).catch(handleApiError),
  delete: (id) => api.delete(`/assignments/${id}`).catch(handleApiError),
};

export const absenceAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/absences');
      return { ...response, data: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getById: (id) => api.get(`/absences/${id}`).catch(handleApiError),
  create: (data) => api.post('/absences', data).catch(handleApiError),
  update: (id, data) => api.put(`/absences/${id}`, data).catch(handleApiError),
  delete: (id) => api.delete(`/absences/${id}`).catch(handleApiError),
};

export default api;
