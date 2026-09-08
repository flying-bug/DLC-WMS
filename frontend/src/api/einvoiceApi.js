import axiosClient from './axiosClient';

const BASE_URL = '/einvoices';

/**
 * Lấy danh sách hóa đơn điện tử phân trang
 */
export const getEInvoices = (params) => {
  return axiosClient.get(BASE_URL, { params });
};

/**
 * Lấy chi tiết hóa đơn điện tử theo ID
 */
export const getEInvoiceById = (id) => {
  return axiosClient.get(`${BASE_URL}/${id}`);
};

/**
 * Lấy danh sách hóa đơn điện tử liên kết với đơn bán hàng (các đợt xuất)
 */
export const getEInvoicesBySalesOrderId = (soId) => {
  return axiosClient.get(`${BASE_URL}/by-so/${soId}`);
};

/**
 * Lấy hóa đơn điện tử liên kết với phiếu xuất kho
 */
export const getEInvoiceByExportId = (exportId) => {
  return axiosClient.get(`${BASE_URL}/by-export/${exportId}`);
};

/**
 * Phát hành hóa đơn điện tử từ đơn bán hàng
 */
export const issueEInvoice = (payload) => {
  return axiosClient.post(`${BASE_URL}/issue`, payload);
};

/**
 * Hủy hóa đơn điện tử
 */
export const cancelEInvoice = (id, payload) => {
  return axiosClient.post(`${BASE_URL}/${id}/cancel`, payload);
};

/**
 * Lấy nội dung HTML mẫu hóa đơn điện tử để hiển thị trực tiếp
 */
export const getEInvoicePreviewHtml = (uuid) => {
  return axiosClient.get(`${BASE_URL}/preview/${uuid}`, {
    responseType: 'text',
    headers: {
      'Accept': 'text/html'
    }
  });
};

