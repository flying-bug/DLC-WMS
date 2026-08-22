import axiosClient from './axiosClient';

export const getMyNotifications = () => {
    return axiosClient.get('/api/v1/notifications');
};

export const getUnreadCount = () => {
    return axiosClient.get('/api/v1/notifications/unread-count');
};

export const markAsRead = (id) => {
    return axiosClient.put(`/api/v1/notifications/${id}/read`);
};

export const markAllAsRead = () => {
    return axiosClient.put('/api/v1/notifications/read-all');
};
