import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
import Toast from '../../components/ui/Toast/Toast';
import ManageSerialModal from './ManageSerialModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Select from 'react-select';
import styles from './CreateImportSlipPage.module.css';

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
  serialNumbers: [],
  quantity: 1,
  price: 0,
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
    docDate: today(),
    note: '',
    status: 'DRAFT',
  }));
  const [items, setItems] = useState([emptyLine()]);

  useEffect(() => {
    const loadLookups = async () => {
      const [warehouseRes, supplierRes, productRes] = await Promise.allSettled([
        importApi.getWarehouses({ size: 100 }),
        importApi.getSuppliers(),
        importApi.getProducts({ size: 100 }),
      ]);
      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || data[0]?.id || '' }));
      }
      if (supplierRes.status === 'fulfilled') {
        const data = pageContent(unwrap(supplierRes.value));
        setSuppliers(data);
      }
      if (productRes.status === 'fulfilled') {
        const data = pageContent(unwrap(productRes.value));
        setProducts(data);
      }
    };
    loadLookups();
  }, []);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const isLineValid = (item) => {
    const product = productById.get(String(item.variantId));
    const quantity = Number(item.quantity || 0);
    const hasValidSerials = !product?.trackSerial || (Number.isInteger(quantity) && item.serialNumbers?.length === quantity);
    return item.variantId && quantity > 0 && Number(item.price) >= 0 && hasValidSerials;
  };
  const isFormValid = Boolean(form.warehouseId && form.docDate && items.length && items.every(isLineValid));

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
    partnerId: form.partnerId ? Number(form.partnerId) : null,
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(localStorage.getItem('userId') || localStorage.getItem('id') || 1),
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: Number(item.quantity),
      quantityOut: 0,
      unitCost: Number(item.price),
      unitPrice: Number(item.price),
      serialNumbers: item.serialNumbers || [],
      note: item.note,
    })),
  });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleSavePartner = async (formData) => {
    try {
      const res = await importApi.createSupplier(formData);
      const newSupplier = res.data?.data || res.data;
      setSuppliers(prev => [...prev, newSupplier]);
      setForm(prev => ({ ...prev, partnerId: newSupplier.id }));
      setShowPartnerModal(false);
      showToast('success', 'Thêm mới nhà cung cấp thành công!');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tạo nhà cung cấp');
    }
  };

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      if (!form.warehouseId) return showToast('error', 'Vui lòng chọn kho nhập.');
      if (!form.partnerId) return showToast('error', 'Vui lòng chọn nhà cung cấp.');
      if (!form.docDate) return showToast('error', 'Vui lòng chọn ngày nhập kho.');
      if (!items.length || !items.every(isLineValid)) {
        return showToast('error', 'Vui lòng chọn hàng hóa và nhập số lượng hợp lệ (Hàng có serial cần khớp số lượng mã quét).');
      }
      return showToast('error', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
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
      navigate('/import-history', { state: { toastMessage: 'Lưu phiếu nhập kho thành công!', toastType: 'success' } });
    } catch (err) {
      if (createdId) {
        navigate('/import-history', { state: { toastMessage: 'Đã tạo phiếu nhưng Ghi sổ thất bại: ' + (err.response?.data?.userMessage || err.message), toastType: 'warning' } });
      } else {
        showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu nhập kho');
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
            <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/import-history'); }}>
              <i className="bi bi-arrow-left"></i> Tạo phiếu nhập kho {form.docCode ? form.docCode : ''}
            </a>
          </div>

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>

              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: '0 0 35%' }}>
                  <label className="misa-label">Mã NCC</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <Select
                        options={suppliers.map(s => ({ value: s.id, label: s.code }))}
                        value={suppliers.find(s => String(s.id) === String(form.partnerId)) ? { value: form.partnerId, label: suppliers.find(s => String(s.id) === String(form.partnerId)).code } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="Chọn NCC"
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
                  <label className="misa-label">Tên NCC</label>
                  <input type="text" className="misa-input" readOnly value={suppliers.find(s => String(s.id) === String(form.partnerId))?.name || ''} style={{ backgroundColor: '#f3f4f6' }} />
                </div>
              </div>

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

              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ghi chú</label>
                <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Ngày nhập kho <span className="required">*</span></label>
                <input type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Số phiếu</label>
                <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-box-seam text-gray-500"></i>
              <h3 className={styles.cardTitle}>Bảng hàng hóa</h3>
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
                    <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
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
                          <Select
                            options={products.map(p => ({ value: p.id, label: p.sku }))}
                            value={products.find(p => String(p.id) === String(item.variantId)) ? { value: item.variantId, label: products.find(p => String(p.id) === String(item.variantId)).sku } : null}
                            onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.value : '')}
                            placeholder="Chọn hàng"
                            isClearable
                            autoFocus={item.isNew}
                            styles={customSelectStyles}
                          />
                        </td>
                        <td>{variantLabel(product)}</td>
                        <td>
                          <div className={styles.serialCellContainer}>
                            <span>{product?.unitName || ''}</span>
                            {product?.trackSerial && (
                              <button
                                type="button"
                                className={(item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? styles.serialBadgeSuccess : styles.serialBadgeWarning}
                                onClick={() => setSerialModalItemId(item.localId)}
                              >
                                <i className="bi bi-upc-scan"></i>
                                {(item.serialNumbers?.length || 0)} / {Number(item.quantity || 0)} Serial
                              </button>
                            )}
                          </div>
                        </td>
                        <td align="right">
                          <input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '80px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
                        </td>
                        <td align="right">
                          <input type="text" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} />
                        </td>
                        <td align="right" className={`${styles.textBold} ${styles.textBlue}`}>
                          {money(Number(item.quantity || 0) * Number(item.price || 0))} đ
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
                <span>Tổng cộng hàng nhập:</span>
                <span>{money(totalQuantity)}</span>
                <span className={styles.textBlue}>{money(totalPrice)} đ</span>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}><i className="bi bi-plus-circle"></i> Thêm dòng mới</button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>Lưu tạm</button>
            <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
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
      {showPartnerModal && (
        <SupplierModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSaved={handleSavePartner}
          onError={(msg) => showToast('error', msg)}
        />
      )}
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

export default CreateImportSlipPage;
