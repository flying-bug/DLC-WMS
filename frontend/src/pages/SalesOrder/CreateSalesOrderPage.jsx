import { useEffect, useState, useMemo, useCallback } from 'react';
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

const emptyLine = () => ({ variantId: null, warehouseId: null, quantity: 1, unitPrice: 0, unitName: '', warrantyMonths: 0, vatRate: 0, serialNumbers: [], note: '' });

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
        const [warehouseRes, customerRes, variantRes, balanceRes, codeRes] = await Promise.allSettled([
          soApi.getWarehouses({ size: 100 }),
          soApi.getCustomers({ isCustomer: true, status: 'APPROVED', size: 1000 }),
          soApi.getProducts({ size: 500 }),
          soApi.getInventoryBalance({}),
          !isEdit ? soApi.getNextSoCode() : Promise.resolve(null),
        ]);
        let whList = [];
        if (warehouseRes.status === 'fulfilled') {
          whList = pageContent(unwrap(warehouseRes.value));
          setWarehouses(whList);
        }
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (variantRes.status === 'fulfilled') {
          setVariants(pageContent(unwrap(variantRes.value)));
        }
        if (balanceRes.status === 'fulfilled') {
          setInventoryBalances(pageContent(unwrap(balanceRes.value)));
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

    const defaultWh = warehouses.length > 0 ? warehouses[0].id : null;

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
          warehouseId: defaultWh,
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
          warehouseId: l.warehouseId || (warehouses.length > 0 ? warehouses[0].id : null),
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
  }, [id, isEdit, warehouses]);

  // ── Line management ──
  const addLine = () => setLines(p => [...p, emptyLine()]);
  const removeLine = (idx) => setLines(p => p.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => setLines(p =>
    p.map((l, i) => i === idx ? { ...l, [field]: value } : l)
  );

  const updateLineMultiple = (idx, updates) => setLines(p =>
    p.map((l, i) => i === idx ? { ...l, ...updates } : l)
  );

  const handleProductSelect = (idx, selected) => {
    if (!selected) {
      updateLine(idx, 'variantId', null);
      return;
    }
    const currentWh = lines[idx]?.warehouseId || null;
    const existingIndex = currentWh
      ? lines.findIndex((l, i) => i !== idx && String(l.variantId) === String(selected.id) && String(l.warehouseId) === String(currentWh))
      : -1;
    if (existingIndex >= 0) {
      const addedQty = Number(lines[idx]?.quantity) || 1;
      setLines(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: Number(next[existingIndex].quantity || 0) + addedQty
        };
        return next.filter((_, i) => i !== idx);
      });
      showToast('info', 'Sản phẩm cùng kho xuất đã tồn tại trong danh sách, đã tự động tăng số lượng.');
      return;
    }
    updateLineMultiple(idx, {
      variantId: selected.id,
      warehouseId: currentWh,
      unitPrice: Number(selected.salePrice || 0),
      unitName: selected.unitName || 'Cái',
      warrantyMonths: Number(selected.warrantyMonths || 0),
      vatRate: Number(selected.vatPercent || selected.vatRate || 0),
    });
  };

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
  const buildPayload = () => {
    const firstWh = lines[0]?.warehouseId || form.warehouseId;
    return {
      soCode: form.soCode.trim() || undefined,
      soDate: form.soDate,
      paymentDueDate: form.paymentDueDate || undefined,
      partnerId: Number(form.partnerId),
      warehouseId: firstWh ? Number(firstWh) : undefined,
      deliveryAddress: form.deliveryAddress || undefined,
      note: form.note || undefined,
      lines: lines.map(l => ({
        variantId: Number(l.variantId),
        warehouseId: l.warehouseId ? Number(l.warehouseId) : undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate || 0),
        warrantyMonths: Number(l.warrantyMonths || 0),
        note: l.note || undefined,
      })),
    };
  };

  const buildDirectPayload = () => {
    const firstWh = lines.find(l => l.warehouseId)?.warehouseId || form.warehouseId || (warehouses[0]?.id ? Number(warehouses[0].id) : 1);
    return {
      partnerId: form.partnerId ? Number(form.partnerId) : undefined,
      customerPhone: directCustomer.phone.trim() || undefined,
      customerName: directCustomer.name.trim() || undefined,
      customerAddress: directCustomer.address.trim() || undefined,
      warehouseId: Number(firstWh),
      checkoutDate: form.soDate,
      paymentAmount: Number(paymentAmount || 0),
      note: form.note || undefined,
      lines: lines.map(l => ({
        variantId: Number(l.variantId),
        warehouseId: l.warehouseId ? Number(l.warehouseId) : Number(firstWh),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate || 0),
        warrantyMonths: Number(l.warrantyMonths || 0),
        serialNumbers: Array.isArray(l.serialNumbers) ? l.serialNumbers : [],
        note: l.note || undefined,
      })),
    };
  };

  const focusField = (elementId) => {
    setTimeout(() => {
      const el = document.getElementById(elementId);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof el.select === 'function') {
          el.select();
        }
      }
    }, 50);
  };

  const validate = () => {
    if (!form.partnerId) {
      showToast('error', 'Vui lòng chọn khách hàng');
      focusField('so-partnerId');
      return false;
    }
    if (!form.soDate) {
      showToast('error', 'Vui lòng nhập ngày lập');
      focusField('so-docDate');
      return false;
    }

    if (form.paymentDueDate) {
      if (form.paymentDueDate < form.soDate) {
        showToast('error', 'Hạn thanh toán không được nhỏ hơn ngày lập đơn');
        focusField('so-paymentDueDate');
        return false;
      }
      if (form.paymentDueDate < today()) {
        showToast('error', 'Hạn thanh toán không được nằm trong quá khứ');
        focusField('so-paymentDueDate');
        return false;
      }
    }

    if (lines.length === 0) {
      showToast('error', 'Đơn hàng phải có ít nhất 1 dòng sản phẩm');
      return false;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId) {
        showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`);
        focusField(`so-line-product-${i}`);
        return false;
      }
      if (!lines[i].warehouseId) {
        const prod = variants.find(item => String(item.id) === String(lines[i].variantId));
        const prodLabel = prod ? (prod.productName || prod.variantName || `ID #${prod.id}`) : `sản phẩm`;
        showToast('error', `Dòng ${i + 1}: Vui lòng chọn kho xuất cho "${prodLabel}"`);
        focusField(`so-line-wh-${i}`);
        return false;
      }
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
        focusField(`so-line-qty-${i}`);
        return false;
      }
      const price = Number(lines[i].unitPrice);
      if (Number.isNaN(price) || price < 0) {
        showToast('error', `Dòng ${i + 1}: đơn giá không hợp lệ`);
        focusField(`so-line-price-${i}`);
        return false;
      }
    }
    return true;
  };

  const validateDirectCheckout = () => {
    if (!form.soDate) {
      showToast('error', 'Vui lòng nhập ngày bán');
      focusField('so-docDate');
      return false;
    }
    const paid = Number(paymentAmount || 0);
    if (Number.isNaN(paid) || paid < 0) {
      showToast('error', 'Số tiền khách trả không hợp lệ');
      focusField('so-paymentAmount');
      return false;
    }
    if (paid > grandTotal) {
      showToast('error', 'Số tiền khách trả vượt tổng thanh toán');
      focusField('so-paymentAmount');
      return false;
    }

    if (lines.length === 0) {
      showToast('error', 'Đơn hàng phải có ít nhất 1 dòng sản phẩm');
      return false;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId) {
        showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`);
        focusField(`so-line-product-${i}`);
        return false;
      }
      if (!lines[i].warehouseId) {
        const prod = variants.find(item => String(item.id) === String(lines[i].variantId));
        const prodLabel = prod ? (prod.productName || prod.variantName || `ID #${prod.id}`) : `sản phẩm`;
        showToast('error', `Dòng ${i + 1}: Vui lòng chọn kho xuất cho "${prodLabel}"`);
        focusField(`so-line-wh-${i}`);
        return false;
      }
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
        focusField(`so-line-qty-${i}`);
        return false;
      }
      const price = Number(lines[i].unitPrice);
      if (Number.isNaN(price) || price < 0) {
        showToast('error', `Dòng ${i + 1}: đơn giá không hợp lệ`);
        focusField(`so-line-price-${i}`);
        return false;
      }
      const v = variants.find(item => String(item.id) === String(lines[i].variantId));
      if (v?.trackSerial) {
        const serialCount = Array.isArray(lines[i].serialNumbers) ? lines[i].serialNumbers.length : 0;
        if (serialCount !== qty) {
          showToast('error', `Dòng ${i + 1}: Vui lòng quét đủ ${qty} mã serial cho sản phẩm "${v.productName || v.variantName || ''}" (hiện có ${serialCount})`);
          setSerialModalLineIndex(i);
          return false;
        }
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
    trackSerial: Boolean(v.trackSerial),
  }));
  const inventoryMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(inventoryBalances)) {
      inventoryBalances.forEach(b => {
        const qty = Math.max(0, Number(b.availableQuantity ?? (Number(b.totalQuantity || b.quantityOnHand || 0) - Number(b.totalReserved || b.quantityReserved || 0))));
        const vId = String(b.variantId || b.id || '');
        const wId = b.warehouseId ? String(b.warehouseId) : null;
        if (vId && wId) {
          map.set(`${vId}_${wId}`, (map.get(`${vId}_${wId}`) || 0) + qty);
        }
        if (vId) {
          map.set(vId, (map.get(vId) || 0) + qty);
        }
      });
    }
    return map;
  }, [inventoryBalances]);

  const getWarehouseInventoryMap = useCallback((warehouseId) => {
    const map = new Map();
    if (Array.isArray(inventoryBalances)) {
      inventoryBalances.forEach(b => {
        const qty = Math.max(0, Number(b.availableQuantity ?? (Number(b.totalQuantity || b.quantityOnHand || 0) - Number(b.totalReserved || b.quantityReserved || 0))));
        const vId = String(b.variantId || b.id || '');
        const wId = b.warehouseId ? String(b.warehouseId) : null;
        if (warehouseId) {
          if (wId === String(warehouseId)) {
            map.set(vId, (map.get(vId) || 0) + qty);
          }
        } else {
          map.set(vId, (map.get(vId) || 0) + qty);
        }
      });
    }
    return map;
  }, [inventoryBalances]);

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
                          inputId="so-partnerId"
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
                      id="so-docDate"
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
                        id="so-paymentAmount"
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
                        id="so-paymentDueDate"
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
                      <strong>{totalQuantity.toLocaleString('vi-VN')}</strong>
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
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.linesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: 260, width: 280 }}>Sản phẩm</th>
                      <th style={{ width: 170, minWidth: 160 }}>Kho xuất</th>
                      <th style={{ width: 70, textAlign: 'center' }}>ĐVT</th>
                      <th style={{ width: 90, textAlign: 'right' }}>Số lượng</th>
                      <th style={{ width: 75, textAlign: 'center' }}>BH (T)</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Đơn giá</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ width: 80, textAlign: 'center' }}>% VAT</th>
                      {mode === 'direct' && <th style={{ width: 120, textAlign: 'center' }}>Serial</th>}
                      <th style={{ width: 150 }}>Ghi chú dòng</th>
                      <th style={{ width: 40, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineTotal = Number(line.quantity) * Number(line.unitPrice);
                      const effectiveWh = line.warehouseId || null;
                      const lineInventoryMap = getWarehouseInventoryMap(effectiveWh);
                      const availableQty = line.variantId
                        ? (effectiveWh
                            ? (inventoryMap.get(`${line.variantId}_${effectiveWh}`) || 0)
                            : (inventoryMap.get(String(line.variantId)) || 0))
                        : 0;
                      const selectedWhObj = warehouses.find(w => String(w.id) === String(effectiveWh));
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                          <td>
                            <ProductGridSelect
                              id={`so-line-product-${idx}`}
                              products={productOptions}
                              inventoryMap={lineInventoryMap}
                              value={line.variantId}
                              onChange={selected => handleProductSelect(idx, selected)}
                              onAddNew={() => {
                                setQuickAddLineIndex(idx);
                                setShowQuickAddProduct(true);
                              }}
                              displayMode="code-name"
                              placeholder="Chọn mã hoặc tên hàng"
                            />
                            {line.variantId && (
                              <div style={{
                                marginTop: 4,
                                fontSize: 11,
                                color: effectiveWh
                                  ? (availableQty >= Number(line.quantity || 0) ? '#16a34a' : '#dc2626')
                                  : '#d97706'
                              }}>
                                {effectiveWh
                                  ? `Tồn khả dụng (${selectedWhObj?.name || 'Kho'}): ${money(availableQty)}`
                                  : `Tổng tồn hệ thống: ${money(availableQty)} (Chưa chọn kho xuất)`}
                              </div>
                            )}
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <Select
                              inputId={`so-line-wh-${idx}`}
                              options={warehouseOptions}
                              value={warehouseOptions.find(o => String(o.value) === String(line.warehouseId)) || null}
                              onChange={opt => updateLine(idx, 'warehouseId', opt?.value || null)}
                              placeholder="Chọn kho xuất..."
                              styles={{
                                ...customSelectStyles,
                                control: (base, state) => ({
                                  ...customSelectStyles.control(base, state),
                                  borderColor: state.isFocused ? '#2563eb' : (!line.warehouseId ? '#f59e0b' : '#d1d5db'),
                                })
                              }}
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                            {!line.warehouseId && (
                              <div style={{ marginTop: 2, fontSize: 11, color: '#d97706', fontWeight: 500 }}>
                                * Chưa chọn kho
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            {line.unitName || '—'}
                          </td>
                          <td>
                            <input
                              id={`so-line-qty-${idx}`}
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
                              id={`so-line-warranty-${idx}`}
                              type="number"
                              min="0"
                              className={styles.lineInput}
                              value={line.warrantyMonths}
                              onChange={e => updateLine(idx, 'warrantyMonths', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              id={`so-line-price-${idx}`}
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
                              id={`so-line-vat-${idx}`}
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
                                {line.variantId && (() => {
                                  const prod = variants.find(v => String(v.id) === String(line.variantId));
                                  if (!prod?.trackSerial) {
                                    return <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>;
                                  }
                                  const isFull = (line.serialNumbers?.length || 0) === Number(line.quantity || 0);
                                  return (
                                    <button
                                      type="button"
                                      style={{
                                        background: isFull ? '#dcfce7' : '#fef9c3',
                                        color: isFull ? '#166534' : '#854d0e',
                                        border: `1px solid ${isFull ? '#bbf7d0' : '#fef08a'}`,
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
                                  );
                                })()}
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
                      <td colSpan={mode === 'direct' ? 10 : 9} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14, color: '#475569' }}>
                        <strong>Tiền hàng:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 15, color: '#1d4ed8' }}>
                        {money(subTotalAmount)} đ
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={mode === 'direct' ? 10 : 9} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 14, color: '#475569' }}>
                        <strong>Tiền thuế VAT:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 15, color: '#dc2626' }}>
                        {money(totalVatAmount)} đ
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={mode === 'direct' ? 10 : 9} style={{ textAlign: 'right', padding: '8px 12px', fontSize: 15, color: '#0f172a' }}>
                        <strong>Tổng cộng thanh toán:</strong>
                      </td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700, fontSize: 16, color: '#16a34a' }}>
                        {money(grandTotal)} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ color: '#4b5563', fontSize: '13px' }}>
                    Tổng số: <strong style={{ color: '#111827' }}>{lines.length}</strong> bản ghi
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={addLine}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151'
                      }}
                    >
                      Thêm dòng
                    </button>
                    <button
                      type="button"
                      onClick={() => setLines([emptyLine()])}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#374151'
                      }}
                    >
                      Xóa hết dòng
                    </button>
                  </div>
                </div>
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
