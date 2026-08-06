import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import SupplierModal from '../Supplier/components/SupplierModal';
import * as poApi from '../../api/purchaseOrderApi';
import styles from './CreatePurchaseOrderPage.module.css';

const unwrap      = (res) => res?.data?.data ?? res?.data;
const pageContent = (p)   => p?.content ?? p ?? [];
const today       = ()    => new Date().toLocaleDateString('sv-SE');
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
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [variants,  setVariants]  = useState([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState({ isVisible: false, type: 'info', message: '' });

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

  // Load lookups
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [supplierRes, variantRes, codeRes] = await Promise.allSettled([
          poApi.getSuppliers({ isSupplier: true, size: 1000 }),
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
      showToast('error', 'Hạn thanh toán không được nhỏ hơn ngày lập đơn');
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

  // ── react-select options ──
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const variantOptions  = variants.map(v => ({
    value:    v.id,
    label:    `[${v.sku}] ${v.variantName || v.productName}`,
    unitName: v.unitName || 'Cái',
    vatRate:  v.vatPercent || v.vatRate || 0,
  }));

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page Header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbLink} onClick={() => navigate('/purchase-orders')}>
              Đơn mua hàng
            </span>
            <i className="bi bi-chevron-right" style={{ margin: '0 6px', fontSize: 12 }} />
            <span>{isEdit ? 'Cập nhật đơn mua hàng' : 'Tạo đơn mua hàng mới'}</span>
          </div>
          <h1 className={styles.pageTitle}>
            <i className="bi bi-bag-plus" style={{ marginRight: 8 }} />
            {isEdit ? `Cập nhật: ${form.poCode}` : 'Tạo đơn mua hàng mới'}
          </h1>
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

              {/* Right panel — document info */}
              <div className={styles.rightPanel}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <i className="bi bi-file-earmark-text" /> Thông tin chứng từ
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Số đơn mua hàng</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={form.poCode}
                      onChange={e => setForm(p => ({ ...p, poCode: e.target.value }))}
                      placeholder="Để trống để tự sinh (PO0001...)"
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Ngày lập <span className={styles.required}>*</span></label>
                    <input
                      type="date"
                      className={styles.input}
                      value={form.poDate}
                      onChange={e => setForm(p => ({ ...p, poDate: e.target.value }))}
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <label className={styles.label}>Hạn thanh toán</label>
                    <input
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
                <span className={styles.sectionTitle}>
                  <i className="bi bi-list-ul" /> Danh sách hàng hóa cần mua
                </span>
                <button className={styles.btnAddLine} onClick={addLine}>
                  <i className="bi bi-plus-circle" /> Thêm dòng
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className={styles.linesTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Sản phẩm</th>
                      <th style={{ width: 90, textAlign: 'center' }}>ĐVT</th>
                      <th style={{ width: 110, textAlign: 'right' }}>Số lượng</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Đơn giá (đ)</th>
                      <th style={{ width: 80,  textAlign: 'center' }}>VAT (%)</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Thành tiền</th>
                      <th style={{ width: 150 }}>Ghi chú</th>
                      <th style={{ width: 36 }}></th>
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
                            <Select
                              options={variantOptions}
                              value={variantOptions.find(o => o.value === line.variantId) || null}
                              onChange={opt => updateLineMultiple(idx, {
                                variantId: opt?.value || null,
                                unitName:  opt?.unitName || '',
                                vatRate:   opt?.vatRate  || 0,
                              })}
                              placeholder="Chọn sản phẩm..."
                              isClearable
                              styles={customSelectStyles}
                              menuPortalTarget={document.body}
                            />
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                            {line.unitName || '—'}
                          </td>
                          <td>
                            <input
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
                              type="number"
                              className={styles.cellInput}
                              style={{ textAlign: 'right' }}
                              min="0"
                              step="1000"
                              value={line.unitPrice}
                              onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
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

      <SupplierModal 
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSuccess={(newSupplier) => {
          setSuppliers(prev => [newSupplier, ...prev]);
          setForm(prev => ({ ...prev, partnerId: newSupplier.id }));
          setShowSupplierModal(false);
        }}
      />
    </AdminLayout>
  );
}

export default CreatePurchaseOrderPage;
