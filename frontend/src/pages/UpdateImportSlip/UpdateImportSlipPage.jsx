import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import styles from './UpdateImportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  id: null,
  variantId: '',
  quantity: 1,
  price: 0,
  note: '',
});

function UpdateImportSlipPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    docDate: '',
    note: '',
    status: 'DRAFT',
  });
  const [items, setItems] = useState([emptyLine()]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
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
          docDate: detail.docDate || '',
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
        })));
      } catch (err) {
        setError(err.response?.data?.userMessage || 'Không tải được phiếu nhập kho');
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
    try {
      await importApi.updateImportSlip(id, buildPayload(status));
      if (shouldPost) {
        await importApi.postImportSlip(id);
      }
      navigate('/import-history');
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu nhập kho');
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
          <h1 className={styles.pageTitle}>Sửa phiếu nhập kho</h1>
        </div>

        {error && <div className={styles.card} style={{ color: '#b91c1c' }}>{error}</div>}
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
                  <div className="misa-form-group">
                    <label className="misa-label">Nhà cung cấp</label>
                    <select className="misa-select" value={form.partnerId} onChange={(e) => handleFormChange('partnerId', e.target.value)}>
                      <option value="">Chưa chọn</option>
                      {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</option>)}
                    </select>
                  </div>
                  <div className="misa-form-group">
                    <label className="misa-label">Kho nhập <span className="required">*</span></label>
                    <select className="misa-select" value={form.warehouseId} onChange={(e) => handleFormChange('warehouseId', e.target.value)}>
                      <option value="">Chọn kho</option>
                      {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                  <label className="misa-label">Lý do nhập</label>
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
                  <label className="misa-label">Ngày ghi nhận <span className="required">*</span></label>
                  <input type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">Số phiếu</label>
                  <input className="misa-input" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
                </div>

                <div className="misa-form-group">
                  <label className="misa-label">Trạng thái</label>
                  <select className="misa-select" value={form.status} onChange={(e) => handleFormChange('status', e.target.value)}>
                    <option value="DRAFT">Lưu tạm</option>
                    <option value="SUBMITTED">Chờ duyệt</option>
                  </select>
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
                            <select className="misa-select" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={item.variantId} onChange={(e) => handleItemChange(item.localId, 'variantId', e.target.value)}>
                              <option value="">Chọn hàng</option>
                              {products.map(productItem => <option key={productItem.id} value={productItem.id}>{productItem.sku}</option>)}
                            </select>
                          </td>
                          <td>{variantLabel(product)}</td>
                          <td>{product?.unitName || ''}</td>
                          <td><input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '80px', textAlign: 'center', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} /></td>
                          <td><input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value)} /></td>
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
            <button className="btn-misa-save" disabled={!isFormValid || saving || loading} onClick={() => submit('SUBMITTED')}><i className="bi bi-save"></i> Lưu lại</button>
            <button className="btn-misa-post" disabled={!isFormValid || saving || loading} onClick={() => submit('SUBMITTED', true)}><i className="bi bi-printer"></i> Lưu và ghi sổ</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default UpdateImportSlipPage;
