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

export const updateRepairFee = (id, feeId, data) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}/fees/${feeId}`, data);
};

export const updateRepairStatus = (id, statusData) => {
    return axiosClient.put(`${REPAIR_BASE}/${id}/status`, statusData);
};

export const checkRepairCode = (code) => {
    return axiosClient.get(`${REPAIR_BASE}/check-code`, { params: { code } });
};

export const getPreviewCode = () => {
    return axiosClient.get(`${REPAIR_BASE}/preview-code`);
};

export const getNextRepairCode = () => {
    return axiosClient.get(`${REPAIR_BASE}`, { params: { page: 0, size: 1, keyword: 'SC-' } });
};

export const assignRepair = (id) => axiosClient.post(`${REPAIR_BASE}/${id}/assign`);
export const submitQuotation = (id) => axiosClient.post(`${REPAIR_BASE}/${id}/submit-quotation`);
export const approveRepair = (id) => axiosClient.post(`${REPAIR_BASE}/${id}/approve`);
export const declineRepair = (id, reason) => axiosClient.post(`${REPAIR_BASE}/${id}/decline`, { reason });
export const completeRepair = (id, data) => axiosClient.post(`${REPAIR_BASE}/${id}/complete-repair`, data);
export const closeRepair = (id, data) => axiosClient.post(`${REPAIR_BASE}/${id}/close`, data);
export const cancelRepair = (id, reason) => axiosClient.post(`${REPAIR_BASE}/${id}/cancel`, { reason });
export const getTechnicians = () => axiosClient.get(`${REPAIR_BASE}/technicians`);
export const generateShareToken = (id) => axiosClient.post(`${REPAIR_BASE}/${id}/share-token`);
export const getLinkedDocumentsCount = (id) => axiosClient.get(`${REPAIR_BASE}/${id}/linked-documents`);
