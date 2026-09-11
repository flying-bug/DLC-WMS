import React, { useEffect, useMemo, useState } from 'react';
import {
  buildVariantRows,
  countCombinations,
  generateSku,
  MAX_VARIANT_COMBINATIONS,
  normalizeAttributeText,
} from '../utils/variantCombinationUtils';

const emptyAttribute = () => ({ id: Date.now() + Math.random(), name: '', valuesText: '' });

const tableInput = {
  width: '100%',
  minWidth: 90,
  height: 30,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 12,
};

export default function ProductVariantConfigurator({
  value,
  onChange,
  productCode,
  productType,
  isEdit,
  defaults,
}) {
  const draft = value || { enabled: false, attributes: [emptyAttribute()], rows: [], excludedKeys: [] };
  const [pendingSnapshot, setPendingSnapshot] = useState(null);
  const isService = normalizeProductType(productType) === 'dich vu';
  const requiresSerial = normalizeProductType(productType) === 'thanh pham';

  const attributes = useMemo(() => draft.attributes.map((attribute) => ({
    ...attribute,
    name: attribute.name || '',
    values: parseValues(attribute.valuesText),
  })), [draft.attributes]);

  const combinationCount = useMemo(() => {
    const ready = attributes.filter((attribute) => attribute.name.trim() && attribute.values.length > 0);
    return ready.length ? countCombinations(ready) : 0;
  }, [attributes]);

  useEffect(() => {
    if (!draft.enabled || pendingSnapshot) return;
    regenerateRows(attributes, draft.excludedKeys || []);
  }, [productCode, JSON.stringify(defaults)]);

  const patch = (next) => onChange({ ...draft, ...next });

  const setEnabled = (enabled) => {
    if (enabled) {
      if (isEdit || isService) return;
      patch({ enabled: true, attributes: draft.attributes?.length ? draft.attributes : [emptyAttribute()] });
      return;
    }
    if (draft.rows?.length && !window.confirm('Danh sach SKU dang nhap se bi bo. Tiep tuc?')) return;
    patch({ enabled: false, attributes: [emptyAttribute()], rows: [], excludedKeys: [], error: '' });
  };

  const changeAttributes = (nextAttributes) => {
    if (draft.rows?.some((row) => row.isDirty)) {
      setPendingSnapshot({ attributes: draft.attributes, nextAttributes, rows: draft.rows });
      patch({ attributes: nextAttributes, error: 'Co thay doi chua luu tren bang SKU. Xac nhan de sinh lai bang.' });
      return;
    }
    regenerateRows(nextAttributes, draft.excludedKeys || [], draft.rows || [], { attributes: nextAttributes });
  };

  const confirmRegenerate = () => {
    if (!pendingSnapshot) return;
    regenerateRows(
      pendingSnapshot.nextAttributes,
      draft.excludedKeys || [],
      pendingSnapshot.rows,
      { attributes: pendingSnapshot.nextAttributes }
    );
    setPendingSnapshot(null);
  };

  const cancelRegenerate = () => {
    if (!pendingSnapshot) return;
    patch({ attributes: pendingSnapshot.attributes, rows: pendingSnapshot.rows, error: '' });
    setPendingSnapshot(null);
  };

  function regenerateRows(sourceAttributes, excludedKeys, previousRows = draft.rows || [], extra = {}) {
    try {
      if (!String(productCode || '').trim()) {
        patch({ ...extra, rows: [], error: 'Vui lòng nhập mã sản phẩm để sinh SKU phiên bản.' });
        return;
      }
      const ready = sourceAttributes
        .map((attribute) => ({ name: attribute.name, values: attribute.values || parseValues(attribute.valuesText) }))
        .filter((attribute) => attribute.name.trim() && attribute.values.length > 0);
      if (!ready.length) {
        patch({ ...extra, rows: [], error: '' });
        return;
      }
      const rows = buildVariantRows(ready, {
        productCode,
        defaults: normalizeDefaults(defaults, requiresSerial),
        previousRows,
        excludedKeys,
      });
      patch({ ...extra, rows, error: '' });
    } catch (error) {
      patch({ ...extra, rows: [], error: error.message });
    }
  };

  const updateAttribute = (id, changes) => {
    changeAttributes(draft.attributes.map((attribute) =>
      attribute.id === id ? { ...attribute, ...changes } : attribute
    ));
  };

  const addAttribute = () => {
    if ((draft.attributes || []).length >= 3) return;
    changeAttributes([...(draft.attributes || []), emptyAttribute()]);
  };

  const removeAttribute = (id) => {
    changeAttributes((draft.attributes || []).filter((attribute) => attribute.id !== id));
  };

  const updateRow = (index, changes) => {
    const rows = [...(draft.rows || [])];
    rows[index] = { ...rows[index], ...changes, isDirty: true };
    patch({ rows });
  };

  const resetSku = (index) => {
    const rows = [...(draft.rows || [])];
    const usedSkus = new Set(rows.map((row, rowIndex) => rowIndex === index ? null : row.sku).filter(Boolean));
    rows[index] = {
      ...rows[index],
      sku: generateSku(productCode, rows[index].specs, usedSkus),
      skuManuallyEdited: false,
      isDirty: true,
    };
    patch({ rows });
  };

  const deleteRow = (index) => {
    const row = draft.rows[index];
    const excludedKeys = [...(draft.excludedKeys || []), row.canonicalKey];
    patch({ excludedKeys, rows: draft.rows.filter((_, rowIndex) => rowIndex !== index) });
  };

  const restoreAllRows = () => {
    regenerateRows(attributes, [], draft.rows || [], { excludedKeys: [] });
  };

  const applyToAll = (field, valueToApply) => {
    if (draft.rows?.some((row) => row.isDirty) && !window.confirm('Ap dung cho tat ca se ghi de cac dong da sua. Tiep tuc?')) return;
    patch({
      rows: (draft.rows || []).map((row) => ({ ...row, [field]: valueToApply, isDirty: true })),
    });
  };

  const duplicateAttributeName = findDuplicate(attributes.map((attribute) => attribute.name));
  const duplicateValue = attributes.some((attribute) => findDuplicate(attribute.values));
  const visibleError = draft.error || duplicateAttributeName || duplicateValue
    ? draft.error || 'Thuoc tinh hoac gia tri dang bi trung.'
    : '';

  return (
    <div style={{ marginTop: 18, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          <input type="checkbox" checked={Boolean(draft.enabled)} disabled={isEdit || isService} onChange={(event) => setEnabled(event.target.checked)} />
          <span>Hàng hóa có nhiều phiên bản / quy cách</span>
        </label>
        {draft.enabled && (
          <span style={{ fontSize: 12, color: combinationCount > MAX_VARIANT_COMBINATIONS ? '#dc2626' : '#6b7280' }}>
            {combinationCount ? `${combinationCount} SKU` : 'Chưa có tổ hợp'}
          </span>
        )}
      </div>

      {draft.enabled && (
        <div style={{ padding: 12 }}>
          {visibleError && <div style={{ marginBottom: 10, color: '#b91c1c', fontSize: 12 }}>{visibleError}</div>}
          {pendingSnapshot && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button type="button" onClick={confirmRegenerate} style={smallButton('#2563eb', '#fff')}>Xác nhận</button>
              <button type="button" onClick={cancelRegenerate} style={smallButton('#fff', '#374151')}>Hủy</button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {(draft.attributes || []).map((attribute, index) => (
              <div key={attribute.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', gap: 8, alignItems: 'center' }}>
                <input
                  style={tableInput}
                  value={attribute.name}
                  maxLength={50}
                  onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                  placeholder={`Thuộc tính ${index + 1}`}
                />
                <input
                  style={tableInput}
                  value={attribute.valuesText}
                  onChange={(event) => updateAttribute(attribute.id, { valuesText: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.preventDefault();
                  }}
                  placeholder="Nhập giá trị, cách nhau bằng dấu phẩy"
                />
                <button type="button" title="Xóa thuộc tính" onClick={() => removeAttribute(attribute.id)} style={iconButton}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={addAttribute} disabled={(draft.attributes || []).length >= 3} style={smallButton('#fff', '#374151')}>+ Thuộc tính</button>
            <button type="button" onClick={() => regenerateRows(attributes, draft.excludedKeys || [])} style={smallButton('#2563eb', '#fff')}>Sinh danh sách SKU</button>
            {!!draft.excludedKeys?.length && (
              <button type="button" onClick={restoreAllRows} style={smallButton('#fff', '#374151')}>Khôi phục tất cả</button>
            )}
          </div>

          {!!draft.rows?.length && (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Áp dụng mặc định cho tất cả SKU:</span>
                <button type="button" onClick={() => applyToAll('salePrice', Number(defaults.salePrice || 0))} style={smallButton('#fff', '#374151')}>Giá bán</button>
                <button type="button" onClick={() => applyToAll('warrantyMonths', Number(defaults.warrantyMonths || 0))} style={smallButton('#fff', '#374151')}>Bảo hành</button>
              </div>

              <div style={{ marginTop: 10, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 720 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', color: '#374151' }}>
                      <th style={th}>Phiên bản</th>
                      <th style={th}>SKU</th>
                      <th style={th}>Giá bán</th>
                      <th style={th}>Bảo hành</th>
                      <th style={th}>Hoạt động</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.rows.map((row, index) => (
                      <tr key={row.canonicalKey} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <td style={td}>{row.variantName}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input style={tableInput} value={row.sku} maxLength={50} onChange={(event) => updateRow(index, { sku: event.target.value, skuManuallyEdited: true })} />
                            <button type="button" title="Khôi phục mã tự động" onClick={() => resetSku(index)} style={iconButton}>↻</button>
                          </div>
                        </td>
                        <td style={td}><input style={tableInput} type="number" min="0" value={row.salePrice} onChange={(event) => updateRow(index, { salePrice: Number(event.target.value || 0) })} /></td>
                        <td style={td}><input style={{ ...tableInput, minWidth: 56 }} type="number" min="0" max="120" value={row.warrantyMonths} onChange={(event) => updateRow(index, { warrantyMonths: Number(event.target.value || 0) })} /></td>
                        <td style={td}><input type="checkbox" checked={row.active !== false} onChange={(event) => updateRow(index, { active: event.target.checked })} /></td>
                        <td style={td}><button type="button" title="Xóa dòng" onClick={() => deleteRow(index)} style={iconButton}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function parseValues(text) {
  const seen = new Set();
  return String(text || '')
    .split(',')
    .map((value) => value.trim().replace(/\s+/g, ' '))
    .filter((value) => {
      const key = normalizeAttributeText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function findDuplicate(values) {
  const seen = new Set();
  return values.some((value) => {
    const key = normalizeAttributeText(value);
    if (!key) return false;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function normalizeDefaults(defaults = {}, requiresSerial) {
  return {
    ...defaults,
    trackingMode: requiresSerial ? 'SERIAL' : defaults.trackingMode || 'NONE',
    salePrice: Number(defaults.salePrice || 0),
    costPrice: Number(defaults.costPrice || 0),
    minStockQty: Number(defaults.minStockQty || 0),
    warrantyMonths: Number(defaults.warrantyMonths || 0),
  };
}

function normalizeProductType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLowerCase();
}

const th = {
  textAlign: 'left',
  padding: '7px 6px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const td = {
  padding: '6px',
  verticalAlign: 'middle',
};

const iconButton = {
  width: 30,
  height: 30,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
};

function smallButton(background, color) {
  return {
    height: 30,
    padding: '0 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    background,
    color,
    cursor: 'pointer',
    fontSize: 12,
  };
}

