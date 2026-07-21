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
        const list = pageContent(unwrap(supRes));
        setSuppliers(list);
        if (list.length > 0) handleFormChange('partnerId', list[list.length - 1].id);
      }
      setShowPartnerModal(false);
      showToast('success', 'Thêm mới nhà cung cấp thành công!');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tạo nhà cung cấp');
    }
  };

  const handleSaveCustomer = async (isEdit, isContinue) => {
    try {
      const res = await customerApi.searchCustomers('', '', '', 0, 1000);
      const data = pageContent(unwrap(res));
      setCustomers(data);
      if (data && data.length > 0) {
        const newlyAdded = data[data.length - 1];
        if (newlyAdded) {
          handleFormChange('customerId', newlyAdded.id);
        }
      }
      showToast('success', 'Thêm mới khách hàng thành công!');
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
          customerApi.searchCustomers('', '', '', 0, 100),
          assemblyOrderApi.getAssemblyOrders({ size: 100 }),
          exportApi.getUsers({ size: 1000 })
        ]);

        if (warehouseRes.status === 'fulfilled') setWarehouses(pageContent(unwrap(warehouseRes.value)));
        if (supplierRes.status === 'fulfilled') setSuppliers(pageContent(unwrap(supplierRes.value)));
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
        const currentUserId = localStorage.getItem('userId') || localStorage.getItem('id');
        const currentUser = userList.find(u => String(u.id) === String(currentUserId));
        const purchaserName = purchaserUser ? (purchaserUser.fullName || purchaserUser.username) : (detail.salespersonId || currentUser?.fullName || currentUser?.username || '');

        setForm({
          docCode: detail.docCode || '',
          warehouseId: detail.warehouseId || '',
          partnerId: loadedImportType === 'PURCHASE' ? detail.partnerId || '' : '',
          customerId: loadedImportType === 'RETURN' ? detail.partnerId || '' : '',
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
          note: line.note || '',
          serialNumbers: line.serialNumbers || [],
          isNew: false,
        })));
      } catch (err) {
        showToast('error', err.response?.data?.userMessage || 'Không tải được phiếu nhập kho');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
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
    partnerId: importType === 'RETURN' ? (form.customerId ? Number(form.customerId) : null) : (form.partnerId ? Number(form.partnerId) : null),
    docDate: form.docDate,
    status,
    note: form.note,
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: Number(item.quantity),
      quantityOut: 0,
      unitCost: Number(item.price),
      unitPrice: Number(item.price),
      serialNumbers: item.serialNumbers || [],
      note: item.note,
    })),
    issuePurpose: importType,
    recipientName: form.deliverer,
    salespersonId: (!isNaN(Number(form.purchaser)) && String(form.purchaser).trim() !== '') ? Number(form.purchaser) : null,
    referenceType: importType === 'PRODUCTION' && form.assemblyOrderId ? 'ASSEMBLY_ORDER' : (form.referenceType || undefined),
    referenceId: importType === 'PRODUCTION' && form.assemblyOrderId ? Number(form.assemblyOrderId) : (form.referenceId || undefined),
  });

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      showToast('error', 'Vui lòng chọn kho, ngày nhập kho và ít nhất một dòng hàng hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      await importApi.updateImportSlip(id, buildPayload(status));
      if (shouldPost) {
        await importApi.postImportSlip(id);
      }
      navigate('/import-history', { state: { toastMessage: shouldPost ? 'Ghi sổ phiếu nhập kho thành công!' : 'Cập nhật phiếu nhập kho thành công!', toastType: 'success' } });
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu nhập kho');
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
              <i className="bi bi-arrow-left"></i> Sửa phiếu nhập kho {form.docCode ? form.docCode : ''}
            </a>
            <span style={{ color: '#d1d5db', fontSize: '20px' }}>|</span>
            <div style={{ width: '280px' }}>
              <Select
                value={[{ value: 'PURCHASE', label: 'Nhập kho mua hàng' }, { value: 'PRODUCTION', label: 'Nhập kho thành phẩm sản xuất' }, { value: 'RETURN', label: 'Nhập kho hàng bán bị trả lại' }].find(o => o.value === importType)}
                options={[
                  { value: 'PURCHASE', label: 'Nhập kho mua hàng' },
                  { value: 'PRODUCTION', label: 'Nhập kho thành phẩm sản xuất' },
                  { value: 'RETURN', label: 'Nhập kho hàng bán bị trả lại' }
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
          <div className={styles.card}>Đang tải dữ liệu...</div>
        ) : (
          <>
            <div className={styles.topGrid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <i className={`bi bi-info-circle ${styles.cardIcon}`}></i>
                    Thông tin chung
                  </h2>
                </div>
                {importType === 'PURCHASE' && (
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">Mã NCC <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Select
                            options={suppliers.map(s => ({ value: s.id, label: s.code || `NCC#${s.id}` }))}
                            value={suppliers.find(s => String(s.id) === String(form.partnerId)) ? { value: form.partnerId, label: suppliers.find(s => String(s.id) === String(form.partnerId)).code || `NCC#${form.partnerId}` } : null}
                            onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                            placeholder="Chọn Mã NCC..."
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
                      <label className="misa-label">Tên NCC</label>
                      <Select
                        options={suppliers.map(s => ({ value: s.id, label: s.name || '' }))}
                        value={suppliers.find(s => String(s.id) === String(form.partnerId)) ? { value: form.partnerId, label: suppliers.find(s => String(s.id) === String(form.partnerId)).name || '' } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="Chọn Tên NCC..."
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                  </div>
                )}

                {importType === 'PRODUCTION' && (
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 100%' }}>
                      <label className="misa-label">Lệnh sản xuất <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          className="misa-input" 
                          readOnly 
                          value={assemblyOrders.find(o => String(o.id) === String(form.assemblyOrderId))?.orderCode || ''} 
                          placeholder="Nhấn biểu tượng bên cạnh để chọn lệnh..."
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
                        <label className="misa-label">Mã KH <span className="required">*</span></label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <Select
                              options={customers.map(c => ({ value: c.id, label: c.code || `KH#${c.id}` }))}
                              value={customers.find(c => String(c.id) === String(form.customerId)) ? { value: form.customerId, label: customers.find(c => String(c.id) === String(form.customerId)).code || `KH#${form.customerId}` } : null}
                              onChange={(selected) => handleFormChange('customerId', selected ? selected.value : '')}
                              placeholder="Chọn Mã KH..."
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
                        <label className="misa-label">Tên Khách hàng</label>
                        <Select
                          options={customers.map(c => ({ value: c.id, label: c.name || '' }))}
                          value={customers.find(c => String(c.id) === String(form.customerId)) ? { value: form.customerId, label: customers.find(c => String(c.id) === String(form.customerId)).name || '' } : null}
                          onChange={(selected) => handleFormChange('customerId', selected ? selected.value : '')}
                          placeholder="Chọn Tên KH..."
                          isClearable
                          styles={customSelectStyles}
                        />
                      </div>
                    </div>
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                      <div className="misa-form-group" style={{ flex: '1' }}>
                        <label className="misa-label">Địa chỉ</label>
                        <input type="text" className="misa-input" readOnly value={customers.find(c => String(c.id) === String(form.customerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} />
                      </div>
                    </div>
                  </>
                )}

              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho nhập <span className="required">*</span></label>
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
                </div>
              </div>
              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                {(importType === 'PURCHASE' || importType === 'PRODUCTION') && (
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">Người giao hàng</label>
                    <input 
                      type="text" 
                      className="misa-input" 
                      value={form.deliverer || ''} 
                      onChange={(e) => handleFormChange('deliverer', e.target.value)} 
                      placeholder="Nhập người giao hàng..."
                    />
                  </div>
                )}
                <div className="misa-form-group" style={{ flex: importType === 'RETURN' ? '1' : '0 0 50%' }}>
                  <label className="misa-label">
                    {importType === 'PURCHASE' && 'Nhân viên mua hàng'}
                    {importType === 'PRODUCTION' && 'Nhân viên phụ trách'}
                    {importType === 'RETURN' && 'Nhân viên nhận hàng'}
                  </label>
                  <input 
                    type="text" 
                    className="misa-input" 
                    value={form.purchaser || ''} 
                    onChange={(e) => handleFormChange('purchaser', e.target.value)} 
                    placeholder="Nhập tên nhân viên..."
                  />
                </div>
              </div>

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                  <label className="misa-label">Ghi chú</label>
                  <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
                </div>

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
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
                        title="Bỏ đính kèm"
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
                    Thông tin chứng từ
                  </h2>
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">Ngày nhập kho <span className="required">*</span></label>
                  <input type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">Số phiếu</label>
                  <input className="misa-input" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.cardHeader} style={{ padding: '24px 24px 20px', margin: 0 }}>
                <h2 className={styles.cardTitle}>
                  <i className={`bi bi-box-seam ${styles.cardIcon}`}></i>
                  Bảng hàng hóa
                </h2>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter} style={{ width: '40px' }}>#</th>
                      <th>Tên hàng</th>
                      <th>Mã hàng</th>
                      <th>ĐVT</th>
                      <th style={{ textAlign: 'right' }}>SL</th>
                      <th style={{ textAlign: 'center' }}>Serial</th>
                      <th style={{ textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ textAlign: 'right' }}>Thành tiền</th>
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
                              placeholder="Chọn hàng"
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
                            {money(Number(item.quantity || 0) * Number(item.price || 0))} đ
                          </td>
                          <td><button className={styles.deleteBtn} onClick={() => removeItem(item.localId)}><i className="bi bi-trash"></i></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableFooter}>
                <span style={{ marginRight: '32px' }}>Tổng cộng hàng nhập:</span>
                <span style={{ width: '80px', textAlign: 'center', marginRight: '64px' }}>{money(totalQuantity)}</span>
                <span style={{ color: 'var(--color-primary)' }}>{money(totalPrice)}</span>
              </div>

              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}><i className="bi bi-plus-circle"></i> Thêm dòng mới</button>
              </div>
            </div>
          </>
        )}

        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={saving || loading} onClick={() => submit('DRAFT')}>Lưu tạm</button>
            <button className="btn-misa-post" disabled={!isFormValid || saving || loading} onClick={() => setShowConfirm(true)}><i className="bi bi-printer"></i> Lưu và ghi sổ</button>
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
        title="Xác nhận ghi sổ"
        message="Bạn có chắc chắn muốn lưu và ghi sổ phiếu nhập kho này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
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
