// API Configuration
window.API_BASE = 'http://localhost:3000/api';

// Authentication utilities
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function clearToken() {
    localStorage.removeItem('token');
}

function parseJwt(token) {
    try {
        const base = token.split('.')[1];
        return JSON.parse(atob(base));
    } catch {
        return null;
    }
}

function getUserInfo() {
    const token = getToken();
    if (!token) return null;
    const payload = parseJwt(token);
    return payload ? {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name || payload.email.split('@')[0]
    } : null;
}

function isAuthenticated() {
    const token = getToken();
    if (!token) return false;

    const payload = parseJwt(token);
    if (!payload) return false;

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function logout() {
    clearToken();
    redirectToLogin();
}

// Global auth object
window.auth = {
    getToken,
    setToken,
    clearToken,
    parseJwt,
    getUserInfo,
    isAuthenticated,
    logout,
    redirectToLogin
};

// API Client
class ApiClient {
    constructor() {
        this.baseURL = window.API_BASE;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);

            if (response.status === 401) {
                logout();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Network error' }));
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            if (window.ui && window.ui.displayError) {
                window.ui.displayError(error.message);
            }
            throw error;
        }
    }

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // Contract endpoints
    async getContracts(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/contracts?${params}`);
    }

    async getContract(id) {
        return this.request(`/contracts/${id}`);
    }

    async uploadContract(formData) {
        const token = getToken();
        const response = await fetch(`${this.baseURL}/contracts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData // FormData object
        });

        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Upload failed' }));
            throw new Error(error.message || 'Upload failed');
        }

        return await response.json();
    }

    async updateContractMetadata(id, metadata) {
        return this.request(`/contracts/${id}/metadata`, {
            method: 'PUT',
            body: JSON.stringify(metadata)
        });
    }

    async submitContractInternal(id) {
        return this.request(`/contracts/${id}/submit-internal`, {
            method: 'POST'
        });
    }

    async reviewContractLegal(id, approved, note = '') {
        return this.request(`/contracts/${id}/review-legal`, {
            method: 'POST',
            body: JSON.stringify({ approved, note })
        });
    }

    async reviewContractManagement(id, approved, note = '') {
        return this.request(`/contracts/${id}/review-management`, {
            method: 'POST',
            body: JSON.stringify({ approved, note })
        });
    }

    async downloadContract(id) {
        const token = getToken();
        const response = await fetch(`${this.baseURL}/contracts/${id}/download`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error('Download failed');
        }

        return response.blob();
    }

    // Dashboard endpoints
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    // Notification endpoints
    async getNotifications() {
        return this.request('/notifications');
    }

    async markNotificationRead(id) {
        return this.request(`/notifications/${id}/read`, {
            method: 'POST'
        });
    }

    async getAuditLogs(params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value);
            }
        });

        const query = searchParams.toString();
        const endpoint = query ? `/audit-logs?${query}` : '/audit-logs';
        return this.request(endpoint);
    }

    // User endpoints
    async getProfile() {
        return this.request('/users/profile');
    }

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }
}

// Global API client
window.api = new ApiClient();

// Utility functions for formatting
window.utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(amount);
    },

    formatDate: (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },

    formatDateTime: (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    formatTime: (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    getStatusText: (status) => {
        const statusMap = {
            'draft': 'Draft',
            'in_review_legal': 'Dalam Review Legal',
            'in_review_management': 'Dalam Review Manajemen',
            'approved': 'Disetujui',
            'rejected': 'Ditolak'
        };
        return statusMap[status] || status;
    },

    getRiskColor: (score) => {
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }
};