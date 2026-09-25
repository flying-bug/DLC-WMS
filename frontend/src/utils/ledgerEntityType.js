// Loại nghiệp vụ trên sổ công nợ đối tác (PartnerLedger.entityType do backend ghi)
const LEDGER_ENTITY_TYPE_LABELS = {
  INVENTORY_IMPORT: 'Nhập kho mua hàng',
  INVENTORY_EXPORT_SO: 'Xuất kho bán hàng',
  UNPOST_IMPORT: 'Bỏ ghi sổ nhập kho',
  UNPOST_EXPORT_SO: 'Bỏ ghi sổ xuất kho',
  PAYMENT_RECEIPT: 'Phiếu thu tiền',
  PAYMENT_VOUCHER: 'Phiếu chi tiền',
  UNPOST_RECEIPT: 'Bỏ ghi sổ phiếu thu',
  UNPOST_VOUCHER: 'Bỏ ghi sổ phiếu chi',
  // Mã cũ, vẫn còn trong dữ liệu ghi trước đây
  SALES_ORDER: 'Đơn bán hàng',
  PURCHASE_ORDER: 'Đơn mua hàng',
  SALES_INVOICE: 'Hóa đơn bán hàng',
  IMPORT_INVOICE: 'Hóa đơn mua hàng',
};

export const ledgerEntityTypeLabel = (type) => LEDGER_ENTITY_TYPE_LABELS[type] || type || '-';
