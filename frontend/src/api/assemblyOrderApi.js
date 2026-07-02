import axiosClient from './axiosClient';

export const getAssemblyBoms = (params = {}) => {
    return axiosClient.get('/assembly-boms', { params });
};

export const createAssemblyBom = (data) => {
    return axiosClient.post('/assembly-boms', data);
};

export const updateAssemblyBom = (id, data) => {
    return axiosClient.put(`/assembly-boms/${id}`, data);
};

export const getAssemblyOrders = (params = {}) => {
    return axiosClient.get('/assembly-orders', { params });
};

export const getAssemblyOrderById = (id) => {
    return axiosClient.get(`/assembly-orders/${id}`);
};

export const createAssemblyOrder = (data) => {
    return axiosClient.post('/assembly-orders', data);
};

export const createDisassemblyOrder = (data) => {
    return axiosClient.post('/disassembly-orders', data);
};

export const updateAssemblyOrder = (id, data) => {
    return axiosClient.put(`/assembly-orders/${id}`, data);
};
