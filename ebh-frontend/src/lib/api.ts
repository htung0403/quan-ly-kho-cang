import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './utils';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = storage.get<string>('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => response.data,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = storage.get<string>('refreshToken');
                if (refreshToken) {
                    const response = await axios.post('/api/auth/refresh', { refreshToken });
                    const { token, refreshToken: newRefreshToken } = response.data.data;

                    storage.set('token', token);
                    storage.set('refreshToken', newRefreshToken);

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed - logout user
                storage.remove('token');
                storage.remove('refreshToken');
                storage.remove('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Handle other errors
        const message = (error.response?.data as { message?: string })?.message || 'Đã xảy ra lỗi';
        return Promise.reject(new Error(message));
    }
);

export default apiClient;

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    register: (data: { email: string; password: string; full_name: string }) =>
        apiClient.post('/auth/register', data),

    logout: () =>
        apiClient.post('/auth/logout'),

    me: () =>
        apiClient.get('/auth/me'),

    refreshToken: (refreshToken: string) =>
        apiClient.post('/api/auth/refresh', { refreshToken }),
};

// Users API
export const usersApi = {
    getAll: (params?: { page?: number; limit?: number; search?: string }) =>
        apiClient.get('/users', { params }),

    getById: (id: string) =>
        apiClient.get(`/users/${id}`),

    getRoles: () =>
        apiClient.get('/users/roles'),

    create: (data: any) =>
        apiClient.post('/users', data),

    update: (id: string, data: Partial<{ full_name: string; phone: string; is_active: boolean }>) =>
        apiClient.put(`/users/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/users/${id}`),

    assignProject: (userId: string, projectId: string, permissions: { can_view: boolean; can_edit: boolean; can_delete: boolean }) =>
        apiClient.post(`/users/${userId}/projects`, { projectId, ...permissions }),

    removeProject: (userId: string, projectId: string) =>
        apiClient.delete(`/users/${userId}/projects/${projectId}`),

    uploadAvatar: (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.post('/users/upload-avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Projects API
export const projectsApi = {
    getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        apiClient.get('/projects', { params }),

    getById: (id: string) =>
        apiClient.get(`/projects/${id}`),

    create: (data: Partial<{ code: string; name: string; description: string; client_name: string; status: string }>) =>
        apiClient.post('/projects', data),

    update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
        apiClient.put(`/projects/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/projects/${id}`),

    getUsers: (projectId: string) =>
        apiClient.get(`/projects/${projectId}/users`),

    assignProject: (projectId: string, userId: string, permissions?: any) =>
        apiClient.post(`/projects/${projectId}/users`, { user_id: userId, ...permissions }),

    removeProject: (projectId: string, userId: string) =>
        apiClient.delete(`/projects/${projectId}/users/${userId}`),
};

// Materials API
export const materialsApi = {
    getAll: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) =>
        apiClient.get('/materials', { params }),

    getById: (id: string) =>
        apiClient.get(`/materials/${id}`),

    create: (data: any) =>
        apiClient.post('/materials', data),

    update: (id: string, data: any) =>
        apiClient.put(`/materials/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/materials/${id}`),

    updateDensity: (id: string, data: { density: number; reason?: string }) =>
        apiClient.post(`/materials/${id}/density`, data),

    getDensityHistory: (id: string) =>
        apiClient.get(`/materials/${id}/density-history`),
};

// Warehouses API
export const warehousesApi = {
    getAll: (params?: { page?: number; limit?: number; search?: string }) =>
        apiClient.get('/warehouses', { params }),

    getById: (id: string) =>
        apiClient.get(`/warehouses/${id}`),

    create: (data: Partial<{ code: string; name: string; address: string; manager_id: string }>) =>
        apiClient.post('/warehouses', data),

    update: (id: string, data: Partial<{ name: string; address: string; is_active: boolean }>) =>
        apiClient.put(`/warehouses/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/warehouses/${id}`),

    getInventory: (id: string) =>
        apiClient.get(`/warehouses/${id}/inventory`),
};

// Vehicles API
export const vehiclesApi = {
    getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        apiClient.get('/vehicles', { params }),

    getById: (id: string) =>
        apiClient.get(`/vehicles/${id}`),

    create: (data: Partial<{ plate_number: string; driver_name: string; capacity_tons: number; vehicle_type: string }>) =>
        apiClient.post('/vehicles', data),

    update: (id: string, data: Partial<{ driver_name: string; status: string; is_active: boolean }>) =>
        apiClient.put(`/vehicles/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/vehicles/${id}`),
};

// Purchases API
export const purchasesApi = {
    getAll: (params?: { page?: number; limit?: number; warehouse_id?: string; project_id?: string; from_date?: string; to_date?: string; search?: string }) =>
        apiClient.get('/purchases', { params }),

    getById: (id: string) =>
        apiClient.get(`/purchases/${id}`),

    create: (data: any) =>
        apiClient.post('/purchases', data),

    update: (id: string, data: Partial<{ notes: string }>) =>
        apiClient.put(`/purchases/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/purchases/${id}`),
};

// Exports API
export const exportsApi = {
    getAll: (params?: { page?: number; limit?: number; warehouse_id?: string; project_id?: string; from_date?: string; to_date?: string }) =>
        apiClient.get('/exports', { params }),

    getById: (id: string) =>
        apiClient.get(`/exports/${id}`),

    create: (data: any) =>
        apiClient.post('/exports', data),

    update: (id: string, data: Partial<{ notes: string }>) =>
        apiClient.put(`/exports/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/exports/${id}`),
};

// Transport Logs API
export const transportApi = {
    getAll: (params?: { page?: number; limit?: number; vehicle_id?: string; from_date?: string; to_date?: string }) =>
        apiClient.get('/transport', { params }),

    getByReceipt: (receiptId: string) =>
        apiClient.get(`/exports/${receiptId}/transport`),

    create: (data: any) =>
        apiClient.post('/transport', data),

    update: (id: string, data: Partial<{ arrival_time: string; notes: string }>) =>
        apiClient.put(`/transport/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/transport/${id}`),
};

// Reports API
export const reportsApi = {
    getInventory: (params?: { warehouse_id?: string; material_id?: string; date?: string }) =>
        apiClient.get('/reports/inventory', { params }),

    getTransport: (params: { from_date: string; to_date: string; vehicle_id?: string }) =>
        apiClient.get('/reports/transport', { params }),

    getProjectProfit: (params: { from_date: string; to_date: string; project_id?: string }) =>
        apiClient.get('/reports/project-profit', { params }),

    getDashboard: () =>
        apiClient.get('/reports/dashboard'),
};

// Settings API
export const settingsApi = {
    get: () =>
        apiClient.get('/settings'),

    update: (data: any) =>
        apiClient.put('/settings', data),

    uploadLogo: (file: File) => {
        const formData = new FormData();
        formData.append('logo', file);
        return apiClient.post('/settings/upload-logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};

// Lookups API
export const lookupsApi = {
    getCategories: () =>
        apiClient.get('/lookups/categories'),

    createCategory: (name: string) =>
        apiClient.post('/lookups/categories', { name }),

    getUnits: () =>
        apiClient.get('/lookups/units'),

    createUnit: (name: string) =>
        apiClient.post('/lookups/units', { name }),
};

// Export all APIs as a single object
export const api = {
    auth: authApi,
    users: usersApi,
    projects: projectsApi,
    materials: materialsApi,
    warehouses: warehousesApi,
    vehicles: vehiclesApi,
    purchases: purchasesApi,
    exports: exportsApi,
    transport: transportApi,
    reports: reportsApi,
    settings: settingsApi,
    lookups: lookupsApi,
};
