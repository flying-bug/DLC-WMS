import axiosClient from './axiosClient';

const STOCKTAKE_BASE = '/stocktakes';

export const getStocktakes = (params = {}) => {
  return axiosClient.get(STOCKTAKE_BASE, { params });
};

export const getNextCode = () => {
  return axiosClient.get(`${STOCKTAKE_BASE}/next-code`);
};

export const getStocktakeDetail = (id) => {
  return axiosClient.get(`${STOCKTAKE_BASE}/${id}`);
};

export const createStocktake = (data) => {
  return axiosClient.post(`${STOCKTAKE_BASE}`, data);
};

export const updateStocktake = (id, data) => {
  return axiosClient.put(`${STOCKTAKE_BASE}/${id}`, data);
};

export const postStocktake = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/post`);
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products/variants', { params });
};

export const getInventoryReport = (params = {}) => {
  return axiosClient.get('/reports/inventory-balance', { params });
};
