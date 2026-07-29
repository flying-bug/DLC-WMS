import axiosClient from './axiosClient';

const EXPORT_BASE = '/exports';

export const getExportHistory = (params = {}) => {
  return axiosClient.get(`${EXPORT_BASE}/history`, { params });
};

export const getNextCode = () => {
  return axiosClient.get(`${EXPORT_BASE}/next-code`);
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

export const resolveScan = (data) => {
  return axiosClient.post(`${EXPORT_BASE}/resolve-scan`, data);
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products/variants', { params });
};

export const getCustomers = (params = {}) => {
  return axiosClient.get('/customers', { params });
};

export const getUsers = (params = {}) => {
  return axiosClient.get('/users', { params });
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};

export const createCustomer = (data) => {
  return axiosClient.post('/customers', data);
};

export const getInventoryBalance = (params = {}) => {
  return axiosClient.get('/reports/inventory-balance', { params });
};
