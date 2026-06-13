// ── App identity ─────────────────────────────────────────────
export const APP_NAME = 'DLC-WMS';
export const COMPANY_NAME = 'Duy Long Computer System';
export const APP_DISPLAY_NAME = 'Duy Long Warehouse';
export const COPYRIGHT_YEAR = 2026;

// ── Client-side routes ────────────────────────────────────────
export const ROUTES = {
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    DASHBOARD: '/dashboard',
    PRODUCTS: '/products',
};

// ── Password rules ────────────────────────────────────────────
export const PASSWORD_RULES = [
    { id: 'minLength', label: 'Tối thiểu 8 ký tự', regex: /.{8,}/ },
    { id: 'specialChar', label: 'Có ít nhất 1 ký tự đặc biệt (!@#$)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
    { id: 'hasNumber', label: 'Có ít nhất 1 chữ số', regex: /\d/ },
];

// ── OTP config ────────────────────────────────────────────────
export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 119; // 1:59

// ── Form placeholders ─────────────────────────────────────────
export const PLACEHOLDERS = {
    EMAIL_OR_USERNAME: 'username@duylong.vn',
    PASSWORD: '••••••••',
};

// ── Mock Google accounts (static UI only) ────────────────────
// TODO: thay bằng dữ liệu thực từ Google OAuth response
export const MOCK_GOOGLE_ACCOUNTS = [
    {
        id: '1',
        name: 'Đức Long',
        email: 'duclong2k@duylong.vn',
        avatarUrl: null, // null → hiển thị avatar chữ cái đầu
        initials: 'ĐL',
    },
    {
        id: '2',
        name: 'Trần Văn Bình',
        email: 'binh.tran@gmail.com',
        avatarUrl: null,
        initials: 'TB',
    },
];
