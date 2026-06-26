import axiosClient from './axiosClient';

const REPAIR_BASE = '/repair-tickets';

export const createRepairTicket = (data) => {
    return axiosClient.post(REPAIR_BASE, data);
};

export const getRepairTickets = (params = {}) => {
    return axiosClient.get(REPAIR_BASE, { params });
};

export const getRepairTicketById = (id) => {
    return axiosClient.get(`${REPAIR_BASE}/${id}`);
};

export const updateRepairTicket = (id, data) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}`, data);
};
