import axiosClient from './axiosClient';

const WARRANTY_BASE = '/warranties';

export const getWarranties = (params = {}) => {
    return axiosClient.get(WARRANTY_BASE, { params });
};

export const getWarrantyById = (id) => {
    return axiosClient.get(`${WARRANTY_BASE}/${id}`);
};
