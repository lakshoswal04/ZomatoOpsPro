import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  // Use the relative path for development and absolute for production
  baseURL: process.env.NODE_ENV === 'production' 
    ? '/api'  // Use relative path with Netlify redirects
    : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear localStorage and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const loginUser = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const getCurrentUser = () => {
  return api.get('/auth/user');
};

// Order API calls
export const getAllOrders = () => {
  return api.get('/orders');
};

export const createOrder = (orderData) => {
  return api.post('/orders', orderData);
};

export const getOrderById = (orderId) => {
  return api.get(`/orders/${orderId}`);
};

export const assignDeliveryPartner = (orderId, deliveryPartnerId, dispatchTime, estimatedDeliveryTime, eta) => {
  return api.put(`/orders/${orderId}/assign`, { 
    deliveryPartnerId,
    dispatchTime,
    estimatedDeliveryTime,
    eta
  });
};

export const updateOrderStatus = (orderId, status) => {
  return api.put(`/orders/${orderId}/status`, { status });
};

export const getAssignedOrders = () => {
  return api.get('/orders/partner/assigned');
};

// User API calls
export const getAvailableDeliveryPartners = () => {
  return api.get('/users/delivery-partners');
};

export const getAllDeliveryPartners = () => {
  return api.get('/users/delivery-partners/all');
};

export const updateAvailability = (isAvailable) => {
  return api.put('/users/availability', { isAvailable });
};

export default api;
