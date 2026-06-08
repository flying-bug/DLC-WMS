import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
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
        if (error.response && error.response.status === 401) {
            // Có thể tự động logout hoặc redirect về trang login nếu token hết hạn
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
