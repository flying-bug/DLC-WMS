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

// Manager duyệt: bắt đầu kiểm kê và khóa kho
export const approveStocktake = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/approve`);
};

export const rejectStocktake = (id, reason) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/reject`, { reason });
};

// Dòng lệch chọn "Không xử lý": thủ kho gửi yêu cầu, Manager/Kế toán xác nhận
export const requestWaiverConfirmation = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/waivers/request`);
};

export const confirmWaivers = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/waivers/confirm`);
};

// Hủy phiếu (mở khóa kho nếu đang kiểm kê)
export const cancelStocktake = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/cancel`);
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};

export const getProducts = (params = {}) => {
  return axiosClient.get('/products/variants', { params });
};

export const getAvailableSerials = (warehouseId, variantId) => {
  return axiosClient.get(`${STOCKTAKE_BASE}/available-serials`, { params: { warehouseId, variantId } });
};

export const getInventoryReport = (params = {}) => {
  return axiosClient.get('/reports/inventory-balance', { params });
};


