import axiosClient from './axiosClient';

const BASE = '/payments';

export const createReceipt = (data) =>
  axiosClient.post(`${BASE}/receipts`, data);

export const createVoucher = (data) =>
  axiosClient.post(`${BASE}/vouchers`, data);

export const postPayment = (id) =>
  axiosClient.post(`${BASE}/${id}/post`);

export const getPartnerDebtBalance = (partnerId) =>
  axiosClient.get(`${BASE}/balance/${partnerId}`);

export const getPartnerPaymentHistory = (partnerId) =>
  axiosClient.get(`${BASE}/history/${partnerId}`);
