import axiosClient from './axiosClient';

// ─── BOM APIs ────────────────────────────────────────────────────────────────

export const getAssemblyBoms = (params = {}) => {
    return axiosClient.get('/assembly-boms', { params });
};

export const getAssemblyBomById = (id) => {
    return axiosClient.get(`/assembly-boms/${id}`);
};

export const createAssemblyBom = (data) => {
    return axiosClient.post('/assembly-boms', data);
};

export const updateAssemblyBom = (id, data) => {
    return axiosClient.put(`/assembly-boms/${id}`, data);
};

// ─── Assembly Order APIs ──────────────────────────────────────────────────────

export const getAssemblyOrders = (params = {}) => {
    return axiosClient.get('/assembly-orders', { params });
};

export const getAssemblyOrderById = (id) => {
    return axiosClient.get(`/assembly-orders/${id}`);
};

export const createAssemblyOrder = (data) => {
    return axiosClient.post('/assembly-orders', data);
};

export const createDisassemblyOrder = (data) => {
    return axiosClient.post('/disassembly-orders', data);
};

export const updateAssemblyOrder = (id, data) => {
    return axiosClient.put(`/assembly-orders/${id}`, data);
};

/**
 * Cập nhật trạng thái lệnh (Duyệt / Hủy…)
 * PUT /api/v1/assembly-orders/{id}/status?status=APPROVED
 */
export const updateOrderStatus = (id, status) => {
    return axiosClient.put(`/assembly-orders/${id}/status`, null, { params: { status } });
};

/**
 * Sinh Phiếu Nhập / Xuất kho từ Lệnh đã APPROVED
 * POST /api/v1/assembly-orders/{id}/inventory-documents
 * body: { documentType: "GOODS_ISSUE" | "GOODS_RECEIPT", lines: [...] }
 */
export const generateInventoryDocument = (id, data) => {
    return axiosClient.post(`/assembly-orders/${id}/inventory-documents`, data);
};

