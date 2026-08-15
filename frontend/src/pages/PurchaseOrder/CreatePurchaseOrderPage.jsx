import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import SupplierModal from '../Supplier/components/SupplierModal';
import OcrUploadModal from '../CreateImportSlip/components/OcrUploadModal';
import OcrResultPreviewModal from '../CreateImportSlip/components/OcrResultPreviewModal';
import { scanImportSlipOcr, confirmOcrMapping } from '../../api/inventoryImportApi';
import * as poApi from '../../api/purchaseOrderApi';
import styles from './CreatePurchaseOrderPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { findBestMatch } from '../../utils/fuzzyMatch';
import { useAiFeature } from '../../contexts/AiFeatureContext';

const unwrap      = (res) => res?.data?.data ?? res?.data;
const pageContent = (p)   => p?.content ?? p ?? [];
const today       = getTodayIsoDate;
const money       = (v)   => Number(v || 0).toLocaleString('vi-VN');

const customSelectStyles = {
  control: (base, state) => ({
    ...base, minHeight: 36, height: 36, fontSize: 13,
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow:   state.isFocused ? '0 0 0 1px #2563eb' : 'none',
  }),
  valueContainer:       (base) => ({ ...base, height: 36, padding: '0 8px' }),
  input:                (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator:   ()     => ({ display: 'none' }),
  indicatorsContainer:  (base) => ({ ...base, height: 36 }),
  menuPortal:           (base) => ({ ...base, zIndex: 9999 }),
};

const emptyLine = () => ({
  variantId: null,
  quantity: 1,
  unitPrice: 0,
  unitName: '',
  vatRate: 0,
  note: '',
});

function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const voiceData = location.state?.voiceData || null;
  const { aiEnabled } = useAiFeature();

  const [suppliers, setSuppliers] = useState([]);
  const [variants,  setVariants]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddLineIndex, setQuickAddLineIndex] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState({ isVisible: false, type: 'info', message: '' });

  // ── AI OCR States ──
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewData, setOcrPreviewData] = useState(null);
  const [ocrQuickAddPreviewIndex, setOcrQuickAddPreviewIndex] = useState(null);
  const [ocrQuickAddProductName, setOcrQuickAddProductName] = useState('');
  const [ocrQuickAddUnitName, setOcrQuickAddUnitName] = useState('');
  const [ocrQuickAddCategoryName, setOcrQuickAddCategoryName] = useState('');
  const [ocrQuickAddWarrantyMonths, setOcrQuickAddWarrantyMonths] = useState('');

  const [form, setForm] = useState({
    poCode: '',
    poDate: today(),
    partnerId: null,
    paymentDueDate: '',
    expectedDeliveryDate: '',
    note: '',
  });
  const [lines, setLines] = useState([emptyLine()]);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(p => ({ ...p, isVisible: false }));

  // ── AI OCR Handlers ──
  const handleOcrPreviewQuickAdd = (index, rawProductName, unit, category, warrantyMonths) => {
    setOcrQuickAddPreviewIndex(index);
    setOcrQuickAddProductName(rawProductName);
    setOcrQuickAddUnitName(unit || '');
    setOcrQuickAddCategoryName(category || '');
    setOcrQuickAddWarrantyMonths(warrantyMonths !== null && warrantyMonths !== undefined ? String(warrantyMonths) : '');
    setShowQuickAddProduct(true);
  };

  const handleOcrSuccess = (data) => {
    setShowOcrModal(false);
    setOcrPreviewData(data);
  };

  const handleOcrFile = async (file) => {
    setOcrLoading(true);
    try {
      const res = await scanImportSlipOcr(file);
      const data = unwrap(res);
      if (!data) {
        showToast('error', 'Không nhận diện được nội dung từ file hóa đơn / báo giá.');
        return;
      }
      handleOcrSuccess(data);
    } catch (err) {
      console.error('OCR scan error:', err);
      showToast('error', err.response?.data?.userMessage || err.message || 'Lỗi khi quét OCR.');
    } finally {
      setOcrLoading(false);
    }
  };

  const confirmOcrPreview = () => {
    if (!ocrPreviewData) return;
    const data = ocrPreviewData;

    // Auto-fill Supplier
    if (data.matchedSupplierId) {
      setForm(prev => ({
        ...prev,
        partnerId: data.matchedSupplierId
      }));
    }

    // Auto-fill Date if available
    if (data.invoiceDate) {
      setForm(prev => ({
        ...prev,
        poDate: data.invoiceDate
      }));
    }

    if (data.invoiceCode) {
      setForm(prev => ({
        ...prev,
        note: prev.note ? `${prev.note} - Hóa đơn/Báo giá: ${data.invoiceCode}` : `Hóa đơn/Báo giá: ${data.invoiceCode}`
      }));
    }

    if (data.items && data.items.length > 0) {
      const ocrLines = data.items.map(item => {
        const matchedVariant = variants.find(v => String(v.id) === String(item.matchedVariantId));
        return {
          variantId: item.matchedVariantId || null,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || (matchedVariant ? Number(matchedVariant.importPrice || matchedVariant.costPrice || 0) : 0),
          unitName: item.unitName || matchedVariant?.unitName || 'Cái',
          vatRate: item.vatRate !== undefined && item.vatRate !== null ? Number(item.vatRate) : Number(matchedVariant?.vatPercent || matchedVariant?.vatRate || 0),
          note: item.rawProductName && item.rawProductName !== item.matchedVariantName ? `Tên gốc: ${item.rawProductName}` : '',
          _ocrConfidence: item.matchConfidence,
          _ocrRawName: item.rawProductName,
          _ocrSuggestions: item.alternativeSuggestions,
        };
      });
      setLines(ocrLines);
    }

    showToast('success', `Trích xuất thành công ${data.items?.length || 0} sản phẩm từ hóa đơn / báo giá!`);
    setOcrPreviewData(null);
  };

  // Load lookups
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [supplierRes, variantRes, codeRes] = await Promise.allSettled([
          poApi.getSuppliers({ isSupplier: true, status: 'APPROVED', size: 1000 }),
          poApi.getProducts({ size: 500 }),
          !isEdit ? poApi.getNextPoCode() : Promise.resolve(null),
        ]);

        if (supplierRes.status === 'fulfilled') {
          setSuppliers(pageContent(unwrap(supplierRes.value)));
        }
        if (variantRes.status === 'fulfilled') {
          setVariants(pageContent(unwrap(variantRes.value)));
        }
        if (codeRes.status === 'fulfilled' && codeRes.value) {
          const code = unwrap(codeRes.value);
          setForm(p => ({ ...p, poCode: code || '' }));
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

    // Auto-select supplier
    if (voiceData.supplierKeyword && suppliers.length > 0) {
      const matchSupp = findBestMatch(suppliers, voiceData.supplierKeyword, s => [s.name, s.code, s.phone]);
      if (matchSupp) {
        setForm(prev => ({ ...prev, partnerId: matchSupp.id }));
      }
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
        const price = voiceData.unitPrice != null ? Number(voiceData.unitPrice) : (Number(matchProd.importPrice || matchProd.costPrice || matchProd.price || 0));
        setLines([{
          variantId: matchProd.id,
          quantity: qty,
          unitPrice: price,
          unitName: matchProd.unitName || 'Cái',
          vatRate: Number(matchProd.vatPercent || matchProd.vatRate || 0),
          note: '',
        }]);
      }
    }
  }, [voiceData, isEdit, suppliers, variants]);

  // Load PO data if editing
  useEffect(() => {
    if (!isEdit) return;
    const loadPo = async () => {
      try {
        const res = await poApi.getPurchaseOrderById(id);
        const po  = unwrap(res);
        if (!po) return;
        setForm({
          poCode:               po.poCode,
          poDate:               po.poDate,
          partnerId:            po.partnerId,
          paymentDueDate:       po.paymentDueDate || '',
          expectedDeliveryDate: po.expectedDeliveryDate || '',
          note:                 po.note || '',
        });
        setLines((po.lines || []).map(l => ({
          variantId: l.variantId,
          quantity:  Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          unitName:  l.unitName || '',
          vatRate:   l.vatRate  || 0,
          note:      l.note     || '',
        })));
      } catch {
        showToast('error', 'Không thể tải dữ liệu đơn hàng');
      }
    };
    loadPo();
  }, [id, isEdit]);

  // ── Line management ──
  const addLine     = ()             => setLines(p => [...p, emptyLine()]);
  const removeLine  = (idx)          => setLines(p => p.filter((_, i) => i !== idx));
  const updateLine  = (idx, f, val)  => setLines(p => p.map((l, i) => i === idx ? { ...l, [f]: val } : l));
  const updateLineMultiple = (idx, updates) =>
    setLines(p => p.map((l, i) => i === idx ? { ...l, ...updates } : l));

  const handleQuickAddProductSuccess = async (newProduct) => {
    try {
      const response = await poApi.getProducts({ size: 500 });
      const refreshedVariants = pageContent(unwrap(response));
      setVariants(refreshedVariants);
      const createdVariant = refreshedVariants.find(v =>
        String(v.productId || v.product?.id) === String(newProduct?.id)
      ) || refreshedVariants.find(v => String(v.id) === String(newProduct?.id));

      if (createdVariant && quickAddLineIndex !== null) {
        updateLineMultiple(quickAddLineIndex, {
          variantId: createdVariant.id,
          unitName: createdVariant.unitName || 'Cái',
          vatRate: Number(createdVariant.vatPercent || createdVariant.vatRate || 0),
        });
        showToast('success', `Đã thêm và chọn sản phẩm ${createdVariant.productName || ''}`.trim());
      } else if (createdVariant && ocrQuickAddPreviewIndex !== null) {
        setOcrPreviewData(prev => {
          if (!prev) return prev;
          const newData = { ...prev, items: [...prev.items] };
          newData.items[ocrQuickAddPreviewIndex] = {
            ...newData.items[ocrQuickAddPreviewIndex],
            matchedVariantId: createdVariant.id,
            matchedVariantName: createdVariant.variantName || createdVariant.productName,
            matchedSku: createdVariant.sku,
            unitName: createdVariant.unitName || 'Cái',
            matchConfidence: 1.0
          };
          return newData;
        });
        showToast('success', `Đã tạo và khớp sản phẩm: ${createdVariant.productName || ''}`);
      } else {
        showToast('warning', 'Đã thêm sản phẩm thành công.');
      }
    } catch {
      showToast('error', 'Thêm sản phẩm thành công nhưng không tải lại được danh sách hàng hóa.');
    } finally {
      setShowQuickAddProduct(false);
      setQuickAddLineIndex(null);
      setOcrQuickAddPreviewIndex(null);
      setOcrQuickAddProductName('');
      setOcrQuickAddUnitName('');
      setOcrQuickAddCategoryName('');
      setOcrQuickAddWarrantyMonths('');
    }
  };

  // ── Totals ──
  const subTotalAmount = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0);
  const totalVatAmount = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0) * Number(l.vatRate || 0) / 100, 0);
  const grandTotal     = subTotalAmount + totalVatAmount;
  const totalQty       = lines.reduce((s, l) => s + Number(l.quantity || 0), 0);

  // ── Build payload ──
  const buildPayload = () => ({
    poCode:               form.poCode.trim() || undefined,
    poDate:               form.poDate,
    paymentDueDate:       form.paymentDueDate       || undefined,
    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
    partnerId:            Number(form.partnerId),
    note:                 form.note || undefined,
    lines: lines.map(l => ({
      variantId: Number(l.variantId),
      quantity:  Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate:   Number(l.vatRate || 0),
      note:      l.note || undefined,
    })),
  });

  const validate = () => {
    if (!form.partnerId) { showToast('error', 'Vui lòng chọn nhà cung cấp'); return false; }
    if (!form.poDate)    { showToast('error', 'Vui lòng nhập ngày lập');      return false; }
    if (form.paymentDueDate && form.paymentDueDate < form.poDate) {
      showToast('error', 'Hạn công nợ không được nhỏ hơn ngày lập đơn');
      return false;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId)           { showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`); return false; }
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
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
        res = await poApi.updatePurchaseOrder(id, buildPayload());
      } else {
        res = await poApi.createPurchaseOrder(buildPayload());
      }
      const saved = unwrap(res);

      // Trigger AI Learning for OCR
      if (form.partnerId) {
        lines.forEach(item => {
          if (item._ocrRawName && item.variantId) {
            confirmOcrMapping(form.partnerId, item._ocrRawName, item.variantId)
              .catch(e => console.warn('Lỗi lưu OCR mapping:', e));
          }
        });
      }

      if (andApprove && saved?.id) {
        try {
          await poApi.approvePurchaseOrder(saved.id);
          navigate('/purchase-orders', {
            state: { toastMessage: `Tạo và duyệt đơn ${saved.poCode} thành công! Công nợ đã được ghi nhận.`, toastType: 'success' }
          });
        } catch (approveErr) {
          navigate('/purchase-orders', {
            state: { toastMessage: `Lưu đơn ${saved.poCode} thành công nhưng duyệt thất bại: ${approveErr.response?.data?.userMessage}`, toastType: 'warning' }
          });
        }
      } else {
        navigate('/purchase-orders', {
          state: { toastMessage: `${isEdit ? 'Cập nhật' : 'Tạo'} đơn ${saved.poCode} thành công`, toastType: 'success' }
        });
      }
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Lưu đơn hàng thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupplier = async (supplierFormData, isContinue) => {
    try {
      const res = await poApi.createSupplier(supplierFormData);
      const newSupplier = unwrap(res);
      if (newSupplier?.id) {
        setSuppliers(prev => [newSupplier, ...prev]);
        setForm(prev => ({ ...prev, partnerId: newSupplier.id }));
      } else {
        const supRes = await poApi.getSuppliers({ isSupplier: true, size: 1000 });
        const list = pageContent(unwrap(supRes));
        setSuppliers(list);
        if (list.length > 0) setForm(prev => ({ ...prev, partnerId: list[0].id }));
      }
      showToast('success', 'Thêm mới nhà cung cấp thành công!');
      if (!isContinue) {
        setShowSupplierModal(false);
      }
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tạo nhà cung cấp');
    }
  };

  // ── react-select options ──
  const supplierOptions = suppliers
    .filter(s => s.status === 'APPROVED' || s.id === form.partnerId)
    .map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const productOptions = variants.map(v => ({
    ...v,
    productName: v.productName || v.variantName || `Sản phẩm #${v.id}`,
    unitName: v.unitName || 'Cái',
    vatRate: v.vatPercent || v.vatRate || 0,
  }));

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className={styles.breadcrumb}>
                <span className={styles.breadcrumbLink} onClick={() => navigate('/purchase-orders')}>
                  Đơn mua hàng
                </span>
                <i className="bi bi-chevron-right" style={{ margin: '0 6px', fontSize: 12 }} />
                <span>{isEdit ? 'Cập nhật đơn mua hàng' : 'Tạo đơn mua hàng mới'}</span>
              </div>
              <h1 className={styles.pageTitle}>
                <i className="bi bi-bag-plus" style={{ marginRight: 8 }} />
                {isEdit
                  ? `Cập nhật: ${form.poCode}`
                  : `Tạo đơn mua hàng mới${form.poCode ? `: ${form.poCode}` : ''}`}
              </h1>
            </div>

            {!isEdit && aiEnabled && (
              <button
                type="button"
                onClick={() => setShowOcrModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  background: 'var(--brand-gradient, linear-gradient(135deg, var(--color-primary, #059669) 0%, var(--color-primary-accent, #10b981) 100%))',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
              >
                <i className="bi bi-robot" style={{ fontSize: '15px' }}></i> 🤖 Quét AI (OCR Báo giá / Hóa đơn)
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : (
          <>
            {/* ── Form body ── */}
            <div className={styles.formBody}>
              {/* Left panel — supplier info */}
              <div className={styles.leftPanel}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-truck" /> Thông tin nhà cung cấp
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Nhà cung cấp <span className={styles.required}>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <Select
                          options={supplierOptions}
                          value={supplierOptions.find(o => o.value === form.partnerId) || null}
                          onChange={opt => setForm(p => ({ ...p, partnerId: opt?.value || null }))}
                          placeholder="Chọn nhà cung cấp..."
                          isClearable
                          styles={customSelectStyles}
                        />
                      </div>
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#f9fafb',
                          cursor: 'pointer',
                          color: '#2563eb'
                        }}
                        title="Thêm nhanh nhà cung cấp"
                        onClick={() => setShowSupplierModal(true)}
                      >
                        <i className="bi bi-plus-lg" style={{ fontSize: '16px' }}></i>
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Hạn công nợ</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={form.paymentDueDate}
                      onChange={e => setForm(p => ({ ...p, paymentDueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-info-circle" /> Thông tin chung
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ngày lập đơn <span className={styles.required}>*</span></label>
                    <input
                      type="date"
                      className={styles.input}
                      value={form.poDate}
                      onChange={e => setForm(p => ({ ...p, poDate: e.target.value }))}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ngày dự kiến nhận</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={form.expectedDeliveryDate}
                      onChange={e => setForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ghi chú</label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      placeholder="Ghi chú thêm về đơn hàng..."
                      value={form.note}
                      onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Right panel — totals & quick actions */}
              <div className={styles.rightPanel}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Tổng giá trị đơn hàng</div>
                  <div className={styles.summaryRow}>
                    <span>Tổng số lượng:</span>
                    <strong>{totalQty}</strong>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tiền hàng (chưa VAT):</span>
                    <span>{money(subTotalAmount)} đ</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tiền thuế VAT:</span>
                    <span>{money(totalVatAmount)} đ</span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryTotalRow}>
                    <span>TỔNG CỘNG:</span>
                    <span className={styles.totalAmount}>{money(grandTotal)} đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Product lines table ── */}
            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <span className={styles.tableTitle}>
                  <i className="bi bi-box-seam" /> Danh sách sản phẩm ({lines.length})
                </span>
                <button className={styles.btnAddLine} onClick={addLine}>
                  <i className="bi bi-plus-lg" /> Thêm dòng
                </button>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: 260 }}>Sản phẩm / Biến thể <span className={styles.required}>*</span></th>
                      <th style={{ width: 90, textAlign: 'center' }}>ĐVT</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Số lượng <span className={styles.required}>*</span></th>
                      <th style={{ width: 140, textAlign: 'right' }}>Đơn giá (đ)</th>
                      <th style={{ width: 90, textAlign: 'right' }}>VAT (%)</th>
                      <th style={{ width: 150, textAlign: 'right' }}>Thành tiền (đ)</th>
                      <th style={{ minWidth: 160 }}>Ghi chú dòng</th>
                      <th style={{ width: 50, textAlign: 'center' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineSubtotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
                      const lineVat      = lineSubtotal * Number(line.vatRate || 0) / 100;
                      const lineTotal    = lineSubtotal + lineVat;

                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                          <td>
                            <ProductGridSelect
                              products={productOptions}
                              value={line.variantId ? String(line.variantId) : ''}
                              onChange={val => {
                                const selected = variants.find(v => String(v.id) === String(val));
                                if (selected) {
                                  updateLineMultiple(idx, {
                                    variantId: selected.id,
                                    unitName:  selected.unitName || 'Cái',
                                    unitPrice: Number(selected.importPrice || selected.costPrice || selected.price || 0),
                                    vatRate:   Number(selected.vatPercent || selected.vatRate || 0),
                                  });
                                } else {
                                  updateLine(idx, 'variantId', null);
                                }
                              }}
                              onQuickAdd={() => {
                                setQuickAddLineIndex(idx);
                                setShowQuickAddProduct(true);
                              }}
                              placeholder="Tìm kiếm theo mã SKU, tên linh kiện..."
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={styles.unitBadge}>{line.unitName || '—'}</span>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className={`${styles.input} ${styles.inputRight}`}
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              className={`${styles.input} ${styles.inputRight}`}
                              value={line.unitPrice}
                              onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              className={`${styles.input} ${styles.inputRight}`}
                              value={line.vatRate}
                              onChange={e => updateLine(idx, 'vatRate', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                            {money(lineTotal)}
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Ghi chú..."
                              value={line.note}
                              onChange={e => updateLine(idx, 'note', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {lines.length > 1 && (
                              <button
                                className={styles.btnRemoveLine}
                                onClick={() => removeLine(idx)}
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div className={styles.actionBar}>
              <button
                className={styles.btnOutline}
                onClick={() => navigate('/purchase-orders')}
                disabled={saving}
              >
                <i className="bi bi-x" /> Hủy
              </button>
              <button
                className={styles.btnSave}
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                {saving ? <><i className="bi bi-hourglass-split" /> Đang lưu...</> : <><i className="bi bi-floppy" /> Lưu nháp</>}
              </button>
              {!isEdit && (
                <button
                  className={styles.btnSaveAndApprove}
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {saving ? '...' : <><i className="bi bi-check2-circle" /> Lưu &amp; Duyệt ngay</>}
                </button>
              )}
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
          setOcrQuickAddPreviewIndex(null);
          setOcrQuickAddProductName('');
          setOcrQuickAddUnitName('');
          setOcrQuickAddCategoryName('');
          setOcrQuickAddWarrantyMonths('');
        }}
        onSuccess={handleQuickAddProductSuccess}
        productType="Hàng hóa"
        initialProductName={ocrQuickAddProductName}
        initialUnitName={ocrQuickAddUnitName}
        initialCategoryName={ocrQuickAddCategoryName}
        initialWarrantyMonths={ocrQuickAddWarrantyMonths}
      />

      {showSupplierModal && (
        <SupplierModal 
          onClose={() => setShowSupplierModal(false)}
          onSave={handleSaveSupplier}
        />
      )}

      <OcrUploadModal
        open={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onFileSelected={handleOcrFile}
        loading={ocrLoading}
        onOcrSuccess={handleOcrSuccess}
      />

      <OcrResultPreviewModal
        open={Boolean(ocrPreviewData)}
        data={ocrPreviewData}
        onConfirm={confirmOcrPreview}
        onCancel={() => setOcrPreviewData(null)}
        onQuickAdd={handleOcrPreviewQuickAdd}
      />
    </AdminLayout>
  );
}

export default CreatePurchaseOrderPage;
