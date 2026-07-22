import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import CustomerModal from '../Customer/components/CustomerModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import styles from './UpdateExportSlipPage.module.css';

import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} Ä‘`;
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
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    salespersonId: '',
    customerAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    docDate: today(),
    note: '',
    referenceType: '',
    referenceId: '',
    referenceCode: '',
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
          const userList = userRes.status === 'fulfilled' ? pageContent(unwrap(userRes.value)) : [];
          setUsers(userList);
          const salespersonUser = userList.find(u => String(u.id) === String(detail.salespersonId));
          const currentUserId = sessionStorage.getItem('userId') || sessionStorage.getItem('id');
          const currentUser = userList.find(u => String(u.id) === String(currentUserId));
          const salespersonName = salespersonUser ? (salespersonUser.fullName || salespersonUser.username) : (detail.salespersonId || currentUser?.fullName || currentUser?.username || '');

          setForm({
            docCode: detail.docCode || '',
            warehouseId: detail.warehouseId || '',
            partnerId: detail.partnerId || '',
            salespersonId: salespersonName,
            customerAddress: detail.customerAddress || '',
            receiverName: detail.recipientName || '',
            receiverPhone: detail.receiverPhone || '',
            receiverAddress: detail.recipientAddress || '',
            docDate: detail.docDate || '',
            note: detail.note || '',
            status: detail.status || 'DRAFT',
            referenceType: detail.referenceType || '',
            referenceId: detail.referenceId || '',
            referenceCode: detail.referenceCode || (detail.referenceId ? `Tham chiáº¿u #${detail.referenceId}` : ''),
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
        setError(err.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c phiáº¿u xuáº¥t kho');
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
  const isFormValid = Boolean(form.warehouseId && form.partnerId && form.docDate && items.length && items.every(item => item.variantId && Number(item.quantity) > 0 && Number(item.price) >= 0));

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

  const handleSavePartner = async (isEdit, isContinue) => {
    try {
      const res = await exportApi.getCustomers({ size: 1000 });
      const data = pageContent(unwrap(res));
      setCustomers(data);
      if (data && data.length > 0) {
        const newlyAdded = data[data.length - 1];
        if (newlyAdded) {
          handleFormChange('partnerId', newlyAdded.id);
        }
      }
      setToast({ isVisible: true, type: 'success', message: 'ThÃªm má»›i khÃ¡ch hÃ ng thÃ nh cÃ´ng!' });
    } catch (err) {
      console.error(err);
    } finally {
      if (!isContinue) {
        setShowPartnerModal(false);
      }
    }
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
          setError('Serial nÃ y Ä‘Ã£ Ä‘Æ°á»£c quÃ©t trong phiáº¿u.');
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
      setError('Vui lÃ²ng chá»n kho xuáº¥t trÆ°á»›c khi quÃ©t mÃ£.');
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
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃ´ng tÃ¬m tháº¥y mÃ£ vá»«a quÃ©t');
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
    salespersonId: (!isNaN(Number(form.salespersonId)) && String(form.salespersonId).trim() !== '') ? Number(form.salespersonId) : null,
    customerAddress: form.customerAddress,
    recipientName: form.receiverName || customers.find(s => String(s.id) === String(form.partnerId))?.name || '',
    receiverPhone: form.receiverPhone || selectedCustomer?.phone || '',
    recipientAddress: form.receiverAddress || form.customerAddress || customers.find(s => String(s.id) === String(form.partnerId))?.address || '',
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(sessionStorage.getItem('userId') || sessionStorage.getItem('id') || 1),
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: 0,
      quantityOut: Number(item.quantity),
      unitCost: 0,
      unitPrice: Number(item.price),
      serialNumberId: item.serialNumberId || null,
      note: item.note,
    })),
    referenceType: form.referenceType || undefined,
    referenceId: form.referenceId || undefined,
  });

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      if (!form.warehouseId) return showToast('error', 'Vui lÃ²ng chá»n kho xuáº¥t.');
      if (!form.partnerId) return showToast('error', 'Vui lÃ²ng chá»n khÃ¡ch hÃ ng.');
      if (!form.receiverAddress) return showToast('error', 'Vui lÃ²ng nháº­p Ä‘á»‹a chá»‰ nháº­n hÃ ng.');
      if (!form.docDate) return showToast('error', 'Vui lÃ²ng chá»n ngÃ y ghi nháº­n.');
      if (!items.length || !items.every(item => item.variantId && Number(item.quantity) > 0)) {
        return showToast('error', 'Vui lÃ²ng chá»n hÃ ng hÃ³a vÃ  nháº­p sá»‘ lÆ°á»£ng > 0.');
      }
      return showToast('error', 'Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.');
    }
    setSaving(true);
    try {
      await exportApi.updateExportSlip(id, buildPayload(status));
      if (shouldPost) {
        await exportApi.postExportSlip(id);
      }
      navigate('/export-slips', { state: { toastMessage: shouldPost ? 'Ghi sá»• phiáº¿u xuáº¥t kho thÃ nh cÃ´ng!' : 'Cáº­p nháº­t phiáº¿u xuáº¥t kho thÃ nh cÃ´ng!', toastType: 'success' } });
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃ´ng cáº­p nháº­t Ä‘Æ°á»£c phiáº¿u xuáº¥t kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/export-slips'); }}>
          <i className="bi bi-arrow-left"></i> Cáº­p nháº­t phiáº¿u xuáº¥t kho {form.docCode ? form.docCode : ''}
        </a>
      </div>

      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}
        {loading ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>Äang táº£i dá»¯ liá»‡u...</div>
          </div>
        ) : (
          <>

            <div className={styles.topSection}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-person-fill"></i> ThÃ´ng tin chung
                </div>
                <div className={styles.cardBody}>
              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                  <label className="misa-label">MÃ£ KH <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        options={customers.map(c => ({ value: c.id, label: c.code || `KH#${c.id}` }))}
                        value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).code || `KH#${form.partnerId}` } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="Chá»n MÃ£ KH..."
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                    <button type="button" onClick={() => setShowPartnerModal(true)} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="bi bi-plus" style={{ fontSize: '18px', color: 'var(--color-primary)' }}></i>
                    </button>
                  </div>
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                  <label className="misa-label">TÃªn KhÃ¡ch hÃ ng</label>
                  <Select
                    options={customers.map(c => ({ value: c.id, label: c.name || '' }))}
                    value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).name || '' } : null}
                    onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                    placeholder="Chá»n TÃªn KH..."
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
              </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Äá»‹a chá»‰ khÃ¡ch hÃ ng</label>
                    <input type="text" className="misa-input" readOnly value={customers.find(s => String(s.id) === String(form.partnerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} placeholder="Tá»± Ä‘á»™ng Ä‘iá»n theo MÃ£ KH" />
                  </div>

                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Kho xuáº¥t <span className="required">*</span></label>
                      <Select
                        options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                        value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                        onChange={(selected) => handleFormChange('warehouseId', selected ? selected.value : '')}
                        placeholder="Chá»n kho"
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">NhÃ¢n viÃªn xuáº¥t hÃ ng</label>
                  <input 
                    type="text" 
                    className="misa-input" 
                    value={form.salespersonId || ''} 
                    onChange={(e) => handleFormChange('salespersonId', e.target.value)} 
                    placeholder="Nháº­p tÃªn nhÃ¢n viÃªn xuáº¥t hÃ ng..." 
                  />
                </div>
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Ghi chÃº</label>
                    <input className="misa-input" value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="Nháº­p ghi chÃº" />
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="misa-label" style={{ marginBottom: 0 }}>KÃ¨m theo chá»©ng tá»«</label>
                      {!form.referenceId && (
                        <button 
                          type="button" 
                          style={{ padding: 0, fontSize: '13px', background: 'none', border: 'none', color: '#0070cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setShowReferenceModal(true)}
                        >
                          <i className="bi bi-link-45deg" style={{ fontSize: '16px' }}></i> Tham chiáº¿u
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
                          title="XÃ³a tham chiáº¿u"
                        ></i>
                      </div>
                    ) : (
                      <input type="text" className="misa-input" style={{ marginTop: '8px' }} placeholder="Sá»‘ chá»©ng tá»« Ä‘Ã­nh kÃ¨m..." />
                    )}
                  </div>


                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-file-earmark-text-fill"></i> ThÃ´ng tin chá»©ng tá»«
                </div>
                <div className={styles.cardBody}>
                  <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                    <label className="misa-label">NgÃ y ghi nháº­n <span className="required">*</span></label>
                    <input type="date" className="misa-input" value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
                  </div>

                  <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                    <label className="misa-label">Sá»‘ phiáº¿u</label>
                    <input className="misa-input" placeholder="Äá»ƒ trá»‘ng Ä‘á»ƒ há»‡ thá»‘ng tá»± sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.scanPanel}>
                <div>
                  <div className={styles.scanTitle}>Scan Product / Serial</div>
                  <div className={styles.scanHint}>QuÃ©t serial cho hÃ ng cÃ³ serial, hoáº·c barcode/SKU cho hÃ ng thÆ°á»ng.</div>
                </div>
                <form className={styles.scanForm} onSubmit={handleScanSubmit}>
                  <div className={styles.scanInputWrap}>
                    <i className="bi bi-upc-scan"></i>
                    <input
                      className="misa-input"
                      style={{ paddingLeft: '32px', height: '34px' }}
                      value={scanCode}
                      onChange={(event) => setScanCode(event.target.value)}
                      placeholder="Äáº·t con trá» vÃ o Ä‘Ã¢y rá»“i quÃ©t mÃ£"
                      disabled={scanLoading}
                    />
                  </div>
                  <button className={styles.btnAddRow} type="submit" disabled={scanLoading} style={{ display: 'none' }}>
                    {scanLoading ? 'Äang quÃ©t...' : 'ThÃªm mÃ£'}
                  </button>
                </form>
              </div>

              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Báº£ng hÃ ng hÃ³a</div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                      <th style={{ width: '22%' }}>TÃªn hÃ ng</th>
                      <th style={{ width: '14%' }}>MÃ£ hÃ ng</th>
                      <th style={{ width: '8%' }}>ÄVT</th>
                      <th style={{ width: '8%' }} className={styles.textCenter}>Tá»“n</th>
                      <th style={{ width: '12%' }} className={styles.textRight}>SL</th>
                      <th style={{ width: '15%' }} className={styles.textRight}>ÄÆ¡n giÃ¡</th>
                      <th style={{ width: '15%' }} className={styles.textRight}>ThÃ nh tiá»n</th>
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
                              options={products.map(p => ({ value: p.id, label: `${p.productName} - ${p.sku || p.productCode}` }))}
                              value={products.find(p => String(p.id) === String(item.variantId)) ? { value: item.variantId, label: `${products.find(p => String(p.id) === String(item.variantId)).productName} - ${products.find(p => String(p.id) === String(item.variantId)).sku || products.find(p => String(p.id) === String(item.variantId)).productCode}` } : null}
                              onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.value : '')}
                              placeholder="Chá»n hÃ ng"
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                            />
                          </td>
                          <td>
                            {product?.sku || product?.productCode || ''}
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
                    <span>Tá»•ng sá»‘ lÆ°á»£ng:</span>
                    <span>{money(totalQuantity)}</span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Tá»•ng cá»™ng:</span>
                    <span className={styles.totalValue}>{money(totalPrice)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}>
                  <i className="bi bi-plus-circle"></i> ThÃªm dÃ²ng má»›i
                </button>
              </div>
            </div>
          </>
        )}</div>

      <div className={styles.bottomBar}>
        <button className="btn-misa-cancel" onClick={() => navigate('/export-slips')}>
          Há»§y bá»
        </button>
        <div className={styles.actionButtons}>
          <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> LÆ°u táº¡m
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
            <i className="bi bi-printer"></i> LÆ°u vÃ  ghi sá»•
          </button>
        </div>
      </div>
      <CustomerModal
        isOpen={showPartnerModal}
        editData={null}
        onClose={() => setShowPartnerModal(false)}
        onSaved={handleSavePartner}
        onError={(msg) => showToast('error', msg)}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(doc) => {
          setForm(prev => ({
            ...prev,
            referenceType: doc.type,
            referenceId: doc.id,
            referenceCode: doc.code
          }));
          setShowReferenceModal(false);
        }}
        type="EXPORT"
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="XÃ¡c nháº­n ghi sá»•"
        message="Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n lÆ°u vÃ  ghi sá»• phiáº¿u xuáº¥t kho nÃ y khÃ´ng? Thao tÃ¡c nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c vÃ  sáº½ cáº­p nháº­t láº¡i sá»‘ lÆ°á»£ng hÃ ng hÃ³a trong kho."
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
