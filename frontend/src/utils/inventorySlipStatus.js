/**
 * Trạng thái phiếu nhập / xuất kho còn SỬA được - khớp InventoryDocumentService.EDITABLE_STATUSES ở backend.
 * Phiếu đã ghi sổ / đã hủy chỉ xem (màn /import-slips/:id, /export-slips/:id).
 */
export const EDITABLE_SLIP_STATUSES = ['DRAFT', 'SUBMITTED', 'UNPOSTED'];

export const isSlipEditable = (status) => EDITABLE_SLIP_STATUSES.includes(String(status || 'DRAFT').toUpperCase());
