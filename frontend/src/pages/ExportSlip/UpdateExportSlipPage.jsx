import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import CustomerQuickCreateDrawer from '../Customer/components/CustomerQuickCreateDrawer';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import styles from './UpdateExportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
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
  serialNumberId: null,
  scannedCode: '',
  quantity: 1,
  price: 0,
  note: '',
});

function UpdateExportSlipPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    salespersonName: '',
    customerAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    docDate: today(),
    note: '',
  });
  const [items, setItems] = useState([emptyLine()]);
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  useEffect(() => {
    if (form.warehouseId) {
      exportApi.getInventoryBalance({ warehouseId: form.warehouseId })
        .then(res => setInventoryBalances(pageContent(unwrap(res))))
        .catch(err => console.error('Failed to load balances', err));
    }
  }, [form.warehouseId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailRes, warehouseRes, productRes, customerRes, userRes] = await Promise.allSettled([
          exportApi.getExportDetail(id),
          exportApi.getWarehouses({ size: 100 }),
          exportApi.getProducts({ size: 100 }),
          exportApi.getCustomers({ size: 1000 }),
          exportApi.getUsers({ size: 1000 }).catch(() => null),
        ]);

        let detail = null;
        if (detailRes.status === 'fulfilled') {
          detail = unwrap(detailRes.value);
        }

        if (warehouseRes.status === 'fulfilled') {
          setWarehouses(pageContent(unwrap(warehouseRes.value)));
        }
        if (productRes.status === 'fulfilled') {
          setProducts(pageContent(unwrap(productRes.value)));
        }
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (userRes.status === 'fulfilled' && userRes.value) {
          setUsers(pageContent(unwrap(userRes.value)));
        }

        if (detail) {
          setForm({
            docCode: detail.docCode || '',
            warehouseId: detail.warehouseId || '',
            partnerId: detail.partnerId || '',
            salespersonName: detail.salespersonName || '',
            customerAddress: detail.customerAddress || '',
            receiverName: detail.receiverName || '',
            receiverPhone: detail.receiverPhone || '',
            receiverAddress: detail.receiverAddress || '',
            docDate: detail.docDate || '',
            note: detail.note || '',
            status: detail.status || 'DRAFT',
          });
          setItems((detail.lines || []).map(line => ({
            localId: crypto.randomUUID(),
            variantId: line.variantId || '',
            quantity: line.quantityOut || 1,
            price: line.unitPrice || 0,
            note: line.note || '',
            serialNumberId: line.serialNumberId || null,
            scannedCode: line.serialNumber || line.productCode || '',
          })));
        }
      } catch (err) {
        setError(err.response?.data?.userMessage || 'Không tải được phiếu xuất kho');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const selectedCustomer = useMemo(() => customers.find(c => String(c.id) === String(form.partnerId)), [customers, form.partnerId]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const isFormValid = Boolean(form.warehouseId && form.partnerId && form.receiverAddress && form.docDate && items.length && items.every(item => item.variantId && Number(item.quantity) > 0 && Number(item.price) >= 0));

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      if (field === 'partnerId') {
        const cust = customers.find(c => String(c.id) === String(value));
        if (cust) {
          newForm.customerAddress = cust.address || '';
          newForm.receiverName = cust.name || '';
          newForm.receiverPhone = cust.phone || '';
          newForm.receiverAddress = cust.address || '';
        } else {
          newForm.customerAddress = '';
          newForm.receiverName = '';
          newForm.receiverPhone = '';
          newForm.receiverAddress = '';
        }
      }
      return newForm;
    });
  };

  const handleItemChange = (localId, field, value) => {
    setItems(prev => {
      if (field === 'variantId') {
        const existingIndex = prev.findIndex(item => item.localId !== localId && String(item.variantId) === String(value) && !item.serialNumberId);
        if (existingIndex >= 0) {
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Number(newItems[existingIndex].quantity || 0) + 1
          };
          return newItems.filter(item => item.localId !== localId);
        }
        const selectedProduct = products.find(p => String(p.id) === String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          variantId: value,
          price: selectedProduct ? Number(selectedProduct.salePrice || 0) : 0
        } : item);
      }
      return prev.map(item => item.localId === localId ? { ...item, [field]: value } : item);
    });
  };

  const handleSavePartner = async (formData) => {
    const res = await exportApi.createCustomer(formData);
    const newCustomer = res.data?.data || res.data;
    setCustomers(prev => [...prev, newCustomer]);
    setForm(prev => ({ ...prev, partnerId: newCustomer.id, customerAddress: newCustomer.address || '' }));
    setShowPartnerModal(false);
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine()]);
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
          salePrice: scanResult.salePrice || 0,
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
          price: scanResult.salePrice || 0,
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
        price: scanResult.salePrice || 0,
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
    if (!form.warehouseId) {
      setError('Vui lòng chọn kho xuất trước khi quét mã.');
      return;
    }

    setScanLoading(true);
    setError('');
    try {
      const response = await exportApi.resolveScan({
        code,
        warehouseId: Number(form.warehouseId),
      });
      addScannedItem(unwrap(response));
      setScanCode('');
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không tìm thấy mã vừa quét');
    } finally {
      setScanLoading(false);
    }
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : prev);
  };

  const buildPayload = (status) => ({
    docCode: form.docCode || undefined,
    warehouseId: Number(form.warehouseId),
    partnerId: form.partnerId ? Number(form.partnerId) : null,
    salespersonName: form.salespersonName,
    customerAddress: form.customerAddress,
    receiverName: form.receiverName || customers.find(s => String(s.id) === String(form.partnerId))?.name || '',
    receiverPhone: form.receiverPhone || selectedCustomer?.phone || '',
    receiverAddress: form.receiverAddress || form.customerAddress || customers.find(s => String(s.id) === String(form.partnerId))?.address || '',
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(localStorage.getItem('userId') || localStorage.getItem('id') || 1),
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: 0,
      quantityOut: Number(item.quantity),
      unitCost: 0,
      unitPrice: Number(item.price),
      serialNumberId: item.serialNumberId || null,
      note: item.note,
    })),
  });

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      if (!form.warehouseId) return showToast('error', 'Vui lòng chọn kho xuất.');
      if (!form.partnerId) return showToast('error', 'Vui lòng chọn khách hàng.');
      if (!form.receiverAddress) return showToast('error', 'Vui lòng nhập địa chỉ nhận hàng.');
      if (!form.docDate) return showToast('error', 'Vui lòng chọn ngày ghi nhận.');
      if (!items.length || !items.every(item => item.variantId && Number(item.quantity) > 0)) {
        return showToast('error', 'Vui lòng chọn hàng hóa và nhập số lượng > 0.');
      }
      return showToast('error', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
    }
    setSaving(true);
    let createdId = null;
    try {
      await exportApi.updateExportSlip(id, buildPayload(status));
      if (shouldPost) {
        await exportApi.postExportSlip(id);
      }
      navigate('/export-slips');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu xuất kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/export-slips'); }}>
          <i className="bi bi-arrow-left"></i> Cập nhật phiếu xuất kho {form.docCode ? form.docCode : ''}
        </a>
      </div>

      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}
        {loading ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>

        <div className={styles.topSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-person-fill"></i> Thông tin chung
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: '0 0 35%' }}>
                  <label className="misa-label">Mã KH <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        options={customers.map(c => ({ value: c.id, label: c.code }))}
                        value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).code } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="Chọn khách hàng"
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                    <button type="button" onClick={() => setShowPartnerModal(true)} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="bi bi-plus" style={{ fontSize: '18px', color: 'var(--color-primary)' }}></i>
                    </button>
                  </div>
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 65%' }}>
                  <label className="misa-label">Tên Khách hàng</label>
                  <input type="text" className="misa-input" readOnly value={customers.find(s => String(s.id) === String(form.partnerId))?.name || ''} style={{ backgroundColor: '#f3f4f6' }} />
                </div>
              </div>

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Địa chỉ khách hàng</label>
                <input type="text" className="misa-input" readOnly value={customers.find(s => String(s.id) === String(form.partnerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} placeholder="Tự động điền theo Mã KH" />
              </div>

              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho xuất <span className="required">*</span></label>
                  <Select
                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                    value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                    onChange={(selected) => handleFormChange('warehouseId', selected ? selected.value : '')}
                    placeholder="Chọn kho"
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Nhân viên xuất hàng</label>
                  <input
                    list="export-staff-list"
                    className="misa-input"
                    value={form.salespersonName || ''}
                    onChange={(e) => handleFormChange('salespersonName', e.target.value)}
                    placeholder="Nhập hoặc chọn tên nhân viên"
                  />
                  <datalist id="export-staff-list">
                    {users.map(user => <option key={user.id} value={user.fullName || user.username} />)}
                  </datalist>
                </div>
              </div>

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ghi chú</label>
                <input className="misa-input" value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="Nhập ghi chú" />
              </div>


            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-truck"></i> Thông tin người nhận
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-row">
                <div className="misa-form-group">
                  <label className="misa-label">Họ tên người nhận</label>
                  <input className="misa-input" value={form.receiverName} onChange={(event) => handleFormChange('receiverName', event.target.value)} placeholder="Tên người nhận hàng" />
                </div>
                <div className="misa-form-group">
                  <label className="misa-label">Số điện thoại</label>
                  <input className="misa-input" value={form.receiverPhone} onChange={(event) => handleFormChange('receiverPhone', event.target.value)} placeholder="SĐT người nhận" />
                </div>
              </div>
              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Địa chỉ nhận hàng <span className="required">*</span></label>
                <input className="misa-input" value={form.receiverAddress} onChange={(event) => handleFormChange('receiverAddress', event.target.value)} placeholder="Địa chỉ giao hàng" />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text-fill"></i> Thông tin chứng từ
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Ngày ghi nhận <span className="required">*</span></label>
                <input type="date" className="misa-input" value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Số phiếu</label>
                <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.scanPanel}>
            <div>
              <div className={styles.scanTitle}>Scan Product / Serial</div>
              <div className={styles.scanHint}>Quét serial cho hàng có serial, hoặc barcode/SKU cho hàng thường.</div>
            </div>
            <form className={styles.scanForm} onSubmit={handleScanSubmit}>
              <div className={styles.scanInputWrap}>
                <i className="bi bi-upc-scan"></i>
                <input
                  className="misa-input"
                  style={{ paddingLeft: '32px', height: '34px' }}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Đặt con trỏ vào đây rồi quét mã"
                  disabled={scanLoading}
                />
              </div>
              <button className={styles.btnAddRow} type="submit" disabled={scanLoading}>
                {scanLoading ? 'Đang quét...' : 'Thêm mã'}
              </button>
            </form>
          </div>

          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>Bảng hàng hóa</div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '18%' }}>Mã hàng</th>
                  <th style={{ width: '22%' }}>Tên hàng</th>
                  <th style={{ width: '8%' }}>ĐVT</th>
                  <th style={{ width: '8%' }} className={styles.textCenter}>Tồn kho</th>
                  <th style={{ width: '12%' }} className={styles.textRight}>Số lượng</th>
                  <th style={{ width: '15%' }} className={styles.textRight}>Đơn giá</th>
                  <th style={{ width: '15%' }} className={styles.textRight}>Thành tiền</th>
                  <th style={{ width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = productById.get(String(item.variantId));
                  return (
                    <tr key={item.localId}>
                      <td className={styles.textCenter}>{index + 1}</td>
                      <td>
                        <Select
                          options={products.map(p => ({ value: p.id, label: p.sku }))}
                          value={products.find(p => String(p.id) === String(item.variantId)) ? { value: item.variantId, label: products.find(p => String(p.id) === String(item.variantId)).sku } : null}
                          onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.value : '')}
                          placeholder="Chọn hàng"
                          isClearable
                          styles={customSelectStyles}
                        />
                      </td>
                      <td>
                        {variantLabel(product)}
                      </td>
                      <td>
                        {product?.unitName || ''}
                        {item.serialNumberId && <div className={styles.serialTag}>{item.scannedCode}</div>}
                      </td>
                      <td className={styles.textCenter} style={{ fontWeight: '600', color: '#0052cc' }}>
                        {product ? (inventoryBalances.find(b => String(b.itemCode) === String(product?.productCode) || String(b.itemCode) === String(product?.sku))?.totalQuantity || 0) : ''}
                      </td>
                      <td className={styles.textRight}>
                        <input type="number" min="0" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '100px', margin: '0 auto', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(event) => handleItemChange(item.localId, 'quantity', event.target.value)} />
                      </td>
                      <td className={styles.textRight}>
                        <input type="text" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '130px', marginLeft: 'auto', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(event) => handleItemChange(item.localId, 'price', event.target.value.replace(/\D/g, ''))} />
                      </td>
                      <td className={`${styles.textRight} ${styles.textBlue}`}>{money(Number(item.quantity || 0) * Number(item.price || 0))}</td>
                      <td className={styles.textCenter}>
                        <button className={styles.iconBtnDanger} onClick={() => removeItem(item.localId)}><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

              <div className={styles.tableFooter}>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryRow}>
                    <span>Tổng số lượng:</span>
                    <span>{money(totalQuantity)}</span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Tổng cộng:</span>
                    <span className={styles.totalValue}>{money(totalPrice)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}>
                  <i className="bi bi-plus-circle"></i> Thêm dòng mới
                </button>
              </div>
        </div>
      </>
      )}</div>

      <div className={styles.bottomBar}>
        <button className="btn-misa-cancel" onClick={() => navigate('/export-slips')}>
          Hủy bỏ
        </button>
        <div className={styles.actionButtons}>
          <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
            <i className="bi bi-printer"></i> Lưu và ghi sổ
          </button>
        </div>
      </div>
      <CustomerQuickCreateDrawer
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
        onSaved={handleSavePartner}
        onError={(msg) => showToast('error', msg)}
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="Xác nhận ghi sổ"
        message="Bạn có chắc chắn muốn lưu và ghi sổ phiếu xuất kho này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
        onConfirm={() => {
          setShowConfirm(false);
          submit('DRAFT', true);
        }}
        onCancel={() => setShowConfirm(false)}
      />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}

export default UpdateExportSlipPage;
