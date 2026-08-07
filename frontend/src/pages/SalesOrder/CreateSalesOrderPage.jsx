import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import { getTodayIsoDate } from '../../utils/dateFormat';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import CustomerModal from '../Customer/components/CustomerModal';
import * as soApi from '../../api/salesOrderApi';
import styles from './CreateSalesOrderPage.module.css';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (p) => p?.content ?? p ?? [];
const today = getTodayIsoDate;
const money = (v) => Number(v || 0).toLocaleString('vi-VN');
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const formatMoneyInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};

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

const emptyLine = () => ({ variantId: null, quantity: 1, unitPrice: 0, unitName: '', warrantyMonths: 0, vatRate: 0, serialNumbers: '', note: '' });

function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams(); // nếu có id → chế độ edit
  const isEdit = Boolean(id);

  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('quote');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const [form, setForm] = useState({
    soCode: '',
    soDate: today(),
    partnerId: null,
    warehouseId: null,
    deliveryAddress: '',
    note: '',
    paymentDueDate: '',
  });
  const [directCustomer, setDirectCustomer] = useState({
    phone: '',
    name: '',
    address: '',
  });
  const [paymentAmount, setPaymentAmount] = useState('');
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
          deliveryAddress: so.deliveryAddress || so.partnerAddress || '',
          note: so.note || '',
          paymentDueDate: so.paymentDueDate || '',
        });
        setLines((so.lines || []).map(l => ({
          variantId: l.variantId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          unitName: l.unitName || '',
          warrantyMonths: l.warrantyMonths || 0,
          vatRate: l.vatRate || 0,
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

  const updateLineMultiple = (idx, updates) => setLines(p =>
    p.map((l, i) => i === idx ? { ...l, ...updates } : l)
  );

  const totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  const subTotalAmount = lines.reduce((sum, l) => sum + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);
  const totalVatAmount = lines.reduce((sum, l) => sum + (Number(l.quantity || 0) * Number(l.unitPrice || 0) * Number(l.vatRate || 0) / 100), 0);
  const grandTotal = subTotalAmount + totalVatAmount;

  useEffect(() => {
    if (mode === 'direct' && (paymentAmount === '' || Number(paymentAmount) === 0)) {
      setPaymentAmount(Math.round(grandTotal).toString());
    }
  }, [grandTotal, mode, paymentAmount]);

  // ── Save ──
  const buildPayload = () => ({
    soCode: form.soCode.trim() || undefined,
    soDate: form.soDate,
    paymentDueDate: form.paymentDueDate || undefined,
    partnerId: Number(form.partnerId),
    warehouseId: Number(form.warehouseId),
    deliveryAddress: form.deliveryAddress || undefined,
    note: form.note || undefined,
    lines: lines.map(l => ({
      variantId: Number(l.variantId),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate || 0),
      warrantyMonths: Number(l.warrantyMonths || 0),
      note: l.note || undefined,
    })),
  });

  const buildDirectPayload = () => ({
    customerPhone: directCustomer.phone.trim() || undefined,
    customerName: directCustomer.name.trim() || undefined,
    customerAddress: directCustomer.address.trim() || undefined,
    warehouseId: Number(form.warehouseId),
    checkoutDate: form.soDate,
    paymentAmount: Number(paymentAmount || 0),
    note: form.note || undefined,
    lines: lines.map(l => ({
      variantId: Number(l.variantId),
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate || 0),
      warrantyMonths: Number(l.warrantyMonths || 0),
      serialNumbers: String(l.serialNumbers || '')
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean),
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
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
        return false;
      }
    }
    return true;
  };

  const validateDirectCheckout = () => {
    if (!form.warehouseId) { showToast('error', 'Vui lòng chọn kho xuất hàng'); return false; }
    if (!form.soDate) { showToast('error', 'Vui lòng nhập ngày bán'); return false; }
    const paid = Number(paymentAmount || 0);
    if (Number.isNaN(paid) || paid < 0) { showToast('error', 'Số tiền khách trả không hợp lệ'); return false; }
    if (paid > grandTotal) { showToast('error', 'Số tiền khách trả vượt tổng thanh toán'); return false; }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId) { showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`); return false; }
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
        return false;
      }
      const serialCount = String(lines[i].serialNumbers || '')
        .split(/\r?\n|,/)
        .map(s => s.trim())
        .filter(Boolean).length;
      if (serialCount > 0 && serialCount !== qty) {
        showToast('error', `Dòng ${i + 1}: số serial phải bằng số lượng`);
        return false;
      }
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

  const handleDirectCheckout = async () => {
    if (!validateDirectCheckout()) return;
    setSaving(true);
    try {
      const res = await soApi.directCheckout(buildDirectPayload());
      const saved = unwrap(res);
      navigate('/sales-orders', {
        state: { toastMessage: `Bán hàng trực tiếp ${saved.soCode} thành công. Đơn hàng và phiếu xuất đã hoàn thành.`, toastType: 'success' }
      });
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Bán hàng trực tiếp thất bại');
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
    unitName: v.unitName || 'Cái',
    warrantyMonths: v.warrantyMonths || 0,
    vatRate: v.vatPercent || v.vatRate || 0,
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

        {!isEdit && (
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'quote' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('quote')}
            >
              <i className="bi bi-file-earmark-text" /> Tạo đơn báo giá
            </button>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'direct' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('direct')}
            >
              <i className="bi bi-cash-coin" /> Bán hàng trực tiếp
            </button>
          </div>
        )}

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
                    <i className="bi bi-person" /> {mode === 'direct' ? 'Khách mua tại quầy' : 'Thông tin khách hàng'}
                  </div>

                  {mode === 'direct' && (
                    <>
                      <div className={styles.directGrid}>
                        <div className={styles.fieldRow}>
                          <label className={styles.label}>Số điện thoại</label>
                          <input
                            type="text"
                            className={styles.input}
                            value={directCustomer.phone}
                            onChange={e => setDirectCustomer(p => ({ ...p, phone: e.target.value }))}
                            placeholder="Bỏ trống nếu là khách vãng lai"
                          />
                        </div>
                        <div className={styles.fieldRow}>
                          <label className={styles.label}>Tên khách</label>
                          <input
                            type="text"
                            className={styles.input}
                            value={directCustomer.name}
                            onChange={e => setDirectCustomer(p => ({ ...p, name: e.target.value }))}
                            placeholder="Tự tạo nếu SĐT mới"
                          />
                        </div>
                      </div>
                      <div className={styles.fieldRow}>
                        <label className={styles.label}>Địa chỉ</label>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={directCustomer.address}
                          onChange={e => setDirectCustomer(p => ({ ...p, address: e.target.value }))}
                          placeholder="Tùy chọn"
                        />
                      </div>
                    </>
                  )}

                  {mode !== 'direct' && <div className={styles.fieldRow}>
                    <label className={styles.label}>Khách hàng <span className={styles.required}>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={customerOptions}
                          value={customerOptions.find(o => o.value === form.partnerId) || null}
                          onChange={opt => {
                            const cust = customers.find(c => c.id === opt?.value);
                            setForm(p => ({
                              ...p,
                              partnerId: opt?.value || null,
                              deliveryAddress: cust ? cust.address || '' : ''
                            }));
                          }}
                          placeholder="Chọn khách hàng..."
                          isClearable
                          styles={customSelectStyles}
                        />
                      </div>
                      <button type="button" onClick={() => setShowCustomerModal(true)} style={{ width: '38px', height: '38px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-plus" style={{ fontSize: '20px', color: 'var(--color-primary)' }}></i>
                      </button>
                    </div>
                  </div>}

                  {mode !== 'direct' && <div className={styles.fieldRow}>
                    <label className={styles.label}>Địa chỉ giao hàng</label>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      value={form.deliveryAddress}
                      onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))}
                      placeholder="Địa chỉ giao hàng..."
                    />
                  </div>}

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

                  {mode !== 'direct' && <div className={styles.fieldRow}>
                    <label className={styles.label}>Số đơn hàng</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.soCode}
                      onChange={e => setForm(p => ({ ...p, soCode: e.target.value }))}
                      placeholder="Để trống để tự sinh"
                    />
                  </div>}

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

                  {mode === 'direct' ? (
                    <div className={styles.fieldRow}>
                      <label className={styles.label}>Khách trả</label>
                      <input
                        inputMode="numeric"
                        type="text"
                        className={styles.input}
                        value={formatMoneyInput(paymentAmount)}
                        onChange={e => setPaymentAmount(digitsOnly(e.target.value))}
                      />
                    </div>
                  ) : (
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
                  )}

                  {/* Summary box */}
                  <div className={styles.summaryBox}>
                    <div className={styles.summaryRow}>
                      <span>Tổng số lượng:</span>
                      <strong>{totalQuantity}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Tiền hàng:</span>
                      <strong>{money(subTotalAmount)} đ</strong>
                    </div>
                    <div className={styles.summaryRow}>
                      <span>Thuế VAT:</span>
                      <strong>{money(totalVatAmount)} đ</strong>
                    </div>
                    <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                      <span>Tổng thanh toán:</span>
                      <strong className={styles.totalAmount}>{money(grandTotal)} đ</strong>
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
                      <th style={{ width: 70 }}>ĐVT</th>
                      <th style={{ width: 90 }}>Số lượng</th>
                      <th style={{ width: 70 }}>BH (T)</th>
                      <th style={{ width: 130 }}>Đơn giá</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ width: 80 }}>% VAT</th>
                      {mode === 'direct' && <th style={{ width: 180 }}>Serial</th>}
                      <th style={{ width: 140 }}>Ghi chú dòng</th>
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
                                if (opt) {
                                  updateLineMultiple(idx, {
                                    variantId: opt.value,
                                    unitPrice: opt.salePrice || 0,
                                    unitName: opt.unitName || '',
                                    warrantyMonths: opt.warrantyMonths || 0,
                                    vatRate: opt.vatRate || 0
                                  });
                                } else {
                                  updateLine(idx, 'variantId', null);
                                }
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
                          <td style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            {line.unitName || '—'}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
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
                              value={line.warrantyMonths}
                              onChange={e => updateLine(idx, 'warrantyMonths', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              inputMode="numeric"
                              type="text"
                              className={styles.lineInput}
                              value={formatMoneyInput(line.unitPrice)}
                              onChange={e => updateLine(idx, 'unitPrice', digitsOnly(e.target.value))}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e40af' }}>
                            {money(lineTotal)} đ
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={styles.lineInput}
                              value={line.vatRate}
                              onChange={e => updateLine(idx, 'vatRate', e.target.value)}
                            />
                          </td>
                          {mode === 'direct' && (
                            <td>
                              <textarea
                                className={styles.lineTextarea}
                                value={line.serialNumbers || ''}
                                onChange={e => updateLine(idx, 'serialNumbers', e.target.value)}
                                placeholder="Mỗi serial 1 dòng"
                              />
                            </td>
                          )}
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
                      <td colSpan={mode === 'direct' ? 9 : 8} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14, color: '#475569' }}>
                        <strong>Tiền hàng:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 15, color: '#1d4ed8' }}>
                        {money(subTotalAmount)} đ
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={mode === 'direct' ? 9 : 8} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14, color: '#475569' }}>
                        <strong>Tiền thuế VAT:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 15, color: '#dc2626' }}>
                        {money(totalVatAmount)} đ
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={mode === 'direct' ? 9 : 8} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 15, color: '#0f172a' }}>
                        <strong>Tổng cộng thanh toán:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 16, color: '#16a34a' }}>
                        {money(grandTotal)} đ
                      </td>
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
                {mode === 'direct' && (
                  <button className={styles.btnPrimary} onClick={handleDirectCheckout} disabled={saving}>
                    {saving ? 'Đang xử lý...' : (
                      <><i className="bi bi-cash-coin" /> Thanh toán &amp; xuất kho ngay</>
                    )}
                  </button>
                )}
                {mode !== 'direct' && <button className={styles.btnOutline} onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Đang lưu...' : (
                    <><i className="bi bi-floppy" /> Lưu nháp</>
                  )}
                </button>}
                {mode !== 'direct' && !isEdit && (
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

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={(newCustomer) => {
          setCustomers(prev => [newCustomer, ...prev]);
          setForm(prev => ({
            ...prev,
            partnerId: newCustomer.id,
            deliveryAddress: newCustomer.address || ''
          }));
          setShowCustomerModal(false);
        }}
      />
    </AdminLayout>
  );
}

export default CreateSalesOrderPage;
