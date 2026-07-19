import axiosClient from './axiosClient';

// ─── Repair Order APIs ────────────────────────────────────────────────────────

export const getRepairs = (params = {}) => {
    return axiosClient.get('/repairs', { params });
};

export const getRepairById = (id) => {
    return axiosClient.get(`/repairs/${id}`);
};

export const createRepair = (data) => {
    return axiosClient.post('/repairs', data);
};

export const updateRepair = (id, data) => {
    return axiosClient.put(`/repairs/${id}`, data);
};

/**
 * Chuyển trạng thái lệnh sửa chữa
 * PUT /api/v1/repairs/{id}/status
 * body: { status: "CONFIRMED" }
 */
export const updateRepairStatus = (id, status) => {
    return axiosClient.put(`/repairs/${id}/status`, { status });
};

// ─── Repair Lines APIs ────────────────────────────────────────────────────────

export const getRepairLines = (repairId) => {
    return axiosClient.get(`/repairs/${repairId}/lines`);
};

export const addRepairLine = (repairId, data) => {
    return axiosClient.post(`/repairs/${repairId}/lines`, data);
};

export const deleteRepairLine = (repairId, lineId) => {
    return axiosClient.delete(`/repairs/${repairId}/lines/${lineId}`);
};

// ─── Repair Fees APIs ─────────────────────────────────────────────────────────

export const getRepairFees = (repairId) => {
    return axiosClient.get(`/repairs/${repairId}/fees`);
};

export const addRepairFee = (repairId, data) => {
    return axiosClient.post(`/repairs/${repairId}/fees`, data);
};
