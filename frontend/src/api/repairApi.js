import axiosClient from './axiosClient';

const REPAIR_BASE = '/repairs';

export const createRepair = (data) => {
    return axiosClient.post(REPAIR_BASE, data);
};

export const getRepairs = (params = {}) => {
    return axiosClient.get(REPAIR_BASE, { params });
};

export const getRepairById = (id) => {
    return axiosClient.get(`${REPAIR_BASE}/${id}`);
};

export const updateRepair = (id, data) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}`, data);
};

export const addRepairLine = (id, data) => {
    return axiosClient.post(`${REPAIR_BASE}/${id}/lines`, data);
};

export const updateRepairLine = (id, lineId, data) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}/lines/${lineId}`, data);
};

export const deleteRepairLine = (id, lineId) => {
    return axiosClient.delete(`${REPAIR_BASE}/${id}/lines/${lineId}`);
};

export const addRepairFee = (id, data) => {
    return axiosClient.post(`${REPAIR_BASE}/${id}/fees`, data);
};

export const deleteRepairFee = (id, feeId) => {
    return axiosClient.delete(`${REPAIR_BASE}/${id}/fees/${feeId}`);
};

export const updateRepairStatus = (id, statusData) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}/status`, statusData);
};

export const checkRepairCode = (code) => {
    return axiosClient.get(`${REPAIR_BASE}/check-code`, { params: { code } });
};

export const getNextRepairCode = () => {
    // Lấy mã tiếp theo từ backend (backend sẽ trả về mã SC-XXXXX phù hợp khi create)
    // Dùng timestamp tạm thời ở frontend để hiển thị placeholder, backend sẽ override nếu cần
    return axiosClient.get(`${REPAIR_BASE}`, { params: { page: 0, size: 1, keyword: 'SC-' } });
};
