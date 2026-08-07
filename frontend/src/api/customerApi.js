import axiosClient from './axiosClient';
import { getVietnamTimestamp } from '../utils/dateFormat';

const CUSTOMER_BASE = '/customers';

/**
 * Tìm kiếm khách hàng.
 * @param {string} keyword   - Từ khóa SĐT / Tên
 * @param {string} status    - APPROVED | INACTIVE
 * @param {string} groupType - RETAIL | WHOLESALE | DISTRIBUTOR
 * @param {number} page      - Trang hiện tại
 * @param {number} size      - Số bản ghi mỗi trang
 */
export const searchCustomers = (keyword = '', status = '', groupType = '', page = 0, size = 10) => {
    return axiosClient.get(CUSTOMER_BASE, { 
        params: { 
            keyword: keyword || undefined,
            status: status || undefined,
            groupType: groupType || undefined,
            page, 
            size 
        } 
    });
};

// Tải file Excel mẫu
export const downloadCustomerTemplate = async () => {
    try {
        const response = await axiosClient.get('/customers/import/template', {
            responseType: 'blob', // Important for file download
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'DLC_WMS_Template_Khach_Hang.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download template failed:', error);
        throw error;
    }
};

// Preview file Excel
export const previewImportExcel = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post('/customers/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Xác nhận Import
export const confirmImportExcel = async (payload) => {
    const response = await axiosClient.post('/customers/import/confirm', payload);
    return response.data;
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
    return axiosClient.patch(`${CUSTOMER_BASE}/${id}/status`);
};

/**
 * Kích hoạt lại khách hàng đã vô hiệu hóa (Re-activate → status: APPROVED).
 * @param {number} id
 */
export const activateCustomer = (id) => {
    return axiosClient.patch(`${CUSTOMER_BASE}/${id}/activate`);
};

// Xuất Excel danh sách khách hàng
export const exportCustomersToExcel = async (filters = {}, ids = []) => {
    try {
        const params = new URLSearchParams();
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.status) params.append('status', filters.status);
        if (filters.groupType) params.append('groupType', filters.groupType);
        if (ids && ids.length > 0) {
            ids.forEach(id => params.append('ids', id));
        }

        const response = await axiosClient.get('/customers/export', {
            params: params,
            responseType: 'blob', // Important for file download
        });
        
        // Create download link with dynamic name
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = getVietnamTimestamp();
        const fileName = `DLC_WMS_Danh_Sach_Khach_Hang_${timestamp}.xlsx`;
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
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
