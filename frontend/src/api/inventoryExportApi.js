import axiosClient from './axiosClient';

const EXPORT_BASE = '/exports';

export const getExportHistory = (params = {}) => {
  return axiosClient.get(`${EXPORT_BASE}/history`, { params });
};

export const getExportDetail = (id) => {
  return axiosClient.get(`${EXPORT_BASE}/${id}`);
};

export const createExportSlip = (data) => {
  return axiosClient.post(`${EXPORT_BASE}/create`, data);
};

export const updateExportSlip = (id, data) => {
  return axiosClient.put(`${EXPORT_BASE}/${id}`, data);
};

export const postExportSlip = (id) => {
  return axiosClient.post(`${EXPORT_BASE}/${id}/post`);
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products/variants', { params });
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};
