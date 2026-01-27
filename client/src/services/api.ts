import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authAPI = {
    register: (data: { username: string; email: string; password: string; role?: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    verifyOTP: (data: { sessionId: string; otp: string }) =>
        api.post('/auth/verify-otp', data),
    resendOTP: (sessionId: string) =>
        api.post('/auth/resend-otp', { sessionId }),
    getProfile: () =>
        api.get('/auth/me'),
};

// Assets
export const assetAPI = {
    getAll: (params?: { status?: string; category?: string; search?: string }) =>
        api.get('/assets', { params }),
    getById: (id: string) =>
        api.get(`/assets/${id}`),
    create: (data: { assetId: string; assetName: string; description?: string; category?: string }) =>
        api.post('/assets', data),
    update: (id: string, data: Partial<{ assetName: string; description: string; status: string; category: string }>) =>
        api.put(`/assets/${id}`, data),
    delete: (id: string) =>
        api.delete(`/assets/${id}`),
};

// Checkout
export const checkoutAPI = {
    getAll: (params?: { status?: string }) =>
        api.get('/checkout', { params }),
    getById: (id: string) =>
        api.get(`/checkout/${id}`),
    request: (data: { assetId: string; dueDate?: string; notes?: string }) =>
        api.post('/checkout/request', data),
    approve: (id: string) =>
        api.put(`/checkout/${id}/approve`),
    reject: (id: string, reason?: string) =>
        api.put(`/checkout/${id}/reject`, { reason }),
    return: (id: string) =>
        api.put(`/checkout/${id}/return`),
};

// Users
export const userAPI = {
    getAll: (params?: { role?: string; search?: string }) =>
        api.get('/users', { params }),
    getById: (id: string) =>
        api.get(`/users/${id}`),
    update: (id: string, data: Partial<{ username: string; email: string; role: string; isActive: boolean }>) =>
        api.put(`/users/${id}`, data),
    delete: (id: string) =>
        api.delete(`/users/${id}`),
};

// Security Info
export const getSecurityInfo = () => api.get('/security-info');

export default api;
