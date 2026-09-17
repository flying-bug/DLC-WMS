import axiosClient from './axiosClient';

const BASE = (repairId) => `/repairs/${repairId}/photos`;

export const getRepairPhotos = (repairId) =>
    axiosClient.get(BASE(repairId));

export const getRepairPhotosByPhase = (repairId, phase) =>
    axiosClient.get(`${BASE(repairId)}/phase/${phase}`);

export const uploadRepairPhoto = (repairId, phase, file, category = null, caption = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (caption) formData.append('caption', caption);
    return axiosClient.post(`${BASE(repairId)}/phase/${phase}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const deleteRepairPhoto = (repairId, photoId) =>
    axiosClient.delete(`${BASE(repairId)}/${photoId}`);
