import axios from 'axios';
import { forceLogout, getAuthToken } from '../auth/session';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined') {
        const isHttps = window.location.protocol === 'https:';

        // If deployed on HTTPS but envUrl is HTTP, force relative path to avoid Mixed Content block
        if (isHttps && envUrl && envUrl.startsWith('http://')) {
            return '/api/v1';
        }

        if (!envUrl) {
            return '/api/v1'; // fallback to relative path if no env is set
        }
    }
    return envUrl || '/api/v1';
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
        const token = getAuthToken();
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
        // Request gửi bằng token cũ (tab vừa đăng nhập lại trong lúc request đang chạy) thì bỏ qua,
        // không để nó đăng xuất phiên mới.
        const sentAuthorization = error.config?.headers?.Authorization;
        const isStaleRequest = Boolean(sentAuthorization) && sentAuthorization !== `Bearer ${getAuthToken()}`;
        if (error.response && error.response.status === 401 && !isLoginRequest && !isStaleRequest) {
            forceLogout(error.response?.data?.userMessage || 'Phiên đăng nhập của bạn đã hết hạn hoặc tài khoản đã bị khóa.');
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
export { getBaseURL };
