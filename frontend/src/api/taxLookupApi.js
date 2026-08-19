import axiosClient from './axiosClient';

/**
 * Tra cứu thông tin doanh nghiệp qua Mã số thuế
 */
export const lookupTaxCode = (taxCode) => {
  return axiosClient.get(`/tax-lookup/${encodeURIComponent(taxCode)}`);
};
