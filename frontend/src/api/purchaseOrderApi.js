import axiosClient from './axiosClient';

const BASE = '/purchase-orders';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  );

export const getPurchaseOrders = (params = {}) =>
  axiosClient.get(BASE, { params: cleanParams(params) });

export const getPurchaseOrderById = (id) =>
  axiosClient.get(`${BASE}/${id}`);

export const getNextPoCode = () =>
  axiosClient.get(`${BASE}/next-code`);

export const createPurchaseOrder = (data) =>
  axiosClient.post(BASE, data);

export const updatePurchaseOrder = (id, data) =>
  axiosClient.put(`${BASE}/${id}`, data);

export const approvePurchaseOrder = (id) =>
  axiosClient.put(`${BASE}/${id}/approve`);

export const cancelPurchaseOrder = (id) =>
  axiosClient.put(`${BASE}/${id}/cancel`);

// Shared lookups
export const getSuppliers = (params = {}) =>
  axiosClient.get('/suppliers', { params });

export const getSupplierById = (id) =>
  axiosClient.get(`/suppliers/${id}`);

export const createSupplier = (data) =>
  axiosClient.post('/suppliers', data);

export const getProducts = (params = {}) =>
  axiosClient.get('/products/variants', { params });

