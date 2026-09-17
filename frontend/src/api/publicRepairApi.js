import axiosClient from './axiosClient';

const PUBLIC_REPAIR_BASE = '/public/repairs';

export const getPublicRepairQuotation = (token) => {
  return axiosClient.get(`${PUBLIC_REPAIR_BASE}/${token}`);
};

export const approvePublicQuotation = (token) => {
  return axiosClient.post(`${PUBLIC_REPAIR_BASE}/${token}/approve`);
};

export const declinePublicQuotation = (token, reason) => {
  return axiosClient.post(`${PUBLIC_REPAIR_BASE}/${token}/decline`, { reason });
};
