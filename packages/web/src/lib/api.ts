import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    timeout: 15000,
});

// Inject JWT token from store on every request
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally → logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const apiRequest = {
    get: <T>(url: string) => api.get<{ success: boolean; data: T }>(url).then(r => r.data.data),
    post: <T>(url: string, data?: unknown) => api.post<{ success: boolean; data: T }>(url, data).then(r => r.data.data),
    put: <T>(url: string, data?: unknown) => api.put<{ success: boolean; data: T }>(url, data).then(r => r.data.data),
    patch: <T>(url: string, data?: unknown) => api.patch<{ success: boolean; data: T }>(url, data).then(r => r.data.data),
    delete: <T>(url: string) => api.delete<{ success: boolean; data: T }>(url).then(r => r.data.data),
};
