import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parseISO } from 'date-fns';
import { getTodayIsoDate } from '../../utils/dateFormat';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import CustomerModal from '../Customer/components/CustomerModal';
import * as soApi from '../../api/salesOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './CreateSalesOrderPage.module.css';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import { findBestMatch } from '../../utils/fuzzyMatch';

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

const emptyLine = () => ({ variantId: null, quantity: 1, unitPrice: 0, unitName: '', warrantyMonths: 0, vatRate: 0, serialNumbers: [], note: '' });

function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // nếu có id → chế độ edit
  const isEdit = Boolean(id);
  const voiceData = location.state?.voiceData || null;

  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('direct');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [inventoryBalances, setInventoryBalances] = useState([]);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddLineIndex, setQuickAddLineIndex] = useState(null);
  const [serialModalLineIndex, setSerialModalLineIndex] = useState(null);


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
  const [isPaymentUserEdited, setIsPaymentUserEdited] = useState(false);
  const [lines, setLines] = useState([emptyLine()]);

  const selectedSerialLine = serialModalLineIndex !== null ? lines[serialModalLineIndex] : null;
  const selectedSerialProduct = selectedSerialLine ? variants.find(v => String(v.id) === String(selectedSerialLine.variantId)) : null;

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  // Load lookups
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [warehouseRes, customerRes, variantRes, codeRes] = await Promise.allSettled([
          soApi.getWarehouses({ size: 100 }),
          soApi.getCustomers({ isCustomer: true, status: 'APPROVED', size: 1000 }),
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

  // ── Voice Data auto-fill ──────────────────────────────────
  useEffect(() => {
    if (!voiceData || isEdit) return;

    if (voiceData.mode) {
      setMode(voiceData.mode);
    }

    // Auto-select warehouse
    if (voiceData.warehouseKeyword && warehouses.length > 0) {
      const matchWh = findBestMatch(warehouses, voiceData.warehouseKeyword, w => [w.name, w.code]);
      if (matchWh) {
        setForm(prev => ({ ...prev, warehouseId: matchWh.id }));
      }
    }

    // Auto-select customer
    if (voiceData.customerKeyword) {
      if (customers.length > 0) {
        const matchCust = findBestMatch(customers, voiceData.customerKeyword, c => [c.name, c.code, c.phone]);
        if (matchCust) {
          setForm(prev => ({
            ...prev,
            partnerId: matchCust.id,
            deliveryAddress: matchCust.address || prev.deliveryAddress,
          }));
        } else {
          setDirectCustomer(prev => ({
            ...prev,
            name: voiceData.customerKeyword,
            phone: voiceData.customerPhone || prev.phone,
            address: voiceData.deliveryAddress || prev.address,
          }));
        }
      }
    }

    if (voiceData.customerPhone) {
      setDirectCustomer(prev => ({ ...prev, phone: voiceData.customerPhone }));
    }

    // Auto-fill note
    if (voiceData.note) {
      setForm(prev => ({ ...prev, note: prev.note ? `${prev.note} - ${voiceData.note}` : voiceData.note }));
    }

    // Auto-add product line
    if (voiceData.productKeyword && variants.length > 0) {
      const matchProd = findBestMatch(variants, voiceData.productKeyword, v => [v.productName, v.variantName, v.sku]);
      if (matchProd) {
        const qty = Number(voiceData.quantity) || 1;
        const price = voiceData.unitPrice != null ? Number(voiceData.unitPrice) : (Number(matchProd.retailPrice || matchProd.price || 0));
        setLines([{
          variantId: matchProd.id,
          quantity: qty,
          unitPrice: price,
          unitName: matchProd.unitName || 'Cái',
          warrantyMonths: Number(matchProd.warrantyMonths || 0),
          vatRate: Number(matchProd.vatPercent || matchProd.vatRate || 0),
          serialNumbers: [],
          note: '',
        }]);
      }
    }
  }, [voiceData, isEdit, warehouses, customers, variants]);

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

  const handleQuickAddProductSuccess = async (newProduct) => {
    try {
      const response = await soApi.getProducts({ size: 500 });
      const refreshedVariants = pageContent(unwrap(response));
      setVariants(refreshedVariants);
      const createdVariant = refreshedVariants.find(v =>
        String(v.productId || v.product?.id) === String(newProduct?.id)
      ) || refreshedVariants.find(v => String(v.id) === String(newProduct?.id));

      if (createdVariant && quickAddLineIndex !== null) {
        updateLineMultiple(quickAddLineIndex, {
          variantId: createdVariant.id,
          unitPrice: Number(createdVariant.salePrice || 0),
          unitName: createdVariant.unitName || 'Cái',
          warrantyMonths: Number(createdVariant.warrantyMonths || 0),
          vatRate: Number(createdVariant.vatPercent || createdVariant.vatRate || 0),
        });
        showToast('success', `Đã thêm và chọn sản phẩm ${createdVariant.productName || ''}`.trim());
      } else {
        showToast('warning', 'Đã thêm sản phẩm nhưng chưa tìm thấy biến thể để chọn.');
      }
    } catch {
      showToast('error', 'Thêm sản phẩm thành công nhưng không tải lại được danh sách hàng hóa.');
    } finally {
      setShowQuickAddProduct(false);
      setQuickAddLineIndex(null);
    }
  };

  const totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
  const subTotalAmount = lines.reduce((sum, l) => sum + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);
  const totalVatAmount = lines.reduce((sum, l) => sum + (Number(l.quantity || 0) * Number(l.unitPrice || 0) * Number(l.vatRate || 0) / 100), 0);
  const grandTotal = subTotalAmount + totalVatAmount;

  useEffect(() => {
    if (mode === 'direct' && !isPaymentUserEdited) {
      setPaymentAmount(Math.round(grandTotal).toString());
    }
  }, [grandTotal, mode, isPaymentUserEdited]);

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
    partnerId: form.partnerId ? Number(form.partnerId) : undefined,
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
      serialNumbers: Array.isArray(l.serialNumbers) ? l.serialNumbers : [],
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
      const serialCount = Array.isArray(lines[i].serialNumbers) ? lines[i].serialNumbers.length : 0;
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
  const customerOptions = customers
    .filter(c => c.status === 'APPROVED' || c.id === form.partnerId)
    .map(c => ({ value: c.id, label: `${c.code} — ${c.name}${c.phone ? ' (' + c.phone + ')' : ''}` }));
  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: `${w.code} — ${w.name}` }));
  const productOptions = variants.map(v => ({
    ...v,
    productName: v.productName || v.variantName || `Sản phẩm #${v.id}`,
    unitName: v.unitName || 'Cái',
    salePrice: v.salePrice || 0,
    warrantyMonths: v.warrantyMonths || 0,
    vatRate: v.vatPercent || v.vatRate || 0,
  }));
  const inventoryMap = new Map(inventoryBalances.map(balance => [
    String(balance.variantId),
    Math.max(0, Number(balance.totalQuantity || 0) - Number(balance.totalReserved || 0)),
  ]));

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
              className={`${styles.modeTab} ${mode === 'direct' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('direct')}
            >
              <i className="bi bi-cash-coin" /> Bán hàng trực tiếp
            </button>
            <button
              type="button"
              className={`${styles.modeTab} ${mode === 'quote' ? styles.modeTabActive : ''}`}
              onClick={() => setMode('quote')}
            >
              <i className="bi bi-file-earmark-text" /> Tạo đơn báo giá
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

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>
                      Khách hàng {mode !== 'direct' && <span className={styles.required}>*</span>}
                    </label>
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
                            if (cust) {
                              setDirectCustomer({
                                phone: cust.phone || '',
                                name: cust.name || '',
                                address: cust.address || '',
                              });
                            }
                          }}
                          placeholder={mode === 'direct' ? "Chọn khách hàng (hoặc để trống nếu là khách vãng lai)..." : "Chọn khách hàng..."}
                          isClearable
                          styles={customSelectStyles}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        title="Tạo khách hàng mới"
                        style={{ width: '38px', height: '38px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="bi bi-plus" style={{ fontSize: '20px', color: 'var(--color-primary)' }}></i>
                      </button>
                    </div>
                  </div>

                  {mode === 'direct' && !form.partnerId && (
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

                  {mode !== 'direct' && (
                    <div className={styles.fieldRow}>
                      <label className={styles.label}>Địa chỉ giao hàng</label>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        value={form.deliveryAddress}
                        onChange={e => setForm(p => ({ ...p, deliveryAddress: e.target.value }))}
                        placeholder="Địa chỉ giao hàng..."
                      />
                    </div>
                  )}

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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className={styles.label} style={{ marginBottom: 0 }}>Khách trả</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            style={{ fontSize: 11, padding: '2px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
                            onClick={() => {
                              setIsPaymentUserEdited(false);
                              setPaymentAmount(Math.round(grandTotal).toString());
                            }}
                          >
                            Trả đủ
                          </button>
                          <button
                            type="button"
                            style={{ fontSize: 11, padding: '2px 6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
                            onClick={() => {
                              setIsPaymentUserEdited(true);
                              setPaymentAmount('0');
                            }}
                          >
                            Nợ 100%
                          </button>
                        </div>
                      </div>
                      <input
                        inputMode="numeric"
                        type="text"
                        className={styles.input}
                        value={formatMoneyInput(paymentAmount)}
                        onChange={e => {
                          setIsPaymentUserEdited(true);
                          setPaymentAmount(digitsOnly(e.target.value));
                        }}
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
                    {mode === 'direct' && (
                      <>
                        <div className={styles.summaryRow} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                          <span>Khách trả:</span>
                          <strong style={{ color: '#166534' }}>{money(Number(paymentAmount || 0))} đ</strong>
                        </div>
                        <div className={styles.summaryRow}>
                          <span>Còn nợ:</span>
                          <strong style={{ color: Math.max(0, grandTotal - Number(paymentAmount || 0)) > 0 ? '#dc2626' : '#166534' }}>
                            {money(Math.max(0, grandTotal - Number(paymentAmount || 0)))} đ
                          </strong>
                        </div>
                      </>
                    )}
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
                            <ProductGridSelect
                              products={productOptions}
                              inventoryMap={inventoryMap}
                              value={line.variantId}
                              onChange={selected => {
                                if (selected) {
                                  updateLineMultiple(idx, {
                                    variantId: selected.id,
                                    unitPrice: Number(selected.salePrice || 0),
                                    unitName: selected.unitName || 'Cái',
                                    warrantyMonths: Number(selected.warrantyMonths || 0),
                                    vatRate: Number(selected.vatPercent || selected.vatRate || 0),
                                  });
                                } else {
                                  updateLine(idx, 'variantId', null);
                                }
                              }}
                              onAddNew={() => {
                                setQuickAddLineIndex(idx);
                                setShowQuickAddProduct(true);
                              }}
                              displayMode="code-name"
                              placeholder="Chọn mã hoặc tên hàng"

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
                            <td align="center">
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {line.variantId && (
                                  <button
                                    type="button"
                                    style={{
                                      background: (line.serialNumbers?.length || 0) === Number(line.quantity || 0) ? '#dcfce7' : '#fef9c3',
                                      color: (line.serialNumbers?.length || 0) === Number(line.quantity || 0) ? '#166534' : '#854d0e',
                                      border: `1px solid ${(line.serialNumbers?.length || 0) === Number(line.quantity || 0) ? '#bbf7d0' : '#fef08a'}`,
                                      borderRadius: '4px',
                                      padding: '2px 8px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onClick={() => setSerialModalLineIndex(idx)}
                                  >
                                    <i className="bi bi-upc-scan"></i>
                                    {(line.serialNumbers?.length || 0)} / {Number(line.quantity || 0)}
                                  </button>
                                )}
                              </div>
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

      <QuickAddProductModal
        isOpen={showQuickAddProduct}
        onClose={() => {
          setShowQuickAddProduct(false);
          setQuickAddLineIndex(null);
        }}
        onSuccess={handleQuickAddProductSuccess}
        productType="Hàng hóa"
      />

      <CustomerModal
        isOpen={showCustomerModal}
        editData={null}
        onClose={() => setShowCustomerModal(false)}
        onSaved={(isEdit, isContinue, newCustomer) => {
          if (newCustomer && newCustomer.id) {
            setCustomers(prev => [newCustomer, ...prev.filter(c => c.id !== newCustomer.id)]);
            setForm(prev => ({
              ...prev,
              partnerId: newCustomer.id,
              deliveryAddress: newCustomer.address || ''
            }));
            setDirectCustomer({
              phone: newCustomer.phone || '',
              name: newCustomer.name || '',
              address: newCustomer.address || '',
            });
          }
          setShowCustomerModal(false);
        }}
        onSuccess={(newCustomer) => {
          if (newCustomer && newCustomer.id) {
            setCustomers(prev => [newCustomer, ...prev.filter(c => c.id !== newCustomer.id)]);
            setForm(prev => ({
              ...prev,
              partnerId: newCustomer.id,
              deliveryAddress: newCustomer.address || ''
            }));
            setDirectCustomer({
              phone: newCustomer.phone || '',
              name: newCustomer.name || '',
              address: newCustomer.address || '',
            });
          }
          setShowCustomerModal(false);
        }}
      />

      {serialModalLineIndex !== null && selectedSerialProduct && (
        <ManageSerialModal
          isOpen={true}
          onClose={(serials) => {
            if (Array.isArray(serials)) {
              updateLine(serialModalLineIndex, 'serialNumbers', serials);
            }
            setSerialModalLineIndex(null);
          }}
          productName={selectedSerialProduct.variantName || selectedSerialProduct.productName}
          targetQuantity={Number(selectedSerialLine.quantity || 0)}
          initialSerials={selectedSerialLine.serialNumbers || []}
          mode="export"
          warehouseId={form.warehouseId}
          variantId={selectedSerialProduct.id}
          onValidateSerial={async (serialValue) => {
            try {
              const response = await exportApi.resolveScan({
                code: serialValue,
                warehouseId: form.warehouseId,
              });
              const scanResult = unwrap(response);
              if (!scanResult.serialNumber) {
                throw new Error('Mã này không tồn tại hoặc không phải là serial.');
              }
              if (String(scanResult.variantId) !== String(selectedSerialProduct.id)) {
                throw new Error('Serial này thuộc về sản phẩm khác.');
              }
              return true;
            } catch (err) {
              throw new Error(err?.response?.data?.userMessage || err.message || 'Mã Serial không hợp lệ.', { cause: err });
            }
          }}
        />
      )}
    </AdminLayout>
  );
}

export default CreateSalesOrderPage;
