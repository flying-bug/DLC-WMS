import axiosClient from './axiosClient';

const IMPORT_BASE = '/imports';

export const getImportHistory = (params = {}) => {
  return axiosClient.get(`${IMPORT_BASE}/history`, { params });
};

export const getImportDetail = (id) => {
  return axiosClient.get(`${IMPORT_BASE}/${id}`);
};

export const createImportSlip = (data) => {
  return axiosClient.post(`${IMPORT_BASE}/create`, data);
};

export const updateImportSlip = (id, data) => {
  return axiosClient.put(`${IMPORT_BASE}/${id}`, data);
};

export const postImportSlip = (id) => {
  return axiosClient.post(`${IMPORT_BASE}/${id}/post`);
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products', { params });
};

export const getSuppliers = (params = {}) => {
  return axiosClient.get('/suppliers', { params });
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};
