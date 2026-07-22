import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import CustomerModal from '../Customer/components/CustomerModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import axiosClient from '../../api/axiosClient';
import styles from './CreateExportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
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

function CreateExportSlipPage() {
  const navigate = useNavigate();
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
  const [form, setForm] = useState(() => ({
    docCode: `EXP-${Date.now()}`,
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
  }));
  const [items, setItems] = useState([{ ...emptyLine(), isNew: false }]);
  const [inventoryBalances, setInventoryBalances] = useState([]);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

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
    const loadLookups = async () => {
      const [warehouseRes, productRes, customerRes, userRes] = await Promise.allSettled([
        exportApi.getWarehouses({ size: 100 }),
        exportApi.getProducts({ size: 100 }),
        exportApi.getCustomers({ size: 1000 }),
        exportApi.getUsers({ size: 1000 }).catch(() => null), // fail gracefully
      ]);

      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || data[0]?.id || '' }));
      }
      if (productRes.status === 'fulfilled') {
        const data = pageContent(unwrap(productRes.value));
        setProducts(data);
      }
      if (customerRes.status === 'fulfilled') {
        const data = pageContent(unwrap(customerRes.value));
        setCustomers(data);
      }
      if (userRes.status === 'fulfilled' && userRes.value) {
        const data = pageContent(unwrap(userRes.value));
        setUsers(data);
      }
      try {
        const meRes = await axiosClient.get('/users/me');
        const me = meRes.data?.data || meRes.data;
        if (me) {
          const defaultName = me.fullName || me.username || '';
          setForm(prev => ({ ...prev, salespersonId: prev.salespersonId || defaultName }));
        }
      } catch (err) {
        console.error('Failed to load me profile', err);
      }
    };

    loadLookups();
  }, []);

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
      setToast({ isVisible: true, type: 'success', message: 'ThÃƒÂªm mÃ¡Â»â€ºi khÃƒÂ¡ch hÃƒÂ ng thÃƒÂ nh cÃƒÂ´ng!' });
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
          setError('Serial nÃƒÂ y Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c quÃƒÂ©t trong phiÃ¡ÂºÂ¿u.');
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
      setError('Vui lÃƒÂ²ng chÃ¡Â»Ân kho xuÃ¡ÂºÂ¥t trÃ†Â°Ã¡Â»â€ºc khi quÃƒÂ©t mÃƒÂ£.');
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
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃƒÂ´ng tÃƒÂ¬m thÃ¡ÂºÂ¥y mÃƒÂ£ vÃ¡Â»Â«a quÃƒÂ©t');
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
      if (!form.warehouseId) return showToast('error', 'Vui lÃƒÂ²ng chÃ¡Â»Ân kho xuÃ¡ÂºÂ¥t.');
      if (!form.partnerId) return showToast('error', 'Vui lÃƒÂ²ng chÃ¡Â»Ân khÃƒÂ¡ch hÃƒÂ ng.');
      if (!form.receiverAddress) return showToast('error', 'Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° nhÃ¡ÂºÂ­n hÃƒÂ ng.');
      if (!form.docDate) return showToast('error', 'Vui lÃƒÂ²ng chÃ¡Â»Ân ngÃƒÂ y ghi nhÃ¡ÂºÂ­n.');
      if (!items.length || !items.every(item => item.variantId && Number(item.quantity) > 0)) {
        return showToast('error', 'Vui lÃƒÂ²ng chÃ¡Â»Ân hÃƒÂ ng hÃƒÂ³a vÃƒÂ  nhÃ¡ÂºÂ­p sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng > 0.');
      }
      return showToast('error', 'Vui lÃƒÂ²ng Ã„â€˜iÃ¡Â»Ân Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§ thÃƒÂ´ng tin bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c.');
    }
    setSaving(true);
    let createdId = null;
    try {
      const response = await exportApi.createExportSlip(buildPayload(status));
      const created = unwrap(response);
      createdId = created?.id;
      if (shouldPost && createdId) {
        await exportApi.postExportSlip(createdId);
      }
      navigate('/export-slips', { state: { toastMessage: shouldPost ? 'Ghi sÃ¡Â»â€¢ phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho thÃƒÂ nh cÃƒÂ´ng!' : 'LÃ†Â°u tÃ¡ÂºÂ¡m phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho thÃƒÂ nh cÃƒÂ´ng!', toastType: 'success' } });
    } catch (err) {
      if (createdId) {
        showToast('error', 'Ã„ÂÃƒÂ£ tÃ¡ÂºÂ¡o phiÃ¡ÂºÂ¿u nhÃ†Â°ng Ghi sÃ¡Â»â€¢ thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i: ' + (err.response?.data?.userMessage || err.response?.data?.devMessage || err.message));
        navigate('/export-slips', { state: { toastMessage: 'Ã„ÂÃƒÂ£ tÃ¡ÂºÂ¡o phiÃ¡ÂºÂ¿u nhÃ†Â°ng Ghi sÃ¡Â»â€¢ thÃ¡ÂºÂ¥t bÃ¡ÂºÂ¡i: ' + (err.response?.data?.userMessage || err.message), toastType: 'warning' } });
      } else {
        showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃƒÂ´ng lÃ†Â°u Ã„â€˜Ã†Â°Ã¡Â»Â£c phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/export-slips'); }}>
          <i className="bi bi-arrow-left"></i> TÃ¡ÂºÂ¡o phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho {form.docCode ? form.docCode : ''}
        </a>
      </div>

      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}

        <div className={styles.topSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-person-fill"></i> ThÃƒÂ´ng tin chung
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                  <label className="misa-label">MÃƒÂ£ KH <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        options={customers.map(c => ({ value: c.id, label: c.code || `KH#${c.id}` }))}
                        value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).code || `KH#${form.partnerId}` } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="ChÃ¡Â»Ân MÃƒÂ£ KH..."
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
                  <label className="misa-label">TÃƒÂªn KhÃƒÂ¡ch hÃƒÂ ng</label>
                  <Select
                    options={customers.map(c => ({ value: c.id, label: c.name || '' }))}
                    value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).name || '' } : null}
                    onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                    placeholder="ChÃ¡Â»Ân TÃƒÂªn KH..."
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
              </div>


              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€° khÃƒÂ¡ch hÃƒÂ ng</label>
                <input type="text" className="misa-input" readOnly value={customers.find(s => String(s.id) === String(form.partnerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} placeholder="TÃ¡Â»Â± Ã„â€˜Ã¡Â»â„¢ng Ã„â€˜iÃ¡Â»Ân theo MÃƒÂ£ KH" />
              </div>

              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho xuÃ¡ÂºÂ¥t <span className="required">*</span></label>
                  <Select
                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                    value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                    onChange={(selected) => handleFormChange('warehouseId', selected ? selected.value : '')}
                    placeholder="ChÃ¡Â»Ân kho"
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">NhÃƒÂ¢n viÃƒÂªn xuÃ¡ÂºÂ¥t hÃƒÂ ng</label>
                  <input 
                    type="text" 
                    className="misa-input" 
                    value={form.salespersonId || ''} 
                    onChange={(e) => handleFormChange('salespersonId', e.target.value)} 
                    placeholder="NhÃ¡ÂºÂ­p tÃƒÂªn nhÃƒÂ¢n viÃƒÂªn xuÃ¡ÂºÂ¥t hÃƒÂ ng..." 
                  />
                </div>
              </div>



              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ghi chÃƒÂº</label>
                <input className="misa-input" value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="NhÃ¡ÂºÂ­p ghi chÃƒÂº" />
              </div>

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="misa-label" style={{ marginBottom: 0 }}>KÃƒÂ¨m theo chÃ¡Â»Â©ng tÃ¡Â»Â«</label>
                  {!form.referenceId && (
                    <button 
                      type="button" 
                      style={{ padding: 0, fontSize: '13px', background: 'none', border: 'none', color: '#0070cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setShowReferenceModal(true)}
                    >
                      <i className="bi bi-link-45deg" style={{ fontSize: '16px' }}></i> Tham chiÃ¡ÂºÂ¿u
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
                      title="XÃƒÂ³a tham chiÃ¡ÂºÂ¿u"
                    ></i>
                  </div>
                ) : (
                  <input type="text" className="misa-input" style={{ marginTop: '8px' }} placeholder="SÃ¡Â»â€˜ chÃ¡Â»Â©ng tÃ¡Â»Â« Ã„â€˜ÃƒÂ­nh kÃƒÂ¨m..." />
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text-fill"></i> ThÃƒÂ´ng tin chÃ¡Â»Â©ng tÃ¡Â»Â«
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">NgÃƒÂ y ghi nhÃ¡ÂºÂ­n <span className="required">*</span></label>
                <input type="date" className="misa-input" value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">SÃ¡Â»â€˜ phiÃ¡ÂºÂ¿u</label>
                <input className="misa-input" placeholder="Ã„ÂÃ¡Â»Æ’ trÃ¡Â»â€˜ng Ã„â€˜Ã¡Â»Æ’ hÃ¡Â»â€¡ thÃ¡Â»â€˜ng tÃ¡Â»Â± sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.scanPanel}>
            <div>
              <div className={styles.scanTitle}>Scan Product / Serial</div>
              <div className={styles.scanHint}>QuÃƒÂ©t serial cho hÃƒÂ ng cÃƒÂ³ serial, hoÃ¡ÂºÂ·c barcode/SKU cho hÃƒÂ ng thÃ†Â°Ã¡Â»Âng.</div>
            </div>
            <form className={styles.scanForm} onSubmit={handleScanSubmit}>
              <div className={styles.scanInputWrap}>
                <i className="bi bi-upc-scan"></i>
                <input
                  className="misa-input"
                  style={{ paddingLeft: '32px', height: '34px' }}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Ã„ÂÃ¡ÂºÂ·t con trÃ¡Â»Â vÃƒÂ o Ã„â€˜ÃƒÂ¢y rÃ¡Â»â€œi quÃƒÂ©t mÃƒÂ£"
                  disabled={scanLoading}
                />
              </div>
                  <button className={styles.btnAddRow} type="submit" disabled={scanLoading} style={{ display: 'none' }}>
                    {scanLoading ? 'Ã„Âang quÃƒÂ©t...' : 'ThÃƒÂªm mÃƒÂ£'}
                  </button>
            </form>
          </div>

          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>BÃ¡ÂºÂ£ng hÃƒÂ ng hÃƒÂ³a</div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '22%' }}>TÃƒÂªn hÃƒÂ ng</th>
                  <th style={{ width: '14%' }}>MÃƒÂ£ hÃƒÂ ng</th>
                  <th style={{ width: '8%' }}>Ã„ÂVT</th>
                  <th style={{ width: '8%' }} className={styles.textCenter}>TÃ¡Â»â€œn</th>
                  <th style={{ width: '12%' }} className={styles.textRight}>SL</th>
                  <th style={{ width: '15%' }} className={styles.textRight}>Ã„ÂÃ†Â¡n giÃƒÂ¡</th>
                  <th style={{ width: '15%' }} className={styles.textRight}>ThÃƒÂ nh tiÃ¡Â»Ân</th>
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
                          placeholder="ChÃ¡Â»Ân hÃƒÂ ng"
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
                    <span>TÃ¡Â»â€¢ng sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng:</span>
                    <span>{money(totalQuantity)}</span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>TÃ¡Â»â€¢ng cÃ¡Â»â„¢ng:</span>
                    <span className={styles.totalValue}>{money(totalPrice)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}>
                  <i className="bi bi-plus-circle"></i> ThÃƒÂªm dÃƒÂ²ng mÃ¡Â»â€ºi
                </button>
              </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <button className="btn-misa-cancel" onClick={() => navigate('/export-slips')}>
          HÃ¡Â»Â§y bÃ¡Â»Â
        </button>
        <div className={styles.actionButtons}>
          <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> LÃ†Â°u tÃ¡ÂºÂ¡m
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
            <i className="bi bi-printer"></i> LÃ†Â°u vÃƒÂ  ghi sÃ¡Â»â€¢
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
        onSelect={(data) => {
          setForm(prev => ({ 
            ...prev, 
            referenceType: data.referenceType, 
            referenceId: data.referenceId,
            referenceCode: data.docCode 
          }));
        }}
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="XÃƒÂ¡c nhÃ¡ÂºÂ­n ghi sÃ¡Â»â€¢"
        message="BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c chÃ¡ÂºÂ¯n muÃ¡Â»â€˜n lÃ†Â°u vÃƒÂ  ghi sÃ¡Â»â€¢ phiÃ¡ÂºÂ¿u xuÃ¡ÂºÂ¥t kho nÃƒÂ y khÃƒÂ´ng? Thao tÃƒÂ¡c nÃƒÂ y khÃƒÂ´ng thÃ¡Â»Æ’ hoÃƒÂ n tÃƒÂ¡c vÃƒÂ  sÃ¡ÂºÂ½ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t lÃ¡ÂºÂ¡i sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng hÃƒÂ ng hÃƒÂ³a trong kho."
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

export default CreateExportSlipPage;
