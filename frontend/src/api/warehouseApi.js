import axiosClient from './axiosClient';

const WAREHOUSE_BASE = '/warehouses';

/**
 * Lấy danh sách kho (phân trang + tìm kiếm)
 */
export const getWarehouses = (params = {}) => {
    return axiosClient.get(WAREHOUSE_BASE, { params });
};

/**
 * Xuất Excel danh sách kho
 */
export const exportWarehouses = (params = {}) => {
    return axiosClient.get(`${WAREHOUSE_BASE}/export`, {
        params,
        responseType: 'blob'
    });
};

/**
 * Lấy chi tiết kho kèm metrics
 */
export const getWarehouseDetail = (id) => {
    return axiosClient.get(`${WAREHOUSE_BASE}/${id}/metrics`);
};

/**
 * Tạo mới kho
 */
export const createWarehouse = (data) => {
    return axiosClient.post(WAREHOUSE_BASE, data);
};

/**
 * Cập nhật thông tin kho
 */
export const updateWarehouse = (id, data) => {
    return axiosClient.put(`${WAREHOUSE_BASE}/${id}`, data);
};

/**
 * Xóa (Soft Delete) kho
 */
export const deleteWarehouse = (id) => {
    return axiosClient.delete(`${WAREHOUSE_BASE}/${id}`);
};

/**
 * Lấy lịch sử thay đổi (Audit Logs)
 */
export const getWarehouseLogs = (id, params = {}) => {
    return axiosClient.get(`${WAREHOUSE_BASE}/${id}/logs`, { params });
};
