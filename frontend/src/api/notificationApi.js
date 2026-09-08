import axiosClient from './axiosClient';

export const getMyNotifications = () => {
    return axiosClient.get('/notifications');
};

export const getUnreadCount = () => {
    return axiosClient.get('/notifications/unread-count');
};

export const markAsRead = (id) => {
    return axiosClient.put(`/notifications/${id}/read`);
};

export const markAllAsRead = () => {
    return axiosClient.put('/notifications/read-all');
};
