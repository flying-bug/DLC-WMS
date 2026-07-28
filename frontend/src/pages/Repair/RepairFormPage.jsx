import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import * as customerApi from '../../api/customerApi';
import * as inventoryImportApi from '../../api/inventoryImportApi';
import axiosClient from '../../api/axiosClient';
import CustomerModal from '../Customer/components/CustomerModal';
import QuickProductModal from './components/QuickProductModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './RepairFormPage.module.css';

const customSelectStyles = {
  control: (base, state) => ({
    ...base, minHeight: '32px', height: '32px', fontSize: '13px',
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#2563eb' : '#9ca3af' }
  }),
  valueContainer: (base) => ({ ...base, height: '32px', padding: '0 8px' }),
  input: (base) => ({ ...base, margin: '0', padding: '0' }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (base) => ({ ...base, height: '30px' }),
  dropdownIndicator: (base) => ({ ...base, padding: '4px' }),
  clearIndicator: (base) => ({ ...base, padding: '4px' }),
  menu: (base) => ({ ...base, fontSize: '13px', zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 })
};

const STAGES = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR', 'DONE'];
const STAGE_LABELS = { DRAFT: 'Nháp', QUOTATION: 'Báo giá', CONFIRMED: 'Xác nhận', UNDER_REPAIR: 'Đang sửa', DONE: 'Hoàn tất' };
const EDITABLE_STATUSES = ['DRAFT', 'QUOTATION'];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const today = () => new Date().toLocaleDateString('sv-SE');

function RepairFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'create';
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [repair, setRepair] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [variants, setVariants] = useState([]);
  const [users, setUsers] = useState([]);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [quickProductType, setQuickProductType] = useState('Thành phẩm');
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    repairCode: '',
    partnerId: '',
    productId: '',
    warehouseId: '',
    serialNumberId: '',
    issueDescription: '',
    solutionDescription: '',
    underWarranty: false,
    invoiceMethod: 'none',
    receivedDate: today(),
    expectedDate: '',
    responsiblePerson: '',
    attachedDoc: '',
    referenceId: '',
    referenceCode: ''
  });

  const [activeTab, setActiveTab] = useState('PARTS');
  const [pendingLines, setPendingLines] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [addingType, setAddingType] = useState(null);
  
  const [codeError, setCodeError] = useState('');
  const codeCheckTimer = useRef(null);

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cusRes, prodRes, whRes, varRes, userRes] = await Promise.allSettled([
        customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
        inventoryImportApi.getProducts({ size: 1000 }),
        inventoryImportApi.getWarehouses({ size: 100 }),
        axiosClient.get('/products/variants', { params: { size: 1000 } }),
        axiosClient.get('/users', { params: { size: 1000 } })
      ]);
      
      if (cusRes.status === 'fulfilled') setCustomers(cusRes.value?.data?.data?.content || []);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value?.data?.data?.content || []);
      if (whRes.status === 'fulfilled') setWarehouses(whRes.value?.data?.data?.content || []);
      if (varRes.status === 'fulfilled') setVariants(varRes.value?.data?.data?.content || []);
      if (userRes.status === 'fulfilled') setUsers(userRes.value?.data?.data?.content || []);

      if (isNew) {
        setFormData(prev => ({ ...prev, repairCode: '' }));
      } else {
        const res = await repairApi.getRepairById(id);
        const data = res.data?.data;
        if (data) {
          setRepair(data);
          setFormData({
            repairCode: data.repairCode || '',
            partnerId: data.partnerId || '',
            productId: data.productId || '',
            warehouseId: data.warehouseId || '',
            serialNumberId: data.serialNumberId || '',
            issueDescription: data.issueDescription || '',
            solutionDescription: data.solutionDescription || '',
            underWarranty: !!data.underWarranty,
            invoiceMethod: data.invoiceMethod || 'none',
            receivedDate: data.receivedDate || '',
            expectedDate: data.expectedDate || '',
            responsiblePerson: '',
            attachedDoc: '',
            referenceId: '',
            referenceCode: ''
          });
        }
      }
    } catch (err) {
      showToast('error', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCodeChange = (value) => {
    setFormData(prev => ({ ...prev, repairCode: value }));
    setCodeError('');
    if (codeCheckTimer.current) clearTimeout(codeCheckTimer.current);
    if (!value.trim()) return;
    codeCheckTimer.current = setTimeout(async () => {
      try {
        const res = await repairApi.checkRepairCode(value.trim());
        if (res.data?.data?.exists) setCodeError('Mã lệnh đã tồn tại.');
      } catch (e) {
        console.error(e);
      }
    }, 500);
  };

  const handleSave = async () => {
    if (codeError) { showToast('error', 'Mã lệnh bị trùng.'); return; }
    if (!formData.partnerId) { showToast('error', 'Vui lòng chọn Khách hàng.'); return; }
    if (!formData.productId) { showToast('error', 'Vui lòng chọn Sản phẩm cần sửa.'); return; }

    setSaving(true);
    try {
      const payload = {
        repairCode: formData.repairCode || undefined,
        partnerId: Number(formData.partnerId),
        productId: Number(formData.productId),
        warehouseId: formData.warehouseId ? Number(formData.warehouseId) : null,
        serialNumberId: formData.serialNumberId ? Number(formData.serialNumberId) : null,
        issueDescription: formData.issueDescription || null,
        solutionDescription: formData.solutionDescription || null,
        underWarranty: formData.underWarranty,
        invoiceMethod: formData.invoiceMethod,
        receivedDate: formData.receivedDate || null,
        expectedDate: formData.expectedDate || null,
        // Ghi chú chẩn đoán không còn trên UI, truyền null hoặc giữ nguyên
        diagnosisNote: null
      };

      if (isNew) {
        const res = await repairApi.createRepair(payload);
        const newId = res.data?.data?.id;
        for (const line of pendingLines) {
          await repairApi.addRepairLine(newId, {
            actionType: line.actionType,
            componentVariantId: Number(line.componentVariantId),
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            isFreeWarranty: line.isFreeWarranty,
            note: line.note || null
          });
        }
        for (const fee of pendingFees) {
          await repairApi.addRepairFee(newId, {
            feeName: fee.feeName,
            feeAmount: Number(fee.feeAmount),
            isFreeWarranty: fee.isFreeWarranty,
            note: fee.note || null
          });
        }
        showToast('success', 'Tạo lệnh sửa chữa thành công');
        setTimeout(() => navigate(`/repairs/${newId}/edit`, { replace: true }), 500);
      } else {
        await repairApi.updateRepair(id, payload);
        showToast('success', 'Cập nhật thành công');
        loadData();
      }
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (targetStatus) => {
    if (!window.confirm(`Xác nhận chuyển trạng thái sang "${STAGE_LABELS[targetStatus]}"?`)) return;
    try {
      await repairApi.updateRepairStatus(id, { status: targetStatus });
      loadData();
      showToast('success', 'Đổi trạng thái thành công');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Lỗi chuyển trạng thái');
    }
  };

  const handleSaveLine = async (form) => {
    if (!form.componentVariantId) { showToast('error', 'Vui lòng chọn sản phẩm/linh kiện.'); return false; }
    const linePayload = {
      actionType: form.actionType,
      componentVariantId: Number(form.componentVariantId),
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      isFreeWarranty: form.isFreeWarranty,
      note: form.note || null
    };
    if (isNew) {
      const variant = variants.find(p => p.id === form.componentVariantId);
      setPendingLines(prev => [...prev, { ...linePayload, _label: variant?.productName, _unitName: variant?.unitName, _key: crypto.randomUUID() }]);
      return true;
    } else {
      try {
        await repairApi.addRepairLine(id, linePayload);
        loadData();
        return true;
      } catch (err) {
        showToast('error', err.response?.data?.userMessage || 'Lỗi thêm linh kiện');
        return false;
      }
    }
  };

  const handleSaveFee = async (form) => {
    if (!form.feeName) { showToast('error', 'Vui lòng nhập tên phí.'); return false; }
    const feePayload = {
      feeName: form.feeName.trim(),
      feeAmount: Number(form.feeAmount),
      quantity: Number(form.quantity || 1),
      unitName: form.unitName || null,
      isFreeWarranty: form.isFreeWarranty,
      note: form.note || null
    };
    if (isNew) {
      setPendingFees(prev => [...prev, { ...feePayload, _key: crypto.randomUUID() }]);
      return true;
    } else {
      try {
        await repairApi.addRepairFee(id, feePayload);
        loadData();
        return true;
      } catch (err) {
        showToast('error', err.response?.data?.userMessage || 'Lỗi thêm phí');
        return false;
      }
    }
  };

  const handleDeleteLine = async (lineId, index) => {
    if (!window.confirm('Xóa dòng linh kiện này?')) return;
    if (isNew) {
      setPendingLines(prev => prev.filter((_, i) => i !== index));
    } else {
      try {
        await repairApi.deleteRepairLine(id, lineId);
        loadData();
      } catch (err) { showToast('error', 'Lỗi xóa linh kiện'); }
    }
  };

  const handleDeleteFee = async (feeId, index) => {
    if (!window.confirm('Xóa dòng phí dịch vụ này?')) return;
    if (isNew) {
      setPendingFees(prev => prev.filter((_, i) => i !== index));
    } else {
      try {
        await repairApi.deleteRepairFee(id, feeId);
        loadData();
      } catch (err) { showToast('error', 'Lỗi xóa phí'); }
    }
  };

  const currentStatus = repair?.repairStatus || 'DRAFT';
  const isEditable = isNew || EDITABLE_STATUSES.includes(currentStatus);
  const lines = isNew ? pendingLines : (repair?.lines || []);
  const fees = isNew ? pendingFees : (repair?.fees || []);

  const totalLinesAmount = lines.reduce((acc, l) => acc + (l.isFreeWarranty ? 0 : Number(l.quantity) * Number(l.unitPrice)), 0);
  const totalFeesAmount = fees.reduce((acc, f) => acc + (f.isFreeWarranty ? 0 : Number(f.quantity || 1) * Number(f.feeAmount)), 0);
  const totalAmount = totalLinesAmount + totalFeesAmount;

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* HEADER */}
        <div className={styles.pageTitleContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/repairs')}
              className={styles.iconBtn}
              title="Quay lại"
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <h1 className={styles.pageTitle}>{isNew ? 'Thêm mới Lệnh sửa chữa' : `Lệnh sửa chữa: ${repair?.repairCode}`}</h1>
            {!isNew && (
              <span className={`misa-badge ${currentStatus === 'DONE' ? 'misa-badge-success' : currentStatus === 'UNDER_REPAIR' ? 'misa-badge-warning' : 'misa-badge-primary'}`}>
                {STAGE_LABELS[currentStatus]}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isNew && currentStatus === 'DRAFT' && (
              <>
                <button className={styles.btnSecondary} onClick={() => handleStatusTransition('QUOTATION')}><i className="bi bi-send"></i> Báo giá</button>
                <button className={styles.btnPrimary} onClick={() => handleStatusTransition('CONFIRMED')}><i className="bi bi-check"></i> Xác nhận</button>
              </>
            )}
            {!isNew && currentStatus === 'QUOTATION' && (
              <button className={styles.btnPrimary} onClick={() => handleStatusTransition('CONFIRMED')}><i className="bi bi-check"></i> Xác nhận</button>
            )}
            {!isNew && currentStatus === 'CONFIRMED' && (
              <button className={styles.btnPrimary} onClick={() => handleStatusTransition('UNDER_REPAIR')}><i className="bi bi-tools"></i> Bắt đầu sửa</button>
            )}
            {!isNew && currentStatus === 'UNDER_REPAIR' && (
              <button className={styles.btnPrimary} onClick={() => handleStatusTransition('DONE')}><i className="bi bi-check-all"></i> Hoàn tất</button>
            )}
            {!isNew && !['DONE', 'CANCELLED'].includes(currentStatus) && (
              <button className={styles.btnDanger} onClick={() => handleStatusTransition('CANCELLED')}><i className="bi bi-x-circle"></i> Hủy lệnh</button>
            )}
            {!isNew && ['CONFIRMED', 'UNDER_REPAIR', 'DONE'].includes(currentStatus) && (
              <>
                <button className={styles.btnSecondary} onClick={() => navigate('/export-slips', { state: { filterDocCode: 'REP-EX-' + repair.repairCode } })}><i className="bi bi-box-arrow-up-right"></i> Phiếu xuất</button>
                <button className={styles.btnSecondary} onClick={() => navigate('/import-history', { state: { filterDocCode: 'REP-SCRAP-' + repair.repairCode } })}><i className="bi bi-box-arrow-in-down-left"></i> Nhập Scrap</button>
              </>
            )}
          </div>
        </div>

        <div className={styles.formGrid}>
          {/* LEFT: Chung */}
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chung</h3>
              </div>
              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: 1 }}>
                  <label className="misa-label">Khách hàng <span className="required">*</span></label>
                  <Select
                    isDisabled={!isEditable}
                    options={customers.map(c => ({ value: c.id, label: [c.phone, c.name].filter(Boolean).join(' - ') }))}
                    value={customers.find(c => String(c.id) === String(formData.partnerId)) ? { value: formData.partnerId, label: [customers.find(c => String(c.id) === String(formData.partnerId)).phone, customers.find(c => String(c.id) === String(formData.partnerId)).name].filter(Boolean).join(' - ') } : null}
                    onChange={opt => handleFormChange('partnerId', opt ? opt.value : '')}
                    placeholder="Chọn khách hàng..."
                    isClearable styles={customSelectStyles}
                  />
                </div>
              </div>
              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: 1 }}>
                  <label className="misa-label">Sản phẩm cần sửa <span className="required">*</span></label>
                  <Select
                    isDisabled={!isEditable}
                    options={products.map(p => ({ value: p.id, label: [p.productCode, p.productName].filter(Boolean).join(' - ') }))}
                    value={products.find(p => String(p.id) === String(formData.productId)) ? { value: formData.productId, label: [products.find(p => String(p.id) === String(formData.productId)).productCode, products.find(p => String(p.id) === String(formData.productId)).productName].filter(Boolean).join(' - ') } : null}
                    onChange={opt => handleFormChange('productId', opt ? opt.value : '')}
                    placeholder="Chọn sản phẩm..."
                    isClearable styles={customSelectStyles}
                  />
                </div>
              </div>
              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho thực hiện sửa chữa</label>
                  <Select
                    isDisabled={!isEditable}
                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                    value={warehouses.find(w => String(w.id) === String(formData.warehouseId)) ? { value: formData.warehouseId, label: `${warehouses.find(w => String(w.id) === String(formData.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(formData.warehouseId)).name}` } : null}
                    onChange={opt => handleFormChange('warehouseId', opt ? opt.value : '')}
                    placeholder="Chọn kho..."
                    isClearable styles={customSelectStyles}
                  />
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Người chịu trách nhiệm</label>
                  <input type="text" className="misa-input" disabled={!isEditable} placeholder="Nhập tên nhân viên..." value={formData.responsiblePerson} onChange={e => handleFormChange('responsiblePerson', e.target.value)} />
                </div>
              </div>
              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Lỗi thiết bị (Mô tả)</label>
                <textarea className="misa-textarea" disabled={!isEditable} value={formData.issueDescription} onChange={e => handleFormChange('issueDescription', e.target.value)} style={{ minHeight: '60px' }}></textarea>
              </div>
              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="misa-label" style={{ marginBottom: 0 }}>Kèm theo chứng từ</label>
                  {!formData.referenceId && (
                    <button
                      type="button"
                      style={{ padding: 0, fontSize: '13px', background: 'none', border: 'none', color: '#0070cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => showToast('info', 'Tính năng đang được phát triển')}
                    >
                      <i className="bi bi-link-45deg" style={{ fontSize: '16px' }}></i> Tham chiếu
                    </button>
                  )}
                </div>
                {formData.referenceId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: '500', cursor: 'pointer' }} onClick={() => {}}>
                      <i className="bi bi-file-earmark-text"></i> {formData.referenceCode}
                    </span>
                    <i
                      className="bi bi-x-circle-fill"
                      style={{ color: '#dc3545', cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => handleFormChange('referenceId', '')}
                      title="Xóa tham chiếu"
                    ></i>
                  </div>
                ) : (
                  <input type="text" className="misa-input" style={{ marginTop: '8px' }} disabled={!isEditable} placeholder="Số chứng từ đính kèm..." value={formData.attachedDoc} onChange={e => handleFormChange('attachedDoc', e.target.value)} />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Document info */}
          <div className={styles.rightCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-file-earmark-text text-gray-500"></i>
                <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
              </div>
              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Số phiếu</label>
                <input className="misa-input" disabled={!isNew} value={formData.repairCode} onChange={e => handleCodeChange(e.target.value)} placeholder="Tự sinh nếu để trống" />
                {codeError && <span style={{ color: 'red', fontSize: '12px' }}>{codeError}</span>}
              </div>
              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Ngày tiếp nhận</label>
                <input type="date" className="misa-input" disabled={!isEditable} value={formData.receivedDate} onChange={e => handleFormChange('receivedDate', e.target.value)} />
              </div>
              <div className="misa-form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="underWarranty" disabled={!isEditable} checked={formData.underWarranty} onChange={e => handleFormChange('underWarranty', e.target.checked)} />
                <label htmlFor="underWarranty" className="misa-label" style={{ marginBottom: 0 }}>Có trong hạn bảo hành</label>
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG HÀNG HÓA */}
        <div className={styles.card} style={{ marginTop: '16px' }}>
          <div className={styles.cardHeader}>
            <div className={styles.tabs}>
              <button className={`${styles.tabBtn} ${activeTab === 'PARTS' ? styles.tabActive : ''}`} onClick={() => setActiveTab('PARTS')}>Linh kiện</button>
              <button className={`${styles.tabBtn} ${activeTab === 'FEES' ? styles.tabActive : ''}`} onClick={() => setActiveTab('FEES')}>Dịch vụ</button>
            </div>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                {activeTab === 'PARTS' ? (
                  <tr>
                    <th>Loại</th>
                    <th>Linh kiện</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>SL</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'center' }}>Bảo hành</th>
                    <th>Ghi chú</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Dịch vụ</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>SL</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'center' }}>Bảo hành</th>
                    <th>Ghi chú</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === 'PARTS' && lines.map((line, idx) => (
                  <tr key={line.id || line._key}>
                    <td>{line.actionType === 'ADD' ? 'Lắp thêm' : 'Thu hồi'}</td>
                    <td>{line.componentVariant?.productName || line._label}</td>
                    <td align="right">{line.quantity}</td>
                    <td>{line.componentVariant?.unitName || line._unitName}</td>
                    <td align="right">{money(line.unitPrice)}</td>
                    <td align="center"><input type="checkbox" readOnly checked={line.isFreeWarranty} /></td>
                    <td>{line.note}</td>
                    <td align="center">
                      {isEditable && (
                        <button className={styles.iconBtnDanger} onClick={() => handleDeleteLine(line.id, idx)}><i className="bi bi-trash"></i></button>
                      )}
                    </td>
                  </tr>
                ))}
                {activeTab === 'FEES' && fees.map((fee, idx) => (
                  <tr key={fee.id || fee._key}>
                    <td>{fee.feeName}</td>
                    <td align="right">{fee.quantity || 1}</td>
                    <td>{fee.unitName}</td>
                    <td align="right">{money(fee.feeAmount)}</td>
                    <td align="center"><input type="checkbox" readOnly checked={fee.isFreeWarranty} /></td>
                    <td>{fee.note}</td>
                    <td align="center">
                      {isEditable && (
                        <button className={styles.iconBtnDanger} onClick={() => handleDeleteFee(fee.id, idx)}><i className="bi bi-trash"></i></button>
                      )}
                    </td>
                  </tr>
                ))}
                {addingType === 'PART' && activeTab === 'PARTS' && (
                  <NewInlineRow type="PART" variants={variants.map(v => ({ value: v.id, label: `${v.sku || v.productCode} - ${v.productName}`, unitName: v.unitName, salePrice: v.salePrice }))} onSave={handleSaveLine} onCancel={() => setAddingType(null)} underWarranty={formData.underWarranty} />
                )}
                {addingType === 'FEE' && activeTab === 'FEES' && (
                  <NewInlineRow type="FEE" variants={products.filter(p => p.productType === 'Dịch vụ').map(v => ({ value: v.id, label: v.productName, unitName: v.unitName, salePrice: v.salePrice, productName: v.productName }))} onSave={handleSaveFee} onCancel={() => setAddingType(null)} underWarranty={formData.underWarranty} />
                )}
              </tbody>
            </table>
          </div>
          {isEditable && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className={styles.btnOutlineBlue} onClick={() => setAddingType(activeTab === 'PARTS' ? 'PART' : 'FEE')}>
                <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Thêm {activeTab === 'PARTS' ? 'linh kiện' : 'dịch vụ'}
              </button>
              <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                Tổng cộng: <span style={{ color: '#017e84', marginLeft: '4px' }}>{money(activeTab === 'PARTS' ? totalLinesAmount : totalFeesAmount)} đ</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/repairs')}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            {isEditable && (
              <button className="btn-misa-post" disabled={saving || !!codeError} onClick={handleSave}>
                <i className="bi bi-save"></i> {isNew ? 'Lưu mới' : 'Lưu lại'}
              </button>
            )}
          </div>
        </div>
      </div>
      {toast.isVisible && <Toast type={toast.type} message={toast.message} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />}
    </AdminLayout>
  );
}

