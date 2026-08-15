import axiosClient from './axiosClient';

const BASE = '/payments';

export const createReceipt = (data) =>
  axiosClient.post(`${BASE}/receipts`, data);

export const createVoucher = (data) =>
  axiosClient.post(`${BASE}/vouchers`, data);

export const postPayment = (id) =>
  axiosClient.post(`${BASE}/${id}/post`);

export const updatePayment = (id, data) =>
  axiosClient.put(`${BASE}/${id}`, data);

export const deletePayment = (id) =>
  axiosClient.delete(`${BASE}/${id}`);

export const getPartnerDebtBalance = (partnerId) =>
  axiosClient.get(`${BASE}/balance/${partnerId}`);

export const getPartnerPaymentHistory = (partnerId) =>
  axiosClient.get(`${BASE}/history/${partnerId}`);

export const getPartnerLedgerDetails = (partnerId) =>
  axiosClient.get(`${BASE}/ledger/${partnerId}`);
