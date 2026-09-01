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
  return axiosClient.get('/users/search', { params });
};

export const scanImportSlipOcr = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient.post(`${IMPORT_BASE}/ocr-scan`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const confirmOcrMapping = (partnerId, vendorProductName, variantId) => {
  return axiosClient.post(`${IMPORT_BASE}/ocr-confirm-mapping`, null, {
    params: { partnerId, vendorProductName, variantId },
  });
};

export const initOcrSession = () => {
  return axiosClient.get(`${IMPORT_BASE}/ocr-session/init`);
};

export const getOcrSessionState = (sessionId) => {
  return axiosClient.get(`${IMPORT_BASE}/ocr-session/${sessionId}`);
};

export const uploadOcrForSession = (sessionId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return axiosClient.post(`${IMPORT_BASE}/ocr-session/${sessionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const checkImportUnpost = (id) => {

  return axiosClient.get(`${IMPORT_BASE}/${id}/check-unpost`);
};

export const unpostImportSlip = (id, reason = '') => {
  return axiosClient.post(`${IMPORT_BASE}/${id}/unpost`, null, {
    params: { reason }
  });
};

export const getImportSlipLogs = (id) => {
  return axiosClient.get(`${IMPORT_BASE}/${id}/logs`);
};

