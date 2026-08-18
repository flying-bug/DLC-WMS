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
import { useAiFeature } from '../../contexts/AiFeatureContext';
import { scanImportSlipOcr, confirmOcrMapping } from '../../api/inventoryImportApi';
import * as poApi from '../../api/purchaseOrderApi';
import styles from './CreatePurchaseOrderPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { findBestMatch } from '../../utils/fuzzyMatch';

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

const emptyLine = (defaultWh = null) => ({
  variantId: null,
  warehouseId: defaultWh,
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

  const [suppliers,  setSuppliers]  = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants,   setVariants]   = useState([]);
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
          _ocrRawName: item.rawProductName,
        };
      });
      setLines(ocrLines);
    }

    setOcrPreviewData(null);
    showToast('success', 'Đã áp dụng dữ liệu từ chứng từ AI vào đơn mua hàng!');
  };

  // Load lookups
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [supplierRes, variantRes, warehouseRes, codeRes] = await Promise.allSettled([
          poApi.getSuppliers({ isSupplier: true, status: 'APPROVED', size: 1000 }),
          poApi.getProducts({ size: 500 }),
          poApi.getWarehouses({ size: 100 }),
          !isEdit ? poApi.getNextPoCode() : Promise.resolve(null),
        ]);

        if (supplierRes.status === 'fulfilled') {
          setSuppliers(pageContent(unwrap(supplierRes.value)));
        }
        if (variantRes.status === 'fulfilled') {
          setVariants(pageContent(unwrap(variantRes.value)));
        }
        if (warehouseRes.status === 'fulfilled') {
          const whList = pageContent(unwrap(warehouseRes.value));
          setWarehouses(whList);
          if (!isEdit && whList.length > 0) {
            setLines(prev => prev.map(l => ({ ...l, warehouseId: l.warehouseId || whList[0].id })));
          }
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
        const defaultWh = warehouses.length > 0 ? warehouses[0].id : null;
        setLines([{
          variantId: matchProd.id,
          warehouseId: defaultWh,
          quantity: qty,
          unitPrice: price,
          unitName: matchProd.unitName || 'Cái',
          vatRate: Number(matchProd.vatPercent || matchProd.vatRate || 0),
          note: '',
        }]);
      }
    }
  }, [voiceData, isEdit, suppliers, variants, warehouses]);

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
          variantId:   l.variantId,
          warehouseId: l.warehouseId || (warehouses.length > 0 ? warehouses[0].id : null),
          quantity:    Number(l.quantity),
          unitPrice:   Number(l.unitPrice),
          unitName:    l.unitName || '',
          vatRate:     l.vatRate  || 0,
          note:        l.note     || '',
        })));
      } catch {
        showToast('error', 'Không thể tải dữ liệu đơn hàng');
      }
    };
    loadPo();
  }, [id, isEdit, warehouses]);

  // ── Line management ──
  const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : null;
  const addLine     = ()             => setLines(p => [...p, emptyLine(defaultWarehouseId)]);
  const removeLine  = (idx)          => setLines(p => p.filter((_, i) => i !== idx));
  const updateLine  = (idx, f, val)  => setLines(p => p.map((l, i) => i === idx ? { ...l, [f]: val } : l));
  const updateLineMultiple = (idx, updates) =>
    setLines(p => p.map((l, i) => i === idx ? { ...l, ...updates } : l));

  const handleProductSelect = (idx, selected) => {
    if (!selected) {
      updateLine(idx, 'variantId', null);
      return;
    }
    const currentWh = lines[idx]?.warehouseId || defaultWarehouseId;
    const existingIndex = lines.findIndex((l, i) => i !== idx && String(l.variantId) === String(selected.id) && String(l.warehouseId) === String(currentWh));
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
      showToast('info', 'Sản phẩm cùng kho nhận đã tồn tại trong danh sách, đã tự động tăng số lượng.');
      return;
    }
    updateLineMultiple(idx, {
      variantId: selected.id,
      warehouseId: currentWh,
      unitName: selected.unitName || 'Cái',
      vatRate: Number(selected.vatPercent || selected.vatRate || 0),
    });
  };

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
          warehouseId: lines[quickAddLineIndex]?.warehouseId || defaultWarehouseId,
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
        showToast('warning', 'Đã thêm sản phẩm nhưng chưa tìm thấy biến thể để chọn.');
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
      variantId:   Number(l.variantId),
      warehouseId: l.warehouseId ? Number(l.warehouseId) : undefined,
      quantity:    Number(l.quantity),
      unitPrice:   Number(l.unitPrice),
      vatRate:     Number(l.vatRate || 0),
      note:        l.note || undefined,
    })),
  });

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
      showToast('error', 'Vui lòng chọn nhà cung cấp');
      focusField('po-supplierId');
      return false;
    }
    if (!form.poDate) {
      showToast('error', 'Vui lòng nhập ngày lập');
      focusField('po-docDate');
      return false;
    }
    if (form.paymentDueDate && form.paymentDueDate < form.poDate) {
      showToast('error', 'Hạn công nợ không được nhỏ hơn ngày lập đơn');
      focusField('po-paymentDueDate');
      return false;
    }
    if (lines.length === 0) {
      showToast('error', 'Đơn mua hàng phải có ít nhất 1 dòng sản phẩm');
      return false;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].variantId) {
        showToast('error', `Dòng ${i + 1}: chưa chọn sản phẩm`);
        focusField(`po-line-product-${i}`);
        return false;
      }
      const qty = Number(lines[i].quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        showToast('error', `Dòng ${i + 1}: số lượng phải là số nguyên lớn hơn 0`);
        focusField(`po-line-qty-${i}`);
        return false;
      }
      const price = Number(lines[i].unitPrice);
      if (Number.isNaN(price) || price < 0) {
        showToast('error', `Dòng ${i + 1}: đơn giá không hợp lệ`);
        focusField(`po-line-price-${i}`);
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

      if (!isEdit && form.partnerId) {
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
                padding: '8px 16px',
                background: 'var(--brand-gradient, linear-gradient(135deg, var(--color-primary, #059669) 0%, var(--color-primary-accent, #10b981) 100%))',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
              }}
            >
              <i className="bi bi-robot" style={{ fontSize: '15px' }} />
              <span>Quét AI (OCR Báo giá / Hóa đơn)</span>
            </button>
          )}
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
                          inputId="po-supplierId"
                          options={supplierOptions}
                          value={supplierOptions.find(o => o.value === form.partnerId) || null}
                          onChange={opt => setForm(p => ({ ...p, partnerId: opt?.value || null }))}
                          placeholder="Chọn nhà cung cấp..."
                          isClearable
                          styles={customSelectStyles}
                          menuPortalTarget={document.body}
                        />
                      </div>
                      <button type="button" onClick={() => setShowSupplierModal(true)} style={{ width: '38px', height: '38px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="bi bi-plus" style={{ fontSize: '20px', color: 'var(--color-primary)' }}></i>
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ghi chú</label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={form.note}
                      onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="Ghi chú thêm về đơn mua hàng..."
                    />
                  </div>
                </div>
              </div>

              {/* Middle panel — order identity */}
              <div className={styles.middlePanel}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-file-earmark-text" /> Thông tin đơn mua
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ngày lập <span className={styles.required}>*</span></label>
                    <input
                      id="po-docDate"
                      type="date"
                      className={styles.input}
                      value={form.poDate}
                      onChange={e => setForm(p => ({ ...p, poDate: e.target.value }))}
                    />
                  </div>

                  <div className={styles.additionalFields}>
                    <div className={styles.fieldRow}>
                      <label className={styles.label}>Hạn công nợ</label>
                      <input
                        id="po-paymentDueDate"
                        type="date"
                        className={styles.input}
                        min={form.poDate}
                        value={form.paymentDueDate}
                        onChange={e => setForm(p => ({ ...p, paymentDueDate: e.target.value }))}
                      />
                    </div>

                    <div className={styles.fieldRow}>
                      <label className={styles.label}>Ngày giao hàng dự kiến</label>
                      <input
                        type="date"
                        className={styles.input}
                        min={form.poDate}
                        value={form.expectedDeliveryDate}
                        onChange={e => setForm(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel — delivery and totals */}
              <div className={styles.rightPanel}>
                <div className={styles.section}>
                  {/* Summary box */}
                  <div className={styles.summaryBox}>
                    <div className={styles.summaryRow}>
                      <span>Tổng số lượng:</span>
                      <strong>{totalQty.toLocaleString('vi-VN')}</strong>
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
                      <span>Tổng công nợ:</span>
                      <strong className={styles.totalAmount}>{money(grandTotal)} đ</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lines ── */}
            <div className={styles.linesSection}>
              <div className={styles.linesSectionHeader}>
                <span className={styles.sectionTitle}>
                  <i className="bi bi-list-ul" /> Danh sách hàng hóa cần mua
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.linesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 36, textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: 260, width: 280 }}>Sản phẩm</th>
                      <th style={{ width: 170, minWidth: 160 }}>Kho nhận dự kiến</th>
                      <th style={{ width: 80, textAlign: 'center' }}>ĐVT</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Số lượng</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Đơn giá (đ)</th>
                      <th style={{ width: 80,  textAlign: 'center' }}>VAT (%)</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ width: 150 }}>Ghi chú</th>
                      <th style={{ width: 36, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineTotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
                      const vatAmt    = lineTotal * Number(line.vatRate || 0) / 100;
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{idx + 1}</td>
                          <td>
                            <ProductGridSelect
                              id={`po-line-product-${idx}`}
                              products={productOptions}
                              value={line.variantId}
                              onChange={selected => handleProductSelect(idx, selected)}
                              onAddNew={() => {
                                setQuickAddLineIndex(idx);
                                setShowQuickAddProduct(true);
                              }}
                              displayMode="code-name"
                              placeholder="Chọn mã hoặc tên hàng"
                              hideStock
                            />
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <Select
                              inputId={`po-line-wh-${idx}`}
                              options={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.code})` }))}
                              value={warehouses.map(w => ({ value: w.id, label: `${w.name} (${w.code})` })).find(o => o.value === line.warehouseId) || null}
                              onChange={opt => updateLine(idx, 'warehouseId', opt?.value || null)}
                              placeholder="Chọn kho..."
                              styles={customSelectStyles}
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            />
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                            {line.unitName || '—'}
                          </td>
                          <td>
                            <input
                              id={`po-line-qty-${idx}`}
                              type="number"
                              className={styles.cellInput}
                              style={{ textAlign: 'right' }}
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={e => updateLine(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              id={`po-line-price-${idx}`}
                              type="text"
                              className={styles.cellInput}
                              style={{ textAlign: 'right' }}
                              value={line.unitPrice ? Number(line.unitPrice).toLocaleString('vi-VN') : ''}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '');
                                updateLine(idx, 'unitPrice', raw);
                              }}
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <input
                              id={`po-line-vat-${idx}`}
                              type="number"
                              className={styles.cellInput}
                              style={{ textAlign: 'center' }}
                              min="0"
                              max="100"
                              step="1"
                              value={line.vatRate}
                              onChange={e => updateLine(idx, 'vatRate', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e40af', fontSize: 13, whiteSpace: 'nowrap' }}>
                            {money(lineTotal + vatAmt)} đ
                          </td>
                          <td>
                            <input
                              type="text"
                              className={styles.cellInput}
                              value={line.note}
                              onChange={e => updateLine(idx, 'note', e.target.value)}
                              placeholder="Ghi chú..."
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {lines.length > 1 && (
                              <button
                                className={styles.btnRemoveLine}
                                onClick={() => removeLine(idx)}
                                title="Xóa dòng"
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
