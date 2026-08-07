import axiosClient from './axiosClient';

const BASE = '/sales-orders';

export const getSalesOrders = (params = {}) =>
  axiosClient.get(BASE, { params });

export const getSalesOrderById = (id) =>
  axiosClient.get(`${BASE}/${id}`);

export const getNextSoCode = () =>
  axiosClient.get(`${BASE}/next-code`);

export const createSalesOrder = (data) =>
  axiosClient.post(BASE, data);

export const directCheckout = (data) =>
  axiosClient.post(`${BASE}/direct-checkout`, data);

export const updateSalesOrder = (id, data) =>
  axiosClient.put(`${BASE}/${id}`, data);

export const approveSalesOrder = (id) =>
  axiosClient.put(`${BASE}/${id}/approve`);

export const cancelSalesOrder = (id) =>
  axiosClient.put(`${BASE}/${id}/cancel`);

export const recordPayment = (id, amount) =>
  axiosClient.post(`${BASE}/${id}/payments`, { amount });

export const sendQuoteEmail = (id, data) =>
  axiosClient.post(`${BASE}/${id}/send-quote-email`, data);

// Tạo draft phiếu xuất kho từ SO đã duyệt
export const createExportFromSO = (soId) =>
  axiosClient.post(`/exports/from-sales-order/${soId}`);

// Re-export các lookups dùng chung
export const getWarehouses = (params = {}) =>
  axiosClient.get('/warehouses', { params });

export const getCustomers = (params = {}) =>
  axiosClient.get('/customers', { params });

export const getProducts = (params = {}) =>
  axiosClient.get('/products/variants', { params });

export const getInventoryBalance = (params = {}) =>
  axiosClient.get('/reports/inventory-balance', { params });
