import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import * as customerApi from '../../api/customerApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
import CustomerModal from '../Customer/components/CustomerModal';
import AssemblyOrderSelectionModal from './components/AssemblyOrderSelectionModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Toast from '../../components/ui/Toast/Toast';
import ManageSerialModal from './ManageSerialModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import axiosClient from '../../api/axiosClient';
import styles from './CreateImportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');
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
  serialNumbers: [],
  quantity: 1,
  price: 0,
  vatPercent: 0,
  note: '',
  isNew: true,
});

function CreateImportSlipPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [saving, setSaving] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState(() => ({
    docCode: `IMP-${Date.now()}`,
    warehouseId: '',
    partnerId: '',
    partnerName: '',
    customerId: '',
    customerName: '',
    assemblyOrderId: '',
    deliverer: '',
    purchaser: '',
    attachedDoc: '',
    docDate: today(),
    note: '',
    status: 'DRAFT',
    referenceType: '',
    referenceId: '',
    referenceCode: '',
  }));
  const [items, setItems] = useState([{ ...emptyLine(), isNew: false }]);
  const [importType, setImportType] = useState('PURCHASE');
  const [customers, setCustomers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [showAssemblyOrderModal, setShowAssemblyOrderModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      const [warehouseRes, supplierRes, productRes, customerRes, assemblyOrderRes, userRes] = await Promise.allSettled([
        importApi.getWarehouses({ size: 100 }),
        importApi.getSuppliers(),
        importApi.getProducts({ size: 100 }),
        customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
        assemblyOrderApi.getAssemblyOrders({ size: 100 }),
        exportApi.getUsers({ size: 1000 })
      ]);
      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || data[0]?.id || '' }));
      }
      if (supplierRes.status === 'fulfilled') {
        const data = pageContent(unwrap(supplierRes.value)).filter(s => s.status !== 'INACTIVE');
        setSuppliers(data);
      }
      if (productRes.status === 'fulfilled') {
        const data = pageContent(unwrap(productRes.value));
        setProducts(data);
      }
      if (customerRes.status === 'fulfilled') {
        const data = pageContent(unwrap(customerRes.value));
        setCustomers(data);
      }
      if (assemblyOrderRes.status === 'fulfilled') {
        const data = pageContent(unwrap(assemblyOrderRes.value));
        setAssemblyOrders(data);
      }
      if (userRes.status === 'fulfilled') {
        const data = pageContent(unwrap(userRes.value));
        setUsers(data);
      }
      try {
        const meRes = await axiosClient.get('/users/me');
        const me = meRes.data?.data || meRes.data;
        if (me) {
          const defaultName = me.fullName || me.username || '';
          setForm(prev => ({ ...prev, purchaser: prev.purchaser || defaultName }));
        }
      } catch (err) {
        console.error('Failed to load me profile', err);
      }
    };
    loadLookups();
  }, []);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0) * Number(item.vatPercent || 0) / 100), 0);
  const grandTotal = totalPrice + totalVat;
  const isLineValid = (item) => {
    const product = productById.get(String(item.variantId));
    const quantity = Number(item.quantity || 0);
    const hasValidSerials = !product?.trackSerial || (Number.isInteger(quantity) && item.serialNumbers?.length === quantity);
    return item.variantId && quantity > 0 && Number(item.price) >= 0 && hasValidSerials;
  };
  const isFormValid = Boolean(
    form.warehouseId &&
    form.docDate &&
    (importType === 'PURCHASE' ? form.partnerId
      : importType === 'PRODUCTION' ? form.assemblyOrderId
      : importType === 'RETURN' ? form.customerId
      : true) && // OTHER type has no required partner field
    items.length && items.every(isLineValid)
  );

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (localId, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.localId !== localId) return item;
      if (field === 'quantity') {
        const quantity = Number(value || 0);
        return { ...item, quantity: value, serialNumbers: item.serialNumbers?.slice(0, Math.max(0, quantity)) || [] };
      }
      if (field === 'variantId') {
        return { ...item, [field]: value, serialNumbers: [] };
      }
      return { ...item, [field]: value };
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine()]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : prev);
  };

  const selectedSerialItem = items.find(item => item.localId === serialModalItemId);
  const selectedSerialProduct = selectedSerialItem ? productById.get(String(selectedSerialItem.variantId)) : null;

  const handleSerialModalClose = (serialNumbers) => {
    if (Array.isArray(serialNumbers) && serialModalItemId) {
      setItems(prev => prev.map(item => item.localId === serialModalItemId
        ? { ...item, serialNumbers }
        : item));
    }
    setSerialModalItemId(null);
  };

  const buildPayload = (status) => ({
    docCode: form.docCode || undefined,
    warehouseId: Number(form.warehouseId),
    partnerId: importType === 'RETURN' ? (form.customerId ? Number(form.customerId) : null)
      : importType === 'OTHER' ? null
      : (form.partnerId ? Number(form.partnerId) : null),
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(sessionStorage.getItem('userId') || sessionStorage.getItem('id') || 1),
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: Number(item.quantity),
      quantityOut: 0,
      unitCost: Number(item.price),
      unitPrice: Number(item.price),
      vatPercent: Number(item.vatPercent || 0),
      serialNumbers: item.serialNumbers || [],
      note: item.note,
    })),
    issuePurpose: importType,
    recipientName: importType === 'OTHER' ? form.otherObjectName : form.deliverer,
    salespersonId: (!isNaN(Number(form.purchaser)) && String(form.purchaser).trim() !== '') ? Number(form.purchaser) : null,
    referenceType: importType === 'PRODUCTION' && form.assemblyOrderId ? 'ASSEMBLY_ORDER' : (form.referenceType || undefined),
    referenceId: importType === 'PRODUCTION' && form.assemblyOrderId ? Number(form.assemblyOrderId) : (form.referenceId || undefined),
  });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleSavePartner = async (formData) => {
    try {
      const res = await importApi.createSupplier(formData);
      const newSupplier = unwrap(res);
      if (newSupplier?.id) {
        setSuppliers(prev => [...prev, newSupplier]);
        handleFormChange('partnerId', newSupplier.id);
      } else {
        const supRes = await importApi.getSuppliers({ size: 1000 });
        const list = pageContent(unwrap(supRes)).filter(s => s.status !== 'INACTIVE');
        setSuppliers(list);
        if (list.length > 0) handleFormChange('partnerId', list[list.length - 1].id);
      }
      setShowPartnerModal(false);
      showToast('success', 'ThÃªm má»›i nhÃ  cung cáº¥p thÃ nh cÃ´ng!');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'CÃ³ lá»—i xáº£y ra khi táº¡o nhÃ  cung cáº¥p');
    }
  };

  const handleSaveCustomer = async (isEdit, isContinue) => {
    try {
      const res = await customerApi.searchCustomers('', 'APPROVED', '', 0, 1000);
      const data = pageContent(unwrap(res));
      setCustomers(data);
      if (data && data.length > 0) {
        const newlyAdded = data[data.length - 1];
        if (newlyAdded) {
          handleFormChange('customerId', newlyAdded.id);
        }
      }
      showToast('success', 'ThÃªm má»›i khÃ¡ch hÃ ng thÃ nh cÃ´ng!');
    } catch (err) {
      console.error(err);
    } finally {
      if (!isContinue) {
        setShowCustomerDrawer(false);
      }
    }
  };

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      if (!form.warehouseId) return showToast('error', 'Vui lÃ²ng chá»n kho nháº­p.');
      if (importType === 'PURCHASE' && !form.partnerId) return showToast('error', 'Vui lÃ²ng chá»n nhÃ  cung cáº¥p.');
      if (importType === 'PRODUCTION' && !form.assemblyOrderId) return showToast('error', 'Vui lÃ²ng chá»n lá»‡nh quáº£n lÃ½ BOM.');
      if (importType === 'RETURN' && !form.customerId) return showToast('error', 'Vui lÃ²ng chá»n khÃ¡ch hÃ ng.');
      if (!form.docDate) return showToast('error', 'Vui lÃ²ng chá»n ngÃ y nháº­p kho.');
      if (!items.length || !items.every(isLineValid)) {
        return showToast('error', 'Vui lÃ²ng chá»n hÃ ng hÃ³a vÃ  nháº­p sá»‘ lÆ°á»£ng há»£p lá»‡ (HÃ ng cÃ³ serial cáº§n khá»›p sá»‘ lÆ°á»£ng mÃ£ quÃ©t).');
      }
      return showToast('error', 'Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin báº¯t buá»™c.');
    }
    setSaving(true);
    let createdId = null;
    try {
      const response = await importApi.createImportSlip(buildPayload(status));
      const created = unwrap(response);
      createdId = created?.id;
      if (shouldPost && createdId) {
        await importApi.postImportSlip(createdId);
      }
      if (status === 'DRAFT' && createdId) {
        navigate(`/import-slips/${createdId}/edit`, { state: { toastMessage: 'LÆ°u táº¡m phiáº¿u nháº­p kho thÃ nh cÃ´ng!', toastType: 'success' } });
      } else {
        navigate('/import-history', { state: { toastMessage: shouldPost ? 'Ghi sá»• phiáº¿u nháº­p kho thÃ nh cÃ´ng!' : 'Táº¡o phiáº¿u nháº­p kho thÃ nh cÃ´ng!', toastType: 'success' } });
      }
    } catch (err) {
      if (createdId) {
        navigate('/import-history', { state: { toastMessage: 'ÄÃ£ táº¡o phiáº¿u nhÆ°ng Ghi sá»• tháº¥t báº¡i: ' + (err.response?.data?.userMessage || err.message), toastType: 'warning' } });
      } else {
        showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃ´ng lÆ°u Ä‘Æ°á»£c phiáº¿u nháº­p kho');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody} style={{ padding: 0 }}>
        <div className={styles.scrollableContent}>
          <div className={styles.pageHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/import-history'); }}>
                <i className="bi bi-arrow-left"></i> Táº¡o phiáº¿u nháº­p kho {form.docCode ? form.docCode : ''}
              </a>
              <span style={{ color: '#d1d5db', fontSize: '20px' }}>|</span>
              <div style={{ width: '280px' }}>
                <Select
                  value={[
                    { value: 'PURCHASE', label: 'Nháº­p kho mua hÃ ng' },
                    { value: 'PRODUCTION', label: 'Nháº­p kho thÃ nh pháº©m sáº£n xuáº¥t' },
                    { value: 'RETURN', label: 'Nháº­p kho hÃ ng bÃ¡n bá»‹ tráº£ láº¡i' },
                    { value: 'OTHER', label: 'KhÃ¡c' }
                  ].find(o => o.value === importType)}
                  options={[
                    { value: 'PURCHASE', label: 'Nháº­p kho mua hÃ ng' },
                    { value: 'PRODUCTION', label: 'Nháº­p kho thÃ nh pháº©m sáº£n xuáº¥t' },
                    { value: 'RETURN', label: 'Nháº­p kho hÃ ng bÃ¡n bá»‹ tráº£ láº¡i' },
                    { value: 'OTHER', label: 'KhÃ¡c' }
                  ]}
                  onChange={(option) => {
                    setImportType(option.value);
                    setForm(prev => ({
                      ...prev,
                      partnerId: '',
                      customerId: '',
                      assemblyOrderId: ''
                    }));
                  }}
                  styles={{
                    ...customSelectStyles,
                    control: (base, state) => ({ ...customSelectStyles.control(base, state), fontWeight: 'bold' })
                  }}
                  isSearchable={false}
                />
              </div>
            </div>
          </div>

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>ThÃ´ng tin chung</h3>
              </div>

              {importType === 'PURCHASE' && (
                <div className="misa-form-row">
                  <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                    <label className="misa-label">MÃ£ nhÃ  cung cáº¥p <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={suppliers.map(s => ({ value: s.id, label: `${s.code || `NCC#${s.id}`} - ${s.name || ''}`, codeOnly: s.code || `NCC#${s.id}` }))}
                          value={suppliers.find(s => String(s.id) === String(form.partnerId)) ? { value: form.partnerId, label: `${suppliers.find(s => String(s.id) === String(form.partnerId)).code || `NCC#${form.partnerId}`} - ${suppliers.find(s => String(s.id) === String(form.partnerId)).name || ''}`, codeOnly: suppliers.find(s => String(s.id) === String(form.partnerId)).code || `NCC#${form.partnerId}` } : null}
                          onChange={(selected) => {
                            handleFormChange('partnerId', selected ? selected.value : '');
                            handleFormChange('partnerName', selected ? (suppliers.find(s => String(s.id) === String(selected.value))?.name || '') : '');
                          }}
                          formatOptionLabel={(option, { context }) => context === 'value' ? option.codeOnly : option.label}
                          placeholder="Chá»n MÃ£ nhÃ  cung cáº¥p..."
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
                    <label className="misa-label">TÃªn nhÃ  cung cáº¥p</label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.partnerName !== undefined ? form.partnerName : (suppliers.find(s => String(s.id) === String(form.partnerId))?.name || '')}
                      onChange={(e) => handleFormChange('partnerName', e.target.value)}
                      placeholder="Nháº­p tÃªn nhÃ  cung cáº¥p..."
                      readOnly={!!form.partnerId}
                      style={{ backgroundColor: form.partnerId ? '#f9fafb' : '#fff' }}
                    />
                  </div>
                </div>
              )}

              {importType === 'PRODUCTION' && (
                <div className="misa-form-row">
                  <div className="misa-form-group" style={{ flex: '0 0 100%' }}>
                    <label className="misa-label">Lá»‡nh sáº£n xuáº¥t <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="misa-input"
                        readOnly
                        value={assemblyOrders.find(o => String(o.id) === String(form.assemblyOrderId))?.orderCode || ''}
                        placeholder="Nháº¥n biá»ƒu tÆ°á»£ng bÃªn cáº¡nh Ä‘á»ƒ chá»n lá»‡nh..."
                        style={{ flex: 1, backgroundColor: '#f3f4f6', cursor: 'pointer' }}
                        onClick={() => setShowAssemblyOrderModal(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAssemblyOrderModal(true)}
                        style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="bi bi-search" style={{ fontSize: '16px', color: 'var(--color-primary)' }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {importType === 'RETURN' && (
                <>
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">MÃ£ khÃ¡ch hÃ ng <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Select
                            options={customers.map(c => ({ value: c.id, label: `${c.code || `KH#${c.id}`} - ${c.name || ''}`, codeOnly: c.code || `KH#${c.id}` }))}
                            value={customers.find(c => String(c.id) === String(form.customerId)) ? { value: form.customerId, label: `${customers.find(c => String(c.id) === String(form.customerId)).code || `KH#${form.customerId}`} - ${customers.find(c => String(c.id) === String(form.customerId)).name || ''}`, codeOnly: customers.find(c => String(c.id) === String(form.customerId)).code || `KH#${form.customerId}` } : null}
                            onChange={(selected) => {
                              handleFormChange('customerId', selected ? selected.value : '');
                              handleFormChange('customerName', selected ? (customers.find(c => String(c.id) === String(selected.value))?.name || '') : '');
                            }}
                            formatOptionLabel={(option, { context }) => context === 'value' ? option.codeOnly : option.label}
                            placeholder="Chá»n MÃ£ khÃ¡ch hÃ ng..."
                            isClearable
                            styles={customSelectStyles}
                          />
                        </div>
                        <button type="button" onClick={() => setShowCustomerDrawer(true)} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="bi bi-plus" style={{ fontSize: '18px', color: 'var(--color-primary)' }}></i>
                        </button>
                      </div>
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                      <label className="misa-label">TÃªn khÃ¡ch hÃ ng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.customerName !== undefined ? form.customerName : (customers.find(c => String(c.id) === String(form.customerId))?.name || '')}
                        onChange={(e) => handleFormChange('customerName', e.target.value)}
                        placeholder="Nháº­p tÃªn khÃ¡ch hÃ ng..."
                        readOnly={!!form.customerId}
                        style={{ backgroundColor: form.customerId ? '#f9fafb' : '#fff' }}
                      />
                    </div>
                  </div>
                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '1' }}>
                      <label className="misa-label">Äá»‹a chá»‰</label>
                      <input type="text" className="misa-input" readOnly value={customers.find(c => String(c.id) === String(form.customerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} />
                    </div>
                  </div>
                </>
              )}

              {importType === 'OTHER' && (
                <>
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">MÃ£ Ä‘á»‘i tÆ°á»£ng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.otherObjectCode || ''}
                        onChange={(e) => handleFormChange('otherObjectCode', e.target.value)}
                        placeholder="Nháº­p mÃ£ Ä‘á»‘i tÆ°á»£ng..."
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                      <label className="misa-label">TÃªn Ä‘á»‘i tÆ°á»£ng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.otherObjectName || ''}
                        onChange={(e) => handleFormChange('otherObjectName', e.target.value)}
                        placeholder="Nháº­p tÃªn Ä‘á»‘i tÆ°á»£ng..."
                      />
                    </div>
                  </div>
                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '1' }}>
                      <label className="misa-label">Äá»‹a chá»‰</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.otherObjectAddress || ''}
                        onChange={(e) => handleFormChange('otherObjectAddress', e.target.value)}
                        placeholder="Nháº­p Ä‘á»‹a chá»‰..."
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho nháº­p <span className="required">*</span></label>
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
                  <label className="misa-label">
                    {importType === 'PURCHASE' && 'NhÃ¢n viÃªn mua hÃ ng'}
                    {importType === 'PRODUCTION' && 'NhÃ¢n viÃªn phá»¥ trÃ¡ch'}
                    {importType === 'RETURN' && 'NhÃ¢n viÃªn nháº­n hÃ ng'}
                    {importType === 'OTHER' && 'NhÃ¢n viÃªn nháº­n hÃ ng'}
                  </label>
                  <input
                    type="text"
                    className="misa-input"
                    value={form.purchaser || ''}
                    onChange={(e) => handleFormChange('purchaser', e.target.value)}
                    placeholder="Nháº­p tÃªn nhÃ¢n viÃªn..."
                  />
                </div>
              </div>

              {(importType === 'PURCHASE' || importType === 'PRODUCTION' || importType === 'OTHER') && (
                <div className="misa-form-row" style={{ marginTop: '12px' }}>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">NgÆ°á»i giao hÃ ng</label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.deliverer || ''}
                      onChange={(e) => handleFormChange('deliverer', e.target.value)}
                      placeholder="Nháº­p ngÆ°á»i giao hÃ ng..."
                    />
                  </div>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  </div>
                </div>
              )}

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ghi chÃº</label>
                <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
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
                  <input type="text" className="misa-input" style={{ marginTop: '8px' }} value={form.attachedDoc} onChange={(e) => handleFormChange('attachedDoc', e.target.value)} placeholder="Sá»‘ chá»©ng tá»« Ä‘Ã­nh kÃ¨m..." />
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>ThÃ´ng tin chá»©ng tá»«</h3>
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Sá»‘ phiáº¿u</label>
                <input className="misa-input" placeholder="Äá»ƒ trá»‘ng Ä‘á»ƒ há»‡ thá»‘ng tá»± sinh" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">NgÃ y nháº­p kho <span className="required">*</span></label>
                <input type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-box-seam text-gray-500"></i>
              <h3 className={styles.cardTitle}>Báº£ng hÃ ng hÃ³a</h3>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>MÃ£ hÃ ng</th>
                    <th>TÃªn hÃ ng</th>
                    <th>ÄVT</th>
                    <th style={{ textAlign: 'right' }}>SL</th>
                    <th style={{ textAlign: 'center' }}>Serial</th>
                    <th style={{ textAlign: 'right' }}>ÄÆ¡n giÃ¡</th>
                    <th style={{ textAlign: 'right' }}>ThÃ nh tiá»n</th>
                    <th style={{ textAlign: 'right' }}>% thuáº¿ GTGT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const product = productById.get(String(item.variantId));
                    return (
                      <tr key={item.localId}>
                        <td>{index + 1}</td>
                        <td>{product?.sku || product?.productCode || ''}</td>
                        <td>
                          <Select
                            options={products.map(p => ({ value: p.id, label: `${p.productName} - ${p.sku || p.productCode}` }))}
                            value={products.find(p => String(p.id) === String(item.variantId)) ? { value: item.variantId, label: `${products.find(p => String(p.id) === String(item.variantId)).productName} - ${products.find(p => String(p.id) === String(item.variantId)).sku || products.find(p => String(p.id) === String(item.variantId)).productCode}` } : null}
                            onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.value : '')}
                            placeholder="Chá»n hÃ ng"
                            isClearable
                            autoFocus={item.isNew}
                            styles={customSelectStyles}
                            menuPortalTarget={document.body}
                          />
                        </td>
                        <td>{product?.unitName || ''}</td>
                        <td align="right">
                          <input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
                        </td>
                        <td align="center">
                          <div className={styles.serialCellContainer} style={{ justifyContent: 'center' }}>
                            {product?.trackSerial && (
                              <button
                                type="button"
                                className={(item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? styles.serialBadgeSuccess : styles.serialBadgeWarning}
                                onClick={() => setSerialModalItemId(item.localId)}
                              >
                                <i className="bi bi-upc-scan"></i>
                                {(item.serialNumbers?.length || 0)} / {Number(item.quantity || 0)}
                              </button>
                            )}
                          </div>
                        </td>
                        <td align="right">
                          <input type="text" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} />
                        </td>
                        <td align="right" className={`${styles.textBold} ${styles.textBlue}`}>
                          {money(Number(item.quantity || 0) * Number(item.price || 0))} Ä‘
                        </td>
                        <td align="right">
                          <input type="number" min="0" max="100" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'right', fontSize: '13px' }} value={item.vatPercent !== undefined ? item.vatPercent : ''} onChange={(e) => handleItemChange(item.localId, 'vatPercent', e.target.value)} />
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
                  <tfoot>
                    <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      <td colSpan="4" style={{ textAlign: 'right', padding: '12px' }}></td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{money(totalQuantity)}</td>
                      <td colSpan="2"></td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{money(totalPrice)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div style={{ color: '#4b5563', fontSize: '13px' }}>
                    Tá»•ng sá»‘: <strong>{items.length}</strong> báº£n ghi
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={addItem} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>ThÃªm dÃ²ng</button>
                    <button type="button" onClick={() => setItems([emptyLine()])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>XÃ³a háº¿t dÃ²ng</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '350px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <select style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}>
                      <option>20 báº£n ghi trÃªn 1 trang</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <span style={{ cursor: 'pointer' }}>TrÆ°á»›c</span>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>1</span>
                      <span style={{ cursor: 'pointer' }}>Sau</span>
                    </div>
                  </div>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Tá»•ng tiá»n hÃ ng</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalPrice)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Thuáº¿ GTGT</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalVat)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Tá»•ng tiá»n thanh toÃ¡n</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>Há»§y bá»</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>LÆ°u táº¡m</button>
            <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
              <i className="bi bi-printer"></i> LÆ°u vÃ  ghi sá»•
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
      {showPartnerModal && (
        <SupplierModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSaved={handleSavePartner}
          onError={(msg) => showToast('error', msg)}
        />
      )}
      <CustomerModal
        isOpen={showCustomerDrawer}
        editData={null}
        onClose={() => setShowCustomerDrawer(false)}
        onSaved={handleSaveCustomer}
      />
      <AssemblyOrderSelectionModal
        isOpen={showAssemblyOrderModal}
        onClose={() => setShowAssemblyOrderModal(false)}
        onSelect={(assemblyOrder) => {
          setForm(prev => ({ ...prev, assemblyOrderId: assemblyOrder.id }));
          setShowAssemblyOrderModal(false);
        }}
        assemblyOrders={assemblyOrders}
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
        title="XÃ¡c nháº­n ghi sá»•"
        message="Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n lÆ°u vÃ  ghi sá»• phiáº¿u nháº­p kho nÃ y khÃ´ng? Thao tÃ¡c nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c vÃ  sáº½ cáº­p nháº­t láº¡i sá»‘ lÆ°á»£ng hÃ ng hÃ³a trong kho."
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

export default CreateImportSlipPage;
