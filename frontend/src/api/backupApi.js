import axiosClient from './axiosClient';

// ── System Health ─────────────────────────────────────────────────────────────
export const getSystemHealth = () =>
    axiosClient.get('/system/health').then(r => r.data);

// ── System Settings ──────────────────────────────────────────────────────────
export const getSystemSettings = () =>
    axiosClient.get('/system/settings').then(r => r.data);

export const saveSystemSettings = (data) =>
    axiosClient.post('/system/settings', data).then(r => r.data);

export const uploadServiceAccount = (file) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post('/system/service-account', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
};

export const testDriveConnection = () =>
    axiosClient.post('/system/test-drive').then(r => r.data);

// ── Backup Operations ─────────────────────────────────────────────────────────
export const createBackup = () =>
    axiosClient.post('/backup/create').then(r => r.data);

export const listBackups = () =>
    axiosClient.get('/backup/list').then(r => r.data);

export const deleteBackup = (id) =>
    axiosClient.delete(`/backup/${id}`).then(r => r.data);

export const uploadBackupToDrive = (id) =>
    axiosClient.post(`/backup/${id}/upload-drive`).then(r => r.data);

export const restoreBackup = (id) =>
    axiosClient.post(`/backup/${id}/restore`).then(r => r.data);

export const getDownloadUrl = (id) => {
    const baseUrl = axiosClient.defaults.baseURL;
    const token = sessionStorage.getItem('token');
    // Return URL + token for download anchor href
    return { url: `${baseUrl}/backup/${id}/download`, token };
};

// ── Backup Schedule ───────────────────────────────────────────────────────────
export const getBackupSchedule = () =>
    axiosClient.get('/backup/schedule').then(r => r.data);

export const saveBackupSchedule = (data) =>
    axiosClient.post('/backup/schedule', data).then(r => r.data);
