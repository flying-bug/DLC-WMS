import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as warehouseApi from '../../api/warehouseApi';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import Toast from '../../components/ui/Toast/Toast';
import { useToast } from '../../contexts/ToastContext';
import SuccessPrintModal from '../../components/ui/SuccessPrintModal/SuccessPrintModal';
import { printTransferSlip } from '../../utils/printTransferSlip';
import axiosClient from '../../api/axiosClient';
import styles from './CreateTransferSlipPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { findBestMatch } from '../../utils/fuzzyMatch';


const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = getTodayIsoDate;
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '32px',
    height: '32px',
    fontSize: '13px',
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#2563eb' : '#9ca3af'
    }
  }),
  valueContainer: (base) => ({
    ...base,
    height: '32px',
    padding: '0 8px'
  }),
  input: (base) => ({
    ...base,
    margin: '0',
    padding: '0'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '30px'
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '4px'
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '4px'
  }),
  menu: (base) => ({
    ...base,
    fontSize: '13px',
    zIndex: 9999
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '200px',
    overflowY: 'auto'
  }),
  option: (base) => ({
    ...base,
    padding: '6px 12px'
  })
};

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  variantId: '',
  quantity: 1,
  price: 0,
  serialNumbers: [],
  note: '',
});

function CreateTransferSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const voiceData = location.state?.voiceData || null;
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedSlip, setSavedSlip] = useState(null);

  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const [form, setForm] = useState(() => ({
    transferCode: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    transferDate: today(),
    note: '',
    deliverer: '',
    attachedDocument: '',
    referenceId: '',
    referenceType: '',
    referenceCode: '',
  }));

  const [items, setItems] = useState([emptyLine()]);
  const [sourceInventory, setSourceInventory] = useState(new Map());
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const handleSerialModalClose = (serials) => {
    if (Array.isArray(serials)) {
      handleItemChange(serialModalItemId, 'serialNumbers', serials);
      if (serials.length > 0 && items.find(i => i.localId === serialModalItemId)?.quantity < serials.length) {
        handleItemChange(serialModalItemId, 'quantity', serials.length);
      }
    }
    setSerialModalItemId(null);
  };

  useEffect(() => {
    if (!form.fromWarehouseId) {
      setSourceInventory(new Map());
      return;
    }
    const fetchSourceInventory = async () => {
      try {
        const res = await exportApi.getInventoryBalance({ warehouseId: form.fromWarehouseId });
        const list = pageContent(unwrap(res));
        const invMap = new Map();
        list.forEach(b => {
          if (b.variantId) {
            const totalQuantity = Number(b.totalQuantity ?? b.quantityOnHand ?? 0);
            const totalReserved = Number(b.totalReserved ?? b.quantityReserved ?? 0);
            const availableQuantity = Number(b.availableQuantity ?? (totalQuantity - totalReserved));
            invMap.set(String(b.variantId), Math.max(0, availableQuantity));
          }
        });
        setSourceInventory(invMap);
      } catch (err) {
        console.error('Error fetching source inventory:', err);
        setSourceInventory(new Map());
      }
    };
    fetchSourceInventory();
  }, [form.fromWarehouseId]);

  useEffect(() => {
    const loadLookups = async () => {
      transferApi.getNextCode()
        .then(res => {
          const code = unwrap(res);
          if (code) setForm(prev => ({ ...prev, transferCode: prev.transferCode || code }));
        })
        .catch(err => console.error('Failed to load next transferCode', err));

      const [warehouseRes, productRes] = await Promise.allSettled([
        transferApi.getWarehouses({ size: 100 }),
        transferApi.getProducts({ size: 100 }),
      ]);
      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        if (data.length >= 2) {
          setForm(prev => ({ ...prev, fromWarehouseId: data[0].id, toWarehouseId: data[1].id }));
        }
      }
      if (productRes.status === 'fulfilled') {
        const prodData = pageContent(unwrap(productRes.value));
        setProducts(prodData);
      }
    };
    loadLookups();
  }, []);

  // ── Voice Data auto-fill ──────────────────────────────────
  useEffect(() => {
    if (!voiceData) return;

    // Auto-select warehouses by keyword
    if (voiceData.fromWarehouseKeyword && warehouses.length > 0) {
      const matchFrom = findBestMatch(warehouses, voiceData.fromWarehouseKeyword, w => [w.name, w.code]);
      if (matchFrom) {
        setForm(prev => ({ ...prev, fromWarehouseId: matchFrom.id }));
      }
    }

    if (voiceData.toWarehouseKeyword && warehouses.length > 0) {
      const matchTo = findBestMatch(warehouses, voiceData.toWarehouseKeyword, w => [w.name, w.code]);
      if (matchTo) {
        setForm(prev => ({ ...prev, toWarehouseId: matchTo.id }));
      }
    }

    // Auto-fill note
    if (voiceData.note) {
      setForm(prev => ({ ...prev, note: prev.note ? `${prev.note} - ${voiceData.note}` : voiceData.note }));
    }

    // Auto-add product line by keyword
    if (voiceData.productKeyword && products.length > 0) {
      const matchProd = findBestMatch(products, voiceData.productKeyword, p => [p.productName, p.variantName, p.sku]);
      if (matchProd) {
        const qty = Number(voiceData.quantity) || 1;
        setItems([{
          ...emptyLine(),
          variantId: String(matchProd.id),
          quantity: qty,
        }]);
      }
    }
  }, [voiceData, warehouses, products]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const selectedSerialItem = useMemo(() => items.find(i => i.localId === serialModalItemId), [items, serialModalItemId]);
  const selectedSerialProduct = useMemo(() => {
    if (!selectedSerialItem?.variantId) return null;
    return productById.get(String(selectedSerialItem.variantId));
  }, [selectedSerialItem, productById]);

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

  const isLineValid = (item) => {
    const quantity = Number(item.quantity || 0);
    return item.variantId && quantity > 0;
  };

  const isFormValid = Boolean(
    form.fromWarehouseId &&
    form.toWarehouseId &&
    form.fromWarehouseId !== form.toWarehouseId &&
    form.transferDate &&
    items.length &&
    items.every(isLineValid)
  );

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (localId, field, value) => {
    setItems(prev => {
      if (field === 'variantId') {
        if (!value) {
          return prev.map(item => item.localId === localId ? { ...item, variantId: '', serialNumbers: [], price: 0 } : item);
        }
        const existingIndex = prev.findIndex(item => item.localId !== localId && String(item.variantId) === String(value));
        if (existingIndex >= 0) {
          const currentItem = prev.find(item => item.localId === localId);
          const addedQty = Number(currentItem?.quantity) || 1;
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Number(newItems[existingIndex].quantity || 0) + addedQty
          };
          showToast('info', 'Sản phẩm đã tồn tại trong danh sách, đã tự động tăng số lượng.');
          return newItems.filter(item => item.localId !== localId);
        }
        const product = productById.get(String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          [field]: value,
          price: product?.costPrice || 0
        } : item);
      }
      return prev.map(item => item.localId === localId ? { ...item, [field]: value } : item);
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine()]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : [{ ...emptyLine(), isNew: false }]);
  };

  const ensureScannedProduct = (scanResult) => {
    setProducts(prev => {
      if (prev.some(product => String(product.id) === String(scanResult.variantId))) {
        return prev;
      }
      return [
        ...prev,
        {
          id: scanResult.variantId,
          productCode: scanResult.productCode,
          productName: scanResult.productName,
          sku: scanResult.sku || scanResult.code,
          barcode: scanResult.barcode,
          variantName: scanResult.productName,
          unitName: scanResult.unitName || '',
          trackSerial: scanResult.trackSerial,
          costPrice: scanResult.costPrice || 0,
        },
      ];
    });
  };

  const addScannedItem = (scanResult) => {
    ensureScannedProduct(scanResult);
    setItems(prev => {
      if (scanResult.type === 'SERIAL') {
        if (prev.some(item => Number(item.serialNumberId) === Number(scanResult.serialNumberId))) {
          setError('Serial này đã được quét trong phiếu.');
          return prev;
        }
        const serialLine = {
          ...emptyLine(),
          variantId: scanResult.variantId,
          serialNumberId: scanResult.serialNumberId,
          serialNumbers: scanResult.serialNumber ? [scanResult.serialNumber] : [scanResult.code],
          scannedCode: scanResult.serialNumber || scanResult.code,
          quantity: 1,
          price: scanResult.costPrice || 0,
          note: '',
        };
        const basePrev = prev.filter(item => Boolean(item.variantId));
        return [...basePrev, serialLine];
      }

      const existingIndex = prev.findIndex(item => String(item.variantId) === String(scanResult.variantId) && !item.serialNumberId);
      if (existingIndex >= 0) {
        return prev.map((item, index) => index === existingIndex
          ? { ...item, quantity: Number(item.quantity || 0) + 1, scannedCode: scanResult.barcode || scanResult.code }
          : item);
      }

      const barcodeLine = {
        ...emptyLine(),
        variantId: scanResult.variantId,
        scannedCode: scanResult.barcode || scanResult.code,
        quantity: 1,
        price: scanResult.costPrice || 0,
      };
      const basePrev = prev.filter(item => Boolean(item.variantId));
      return [...basePrev, barcodeLine];
    });
  };

  const handleScanSubmit = async (event) => {
    event.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    if (!form.fromWarehouseId) {
      setError('Vui lòng chọn kho xuất trước khi quét mã.');
      return;
    }

    setScanLoading(true);
    setError('');
    try {
      const response = await exportApi.resolveScan({
        code,
        warehouseId: Number(form.fromWarehouseId),
      });
      addScannedItem(unwrap(response));
      setScanCode('');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không tìm thấy mã vừa quét trong kho xuất');
    } finally {
      setScanLoading(false);
    }
  };

  const buildPayload = () => {
    return {
      transferCode: form.transferCode || undefined,
      fromWarehouseId: Number(form.fromWarehouseId),
      toWarehouseId: Number(form.toWarehouseId),
      transferDate: form.transferDate,
      note: form.note,
      deliverer: form.deliverer,
      attachedDocument: form.attachedDocument,
      referenceId: form.referenceId ? Number(form.referenceId) : undefined,
      referenceType: form.referenceType,
      referenceCode: form.referenceCode,
      lines: items.filter(isLineValid).map(item => ({
        variantId: Number(item.variantId),
        quantity: Number(item.quantity),
        unitCost: Number(item.price || 0),
        serialNumbers: item.serialNumbers || [],
        note: item.note || ''
      })),
    };
  };

  const submit = async (status) => {
    if (!isFormValid) {
      if (form.fromWarehouseId === form.toWarehouseId) {
        showToast('error', 'Kho xuất và kho nhập phải khác nhau.');
      } else {
        showToast('error', 'Vui lòng điền đầy đủ thông tin kho, ngày chuyển và ít nhất một mặt hàng.');
      }
      return;
    }

    // Check trackSerial matches
    const payload = buildPayload();
    for (const line of payload.lines) {
      const product = productById.get(String(line.variantId));
      if (product?.trackSerial && line.serialNumbers.length !== line.quantity) {
        showToast('error', `Mặt hàng ${product.sku || product.productName} có theo dõi Serial. Số lượng quét (${line.serialNumbers.length}) chưa khớp với số lượng chuyển (${line.quantity}).`);
        return;
      }
    }

    setSaving(true);
    try {
      payload.status = status;
      const response = await transferApi.createTransferSlip(payload);
      const created = unwrap(response);
      const fullSlipData = {
        ...created,
        transferCode: created?.transferCode || form.transferCode,
        transferDate: form.transferDate,
        status: status,
        lines: items.filter(isLineValid).map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitCost: Number(item.price),
          variantName: productById.get(String(item.variantId))?.variantName || productById.get(String(item.variantId))?.name,
          sku: productById.get(String(item.variantId))?.sku,
          unitName: productById.get(String(item.variantId))?.unitName,
        })),
        fromWarehouseId: form.fromWarehouseId,
        toWarehouseId: form.toWarehouseId,
        deliverer: form.deliverer,
        note: form.note,
        referenceCode: form.referenceCode,
      };

      setSavedSlip(fullSlipData);
      setShowSuccessModal(true);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu chuyển kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.scrollableContent}>
          <div className={styles.pageHeader}>
            <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/transfer-history'); }}>
              <i className="bi bi-arrow-left"></i> Tạo phiếu chuyển kho {form.transferCode ? form.transferCode : ''}
            </a>
          </div>

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>

              <div className="misa-form-row">
                <div className="misa-form-group">
                  <label className="misa-label">Từ kho (Xuất) <span className="required">*</span></label>
                  <SearchableSelect className="misa-select" value={form.fromWarehouseId} onChange={(e) => handleFormChange('fromWarehouseId', e.target.value)}>
                    <option value="">Chọn kho xuất</option>
                    {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                  </SearchableSelect>
                </div>
                <div className="misa-form-group">
                  <label className="misa-label">Đến kho (Nhập) <span className="required">*</span></label>
                  <SearchableSelect className="misa-select" value={form.toWarehouseId} onChange={(e) => handleFormChange('toWarehouseId', e.target.value)}>
                    <option value="">Chọn kho nhập</option>
                    {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                  </SearchableSelect>
                </div>
              </div>

              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group">
                  <label className="misa-label">Người chuyển hàng</label>
                  <input type="text" className="misa-input" value={form.deliverer || ''} onChange={(e) => handleFormChange('deliverer', e.target.value)} placeholder="Nhập tên người chuyển hàng..." />
                </div>
              </div>

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Lý do chuyển</label>
                <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Ngày chuyển <span className="required">*</span></label>
                <input type="date" className="misa-input" value={form.transferDate} onChange={(e) => handleFormChange('transferDate', e.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Số phiếu</label>
                <input type="text" className="misa-input" placeholder="Tự động tạo nếu để trống" value={form.transferCode} onChange={(e) => handleFormChange('transferCode', e.target.value)} />
              </div>

              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="misa-label" style={{ marginBottom: 0 }}>Kèm theo chứng từ</label>
                    {!form.referenceId && (
                      <button
                        type="button"
                        style={{ padding: 0, fontSize: '13px', background: 'none', border: 'none', color: '#0070cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setShowReferenceModal(true)}
                      >
                        <i className="bi bi-link-45deg" style={{ fontSize: '16px' }}></i> Tham chiếu
                      </button>
                    )}
                  </div>
                  {form.referenceId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <span style={{ color: 'var(--color-primary)', fontWeight: '500', cursor: 'pointer' }} onClick={() => setShowReferenceModal(true)}>
                        <i className="bi bi-file-earmark-text"></i> {form.referenceCode}
                      </span>
                      <i
                        className="bi bi-x-circle-fill"
                        style={{ color: '#dc3545', cursor: 'pointer', fontSize: '14px' }}
                        onClick={() => setForm(prev => ({ ...prev, referenceType: '', referenceId: '', referenceCode: '' }))}
                        title="Xóa tham chiếu"
                      ></i>
                    </div>
                  ) : (
                    <input type="text" className="misa-input" style={{ marginTop: '8px' }} value={form.attachedDocument || ''} onChange={(e) => handleFormChange('attachedDocument', e.target.value)} placeholder="Nhập số/tên chứng từ đính kèm..." />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', backgroundColor: '#fdfdfd', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text)', marginBottom: '4px' }}>Scan Product / Serial</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Quét serial cho hàng có serial, hoặc barcode/SKU cho hàng thường.</div>
              <form style={{ display: 'flex', gap: '8px' }} onSubmit={handleScanSubmit}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <i className="bi bi-upc-scan" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted-2)' }}></i>
                  <input
                    className="misa-input"
                    style={{ paddingLeft: '32px', height: '34px' }}
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Đặt con trỏ vào đây rồi quét mã"
                    disabled={scanLoading}
                  />
                </div>
                <button type="submit" disabled={scanLoading} style={{ display: 'none' }}>
                  {scanLoading ? 'Đang quét...' : 'Thêm mã'}
                </button>
              </form>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Mã hàng</th>
                    <th>Tên hàng</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Tồn khả dụng</th>
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                    <th style={{ textAlign: 'center' }}>Serial</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                    <th>Ghi chú</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const product = productById.get(String(item.variantId));
                    const stock = sourceInventory.get(String(item.variantId)) ?? 0;
                    return (
                      <tr key={item.localId}>
                        <td>{index + 1}</td>
                        <td>
                          <ProductGridSelect
                            products={products}
                            inventoryMap={sourceInventory}
                            value={item.variantId}
                            onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                            displayMode="code"
                            placeholder="Chọn mã"
                          />
                        </td>
                        <td>
                          <ProductGridSelect
                            products={products}
                            inventoryMap={sourceInventory}
                            value={item.variantId}
                            onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                            displayMode="name"
                            placeholder="Chọn hàng"
                          />
                        </td>
                        <td>{product?.unitName || ''}</td>
                        <td align="right" style={{ fontWeight: '500', color: stock <= 0 ? '#ef4444' : '#475569' }}>
                          {stock.toLocaleString('vi-VN')}
                        </td>
                        <td align="right">
                          <input type="number" min="1" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '80px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
                        </td>
                        <td align="center">
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {product?.trackSerial && (
                              <button
                                type="button"
                                className={(item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? styles.serialBadgeSuccess : styles.serialBadgeWarning}
                                onClick={() => setSerialModalItemId(item.localId)}
                              >
                                <i className="bi bi-upc-scan"></i> {(item.serialNumbers?.length || 0)} / {Number(item.quantity || 0)}
                              </button>
                            )}
                          </div>
                        </td>
                        <td align="right">
                          <input type="text" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '100px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} />
                        </td>
                        <td align="right" style={{ fontWeight: 'bold', color: '#0070cc' }}>
                          {new Intl.NumberFormat('vi-VN').format(Number(item.quantity || 0) * Number(item.price || 0))} đ
                        </td>
                        <td>
                          <input type="text" className="misa-input" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={item.note} onChange={(e) => handleItemChange(item.localId, 'note', e.target.value)} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className={styles.iconBtnDanger} onClick={() => removeItem(item.localId)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className={styles.tableFooter} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span>Tổng cộng hàng chuyển:</span>
                  <span className={styles.textBlue} style={{ marginLeft: '8px' }}>{totalQuantity.toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span style={{ marginRight: '8px' }}>Tổng tiền:</span>
                  <span style={{ fontWeight: 'bold', color: '#0070cc' }}>{new Intl.NumberFormat('vi-VN').format(totalPrice)} đ</span>
                </div>
              </div>
              <div className={styles.tableActions} style={{ display: 'flex', gap: '8px', padding: '16px' }}>
                <button type="button" onClick={addItem} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Thêm dòng</button>
                <button type="button" onClick={() => setItems([emptyLine()])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Xóa hết dòng</button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/transfer-history')}>
              <i className="bi bi-x-circle"></i> Hủy bỏ
            </button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={!isFormValid || saving} onClick={() => submit('DRAFT')} style={{ marginRight: '8px' }}>
              <i className="bi bi-save"></i> Lưu tạm
            </button>
            <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => submit('POSTED')}>
              <i className="bi bi-check-circle-fill"></i> Lưu và ghi sổ
            </button>
          </div>
        </div>
      </div>
      {serialModalItemId && selectedSerialProduct && (
        <ManageSerialModal
          isOpen={true}
          onClose={handleSerialModalClose}
          productName={variantLabel(selectedSerialProduct)}
          targetQuantity={Number(selectedSerialItem?.quantity || 0)}
          initialSerials={selectedSerialItem?.serialNumbers || []}
          mode="export"
          warehouseId={form.fromWarehouseId}
          variantId={selectedSerialProduct.id}
        />
      )}
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={async (doc) => {
          setForm(prev => ({ ...prev, referenceType: doc.referenceType, referenceId: doc.referenceId, referenceCode: doc.docCode }));
          try {
            let res;
            if (doc.referenceType === 'IMPORT_SLIP') res = await axiosClient.get(`/imports/${doc.referenceId}`);
            else if (doc.referenceType === 'EXPORT_SLIP') res = await axiosClient.get(`/exports/${doc.referenceId}`);
            else if (doc.referenceType === 'STOCK_TRANSFER') res = await transferApi.getTransferDetail(doc.referenceId);
            else if (doc.referenceType === 'STOCKTAKE') res = await axiosClient.get(`/stocktakes/${doc.referenceId}`);

            const detail = res?.data?.data || res?.data;
            if (detail && detail.lines && detail.lines.length > 0) {
              const newItems = detail.lines.map(line => ({
                ...emptyLine(),
                variantId: String(line.variantId || line.id),
                quantity: line.quantity || line.quantityIn || line.quantityOut || line.actualQuantity || 1,
                price: line.unitCost || line.unitPrice || line.price || 0,
                isNew: false
              }));
              setItems(newItems);
              showToast('success', 'Đã tải dữ liệu từ chứng từ tham chiếu.');
            }
          } catch (err) {
            console.error('Error fetching reference document details', err);
            showToast('error', 'Không thể lấy chi tiết chứng từ tham chiếu.');
          }
        }}
      />
      <SuccessPrintModal
        isOpen={showSuccessModal}
        title={savedSlip?.status === 'POSTED' ? 'Lưu & ghi sổ phiếu chuyển kho thành công!' : 'Lưu tạm phiếu chuyển kho thành công!'}
        message="Phiếu chuyển kho đã được ghi nhận vào hệ thống thành công. Bạn có thể in phiếu ngay bây giờ."
        docCode={savedSlip?.transferCode || form.transferCode}
        printBtnText="In phiếu chuyển kho"
        onPrint={() => {
          printTransferSlip(savedSlip || {}, {
            warehouseById: new Map(warehouses.map(w => [String(w.id), w])),
            productById,
          });
        }}
        onViewList={() => navigate('/transfer-history')}
        onCreateNew={() => window.location.reload()}
        onClose={() => navigate('/transfer-history')}
      />
    </AdminLayout>
  );
}

export default CreateTransferSlipPage;
