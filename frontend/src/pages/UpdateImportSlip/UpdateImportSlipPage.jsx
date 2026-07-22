import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import * as customerApi from '../../api/customerApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
import CustomerModal from '../Customer/components/CustomerModal';
import AssemblyOrderSelectionModal from '../CreateImportSlip/components/AssemblyOrderSelectionModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Toast from '../../components/ui/Toast/Toast';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import styles from './UpdateImportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
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
  id: null,
  variantId: '',
  quantity: 1,
  price: 0,
  vatPercent: 0,
  note: '',
  serialNumbers: [],
  isNew: true,
});

function UpdateImportSlipPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    partnerName: '',
    customerName: '',
    docDate: new Date().toLocaleDateString('sv-SE'),
    note: '',
    status: 'DRAFT',
  });
  const [importType, setImportType] = useState('PURCHASE');
  const [customers, setCustomers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [showAssemblyOrderModal, setShowAssemblyOrderModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [items, setItems] = useState([emptyLine()]);

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
      showToast('success', 'ThÃƒÂªm mÃ¡Â»â€ºi nhÃƒÂ  cung cÃ¡ÂºÂ¥p thÃƒÂ nh cÃƒÂ´ng!');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'CÃƒÂ³ lÃ¡Â»â€”i xÃ¡ÂºÂ£y ra khi tÃ¡ÂºÂ¡o nhÃƒÂ  cung cÃ¡ÂºÂ¥p');
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
      showToast('success', 'ThÃƒÂªm mÃ¡Â»â€ºi khÃƒÂ¡ch hÃƒÂ ng thÃƒÂ nh cÃƒÂ´ng!');
    } catch (err) {
      console.error(err);
    } finally {
      if (!isContinue) {
        setShowCustomerDrawer(false);
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [detailRes, warehouseRes, supplierRes, productRes, customerRes, assemblyOrderRes, userRes] = await Promise.allSettled([
          importApi.getImportDetail(id),
          importApi.getWarehouses({ size: 100 }),
          importApi.getSuppliers(),
          importApi.getProducts({ size: 100 }),
          customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
          assemblyOrderApi.getAssemblyOrders({ size: 100 }),
          exportApi.getUsers({ size: 1000 })
        ]);

        if (warehouseRes.status === 'fulfilled') setWarehouses(pageContent(unwrap(warehouseRes.value)));
        if (supplierRes.status === 'fulfilled') setSuppliers(pageContent(unwrap(supplierRes.value)).filter(s => s.status !== 'INACTIVE'));
        if (productRes.status === 'fulfilled') setProducts(pageContent(unwrap(productRes.value)));
        if (customerRes.status === 'fulfilled') setCustomers(pageContent(unwrap(customerRes.value)));
        if (assemblyOrderRes.status === 'fulfilled') setAssemblyOrders(pageContent(unwrap(assemblyOrderRes.value)));
        const userList = userRes.status === 'fulfilled' ? pageContent(unwrap(userRes.value)) : [];
        setUsers(userList);

        const detail = detailRes.status === 'fulfilled' ? unwrap(detailRes.value) : null;
        if (!detail) throw new Error('Cannot load slip details');

        const loadedImportType = detail.issuePurpose || 'PURCHASE';
        setImportType(loadedImportType);

        const purchaserUser = userList.find(u => String(u.id) === String(detail.salespersonId));
        const currentUserId = sessionStorage.getItem('userId') || sessionStorage.getItem('id');
        const currentUser = userList.find(u => String(u.id) === String(currentUserId));
        const purchaserName = purchaserUser ? (purchaserUser.fullName || purchaserUser.username) : (detail.salespersonId || currentUser?.fullName || currentUser?.username || '');

        setForm({
          docCode: detail.docCode || '',
          warehouseId: detail.warehouseId || '',
          partnerId: loadedImportType === 'PURCHASE' ? detail.partnerId || '' : '',
          partnerName: detail.partnerName || '',
          customerId: loadedImportType === 'RETURN' ? detail.partnerId || '' : '',
          customerName: loadedImportType === 'RETURN' ? detail.partnerName || '' : '',
          assemblyOrderId: loadedImportType === 'PRODUCTION' ? detail.referenceId || '' : '',
          assemblyOrderCode: '', // will be resolved in render
          deliverer: detail.recipientName || '',
          purchaser: purchaserName,
          referenceType: detail.referenceType || '',
          referenceId: detail.referenceId || '',
          referenceCode: detail.referenceCode || '',
          docDate: detail.docDate ? detail.docDate.split('T')[0] : '',
          note: detail.note || '',
          status: detail.status || 'DRAFT',
        });
        setItems((detail.lines || []).map(line => ({
          localId: crypto.randomUUID(),
          id: line.id,
          variantId: line.variantId || '',
          quantity: line.quantityIn || 1,
          price: line.unitCost || 0,
          vatPercent: line.vatPercent || 0,
          note: line.note || '',
          serialNumbers: line.serialNumbers || [],
          isNew: false,
        })));
      } catch (err) {
        showToast('error', err.response?.data?.userMessage || 'KhÃƒÂ´ng tÃ¡ÂºÂ£i Ã„â€˜Ã†Â°Ã¡Â»Â£c phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0) * Number(item.vatPercent || 0) / 100), 0);
  const grandTotal = totalPrice + totalVat;
  const isFormValid = Boolean(form.warehouseId && form.docDate && items.length && items.every(item => item.variantId && Number(item.quantity) > 0 && Number(item.price) >= 0));

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (localId, field, value) => {
    setItems(prev => prev.map(item => item.localId === localId ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { ...emptyLine(), variantId: products[0]?.id || '' }]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : prev);
  };

  const handleSerialModalClose = (savedSerials) => {
    if (savedSerials !== null && serialModalItemId) {
      handleItemChange(serialModalItemId, 'serialNumbers', savedSerials);
    }
    setSerialModalItemId(null);
  };

  const selectedSerialItem = useMemo(() => items.find(i => i.localId === serialModalItemId), [items, serialModalItemId]);
  const selectedSerialProduct = useMemo(() => selectedSerialItem ? productById.get(String(selectedSerialItem.variantId)) : null, [selectedSerialItem, productById]);

  const buildPayload = (status) => ({
    docCode: form.docCode || undefined,
    warehouseId: Number(form.warehouseId),
    partnerId: importType === 'RETURN' ? (form.customerId ? Number(form.customerId) : null)
      : importType === 'OTHER' ? null
      : (form.partnerId ? Number(form.partnerId) : null),
    docDate: form.docDate,
    status,
    note: form.note,
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

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      showToast('error', 'Vui lÃƒÂ²ng chÃ¡Â»Ân kho, ngÃƒÂ y nhÃ¡ÂºÂ­p kho vÃƒÂ  ÃƒÂ­t nhÃ¡ÂºÂ¥t mÃ¡Â»â„¢t dÃƒÂ²ng hÃƒÂ ng hÃ¡Â»Â£p lÃ¡Â»â€¡.');
      return;
    }
    setSaving(true);
    try {
      await importApi.updateImportSlip(id, buildPayload(status));
      if (shouldPost) {
        await importApi.postImportSlip(id);
      }
      navigate('/import-history', { state: { toastMessage: shouldPost ? 'Ghi sÃ¡Â»â€¢ phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho thÃƒÂ nh cÃƒÂ´ng!' : 'CÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho thÃƒÂ nh cÃƒÂ´ng!', toastType: 'success' } });
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'KhÃƒÂ´ng cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t Ã„â€˜Ã†Â°Ã¡Â»Â£c phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/import-history'); }}>
              <i className="bi bi-arrow-left"></i> SÃ¡Â»Â­a phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho {form.docCode ? form.docCode : ''}
            </a>
            <span style={{ color: '#d1d5db', fontSize: '20px' }}>|</span>
            <div style={{ width: '280px' }}>
              <Select
                value={[
                  { value: 'PURCHASE', label: 'NhÃ¡ÂºÂ­p kho mua hÃƒÂ ng' },
                  { value: 'PRODUCTION', label: 'NhÃ¡ÂºÂ­p kho thÃƒÂ nh phÃ¡ÂºÂ©m sÃ¡ÂºÂ£n xuÃ¡ÂºÂ¥t' },
                  { value: 'RETURN', label: 'NhÃ¡ÂºÂ­p kho hÃƒÂ ng bÃƒÂ¡n bÃ¡Â»â€¹ trÃ¡ÂºÂ£ lÃ¡ÂºÂ¡i' },
                  { value: 'OTHER', label: 'KhÃƒÂ¡c' }
                ].find(o => o.value === importType)}
                options={[
                  { value: 'PURCHASE', label: 'NhÃ¡ÂºÂ­p kho mua hÃƒÂ ng' },
                  { value: 'PRODUCTION', label: 'NhÃ¡ÂºÂ­p kho thÃƒÂ nh phÃ¡ÂºÂ©m sÃ¡ÂºÂ£n xuÃ¡ÂºÂ¥t' },
                  { value: 'RETURN', label: 'NhÃ¡ÂºÂ­p kho hÃƒÂ ng bÃƒÂ¡n bÃ¡Â»â€¹ trÃ¡ÂºÂ£ lÃ¡ÂºÂ¡i' },
                  { value: 'OTHER', label: 'KhÃƒÂ¡c' }
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

        {loading ? (
          <div className={styles.card}>Ã„Âang tÃ¡ÂºÂ£i dÃ¡Â»Â¯ liÃ¡Â»â€¡u...</div>
        ) : (
          <>
            <div className={styles.topGrid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <i className={`bi bi-info-circle ${styles.cardIcon}`}></i>
                    ThÃƒÂ´ng tin chung
                  </h2>
                </div>
                {importType === 'PURCHASE' && (
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">MÃƒÂ£ nhÃƒÂ  cung cÃ¡ÂºÂ¥p <span className="required">*</span></label>
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
                            placeholder="ChÃ¡Â»Ân MÃƒÂ£ nhÃƒÂ  cung cÃ¡ÂºÂ¥p..."
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
                      <label className="misa-label">TÃƒÂªn nhÃƒÂ  cung cÃ¡ÂºÂ¥p</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.partnerName !== undefined ? form.partnerName : (suppliers.find(s => String(s.id) === String(form.partnerId))?.name || '')}
                        onChange={(e) => handleFormChange('partnerName', e.target.value)}
                        placeholder="NhÃ¡ÂºÂ­p tÃƒÂªn nhÃƒÂ  cung cÃ¡ÂºÂ¥p..."
                        readOnly={!!form.partnerId}
                        style={{ backgroundColor: form.partnerId ? '#f9fafb' : '#fff' }}
                      />
                    </div>
                  </div>
                )}

                {importType === 'PRODUCTION' && (
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 100%' }}>
                      <label className="misa-label">LÃ¡Â»â€¡nh sÃ¡ÂºÂ£n xuÃ¡ÂºÂ¥t <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="misa-input"
                          readOnly
                          value={assemblyOrders.find(o => String(o.id) === String(form.assemblyOrderId))?.orderCode || ''}
                          placeholder="NhÃ¡ÂºÂ¥n biÃ¡Â»Æ’u tÃ†Â°Ã¡Â»Â£ng bÃƒÂªn cÃ¡ÂºÂ¡nh Ã„â€˜Ã¡Â»Æ’ chÃ¡Â»Ân lÃ¡Â»â€¡nh..."
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
                        <label className="misa-label">MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng <span className="required">*</span></label>
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
                              placeholder="ChÃ¡Â»Ân MÃƒÂ£ khÃƒÂ¡ch hÃƒÂ ng..."
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
                        <label className="misa-label">TÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng</label>
                        <input
                          type="text"
                          className="misa-input"
                          value={form.customerName !== undefined ? form.customerName : (customers.find(c => String(c.id) === String(form.customerId))?.name || '')}
                          onChange={(e) => handleFormChange('customerName', e.target.value)}
                          placeholder="NhÃ¡ÂºÂ­p tÃƒÂªn khÃƒÂ¡ch hÃƒÂ ng..."
                          readOnly={!!form.customerId}
                          style={{ backgroundColor: form.customerId ? '#f9fafb' : '#fff' }}
                        />
                      </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                      <div className="misa-form-group" style={{ flex: '1' }}>
                        <label className="misa-label">Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€°</label>
                        <input type="text" className="misa-input" readOnly value={customers.find(c => String(c.id) === String(form.customerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} />
                      </div>
                    </div>
                  </>
                )}

                {importType === 'OTHER' && (
                  <>
                    <div className="misa-form-row">
                      <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                        <label className="misa-label">MÃƒÂ£ Ã„â€˜Ã¡Â»â€˜i tÃ†Â°Ã¡Â»Â£ng</label>
                        <input
                          type="text"
                          className="misa-input"
                          value={form.otherObjectCode || ''}
                          onChange={(e) => handleFormChange('otherObjectCode', e.target.value)}
                          placeholder="NhÃ¡ÂºÂ­p mÃƒÂ£ Ã„â€˜Ã¡Â»â€˜i tÃ†Â°Ã¡Â»Â£ng..."
                        />
                      </div>
                      <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                        <label className="misa-label">TÃƒÂªn Ã„â€˜Ã¡Â»â€˜i tÃ†Â°Ã¡Â»Â£ng</label>
                        <input
                          type="text"
                          className="misa-input"
                          value={form.otherObjectName || ''}
                          onChange={(e) => handleFormChange('otherObjectName', e.target.value)}
                          placeholder="NhÃ¡ÂºÂ­p tÃƒÂªn Ã„â€˜Ã¡Â»â€˜i tÃ†Â°Ã¡Â»Â£ng..."
                        />
                      </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                      <div className="misa-form-group" style={{ flex: '1' }}>
                        <label className="misa-label">Ã„ÂÃ¡Â»â€¹a chÃ¡Â»â€°</label>
                        <input
                          type="text"
                          className="misa-input"
                          value={form.otherObjectAddress || ''}
                          onChange={(e) => handleFormChange('otherObjectAddress', e.target.value)}
                          placeholder="NhÃ¡ÂºÂ­p Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€°..."
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="misa-form-row" style={{ marginTop: '12px' }}>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">Kho nhÃ¡ÂºÂ­p <span className="required">*</span></label>
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
                    <label className="misa-label">
                      {importType === 'PURCHASE' && 'NhÃƒÂ¢n viÃƒÂªn mua hÃƒÂ ng'}
                      {importType === 'PRODUCTION' && 'NhÃƒÂ¢n viÃƒÂªn phÃ¡Â»Â¥ trÃƒÂ¡ch'}
                      {importType === 'RETURN' && 'NhÃƒÂ¢n viÃƒÂªn nhÃ¡ÂºÂ­n hÃƒÂ ng'}
                      {importType === 'OTHER' && 'NhÃƒÂ¢n viÃƒÂªn nhÃ¡ÂºÂ­n hÃƒÂ ng'}
                    </label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.purchaser || ''}
                      onChange={(e) => handleFormChange('purchaser', e.target.value)}
                      placeholder="NhÃ¡ÂºÂ­p tÃƒÂªn nhÃƒÂ¢n viÃƒÂªn..."
                    />
                  </div>
                </div>

                {(importType === 'PURCHASE' || importType === 'PRODUCTION' || importType === 'OTHER') && (
                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">NgÃ†Â°Ã¡Â»Âi giao hÃƒÂ ng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.deliverer || ''}
                        onChange={(e) => handleFormChange('deliverer', e.target.value)}
                        placeholder="NhÃ¡ÂºÂ­p ngÃ†Â°Ã¡Â»Âi giao hÃƒÂ ng..."
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    </div>
                  </div>
                )}

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                  <label className="misa-label">Ghi chÃƒÂº</label>
                  <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
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
                  {form.referenceId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                      <span className={styles.textBlue} style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="bi bi-file-earmark-text"></i>
                        {form.referenceCode}
                      </span>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => setForm(prev => ({ ...prev, referenceType: '', referenceId: '', referenceCode: '' }))}
                        title="BÃ¡Â»Â Ã„â€˜ÃƒÂ­nh kÃƒÂ¨m"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <i className={`bi bi-file-earmark-text ${styles.cardIcon}`}></i>
                    ThÃƒÂ´ng tin chÃ¡Â»Â©ng tÃ¡Â»Â«
                  </h2>
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">SÃ¡Â»â€˜ phiÃ¡ÂºÂ¿u</label>
                  <input className="misa-input" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">NgÃƒÂ y nhÃ¡ÂºÂ­p kho <span className="required">*</span></label>
                  <input type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.cardHeader} style={{ padding: '24px 24px 20px', margin: 0 }}>
                <h2 className={styles.cardTitle}>
                  <i className={`bi bi-box-seam ${styles.cardIcon}`}></i>
                  BÃ¡ÂºÂ£ng hÃƒÂ ng hÃƒÂ³a
                </h2>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter} style={{ width: '40px' }}>#</th>
                      <th>TÃƒÂªn hÃƒÂ ng</th>
                      <th>MÃƒÂ£ hÃƒÂ ng</th>
                      <th>Ã„ÂVT</th>
                      <th style={{ textAlign: 'right' }}>SL</th>
                      <th style={{ textAlign: 'center' }}>Serial</th>
                      <th style={{ textAlign: 'right' }}>Ã„ÂÃ†Â¡n giÃƒÂ¡</th>
                      <th style={{ textAlign: 'right' }}>ThÃƒÂ nh tiÃ¡Â»Ân</th>
                      <th style={{ textAlign: 'right' }}>% thuÃ¡ÂºÂ¿ GTGT</th>
                      <th style={{ width: '40px' }}></th>
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
                              autoFocus={item.isNew}
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                            />
                          </td>
                          <td>{product?.sku || product?.productCode || ''}</td>
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
                            {money(Number(item.quantity || 0) * Number(item.price || 0))} Ã„â€˜
                          </td>
                          <td align="right">
                            <input type="number" min="0" max="100" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'right', fontSize: '13px' }} value={item.vatPercent !== undefined ? item.vatPercent : ''} onChange={(e) => handleItemChange(item.localId, 'vatPercent', e.target.value)} />
                          </td>
                          <td><button className={styles.deleteBtn} onClick={() => removeItem(item.localId)}><i className="bi bi-trash"></i></button></td>
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
                    TÃ¡Â»â€¢ng sÃ¡Â»â€˜: <strong>{items.length}</strong> bÃ¡ÂºÂ£n ghi
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={addItem} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>ThÃƒÂªm dÃƒÂ²ng</button>
                    <button type="button" onClick={() => setItems([emptyLine()])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>XÃƒÂ³a hÃ¡ÂºÂ¿t dÃƒÂ²ng</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '350px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <select style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}>
                      <option>20 bÃ¡ÂºÂ£n ghi trÃƒÂªn 1 trang</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <span style={{ cursor: 'pointer' }}>TrÃ†Â°Ã¡Â»â€ºc</span>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>1</span>
                      <span style={{ cursor: 'pointer' }}>Sau</span>
                    </div>
                  </div>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>TÃ¡Â»â€¢ng tiÃ¡Â»Ân hÃƒÂ ng</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalPrice)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>ThuÃ¡ÂºÂ¿ GTGT</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalVat)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>TÃ¡Â»â€¢ng tiÃ¡Â»Ân thanh toÃƒÂ¡n</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>HÃ¡Â»Â§y bÃ¡Â»Â</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" style={{ marginRight: '8px', backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db' }} onClick={() => window.print()}>
              <i className="bi bi-printer"></i> In phiÃ¡ÂºÂ¿u
            </button>
            <button className="btn-misa-draft" disabled={saving || loading} onClick={() => submit('DRAFT')}>LÃ†Â°u tÃ¡ÂºÂ¡m</button>
            <button className="btn-misa-post" disabled={!isFormValid || saving || loading} onClick={() => setShowConfirm(true)}><i className="bi bi-printer"></i> LÃ†Â°u vÃƒÂ  ghi sÃ¡Â»â€¢</button>
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
      <CustomerModal
        isOpen={showCustomerDrawer}
        editData={null}
        onClose={() => setShowCustomerDrawer(false)}
        onSaved={handleSaveCustomer}
      />
      {showPartnerModal && (
        <SupplierModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSaved={handleSavePartner}
          onError={(msg) => showToast('error', msg)}
        />
      )}
      <AssemblyOrderSelectionModal
        isOpen={showAssemblyOrderModal}
        onClose={() => setShowAssemblyOrderModal(false)}
        assemblyOrders={assemblyOrders}
        onSelect={(order) => {
          setForm(prev => ({ ...prev, assemblyOrderId: order.id, assemblyOrderCode: order.orderCode }));
          setShowAssemblyOrderModal(false);
        }}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(docType, docId, docCode) => {
          setForm(prev => ({ ...prev, referenceType: docType, referenceId: docId, referenceCode: docCode }));
          setShowReferenceModal(false);
        }}
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="XÃƒÂ¡c nhÃ¡ÂºÂ­n ghi sÃ¡Â»â€¢"
        message="BÃ¡ÂºÂ¡n cÃƒÂ³ chÃ¡ÂºÂ¯c chÃ¡ÂºÂ¯n muÃ¡Â»â€˜n lÃ†Â°u vÃƒÂ  ghi sÃ¡Â»â€¢ phiÃ¡ÂºÂ¿u nhÃ¡ÂºÂ­p kho nÃƒÂ y khÃƒÂ´ng? Thao tÃƒÂ¡c nÃƒÂ y khÃƒÂ´ng thÃ¡Â»Æ’ hoÃƒÂ n tÃƒÂ¡c vÃƒÂ  sÃ¡ÂºÂ½ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t lÃ¡ÂºÂ¡i sÃ¡Â»â€˜ lÃ†Â°Ã¡Â»Â£ng hÃƒÂ ng hÃƒÂ³a trong kho."
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

export default UpdateImportSlipPage;
