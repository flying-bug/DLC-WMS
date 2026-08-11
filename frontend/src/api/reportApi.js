import axiosClient from './axiosClient';
import { getVietnamTimestamp } from '../utils/dateFormat';

const REPORT_BASE = '/reports';

/**
 * Lấy báo cáo tồn kho hiện tại (Inventory Balance)
 */
export const getInventoryBalanceReport = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/inventory-balance`, { params });
};

/**
 * Lấy báo cáo sổ kho (Stock Ledger)
 */
export const getStockLedgerReport = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/stock-ledger`, { params });
};

/**
 * Lấy báo cáo chuyển kho (Stock Transfer)
 */
export const getStockTransferReport = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/stock-transfers`, { params });
};

/**
 * Lấy báo cáo công nợ (Debt Report)
 */
export const getDebtReport = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/debt`, { params });
};

/**
 * Lấy báo cáo tổng hợp tồn kho (Inventory Summary / Nhập xuất tồn)
 */
export const getInventorySummaryReport = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/inventory-summary`, { params });
};

/**
 * Lấy các chỉ số dashboard tổng quan
 */
export const getDashboardMetrics = (params = {}) => {
    return axiosClient.get(`${REPORT_BASE}/dashboard`, { params });
};

/**
 * Xuất Excel báo cáo bất kỳ
 */
export const exportReportExcel = async (reportType, params = {}) => {
    try {
        const response = await axiosClient.get(`${REPORT_BASE}/export/${reportType}`, {
            params,
            responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = getVietnamTimestamp();
        
        link.setAttribute('download', `DLC_WMS_Bao_Cao_${reportType}_${timestamp}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export report failed:', error);
        throw error;
    }
};
