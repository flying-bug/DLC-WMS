import axiosClient from './axiosClient';

const TRANSFER_BASE = '/stock-transfers';

export const getTransferHistory = (params = {}) => {
  return axiosClient.get(`${TRANSFER_BASE}`, { params });
};

export const getNextCode = () => {
  return axiosClient.get(`${TRANSFER_BASE}/next-code`);
};

export const getTransferDetail = (id) => {
  return axiosClient.get(`${TRANSFER_BASE}/${id}`);
};

export const createTransferSlip = (data) => {
  return axiosClient.post(`${TRANSFER_BASE}`, data);
};

export const updateTransferSlip = (id, data) => {
  return axiosClient.put(`${TRANSFER_BASE}/${id}`, data);
};

export const dispatchTransferSlip = (id, data) => {
  return axiosClient.post(`${TRANSFER_BASE}/${id}/dispatch`, data);
};

export const receiveTransferSlip = (id, data) => {
  return axiosClient.post(`${TRANSFER_BASE}/${id}/receive`, data);
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products/variants', { params });
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};
