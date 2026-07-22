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

// Interceptor cho Request: GÃ¡ÂºÂ¯n token vÃƒÂ o header nÃ¡ÂºÂ¿u cÃƒÂ³
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

// Interceptor cho Response: XÃ¡Â»Â­ lÃƒÂ½ lÃ¡Â»â€”i chung (VD: hÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n token)
const ERROR_MAP = {
    "Chi phieu xuat kho DRAFT hoac SUBMITTED moi co the ghi so": "ChÃ¡Â»â€° phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho lÃ†Â°u tÃ¡ÂºÂ¡m mÃ¡Â»â€ºi cÃƒÂ³ thÃ¡Â»Æ’ ghi sÃ¡Â»â€¢.",
    "Chi phieu nhap kho DRAFT hoac SUBMITTED moi co the ghi so": "ChÃ¡Â»â€° phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho lÃ†Â°u tÃ¡ÂºÂ¡m mÃ¡Â»â€ºi cÃƒÂ³ thÃ¡Â»Æ’ ghi sÃ¡Â»â€¢.",
    "Chi co the cap nhat phieu DRAFT hoac SUBMITTED": "ChÃ¡Â»â€° cÃƒÂ³ thÃ¡Â»Æ’ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t phiÃ¡ÂºÂ¿u lÃ†Â°u tÃ¡ÂºÂ¡m.",
    "Trang thai phieu xuat kho phai la DRAFT hoac SUBMITTED": "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho phÃ¡ÂºÂ£i lÃƒÂ  lÃ†Â°u tÃ¡ÂºÂ¡m.",
    "Trang thai phieu nhap kho phai la DRAFT hoac SUBMITTED": "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho phÃ¡ÂºÂ£i lÃƒÂ  lÃ†Â°u tÃ¡ÂºÂ¡m.",
    // DÃ¡Â»Â± phÃƒÂ²ng trÃ†Â°Ã¡Â»Âng hÃ¡Â»Â£p dev Ã„â€˜ÃƒÂ£ xÃƒÂ³a chÃ¡Â»Â¯ SUBMITTED Ã¡Â»Å¸ backend
    "Chi phieu xuat kho DRAFT moi co the ghi so": "ChÃ¡Â»â€° phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho lÃ†Â°u tÃ¡ÂºÂ¡m mÃ¡Â»â€ºi cÃƒÂ³ thÃ¡Â»Æ’ ghi sÃ¡Â»â€¢.",
    "Chi phieu nhap kho DRAFT moi co the ghi so": "ChÃ¡Â»â€° phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho lÃ†Â°u tÃ¡ÂºÂ¡m mÃ¡Â»â€ºi cÃƒÂ³ thÃ¡Â»Æ’ ghi sÃ¡Â»â€¢.",
    "Chi co the cap nhat phieu DRAFT": "ChÃ¡Â»â€° cÃƒÂ³ thÃ¡Â»Æ’ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t phiÃ¡ÂºÂ¿u lÃ†Â°u tÃ¡ÂºÂ¡m.",
    "Trang thai phieu xuat kho phai la DRAFT": "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho phÃ¡ÂºÂ£i lÃƒÂ  lÃ†Â°u tÃ¡ÂºÂ¡m.",
    "Trang thai phieu nhap kho phai la DRAFT": "TrÃ¡ÂºÂ¡ng thÃƒÂ¡i phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho phÃ¡ÂºÂ£i lÃƒÂ  lÃ†Â°u tÃ¡ÂºÂ¡m."
};

axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            forceLogout(error.response?.data?.userMessage || 'PhiÃƒÂªn Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p cÃ¡Â»Â§a bÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ hÃ¡ÂºÂ¿t hÃ¡ÂºÂ¡n hoÃ¡ÂºÂ·c tÃƒÂ i khoÃ¡ÂºÂ£n Ã„â€˜ÃƒÂ£ bÃ¡Â»â€¹ khÃƒÂ³a.');
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
