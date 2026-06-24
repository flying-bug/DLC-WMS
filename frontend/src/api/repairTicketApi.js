import axiosClient from './axiosClient';

const REPAIR_BASE = '/repair-tickets';

export const getRepairTickets = (params = {}) => {
    return axiosClient.get(REPAIR_BASE, { params });
};
