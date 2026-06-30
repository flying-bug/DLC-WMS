import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as transferApi from '../../api/stockTransferApi';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './CreateTransferSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  variantId: '',
  serialNumberId: null,
  scannedCode: '',
  quantity: 1,
  note: '',
});

function CreateTransferSlipPage() {
  const navigate = useNavigate();
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
  });
  
  const [items, setItems] = useState([emptyLine()]);

  useEffect(() => {
    const loadLookups = async () => {
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
        const data = pageContent(unwrap(productRes.value));
        setProducts(data);
        setItems(prev => prev.map((item, index) => index === 0 && !item.variantId ? { ...item, variantId: data[0]?.id || '' } : item));
      }
    };
    loadLookups();
  }, []);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  
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
          scannedCode: scanResult.serialNumber || scanResult.code,
          quantity: 1,
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
    const groupedItems = new Map();
    
    items.forEach(item => {
      if (!item.variantId || !item.quantity) return;
      
      const vId = String(item.variantId);
      if (!groupedItems.has(vId)) {
        groupedItems.set(vId, {
          variantId: Number(item.variantId),
          quantity: 0,
          note: item.note,
          serialNumbers: []
        });
      }
      
      const group = groupedItems.get(vId);
      group.quantity += Number(item.quantity);
      if (item.scannedCode && item.serialNumberId) {
        group.serialNumbers.push(item.scannedCode);
      }
    });

    return {
      transferCode: form.transferCode || undefined,
      fromWarehouseId: Number(form.fromWarehouseId),
      toWarehouseId: Number(form.toWarehouseId),
      transferDate: form.transferDate,
      note: form.note,
      lines: Array.from(groupedItems.values()),
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
      await transferApi.createTransferSlip(payload);
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
              <i className="bi bi-arrow-left"></i> Tạo phiếu chuyển kho
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
                <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.transferCode} onChange={(e) => handleFormChange('transferCode', e.target.value)} />
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
                <button type="submit" disabled={scanLoading} style={{ padding: '0 16px', height: '34px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
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
                    <th style={{ textAlign: 'right' }}>Số lượng</th>
                    <th>Ghi chú</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const product = productById.get(String(item.variantId));
                    return (
                      <tr key={item.localId}>
                        <td>{index + 1}</td>
                        <td>
                          <select className="misa-select" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={item.variantId} onChange={(e) => handleItemChange(item.localId, 'variantId', e.target.value)}>
                            <option value="">Chọn hàng</option>
                            {products.map(productItem => <option key={productItem.id} value={productItem.id}>{productItem.sku}</option>)}
                          </select>
                        </td>
                        <td>
                          {variantLabel(product)}
                          {item.serialNumberId && <div style={{ fontSize: '11px', color: '#155e75', backgroundColor: '#cffafe', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', border: '1px solid #a5f3fc' }}>{item.scannedCode}</div>}
                        </td>
                        <td>{product?.unitName || ''}</td>
                        <td align="right">
                          <input type="number" min="1" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '100px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
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
              <div className={styles.tableFooter}>
                <span>Tổng cộng hàng chuyển:</span>
                <span className={styles.textBlue}>{totalQuantity.toLocaleString('vi-VN')}</span>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}><i className="bi bi-plus-circle"></i> Thêm dòng mới</button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/transfer-history')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-save-draft" disabled={!isFormValid || saving} onClick={() => submit('DRAFT')} style={{ marginRight: '8px' }}>
              <i className="bi bi-file-earmark"></i> Lưu tạm
            </button>
            <button className="btn-misa-save" disabled={!isFormValid || saving} onClick={() => submit('POSTED')}>
              <i className="bi bi-save"></i> Lưu (Hoàn thành)
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CreateTransferSlipPage;
