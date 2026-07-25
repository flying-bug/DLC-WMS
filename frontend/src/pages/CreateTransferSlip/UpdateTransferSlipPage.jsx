import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as warehouseApi from '../../api/warehouseApi';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Select from 'react-select';
import styles from './CreateTransferSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');
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

function UpdateTransferSlipPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const [form, setForm] = useState({
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
  });
  
  const [items, setItems] = useState([emptyLine()]);
  const [sourceInventory, setSourceInventory] = useState(new Map());
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const handleSerialModalClose = (serials) => {
    if (serials) {
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
        const res = await warehouseApi.getWarehouseInventory(form.fromWarehouseId);
        const invList = res?.data?.data || [];
        const invMap = new Map();
        invList.forEach(item => {
          if (item.variantId) {
            invMap.set(String(item.variantId), item.availableQuantity);
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
    const loadLookupsAndData = async () => {
      const [warehouseRes, productRes, detailRes] = await Promise.allSettled([
        transferApi.getWarehouses({ size: 100 }),
        transferApi.getProducts({ size: 100 }),
        transferApi.getTransferDetail(id),
      ]);
      if (warehouseRes.status === 'fulfilled') {
        setWarehouses(pageContent(unwrap(warehouseRes.value)));
      }
      if (productRes.status === 'fulfilled') {
        setProducts(pageContent(unwrap(productRes.value)));
      }
      if (detailRes.status === 'fulfilled') {
        const detail = unwrap(detailRes.value);
        setForm({
          transferCode: detail.transferCode || '',
          fromWarehouseId: detail.fromWarehouseId || '',
          toWarehouseId: detail.toWarehouseId || '',
          transferDate: detail.transferDate ? detail.transferDate.substring(0, 10) : today(),
          note: detail.note || '',
        });
        if (detail.lines && detail.lines.length > 0) {
          const loadedItems = detail.lines.map(line => ({
             localId: crypto.randomUUID(),
             variantId: line.variantId || '',
             quantity: line.quantity || 1,
             price: line.unitCost || 0,
             serialNumbers: line.serialNumbers || [],
             note: line.note || '',
          }));
          setItems(loadedItems.length ? loadedItems : [emptyLine()]);
        }
      }
    };
    loadLookupsAndData();
  }, [id]);

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
    setItems(prev => prev.map(item => {
      if (item.localId !== localId) return item;
      
      if (field === 'variantId') {
         const product = productById.get(String(value));
         return { ...item, [field]: value, price: product?.costPrice || 0 };
      }

      return { ...item, [field]: value };
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { ...emptyLine(), variantId: products[0]?.id || '' }]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : prev);
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
        if (prev.some(item => item.scannedCode === (scanResult.serialNumber || scanResult.code))) {
          setError('Serial này đã được quét trong phiếu.');
          return prev;
        }
        const serialLine = {
          ...emptyLine(),
          variantId: scanResult.variantId,
          serialNumberId: scanResult.serialNumberId || true,
          scannedCode: scanResult.serialNumber || scanResult.code,
          quantity: 1,
          price: scanResult.costPrice || 0,
          note: scanResult.serialNumber ? `Serial: ${scanResult.serialNumber}` : '',
        };
        if (prev.length === 1 && !prev[0].variantId) {
          return [serialLine];
        }
        return [...prev, serialLine];
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
      if (prev.length === 1 && !prev[0].variantId) {
        return [barcodeLine];
      }
      return [...prev, barcodeLine];
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
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không tìm thấy mã vừa quét trong kho xuất');
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
         setError('Kho xuất và kho nhập phải khác nhau.');
      } else {
         setError('Vui lòng điền đầy đủ thông tin kho, ngày chuyển và ít nhất một mặt hàng.');
      }
      return;
    }
    
    // Check trackSerial matches
    const payload = buildPayload();
    for (const line of payload.lines) {
      const product = productById.get(String(line.variantId));
      if (product?.trackSerial && line.serialNumbers.length !== line.quantity) {
        setError(`Mặt hàng ${product.sku || product.productName} có theo dõi Serial. Số lượng quét (${line.serialNumbers.length}) chưa khớp với số lượng chuyển (${line.quantity}).`);
        return;
      }
    }
    
    setSaving(true);
    setError('');
    try {
      payload.status = status;
      await transferApi.updateTransferSlip(id, payload);
      navigate('/transfer-history');
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu chuyển kho');
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
              <i className="bi bi-arrow-left"></i> Cập nhật phiếu chuyển kho {form.transferCode ? form.transferCode : ''}
            </a>
          </div>

          {error && <div className={styles.card} style={{ color: '#b91c1c', marginBottom: '20px' }}>{error}</div>}

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>

              <div className="misa-form-row">
                <div className="misa-form-group">
                  <label className="misa-label">Từ kho (Xuất) <span className="required">*</span></label>
                  <select className="misa-select" value={form.fromWarehouseId} onChange={(e) => handleFormChange('fromWarehouseId', e.target.value)}>
                    <option value="">Chọn kho xuất</option>
                    {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                  </select>
                </div>
                <div className="misa-form-group">
                  <label className="misa-label">Đến kho (Nhập) <span className="required">*</span></label>
                  <select className="misa-select" value={form.toWarehouseId} onChange={(e) => handleFormChange('toWarehouseId', e.target.value)}>
                    <option value="">Chọn kho nhập</option>
                    {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                  </select>
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
                          {product?.sku || product?.productCode || ''}
                        </td>
                        <td>
                          <Select
                            options={products.map(p => ({ value: p.id, label: `${p.productName} - ${p.sku || p.productCode}`, nameOnly: p.productName }))}
                            value={product ? { value: product.id, label: `${product.productName} - ${product.sku || product.productCode}`, nameOnly: product.productName } : null}
                            onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.value : '')}
                            placeholder="Chọn hàng"
                            isClearable
                            formatOptionLabel={(option, { context }) => context === 'value' ? option.nameOnly : option.label}
                            styles={customSelectStyles}
                            menuPortalTarget={document.body}
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
                        <td>
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
            <button className="btn-misa-cancel" onClick={() => navigate('/transfer-history')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={!isFormValid || saving} onClick={() => submit('DRAFT')} style={{ marginRight: '8px' }}>
              Lưu tạm
            </button>
            <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => submit('POSTED')}>
              <i className="bi bi-printer"></i> Lưu và ghi sổ
            </button>
          </div>
        </div>
      </div>
      <ManageSerialModal
        isOpen={Boolean(serialModalItemId)}
        onClose={handleSerialModalClose}
        productName={variantLabel(selectedSerialProduct)}
        targetQuantity={Number(selectedSerialItem?.quantity || 0)}
        initialSerials={selectedSerialItem?.serialNumbers || []}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(doc) => {
          setForm(prev => ({ ...prev, referenceType: doc.type, referenceId: doc.id, referenceCode: doc.code }));
        }}
      />
    </AdminLayout>
  );
}

export default UpdateTransferSlipPage;
