// Bán hàng trực tiếp tại quầy chỉ xuất từ MỘT kho (kho bán): khách nhận hàng ngay nên hàng phải có sẵn ở
// kho đó. Hàng ở kho khác đi qua đơn báo giá/đơn hàng, nơi mỗi kho được tách một phiếu xuất riêng.

export const isActiveWarehouse = (w) => !w.status || w.status === 'APPROVED';

// Kho được phân công (nếu chỉ có đúng 1) → kho chọn lần trước → kho đầu tiên
export const resolveDefaultDirectWarehouse = (warehouseList, myWarehouseList, savedWarehouseId) => {
  const findIn = (whId) => warehouseList.find(w => String(w.id) === String(whId));
  if (myWarehouseList.length === 1 && findIn(myWarehouseList[0].id)) return findIn(myWarehouseList[0].id).id;
  if (savedWarehouseId && findIn(savedWarehouseId)) return findIn(savedWarehouseId).id;
  return warehouseList[0]?.id ?? null;
};

// Đưa mọi dòng về kho bán: dồn các dòng cùng sản phẩm, và bỏ serial của dòng vốn thuộc kho khác
export const moveLinesToWarehouse = (lines, warehouseId) => {
  const merged = [];
  lines.forEach(line => {
    const sameWarehouse = !line.warehouseId || String(line.warehouseId) === String(warehouseId);
    const moved = { ...line, warehouseId, serialNumbers: sameWarehouse ? (line.serialNumbers || []) : [] };
    const existing = moved.variantId ? merged.find(l => String(l.variantId) === String(moved.variantId)) : null;
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + Number(moved.quantity || 0);
      existing.serialNumbers = Array.from(new Set([...existing.serialNumbers, ...moved.serialNumbers]));
    } else {
      merged.push(moved);
    }
  });
  return merged;
};

// Dòng mà kho bán không đủ hàng nhưng kho khác còn. inventoryMap có khóa `${variantId}_${warehouseId}`.
export const findDirectShortages = ({ lines, warehouseId, warehouses, inventoryMap, variants }) => {
  if (!warehouseId) return [];
  return lines.flatMap((line, idx) => {
    if (!line.variantId) return [];
    const need = Number(line.quantity || 0);
    const have = inventoryMap.get(`${line.variantId}_${warehouseId}`) || 0;
    if (have >= need) return [];
    const others = warehouses
      .filter(w => String(w.id) !== String(warehouseId))
      .map(w => ({ id: w.id, code: w.code, qty: inventoryMap.get(`${line.variantId}_${w.id}`) || 0 }))
      .filter(o => o.qty > 0);
    if (others.length === 0) return [];
    const prod = variants.find(v => String(v.id) === String(line.variantId));
    return [{ idx, name: prod?.productName || prod?.variantName || `Sản phẩm #${line.variantId}`, have, need, others }];
  });
};
