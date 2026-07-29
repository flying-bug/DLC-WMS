import axiosClient from './axiosClient';

const IMPORT_BASE = '/imports';

export const getImportHistory = (params = {}) => {
  return axiosClient.get(`${IMPORT_BASE}/history`, { params });
};

export const getNextCode = () => {
  return axiosClient.get(`${IMPORT_BASE}/next-code`);
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
  return axiosClient.get('/products/variants', { params });
};

export const getSuppliers = (params = {}) => {
  return axiosClient.get('/suppliers', { params });
};

export const createSupplier = (data) => {
  return axiosClient.post('/suppliers', data);
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};

export const getUsers = (params = {}) => {
  return axiosClient.get('/users', { params });
};