function NewInlineRow({ type, variants, onSave, onCancel, underWarranty }) {
  const [form, setForm] = useState(
    type === 'PART'
      ? { actionType: 'ADD', componentVariantId: '', quantity: 1, unitPrice: 0, isFreeWarranty: underWarranty || false, note: '' }
      : { feeName: '', feeAmount: 0, isFreeWarranty: underWarranty || false, note: '' }
  );

  const isFree = form.isFreeWarranty;

  const handleSave = async () => {
    const success = await onSave(form);
    if (success) {
      setForm(
        type === 'PART'
          ? { actionType: 'ADD', componentVariantId: '', quantity: 1, unitPrice: 0, isFreeWarranty: underWarranty || false, note: '' }
          : { feeName: '', feeAmount: 0, isFreeWarranty: underWarranty || false, note: '' }
      );
    }
  };

  if (type === 'PART') return (
    <tr style={{ background: '#f0fdf4' }}>
      <td>
        <select className="misa-input" value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value })} style={{ width: '100%', minWidth: '90px' }}>
          <option value="ADD">Lắp thêm</option>
          <option value="REMOVE">Thu hồi</option>
        </select>
      </td>
      <td>
        <Select 
          options={variants} 
          value={variants.find(v => v.value === form.componentVariantId) || null}
          onChange={opt => setForm({ ...form, componentVariantId: opt ? opt.value : '', unitPrice: opt ? opt.salePrice : 0 })} 
          placeholder="Chọn linh kiện..." 
          isClearable 
          styles={customSelectStyles} 
          menuPortalTarget={document.body} 
        />
      </td>
      <td align="right"><input type="number" min="1" className="misa-input" style={{ width: '100%', minWidth: '60px', textAlign: 'right' }} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></td>
      <td>{variants.find(v => v.value === form.componentVariantId)?.unitName || '-'}</td>
      <td align="right"><input type="number" className="misa-input" disabled={isFree} style={{ width: '100%', minWidth: '100px', textAlign: 'right' }} value={isFree ? 0 : form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} /></td>
      <td align="center"><input type="checkbox" checked={form.isFreeWarranty} onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, unitPrice: e.target.checked ? 0 : form.unitPrice })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} /></td>
      <td><input type="text" className="misa-input" placeholder="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ width: '100%', minWidth: '120px' }} /></td>
      <td align="center" style={{ whiteSpace: 'nowrap' }}>
        <button className={styles.iconBtn} onClick={handleSave} style={{ color: '#10b981', marginRight: '4px' }} title="Lưu dòng"><i className="bi bi-check-lg" style={{ fontSize: '18px' }}></i></button>
        <button className={styles.iconBtnDanger} onClick={onCancel} title="Đóng"><i className="bi bi-x-lg" style={{ fontSize: '16px' }}></i></button>
      </td>
    </tr>
  );

  return (
    <tr style={{ background: '#eff6ff' }}>
      <td>
        <Select 
          options={variants} 
          value={variants.find(v => v.productName === form.feeName) || null}
          onChange={opt => setForm({ ...form, feeName: opt ? opt.productName : '', feeAmount: opt ? opt.salePrice : 0, unitName: opt ? opt.unitName : '' })} 
          placeholder="Chọn dịch vụ..." 
          isClearable 
          styles={customSelectStyles} 
          menuPortalTarget={document.body} 
        />
      </td>
      <td align="right"><input type="number" min="1" className="misa-input" style={{ width: '100%', minWidth: '60px', textAlign: 'right' }} value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: e.target.value, feeAmount: e.target.value * (variants.find(v => v.productName === form.feeName)?.salePrice || 0) })} /></td>
      <td>{form.unitName || '-'}</td>
      <td align="right"><input type="number" className="misa-input" disabled={isFree} style={{ width: '100%', minWidth: '100px', textAlign: 'right' }} value={isFree ? 0 : form.feeAmount} onChange={e => setForm({ ...form, feeAmount: e.target.value })} /></td>
      <td align="center"><input type="checkbox" checked={form.isFreeWarranty} onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, feeAmount: e.target.checked ? 0 : form.feeAmount })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} /></td>
      <td><input type="text" className="misa-input" placeholder="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ width: '100%', minWidth: '120px' }} /></td>
      <td align="center" style={{ whiteSpace: 'nowrap' }}>
        <button className={styles.iconBtn} onClick={handleSave} style={{ color: '#10b981', marginRight: '4px' }} title="Lưu dòng"><i className="bi bi-check-lg" style={{ fontSize: '18px' }}></i></button>
        <button className={styles.iconBtnDanger} onClick={onCancel} title="Đóng"><i className="bi bi-x-lg" style={{ fontSize: '16px' }}></i></button>
      </td>
    </tr>
  );
}

export default RepairFormPage;
