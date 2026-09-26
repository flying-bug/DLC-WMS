// Tùy chọn bộ lọc dùng chung cho danh sách phiếu nhập/xuất/kiểm kê/thu chi (trang danh sách và các bàn làm việc).

export const IMPORT_PURPOSE_OPTIONS = [
  { value: 'PURCHASE', label: 'Nhập mua hàng' },
  { value: 'STOCKTAKE_ADD', label: 'Nhập điều chỉnh kiểm kê' },
  { value: 'PRODUCTION', label: 'Lắp ráp / tháo dỡ' },
  { value: 'RETURN', label: 'Hàng bán bị trả lại' },
  { value: 'SCRAP', label: 'Nhập phế liệu (Sửa chữa)' },
  { value: 'OTHER', label: 'Khác' },
];

export const EXPORT_PURPOSE_OPTIONS = [
  { value: 'SALES', label: 'Bán hàng' },
  { value: 'USAGE', label: 'Sử dụng nội bộ' },
  { value: 'ASSEMBLY', label: 'Xuất lắp ráp / tháo dỡ' },
  { value: 'REPAIR', label: 'Xuất sửa chữa' },
  { value: 'OTHER', label: 'Khác' },
];

export const DOCUMENT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Lưu tạm' },
  { value: 'POSTED', label: 'Ghi sổ' },
];

export const STOCKTAKE_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Lưu tạm' },
  { value: 'POSTED', label: 'Đã xử lý' },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Chờ ghi sổ' },
  { value: 'POSTED', label: 'Đã ghi sổ quỹ' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
];
