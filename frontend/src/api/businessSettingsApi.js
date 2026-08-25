import axiosClient from './axiosClient';

export const getBusinessSettings = () => {
    return axiosClient.get('/business-settings');
};

export const saveBusinessSettings = (data) => {
    return axiosClient.post('/business-settings', data);
};

export const getDefaultVat = () => {
    return axiosClient.get('/business-settings/vat');
};
