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
        const token = sessionStorage.getItem('token');
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
const ERROR_MAP = {
    "Chi phieu xuat kho DRAFT hoac SUBMITTED moi co the ghi so": "Chỉ phiếu xuất kho lưu tạm mới có thể ghi sổ.",
    "Chi phieu nhap kho DRAFT hoac SUBMITTED moi co the ghi so": "Chỉ phiếu nhập kho lưu tạm mới có thể ghi sổ.",
    "Chi co the cap nhat phieu DRAFT hoac SUBMITTED": "Chỉ có thể cập nhật phiếu lưu tạm.",
    "Trang thai phieu xuat kho phai la DRAFT hoac SUBMITTED": "Trạng thái phiếu xuất kho phải là lưu tạm.",
    "Trang thai phieu nhap kho phai la DRAFT hoac SUBMITTED": "Trạng thái phiếu nhập kho phải là lưu tạm.",
    // Dự phòng trường hợp dev đã xóa chữ SUBMITTED ở backend
    "Chi phieu xuat kho DRAFT moi co the ghi so": "Chỉ phiếu xuất kho lưu tạm mới có thể ghi sổ.",
    "Chi phieu nhap kho DRAFT moi co the ghi so": "Chỉ phiếu nhập kho lưu tạm mới có thể ghi sổ.",
    "Chi co the cap nhat phieu DRAFT": "Chỉ có thể cập nhật phiếu lưu tạm.",
    "Trang thai phieu xuat kho phai la DRAFT": "Trạng thái phiếu xuất kho phải là lưu tạm.",
    "Trang thai phieu nhap kho phai la DRAFT": "Trạng thái phiếu nhập kho phải là lưu tạm."
};

axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response && (error.response.status === 401 || error.response.status === 403) && !isLoginRequest) {
            forceLogout(error.response?.data?.userMessage || 'Phiên đăng nhập của bạn đã hết hạn hoặc tài khoản đã bị khóa.');
        }

        // Translate specific backend errors to nice Vietnamese
        if (error.response && error.response.data) {
            let msg = error.response.data.userMessage || error.response.data.devMessage;
            if (msg) {
                for (const [key, value] of Object.entries(ERROR_MAP)) {
                    if (msg.includes(key)) {
                        error.response.data.userMessage = value;
                        error.response.data.devMessage = value;
                        break;
                    }
                }
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
export { getBaseURL };
