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

// Interceptor cho Request: Gáº¯n token vÃ o header náº¿u cÃ³
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

// Interceptor cho Response: Xá»­ lÃ½ lá»—i chung (VD: háº¿t háº¡n token)
const ERROR_MAP = {
    "Chi phieu xuat kho DRAFT hoac SUBMITTED moi co the ghi so": "Chá»‰ phiáº¿u xuáº¥t kho lÆ°u táº¡m má»›i cÃ³ thá»ƒ ghi sá»•.",
    "Chi phieu nhap kho DRAFT hoac SUBMITTED moi co the ghi so": "Chá»‰ phiáº¿u nháº­p kho lÆ°u táº¡m má»›i cÃ³ thá»ƒ ghi sá»•.",
    "Chi co the cap nhat phieu DRAFT hoac SUBMITTED": "Chá»‰ cÃ³ thá»ƒ cáº­p nháº­t phiáº¿u lÆ°u táº¡m.",
    "Trang thai phieu xuat kho phai la DRAFT hoac SUBMITTED": "Tráº¡ng thÃ¡i phiáº¿u xuáº¥t kho pháº£i lÃ  lÆ°u táº¡m.",
    "Trang thai phieu nhap kho phai la DRAFT hoac SUBMITTED": "Tráº¡ng thÃ¡i phiáº¿u nháº­p kho pháº£i lÃ  lÆ°u táº¡m.",
    // Dá»± phÃ²ng trÆ°á»ng há»£p dev Ä‘Ã£ xÃ³a chá»¯ SUBMITTED á»Ÿ backend
    "Chi phieu xuat kho DRAFT moi co the ghi so": "Chá»‰ phiáº¿u xuáº¥t kho lÆ°u táº¡m má»›i cÃ³ thá»ƒ ghi sá»•.",
    "Chi phieu nhap kho DRAFT moi co the ghi so": "Chá»‰ phiáº¿u nháº­p kho lÆ°u táº¡m má»›i cÃ³ thá»ƒ ghi sá»•.",
    "Chi co the cap nhat phieu DRAFT": "Chá»‰ cÃ³ thá»ƒ cáº­p nháº­t phiáº¿u lÆ°u táº¡m.",
    "Trang thai phieu xuat kho phai la DRAFT": "Tráº¡ng thÃ¡i phiáº¿u xuáº¥t kho pháº£i lÃ  lÆ°u táº¡m.",
    "Trang thai phieu nhap kho phai la DRAFT": "Tráº¡ng thÃ¡i phiáº¿u nháº­p kho pháº£i lÃ  lÆ°u táº¡m."
};

axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            forceLogout(error.response?.data?.userMessage || 'PhiÃªn Ä‘Äƒng nháº­p cá»§a báº¡n Ä‘Ã£ háº¿t háº¡n hoáº·c tÃ i khoáº£n Ä‘Ã£ bá»‹ khÃ³a.');
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
