import axiosClient from './axiosClient';

const CUSTOMER_BASE = '/customers';

/**
 * Tìm kiếm khách hàng theo SĐT (Autocomplete, có phân trang).
 * @param {string} phone - Từ khóa SĐT (partial match, optional)
 * @param {number} page  - Trang hiện tại (default: 0)
 * @param {number} size  - Số bản ghi mỗi trang (default: 10)
 */
export const searchCustomers = (phone = '', page = 0, size = 10) => {
    return axiosClient.get(CUSTOMER_BASE, { params: { phone: phone || undefined, page, size } });
};

/**
 * Lấy chi tiết khách hàng theo ID.
 * @param {number} id
 */
export const getCustomerById = (id) => {
    return axiosClient.get(`${CUSTOMER_BASE}/${id}`);
};

/**
 * Tạo mới khách hàng (Quick Create hoặc form đầy đủ).
 * @param {object} data - { name, phone, email, address, groupType }
 */
export const createCustomer = (data) => {
    return axiosClient.post(CUSTOMER_BASE, data);
};

/**
 * Cập nhật thông tin khách hàng.
 * Ghi Audit Log phía Backend nếu SĐT thay đổi.
 * @param {number} id
 * @param {object} data
 */
export const updateCustomer = (id, data) => {
    return axiosClient.put(`${CUSTOMER_BASE}/${id}`, data);
};

/**
 * Vô hiệu hóa khách hàng (Soft Delete → status: INACTIVE).
 * @param {number} id
 */
export const deactivateCustomer = (id) => {
    return axiosClient.patch(`${CUSTOMER_BASE}/${id}/status`, { status: 'INACTIVE' });
};

/**
 * Lấy lịch sử mua hàng của khách hàng (3 Tab - Tab 1).
 * @param {number} id
 * @param {number} page
 * @param {number} size
 */
export const getCustomerSalesHistory = (id, page = 0, size = 10) => {
    return axiosClient.get(`${CUSTOMER_BASE}/${id}/sales-history`, { params: { page, size } });
};

/**
 * Lấy lịch sử bảo hành của khách hàng (3 Tab - Tab 2).
 * @param {number} id
 * @param {number} page
 * @param {number} size
 */
export const getCustomerWarranties = (id, page = 0, size = 10) => {
    return axiosClient.get(`${CUSTOMER_BASE}/${id}/warranties`, { params: { page, size } });
};

/**
 * Lấy lịch sử thu chi và Summary Tổng tiền đã thu (3 Tab - Tab 3).
 * @param {number} id
 * @param {number} page
 * @param {number} size
 */
export const getCustomerReceipts = (id, page = 0, size = 10) => {
    return axiosClient.get(`${CUSTOMER_BASE}/${id}/receipts`, { params: { page, size } });
};
