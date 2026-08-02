import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import * as soApi from '../../api/salesOrderApi';
import styles from './CreateSalesOrderPage.module.css';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (p) => p?.content ?? p ?? [];
const today = () => new Date().toLocaleDateString('sv-SE');
const money = (v) => Number(v || 0).toLocaleString('vi-VN');

const customSelectStyles = {
  control: (base, state) => ({
    ...base, minHeight: 36, height: 36, fontSize: 13,
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
  }),
  valueContainer: (base) => ({ ...base, height: 36, padding: '0 8px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
};

const emptyLine = () => ({ variantId: null, quantity: 1, unitPrice: 0, note: '' });

function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams(); // nếu có id → chế độ edit
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const [form, setForm] = useState({
    soCode: '',
    soDate: today(),
    partnerId: null,
    warehouseId: null,
    note: '',
    paymentDueDate: '',
  });
  const [lines, setLines] = useState([emptyLine()]);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  // Load lookups
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [warehouseRes, customerRes, variantRes, codeRes] = await Promise.allSettled([
          soApi.getWarehouses({ size: 100 }),
          soApi.getCustomers({ isCustomer: true, size: 1000 }),
          soApi.getProducts({ size: 500 }),
          !isEdit ? soApi.getNextSoCode() : Promise.resolve(null),
        ]);
        if (warehouseRes.status === 'fulfilled') {
          setWarehouses(pageContent(unwrap(warehouseRes.value)));
        }
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (variantRes.status === 'fulfilled') {
          setVariants(pageContent(unwrap(variantRes.value)));
        }
        if (codeRes.status === 'fulfilled' && codeRes.value) {
          const code = unwrap(codeRes.value);
          setForm(p => ({ ...p, soCode: code || '' }));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isEdit]);

  // Load SO data if editing
  useEffect(() => {
    if (!isEdit) return;
    const loadSo = async () => {
      try {
        const res = await soApi.getSalesOrderById(id);
        const so = unwrap(res);
        if (!so) return;
        setForm({
          soCode: so.soCode,
          soDate: so.soDate,
          partnerId: so.partnerId,
          warehouseId: so.warehouseId,
          note: so.note || '',
          paymentDueDate: so.paymentDueDate || '',
        });
        setLines((so.lines || []).map(l => ({
          variantId: l.variantId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          note: l.note || '',
        })));
      } catch {
        showToast('error', 'Không thể tải dữ liệu đơn hàng');
      }
    };
    loadSo();
  }, [id, isEdit]);

  // Load inventory balances when warehouse changes
  useEffect(() => {
    if (!form.warehouseId) {
      setInventoryBalances([]);
      return;
    }
    const loadBalances = async () => {
      try {
        const res = await soApi.getInventoryBalance({ warehouseId: form.warehouseId });
        setInventoryBalances(unwrap(res) || []);
      } catch (err) {
        console.error('Failed to load inventory balances', err);
      }
    };
    loadBalances();
  }, [form.warehouseId]);

  // ── Line management ──
  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx) => setLines(p => p.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setLines(p =>
    p.map((l, i) => i === idx ? { ...l, [field]: value } : l)
  );

  const totalAmount = lines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unitPrice)), 0);

  // ── Save ──
  const buildPayload = () => ({
    soCode: form.soCode.trim() || undefined,
    soDate: form.soDate,
    paymentDueDate: form.paymentDueDate || undefined,
    partnerId: Number(form.partnerId),
    warehouseId: Number(form.warehouseId),
    note: form.note || undefined,
    lines: lines.map(l => ({
      variantId: Number(l.variantId),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      note: l.note || undefined,
    })),
  });

  const validate = () => {
    if (!form.partnerId) { showToast('error', 'Vui lòng chọn khách hàng'); return false; }
    if (!form.warehouseId) { showToast('error', 'Vui lòng chọn kho'); return false; }
    if (!form.soDate) { showToast('error', 'Vui lòng nhập ngày lập'); return false; }
    
    if (form.paymentDueDate) {
      if (form.paymentDueDate < form.soDate) {
        showToast('error', 'Hạn thanh toán không được nhỏ hơn ngày lập đơn');
        return false;
      }
      if (form.paymentDueDate < today()) {
        showToast('error', 'Hạn thanh toán không được nằm trong quá khứ');
        return false;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId) { showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`); return false; }
      if (Number(lines[i].quantity) <= 0) { showToast('error', `Dòng ${i + 1}: số lượng phải > 0`); return false; }
    }
    return true;
  };

  const handleSave = async (andApprove = false) => {
    if (!validate()) return;
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        res = await soApi.updateSalesOrder(id, buildPayload());
      } else {
        res = await soApi.createSalesOrder(buildPayload());
      }
      const saved = unwrap(res);

      if (andApprove && saved?.id) {
        try {
          await soApi.approveSalesOrder(saved.id);
          navigate('/sales-orders', {
            state: { toastMessage: `Tạo và duyệt đơn ${saved.soCode} thành công! Hàng đã được giữ chỗ 72 giờ.`, toastType: 'success' }
          });
        } catch (approveErr) {
          navigate('/sales-orders', {
            state: { toastMessage: `Lưu đơn ${saved.soCode} thành công nhưng duyệt thất bại: ${approveErr.response?.data?.userMessage}`, toastType: 'warning' }
          });
        }
      } else {
        navigate('/sales-orders', {
          state: { toastMessage: `${isEdit ? 'Cập nhật' : 'Tạo'} đơn ${saved.soCode} thành công`, toastType: 'success' }
        });
      }
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Lưu đơn hàng thất bại');
    } finally {
      setSaving(false);
    }
  };

  // ── Options for react-select ──
  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }));
  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }));
  const variantOptions = variants.map(v => ({
    value: v.id,
    label: `[${v.sku}] ${v.variantName || v.productName}`,
    salePrice: v.salePrice || 0,
  }));

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbLink} onClick={() => navigate('/sales-orders')}>
              Đơn bán hàng
            </span>
            <i className="bi bi-chevron-right" style={{ margin: '0 6px', fontSize: 12 }} />
            <span>{isEdit ? 'Cập nhật đơn hàng' : 'Tạo đơn bán hàng mới'}</span>
          </div>
          <h1 className={styles.pageTitle}>
            {isEdit ? `Cập nhật: ${form.soCode}` : 'Tạo đơn bán hàng mới'}
          </h1>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : (
          <>
            {/* ── Form body ── */}
            <div className={styles.formBody}>
              {/* Left panel */}
              <div className={styles.leftPanel}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-person" /> Thông tin khách hàng & kho
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Khách hàng <span className={styles.required}>*</span></label>
                    <Select
                      options={customerOptions}
                      value={customerOptions.find(o => o.value === form.partnerId) || null}
                      onChange={opt => setForm(p => ({ ...p, partnerId: opt?.value || null }))}
                      placeholder="Chọn khách hàng..."
                      isClearable
                      styles={customSelectStyles}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Kho xuất hàng <span className={styles.required}>*</span></label>
                    <Select
                      options={warehouseOptions}
                      value={warehouseOptions.find(o => o.value === form.warehouseId) || null}
                      onChange={opt => setForm(p => ({ ...p, warehouseId: opt?.value || null }))}
                      placeholder="Chọn kho..."
                      isClearable
                      styles={customSelectStyles}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ghi chú</label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={form.note}
                      onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="Ghi chú thêm về đơn hàng..."
                    />
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className={styles.rightPanel}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-file-earmark-text" /> Thông tin chứng từ
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Số đơn hàng</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.soCode}
                      onChange={e => setForm(p => ({ ...p, soCode: e.target.value }))}
                      placeholder="Để trống để tự sinh"
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ngày lập <span className={styles.required}>*</span></label>
                    <DatePicker
                      className={styles.input}
                      dateFormat="dd/MM/yyyy"
                      selected={form.soDate ? parseISO(form.soDate) : null}
                      onChange={date => setForm(p => ({ ...p, soDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      placeholderText="dd/mm/yyyy"
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Hạn thanh toán</label>
                    <DatePicker
                      className={styles.input}
                      dateFormat="dd/MM/yyyy"
                      minDate={form.soDate ? parseISO(form.soDate) : new Date()}
                      selected={form.paymentDueDate ? parseISO(form.paymentDueDate) : null}
                      onChange={date => setForm(p => ({ ...p, paymentDueDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      placeholderText="dd/mm/yyyy"
                      isClearable
                    />
                  </div>

                  {/* Summary box */}
                  <div className={styles.summaryBox}>
                    <div className={styles.summaryRow}>
                      <span>Số dòng hàng:</span>
                      <strong>{lines.length}</strong>
                    </div>
                    <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                      <span>Tổng cộng:</span>
                      <strong className={styles.totalAmount}>{money(totalAmount)} đ</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lines ── */}
            <div className={styles.linesSection}>
              <div className={styles.linesSectionHeader}>
                <span className={styles.sectionTitle}><i className="bi bi-list-ul" /> Danh sách hàng hóa</span>
                <button className={styles.btnAddLine} onClick={addLine}>
                  <i className="bi bi-plus-circle" /> Thêm dòng
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.linesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Sản phẩm</th>
                      <th style={{ width: 110 }}>Số lượng</th>
                      <th style={{ width: 150 }}>Đơn giá</th>
                      <th style={{ width: 160, textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ width: 160 }}>Ghi chú dòng</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
                      const invBalance = inventoryBalances.find(b => b.variantId === line.variantId);
                      const availableQty = invBalance ? (Number(invBalance.totalQuantity || 0) - Number(invBalance.totalReserved || 0)) : 0;
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                          <td>
                            <Select
                              options={variantOptions}
                              value={variantOptions.find(o => o.value === line.variantId) || null}
                              onChange={opt => {
                                updateLine(idx, 'variantId', opt?.value || null);
                                if (opt?.salePrice) updateLine(idx, 'unitPrice', opt.salePrice);
                              }}
                              placeholder="Chọn sản phẩm..."
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                              menuPosition="fixed"
                            />
                            {line.variantId && (
                              <div style={{ marginTop: 4, fontSize: 11, color: availableQty >= Number(line.quantity || 0) ? '#16a34a' : '#dc2626' }}>
                                Tồn khả dụng: {money(availableQty)}
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0.0001"
                              step="1"
                              className={styles.lineInput}
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className={styles.lineInput}
                              value={line.unitPrice}
                              onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e40af' }}>
                            {money(lineTotal)} đ
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.lineInput}
                              value={line.note}
                              onChange={e => updateLine(idx, 'note', e.target.value)}
                              placeholder="Ghi chú..."
                            />
                          </td>
                          <td>
                            {lines.length > 1 && (
                              <button className={styles.btnRemoveLine} onClick={() => removeLine(idx)} title="Xóa dòng">
                                <i className="bi bi-trash" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14, color: '#475569' }}>
                        <strong>Tổng cộng:</strong>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 15, color: '#1d4ed8' }}>
                        {money(totalAmount)} đ
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── Footer Actions ── */}
            <div className={styles.footerActions}>
              <button className={styles.btnSecondary} onClick={() => navigate('/sales-orders')} disabled={saving}>
                <i className="bi bi-arrow-left" /> Quay lại
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className={styles.btnOutline} onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Đang lưu...' : (
                    <><i className="bi bi-floppy" /> Lưu nháp</>
                  )}
                </button>
                {!isEdit && (
                  <button className={styles.btnPrimary} onClick={() => handleSave(true)} disabled={saving}>
                    {saving ? 'Đang xử lý...' : (
                      <><i className="bi bi-check2-circle" /> Lưu &amp; Duyệt ngay</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default CreateSalesOrderPage;
