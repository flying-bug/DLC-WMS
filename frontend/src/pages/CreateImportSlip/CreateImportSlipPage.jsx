import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import styles from './CreateImportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  variantId: '',
  quantity: 1,
  price: 0,
  note: '',
});

function CreateImportSlipPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    docDate: today(),
    note: '',
    status: 'DRAFT',
  });
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
        setForm(prev => ({ ...prev, partnerId: prev.partnerId || data[0]?.id || '' }));
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
      note: item.note,
    })),
  });

  const submit = async (status, shouldPost = false) => {
    if (!isFormValid) {
      setError('Vui lòng chọn kho, ngày ghi nhận và ít nhất một dòng hàng hợp lệ.');
      return;
    }
    setSaving(true);
    setError('');
    let createdId = null;
    try {
      const response = await importApi.createImportSlip(buildPayload(status));
      const created = unwrap(response);
      createdId = created?.id;
      if (shouldPost && createdId) {
        await importApi.postImportSlip(createdId);
      }
      navigate('/import-history');
    } catch (err) {
      if (createdId) {
        alert('Đã tạo phiếu nhưng Ghi sổ thất bại: ' + (err.response?.data?.userMessage || err.response?.data?.devMessage || err.message));
        navigate('/import-history');
      } else {
        setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu nhập kho');
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
              <i className="bi bi-arrow-left"></i> Tạo phiếu nhập kho
            </a>
          </div>

          {error && <div className={styles.card} style={{ color: '#b91c1c' }}>{error}</div>}

          <div className={styles.topGrid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nhà cung cấp</label>
                  <select className={styles.input} value={form.partnerId} onChange={(e) => handleFormChange('partnerId', e.target.value)}>
                    <option value="">Chưa chọn</option>
                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Kho nhập</label>
                  <select className={styles.input} value={form.warehouseId} onChange={(e) => handleFormChange('warehouseId', e.target.value)}>
                    <option value="">Chọn kho</option>
                    {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Lý do nhập</label>
                  <textarea className={styles.textarea} value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Ngày ghi nhận</label>
                <input type="date" className={styles.input} value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Số phiếu</label>
                <input className={styles.input} placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Trạng thái</label>
                <select className={styles.input} value={form.status} onChange={(e) => handleFormChange('status', e.target.value)}>
                  <option value="DRAFT">Lưu tạm</option>
                  <option value="SUBMITTED">Chờ duyệt</option>
                </select>
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
                          <select className={styles.tableSelect} value={item.variantId} onChange={(e) => handleItemChange(item.localId, 'variantId', e.target.value)}>
                            <option value="">Chọn hàng</option>
                            {products.map(productItem => <option key={productItem.id} value={productItem.id}>{productItem.sku}</option>)}
                          </select>
                        </td>
                        <td>{variantLabel(product)}</td>
                        <td>{product?.unitName || ''}</td>
                        <td align="right">
                          <input type="number" min="0" className={styles.tableInput} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
                        </td>
                        <td align="right">
                          <input type="number" min="0" className={`${styles.tableInput} ${styles.tableInputWide}`} value={item.price} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value)} />
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
            <button className={styles.btnDefault} onClick={() => navigate('/import-history')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className={styles.btnOutlinePrimary} disabled={saving} onClick={() => submit('DRAFT')}>Lưu tạm</button>
            <button className={styles.btnSuccess} disabled={!isFormValid || saving} onClick={() => submit('SUBMITTED')}>
              <i className="bi bi-save"></i> Lưu lại
            </button>
            <button className={styles.btnPrimary} disabled={!isFormValid || saving} onClick={() => submit('SUBMITTED', true)}>
              <i className="bi bi-printer"></i> Lưu và ghi sổ
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CreateImportSlipPage;
