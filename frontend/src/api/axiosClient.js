import axios from 'axios';
import { forceLogout } from '../auth/session';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined') {
        const isHttps = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost';

        // If deployed on HTTPS but envUrl is HTTP, force relative path to avoid Mixed Content block
        if (isHttps && envUrl && envUrl.startsWith('http://')) {
            return '/api/v1';
        }

        if (!envUrl) {
            return isLocalhost ? 'http://localhost:8080/api/v1' : '/api/v1';
        }
    }
    return envUrl || 'http://localhost:8080/api/v1';
};

const axiosClient = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor cho Request: Gắn token vào header nếu có
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor cho Response: Xử lý lỗi chung (VD: hết hạn token)
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            forceLogout(error.response?.data?.userMessage || 'Phien dang nhap cua ban da het han hoac tai khoan da bi khoa.');
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
export { getBaseURL };
