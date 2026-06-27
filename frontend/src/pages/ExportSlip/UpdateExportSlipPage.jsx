import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './UpdateExportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
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

function UpdateExportSlipPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
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
        const [detailRes, warehouseRes, productRes] = await Promise.all([
          exportApi.getExportDetail(id),
          exportApi.getWarehouses({ size: 100 }),
          exportApi.getProducts({ size: 100 }),
        ]);
        const detail = unwrap(detailRes);
        setWarehouses(pageContent(unwrap(warehouseRes)));
        setProducts(pageContent(unwrap(productRes)));
        setForm({
          docCode: detail.docCode || '',
          warehouseId: detail.warehouseId || '',
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
        })));
      } catch (err) {
        setError(err.response?.data?.userMessage || 'Không tải được phiếu xuất kho');
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
    docDate: form.docDate,
    status,
    note: form.note,
    lines: items.map(item => ({
      variantId: Number(item.variantId),
      quantityIn: 0,
      quantityOut: Number(item.quantity),
      unitCost: 0,
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
      await exportApi.updateExportSlip(id, buildPayload(status));
      if (shouldPost) {
        await exportApi.postExportSlip(id);
      }
      navigate('/export-slips');
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu xuất kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
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
                    <div className="misa-form-group">
                      <label className="misa-label">Kho xuất <span className="required">*</span></label>
                      <select className="misa-select" value={form.warehouseId} onChange={(event) => handleFormChange('warehouseId', event.target.value)}>
                        <option value="">Chọn kho</option>
                        {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                      </select>
                    </div>

                    <div className="misa-form-group">
                      <label className="misa-label">Trạng thái</label>
                      <select className="misa-select" value={form.status} onChange={(event) => handleFormChange('status', event.target.value)}>
                        <option value="DRAFT">Lưu tạm</option>
                        <option value="SUBMITTED">Chờ duyệt</option>
                      </select>
                    </div>
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Lý do xuất</label>
                    <input className="misa-input" value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} />
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

                  <div className="misa-form-group">
                    <label className="misa-label">Số phiếu</label>
                    <input className="misa-input" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Bảng hàng hóa</div>
                <button className={styles.btnAddRow} onClick={addItem}>
                  <i className="bi bi-plus-lg"></i> Thêm dòng
                </button>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.textCenter}>#</th>
                      <th>Mã hàng</th>
                      <th>Tên hàng</th>
                      <th>ĐVT</th>
                      <th className={styles.textRight}>Số lượng</th>
                      <th className={styles.textRight}>Đơn giá</th>
                      <th className={styles.textRight}>Thành tiền</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const product = productById.get(String(item.variantId));
                      return (
                        <tr key={item.localId}>
                          <td className={styles.textCenter}>{index + 1}</td>
                          <td>
                            <select className="misa-select" style={{ height: '32px', padding: '0 8px', fontSize: '13px' }} value={item.variantId} onChange={(event) => handleItemChange(item.localId, 'variantId', event.target.value)}>
                              <option value="">Chọn hàng</option>
                              {products.map(productItem => <option key={productItem.id} value={productItem.id}>{productItem.sku}</option>)}
                            </select>
                          </td>
                          <td>{variantLabel(product)}</td>
                          <td>{product?.unitName || ''}</td>
                          <td className={styles.textRight}>
                            <input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '80px', textAlign: 'center', fontSize: '13px' }} value={item.quantity} onChange={(event) => handleItemChange(item.localId, 'quantity', event.target.value)} />
                          </td>
                          <td className={styles.textRight}>
                            <input type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price} onChange={(event) => handleItemChange(item.localId, 'price', event.target.value)} />
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
            </div>
          </>
        )}
      </div>

      <div className={styles.bottomBar}>
        <button className="btn-misa-cancel" onClick={() => navigate('/export-slips')}>
          Hủy bỏ
        </button>
        <div className={styles.actionButtons}>
          <button className="btn-misa-draft" disabled={saving || loading} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className="btn-misa-save" disabled={!isFormValid || saving || loading} onClick={() => submit('SUBMITTED')}>
            <i className="bi bi-check-circle"></i> Lưu lại
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving || loading} onClick={() => submit('SUBMITTED', true)}>
            <i className="bi bi-printer"></i> Lưu và ghi sổ
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default UpdateExportSlipPage;
