import axios from 'axios';
import { STORAGE_KEYS, API_HEADERS } from '../constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT and Tenant context
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const tenantId = localStorage.getItem(STORAGE_KEYS.TENANT_ID);
    const propertyId = localStorage.getItem(STORAGE_KEYS.PROPERTY_ID);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers[API_HEADERS.TENANT_ID] = tenantId;
    }
    if (propertyId) {
      config.headers[API_HEADERS.PROPERTY_ID] = propertyId;
    }
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (redirect to login if not already there)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
