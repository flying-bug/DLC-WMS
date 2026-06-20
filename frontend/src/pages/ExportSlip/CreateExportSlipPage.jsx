import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './CreateExportSlipPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => Number(value || 0).toLocaleString('vi-VN');

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  variantId: '',
  quantity: 1,
  price: 0,
  note: '',
});

function CreateExportSlipPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    docDate: today(),
    note: '',
    status: 'DRAFT',
  });
  const [items, setItems] = useState([emptyLine()]);

  useEffect(() => {
    const loadLookups = async () => {
      const [warehouseRes, productRes] = await Promise.allSettled([
        exportApi.getWarehouses({ size: 100 }),
        exportApi.getProducts({ size: 100 }),
      ]);

      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || data[0]?.id || '' }));
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
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(localStorage.getItem('userId') || localStorage.getItem('id') || 1),
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
    let createdId = null;
    try {
      const response = await exportApi.createExportSlip(buildPayload(status));
      const created = unwrap(response);
      createdId = created?.id;
      if (shouldPost && createdId) {
        await exportApi.postExportSlip(createdId);
      }
      navigate('/export-slips');
    } catch (err) {
      if (createdId) {
        alert('Đã tạo phiếu nhưng Ghi sổ thất bại: ' + (err.response?.data?.userMessage || err.response?.data?.devMessage || err.message));
        navigate('/export-slips');
      } else {
        setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu xuất kho');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}

        <div className={styles.topSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-person-fill"></i> Thông tin chung
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Kho xuất</label>
                  <div className={styles.inputWrapper}>
                    <select className={styles.select} value={form.warehouseId} onChange={(event) => handleFormChange('warehouseId', event.target.value)}>
                      <option value="">Chọn kho</option>
                      {warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Trạng thái</label>
                  <div className={styles.inputWrapper}>
                    <select className={styles.select} value={form.status} onChange={(event) => handleFormChange('status', event.target.value)}>
                      <option value="DRAFT">Lưu tạm</option>
                      <option value="SUBMITTED">Chờ duyệt</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Lý do xuất</label>
                  <div className={styles.inputWrapper}>
                    <input className={styles.input} value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="Nhập lý do xuất kho" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text-fill"></i> Thông tin chứng từ
            </div>
            <div className={styles.cardBody}>
              <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                <label className={styles.label}>Ngày ghi nhận</label>
                <div className={styles.inputWrapper}>
                  <input type="date" className={styles.input} value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Số phiếu</label>
                <div className={styles.inputWrapper}>
                  <input className={styles.input} placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>Bảng hàng tiền</div>
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
                  <th>DVT</th>
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
                        <select className={styles.tableSelect} value={item.variantId} onChange={(event) => handleItemChange(item.localId, 'variantId', event.target.value)}>
                          <option value="">Chọn hàng</option>
                          {products.map(productItem => <option key={productItem.id} value={productItem.id}>{productItem.productCode}</option>)}
                        </select>
                      </td>
                      <td>{product?.productName || ''}</td>
                      <td>{product?.unitName || ''}</td>
                      <td className={styles.textRight}>
                        <input type="number" min="0" className={`${styles.tableInput} ${styles.textRight}`} value={item.quantity} onChange={(event) => handleItemChange(item.localId, 'quantity', event.target.value)} />
                      </td>
                      <td className={styles.textRight}>
                        <input type="number" min="0" className={`${styles.tableInput} ${styles.textRight}`} value={item.price} onChange={(event) => handleItemChange(item.localId, 'price', event.target.value)} />
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
      </div>

      <div className={styles.bottomBar}>
        <button className={styles.attachmentBtn} onClick={() => navigate('/export-slips')}>
          <i className="bi bi-arrow-left" style={{ fontSize: '18px' }}></i> Quay lại
        </button>
        <div className={styles.actionButtons}>
          <button className={styles.btnCancel} onClick={() => navigate('/export-slips')}>Hủy</button>
          <button className={styles.btnDraft} disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className={styles.btnSave} disabled={!isFormValid || saving} onClick={() => submit('SUBMITTED')}>
            <i className="bi bi-check-circle"></i> Lưu lại
          </button>
          <button className={styles.btnSavePrint} disabled={!isFormValid || saving} onClick={() => submit('SUBMITTED', true)}>
            <i className="bi bi-printer"></i> Lưu và ghi sổ
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CreateExportSlipPage;
