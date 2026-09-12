import axiosClient from './axiosClient';

/**
 * Lấy URL kết nối Gmail OAuth (cần JWT auth).
 * Frontend sẽ redirect user đến URL này.
 */
export const getGmailConnectUrl = () => {
    return axiosClient.get('/email/google/connect');
};

/**
 * Lấy trạng thái kết nối Gmail OAuth.
 */
export const getGmailStatus = () => {
    return axiosClient.get('/email/status');
};

/**
 * Gửi email test qua Gmail đã kết nối.
 */
export const sendTestEmail = (toEmail) => {
    return axiosClient.post('/email/test', { toEmail });
};

/**
 * Ngắt kết nối Gmail OAuth.
 */
export const disconnectGmail = () => {
    return axiosClient.post('/email/google/disconnect');
};
