import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
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
    docDate: new Date().toISOString().split('T')[0],
    note: '',
    status: 'DRAFT',
  });
  const [items, setItems] = useState([emptyLine()]);

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [detailRes, warehouseRes, supplierRes, productRes] = await Promise.all([
          importApi.getImportDetail(id),
          importApi.getWarehouses({ size: 100 }),
          importApi.getSuppliers(),
          importApi.getProducts({ size: 100 }),
        ]);

        const detail = unwrap(detailRes);
        setWarehouses(pageContent(unwrap(warehouseRes)));
        setSuppliers(pageContent(unwrap(supplierRes)));
        setProducts(pageContent(unwrap(productRes)));
        setForm({
          docCode: detail.docCode || '',
          warehouseId: detail.warehouseId || '',
          partnerId: detail.partnerId || '',
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
    partnerId: form.partnerId ? Number(form.partnerId) : null,
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
      navigate('/import-history', { state: { toastMessage: 'Cập nhật phiếu nhập kho thành công!', toastType: 'success' } });
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
          <button className={styles.backBtn} onClick={() => navigate('/import-history')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1 className={styles.pageTitle}>Sửa phiếu nhập kho {form.docCode ? form.docCode : ''}</h1>
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
                      <th>Mã hàng</th>
                      <th style={{ minWidth: '150px' }}>Tên hàng</th>
                      <th>ĐVT</th>
                      <th className={styles.textCenter} style={{ width: '100px' }}>Số lượng</th>
                      <th className={styles.textRight}>Đơn giá nhập</th>
                      <th className={styles.textRight}>Thành tiền</th>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          <td><input type="number" min="0" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '80px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} /></td>
                          <td><input type="text" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} /></td>
                          <td className={`${styles.textRight} ${styles.boldText}`}>{money(Number(item.quantity || 0) * Number(item.price || 0))}</td>
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

export default UpdateImportSlipPage;
