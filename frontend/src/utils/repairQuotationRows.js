// Linh kiện thêm / thay thế được tính tiền; linh kiện tháo ra (REMOVE) chỉ thu hồi nên không có trên báo giá.
const CHARGED_ACTIONS = { ADD: 'Lắp thêm', REPLACE: 'Thay thế' };

/**
 * Các dòng của báo giá sửa chữa (linh kiện + dịch vụ) và tổng tiền, tính giống màn Lệnh sửa chữa:
 * dòng bảo hành miễn phí vẫn in ra nhưng thành tiền 0 và không cộng vào tổng.
 */
export function buildRepairQuotationRows(repair, resolveUnitName = () => '') {
  const rows = [];
  (repair?.lines || []).forEach((line) => {
    const kind = CHARGED_ACTIONS[line.actionType];
    if (!kind) return;
    rows.push({
      name: line.componentName || line.variantName || 'Linh kiện',
      code: line.componentSku || line.sku || '',
      kind,
      unit: resolveUnitName(line) || 'Cái',
      quantity: Number(line.quantity || 0),
      unitPrice: Number(line.unitPrice || 0),
      vatPercent: Number(line.vatPercent || 0),
      isFree: Boolean(line.isFreeWarranty),
      note: line.note || '',
    });
  });
  (repair?.fees || []).forEach((fee) => {
    rows.push({
      name: fee.feeName || 'Dịch vụ',
      code: '',
      kind: 'Dịch vụ',
      unit: fee.unitName || 'Lần',
      quantity: Number(fee.quantity || 1),
      unitPrice: Number(fee.feeAmount || 0),
      vatPercent: Number(fee.vatPercent || 0),
      isFree: Boolean(fee.isFreeWarranty),
      note: fee.note || '',
    });
  });

  let subTotal = 0;
  let vatTotal = 0;
  rows.forEach((row) => {
    row.amount = row.isFree ? 0 : row.quantity * row.unitPrice;
    subTotal += row.amount;
    vatTotal += row.amount * row.vatPercent / 100;
  });
  return { rows, subTotal, vatTotal, grandTotal: subTotal + vatTotal };
}
