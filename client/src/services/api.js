import axios from 'axios';

// Dynamically fetch authStore to avoid circular imports
let authStoreInstance;
const getAuthStore = async () => {
  if (!authStoreInstance) {
    const module = await import('../store/authStore');
    authStoreInstance = module.useAuthStore;
  }
  return authStoreInstance;
};

const api = axios.create({
  baseURL: (import.meta.env.VITE_SERVER_URL || 'http://localhost:5000') + '/api',
  withCredentials: true, // Required for reading/writing the httpOnly cookie
});

api.interceptors.request.use(
  async (config) => {
    const store = await getAuthStore();
    const token = store.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and hasn't been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshRes.data.data;
        
        const store = await getAuthStore();
        store.getState().setToken(accessToken);

        isRefreshing = false;
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        
        const store = await getAuthStore();
        store.getState().logout();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
