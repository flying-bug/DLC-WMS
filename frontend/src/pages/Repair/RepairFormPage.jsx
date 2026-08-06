import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import * as repairApi from '../../api/repairApi';
import * as customerApi from '../../api/customerApi';
import * as inventoryImportApi from '../../api/inventoryImportApi';
import * as warrantyApi from '../../api/warrantyApi';
import axiosClient from '../../api/axiosClient';
import CustomerModal from '../Customer/components/CustomerModal';
import QuickProductModal from './components/QuickProductModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import RepairSerialModal from './components/RepairSerialModal';
import RepairQuotationTemplate from './components/RepairQuotationTemplate';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
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

const STAGES = ['DRAFT', 'CONFIRMED', 'UNDER_REPAIR', 'DONE'];
const STAGE_LABELS = { DRAFT: 'Nháp', QUOTATION: 'Báo giá', CONFIRMED: 'Xác nhận', UNDER_REPAIR: 'Đang sửa', DONE: 'Hoàn tất', CANCELLED: 'Đã huỷ' };
const EDITABLE_STATUSES = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR'];
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const handleCustomerSaved = (newCustomer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setFormData(prev => ({ ...prev, partnerId: newCustomer.id }));
    setIsCustomerModalOpen(false);
  };

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
  };

  const openSerialModal = (line, index) => {
    setSerialModalData({
      isOpen: true,
      lineIndex: index,
      productName: line.componentVariant?.productName || line.componentName || line._label,
      warehouseId: repair?.warehouseId || (isNew ? formData.warehouseId : null),
      variantId: line.componentVariantId || line.variantId,
      initialSerialObj: (line.serialNumberId || line.serialNumber) ? { serialNumber: line.serialNumber, serialNumberId: line.serialNumberId } : null,
      actionType: line.actionType || 'ADD'
    });
  };

  const printRef = useRef(null);
  const handlePrintQuote = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bao-Gia-SC-${repair?.repairCode || 'REP'}`,
  });

  const handleCopyPublicLink = () => {
    if (!repair) return;
    if (!repair.publicToken) {
        showToast('error', 'Lệnh sửa chữa này chưa có mã bảo mật (public token). Vui lòng lưu lại hoặc tải lại trang!');
        return;
    }
    const link = `${window.location.origin}/repair-quote/${repair.publicToken}`;
    navigator.clipboard.writeText(link)
      .then(() => showToast('success', 'Đã copy link báo giá!'))
      .catch(() => showToast('error', 'Không thể copy link'));
  };

  const handleGoBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/repairs');
    }
  };

  const closeSerialModal = (serialObj) => {
    if (serialObj !== undefined) {
      const lineIndex = serialModalData.lineIndex;
      const updatedLines = [...(isNew ? pendingLines : (repair?.lines || []))];
      const line = updatedLines[lineIndex];

      if (serialObj === null) {
        line.serialNumberId = null;
        line.serialNumber = '';
      } else {
        line.serialNumberId = serialObj.serialNumberId;
        line.serialNumber = serialObj.serialNumber;
      }

      if (isNew) {
        setPendingLines(updatedLines);
      } else {
        setRepair({ ...repair, lines: updatedLines });
        repairApi.updateRepairLine(id, line.id, {
          serialNumberId: serialObj === null ? null : serialObj.serialNumberId,
          serialNumber: serialObj === null ? null : serialObj.serialNumber
        }).catch(() => loadData());
      }
    }
    setSerialModalData({ isOpen: false, lineIndex: null, productName: '', warehouseId: null, variantId: null, initialSerialObj: null, actionType: 'ADD' });
  };

  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [quickProductType, setQuickProductType] = useState('Thành phẩm');
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    repairCode: '',
    partnerId: '',
    productId: '',
    productQuantity: 1,
    productUnit: '',
    warehouseId: '',
    serialNumberId: '',
    warrantyId: '',
    issueDescription: '',
    solutionDescription: '',
    underWarranty: false,
    invoiceMethod: 'none',
    receivedDate: today(),
    expectedDate: '',
    responsiblePerson: '',
    attachedDoc: '',
    referenceId: '',
    referenceCode: '',
    internalNotes: ''
  });

  const [activeTab, setActiveTab] = useState('DETAILS');
  const [pendingLines, setPendingLines] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [serialModalData, setSerialModalData] = useState({ isOpen: false, lineIndex: null, productName: '', warehouseId: null, variantId: null, initialSerialObj: null, actionType: 'ADD' });
  const [addingType, setAddingType] = useState(null); // 'PART' or 'FEE'
  const [visibleColumns, setVisibleColumns] = useState({
    description: true,
    serialNumber: true
  });

  const [sourceWarranty, setSourceWarranty] = useState(null);
  const [codeError, setCodeError] = useState('');
  const codeCheckTimer = useRef(null);

  const filteredProductsList = useMemo(() => {
    let list = products.filter(p => p.productType === 'Hàng hóa' || p.productType === 'Thành phẩm');
    if (sourceWarranty && sourceWarranty.lines && sourceWarranty.lines.length > 0) {
      const allowedIds = new Set();
      sourceWarranty.lines.forEach(line => {
        if (line.productId) {
          allowedIds.add(Number(line.productId));
        } else if (line.productVariantId) {
          const matchV = variants.find(v => String(v.id) === String(line.productVariantId));
          if (matchV && matchV.productId) allowedIds.add(Number(matchV.productId));
        } else if (line.sku) {
          const matchP = products.find(p => p.productCode === line.sku || p.sku === line.sku);
          if (matchP) allowedIds.add(Number(matchP.id));
        }
      });
      if (allowedIds.size > 0) {
        list = list.filter(p => allowedIds.has(Number(p.id)));
      }
    }
    return list;
  }, [products, sourceWarranty, variants]);

  const maxWarrantyQuantity = useMemo(() => {
    if (!sourceWarranty || !sourceWarranty.lines || !formData.productId) return null;
    let total = 0;
    sourceWarranty.lines.forEach(line => {
      let matches = false;
      if (line.productId && Number(line.productId) === Number(formData.productId)) {
        matches = true;
      } else if (line.productVariantId) {
        const matchV = variants.find(v => String(v.id) === String(line.productVariantId));
        if (matchV && Number(matchV.productId) === Number(formData.productId)) matches = true;
      } else if (line.sku) {
        const matchP = products.find(p => p.productCode === line.sku || p.sku === line.sku);
        if (matchP && Number(matchP.id) === Number(formData.productId)) matches = true;
      }
      if (matches) {
        total += Number(line.quantity || 1);
      }
    });
    return total > 0 ? total : null;
  }, [sourceWarranty, formData.productId, variants, products]);

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cusRes, prodRes, whRes, varRes, userRes] = await Promise.allSettled([
        customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
        axiosClient.get('/products', { params: { size: 1000 } }),
        inventoryImportApi.getWarehouses({ size: 100 }),
        axiosClient.get('/products/variants', { params: { size: 1000 } }),
        axiosClient.get('/users', { params: { size: 1000 } })
      ]);

      const extractContent = (res) => {
        if (res.status !== 'fulfilled' || !res.value?.data) return [];
        const payload = res.value.data;
        return payload?.data?.content || payload?.content || (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []));
      };

      const fetchedCustomers = extractContent(cusRes);
      const fetchedProducts = extractContent(prodRes);

      setCustomers(fetchedCustomers);
      setProducts(fetchedProducts);
      setWarehouses(extractContent(whRes));
      setVariants(extractContent(varRes));
      setUsers(extractContent(userRes));

      if (isNew) {
        const searchParams = new URLSearchParams(location.search);
        const warrantyId = searchParams.get('warrantyId');
        let initialData = { repairCode: '' };

        if (warrantyId) {
          try {
            const warRes = await warrantyApi.getWarrantyById(warrantyId);
            const wData = warRes?.data?.data || warRes?.data;
            if (wData) {
              setSourceWarranty(wData);
              if (wData.partnerId) initialData.partnerId = wData.partnerId;
              initialData.warrantyId = warrantyId;
              initialData.underWarranty = true;
              initialData.referenceId = wData.id || warrantyId;
              initialData.referenceCode = wData.warrantyCode || `Bảo hành #${wData.id || warrantyId}`;

              const allowedProductIds = [];
              const fetchedVariants = extractContent(varRes);
              if (wData.lines && wData.lines.length > 0) {
                wData.lines.forEach(line => {
                  if (line.productId) {
                    allowedProductIds.push(Number(line.productId));
                  } else if (line.productVariantId) {
                    const matchV = fetchedVariants.find(v => String(v.id) === String(line.productVariantId));
                    if (matchV && matchV.productId) allowedProductIds.push(Number(matchV.productId));
                  } else if (line.sku) {
                    const matchP = fetchedProducts.find(p => p.productCode === line.sku || p.sku === line.sku);
                    if (matchP) allowedProductIds.push(Number(matchP.id));
                  }
                });
              }

              if (allowedProductIds.length > 0) {
                initialData.productId = allowedProductIds[0];
                const matchedProd = fetchedProducts.find(p => Number(p.id) === Number(allowedProductIds[0]));
                if (matchedProd && matchedProd.unitName) {
                  initialData.productUnit = matchedProd.unitName;
                }
              }

              if (wData.lines && wData.lines[0]?.serialNumberId) {
                initialData.serialNumberId = wData.lines[0].serialNumberId;
              } else if (wData.serialNumberId) {
                initialData.serialNumberId = wData.serialNumberId;
              }
            }
          } catch (e) {
            console.error('Failed to load warranty for autofill', e);
          }
        }
        setFormData(prev => ({ ...prev, ...initialData }));
      } else {
        const res = await repairApi.getRepairById(id);
        const data = res.data?.data;
        if (data) {
          setRepair(data);
          let refId = '';
          let refCode = '';
          if (data.warrantyId) {
            try {
              const warRes = await warrantyApi.getWarrantyById(data.warrantyId);
              const wData = warRes?.data?.data || warRes?.data;
              if (wData) {
                setSourceWarranty(wData);
                refId = wData.id || data.warrantyId;
                refCode = wData.warrantyCode || `Bảo hành #${refId}`;
              }
            } catch (e) {
              console.error('Failed to load warranty for edit repair', e);
              refId = data.warrantyId;
              refCode = `Bảo hành #${data.warrantyId}`;
            }
          }
          setFormData({
            repairCode: data.repairCode || '',
            partnerId: data.partnerId || '',
            productId: data.productId || '',
            productQuantity: data.productQuantity || 1,
            productUnit: data.productUnit || '',
            warehouseId: data.warehouseId || '',
            serialNumberId: data.serialNumberId || '',
            warrantyId: data.warrantyId || null,
            issueDescription: data.issueDescription || '',
            solutionDescription: data.solutionDescription || '',
            underWarranty: !!data.underWarranty,
            invoiceMethod: data.invoiceMethod || 'none',
            receivedDate: data.receivedDate || '',
            expectedDate: data.expectedDate || '',
            responsiblePerson: data.responsiblePerson || '',
            attachedDoc: '',
            referenceId: refId,
            referenceCode: refCode,
            internalNotes: data.internalNotes || ''
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
    if (!formData.warehouseId) { showToast('error', 'Vui lòng chọn Kho thực hiện sửa chữa.'); return; }
    if (!formData.productQuantity || Number(formData.productQuantity) <= 0) { showToast('error', 'Số lượng sản phẩm phải lớn hơn 0.'); return; }
    if (maxWarrantyQuantity !== null && Number(formData.productQuantity) > maxWarrantyQuantity) {
      showToast('error', `Số lượng tối đa được phép bảo hành là ${maxWarrantyQuantity}.`);
      return;
    }
    if (!formData.responsiblePerson?.trim()) { showToast('error', 'Vui lòng điền Người chịu trách nhiệm (KTV).'); return; }
    if (!formData.issueDescription?.trim()) { showToast('error', 'Vui lòng điền Mô tả lỗi.'); return; }

    setSaving(true);
    try {
      const payload = {
        repairCode: formData.repairCode || undefined,
        partnerId: Number(formData.partnerId),
        productId: Number(formData.productId),
        productQuantity: Number(formData.productQuantity) || 1,
        productUnit: formData.productUnit || null,
        warehouseId: formData.warehouseId ? Number(formData.warehouseId) : null,
        serialNumberId: formData.serialNumberId ? Number(formData.serialNumberId) : null,
        warrantyId: formData.warrantyId ? Number(formData.warrantyId) : null,
        issueDescription: formData.issueDescription || null,
        solutionDescription: formData.solutionDescription || null,
        underWarranty: formData.underWarranty,
        invoiceMethod: formData.invoiceMethod,
        receivedDate: formData.receivedDate || null,
        expectedDate: formData.expectedDate || null,
        responsiblePerson: formData.responsiblePerson || null,
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
            note: line.note || null,
            serialNumber: line.serialNumber || null,
            serialNumberId: line.serialNumberId || null
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
      showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInternalNotes = async () => {
    if (isNew) return;
    try {
      await axiosClient.patch(`/repairs/${id}/internal-notes`, { notes: formData.internalNotes });
      showToast('success', 'Đã lưu ghi chú nội bộ');
    } catch (e) {
      showToast('error', 'Không thể lưu ghi chú');
    }
  };

  const handleChangeStatus = async (status) => {
    if (status === 'DONE') {
      // Kiểm tra linh kiện có trackSerial nhưng chưa quét serial
      const missingSerial = (repair.lines || []).find(l => {
        if (!l.isUsed) return false;

        const variant = variants.find(v => String(v.id) === String(l.componentVariantId));
        if (!variant?.trackSerial) return false;

        if (l.actionType === 'ADD') {
          return !l.serialNumberId;
        } else if (l.actionType === 'REMOVE') {
          return !l.serialNumber;
        }
        return false;
      });
      if (missingSerial) {
        const variant = variants.find(v => String(v.id) === String(missingSerial.componentVariantId));
        const name = missingSerial.componentVariant?.productName || variant?.productName || missingSerial.componentName || 'Linh kiện';
        showToast('error', `"${name}" quản lý theo Serial Number nhưng chưa được nhập/quét mã serial. Vui lòng hoàn thành trước khi kết thúc.`);
        return;
      }

      const hasDiscrepancy = (repair.lines || []).some(l =>
        l.actionType === 'ADD' && (Number(l.quantity) !== Number(l.doneQuantity) || !l.isUsed)
      );
      if (hasDiscrepancy) {
        showToast('error', 'Có sự chênh lệch giữa số lượng yêu cầu và thực tế. Vui lòng cập nhật số lượng hoặc đánh dấu Đã sử dụng trước khi kết thúc.');
        return;
      }
    }

    setSaving(true);
    try {
      await repairApi.updateRepairStatus(id, { status: status, note: 'Chuyển trạng thái từ giao diện' });
      showToast('success', 'Chuyển trạng thái thành công');
      loadData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.userMessage || 'Chuyển trạng thái thất bại';
      showToast('error', errorMsg);
    } finally {
      setSaving(false);
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
      note: form.note || null,
      serialNumber: form.serialNumber || null,
      serialNumberId: form.serialNumberId || null
    };
    if (isNew) {
      const variant = variants.find(p => p.id === form.componentVariantId);
      setPendingLines(prev => [...prev, { ...linePayload, _label: variant?.productName, _unitName: variant?.unitName, _salePrice: variant?.salePrice, _key: crypto.randomUUID() }]);
      setAddingType(null);
      return true;
    } else {
      try {
        await repairApi.addRepairLine(id, linePayload);
        loadData();
        setAddingType(null);
        return true;
      } catch (err) {
        showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Lỗi thêm linh kiện');
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
      const variant = products.find(p => p.productName === form.feeName);
      setPendingFees(prev => [...prev, { ...feePayload, _originalAmount: variant?.salePrice || feePayload.feeAmount, _key: crypto.randomUUID() }]);
      setAddingType(null);
      return true;
    } else {
      try {
        await repairApi.addRepairFee(id, feePayload);
        loadData();
        setAddingType(null);
        return true;
      } catch (err) {
        showToast('error', err.response?.data?.message || err.response?.data?.userMessage || 'Lỗi thêm phí');
        return false;
      }
    }
  };

  const handleDeleteLine = async (lineId, index) => {
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
    if (isNew) {
      setPendingFees(prev => prev.filter((_, i) => i !== index));
    } else {
      try {
        await repairApi.deleteRepairFee(id, feeId);
        loadData();
        showToast('success', 'Xóa dịch vụ thành công');
      } catch (err) {
        showToast('error', err.response?.data?.message || 'Không thể xóa dịch vụ');
      }
    }
  };

  const handleUpdateLineField = async (lineId, key, field, value) => {
    if (isNew) {
      setPendingLines(prev => prev.map(l => ((l.id && l.id === lineId) || (l._key && l._key === key)) ? { ...l, [field]: value } : l));
    } else {
      // Optimistic update
      setRepair(prev => ({
        ...prev,
        lines: prev.lines.map(l => l.id === lineId ? { ...l, [field]: value } : l)
      }));
      try {
        await repairApi.updateRepairLine(id, lineId, { [field]: value });
      } catch (err) {
        showToast('error', 'Cập nhật thất bại');
        loadData(); // revert
      }
    }
  };

  const handleUpdateFeeField = async (feeId, key, field, value) => {
    if (isNew) {
      setPendingFees(prev => prev.map(f => ((f.id && f.id === feeId) || (f._key && f._key === key)) ? { ...f, [field]: value } : f));
    } else {
      setRepair(prev => ({
        ...prev,
        fees: prev.fees.map(f => f.id === feeId ? { ...f, [field]: value } : f)
      }));
      try {
        await repairApi.updateRepairFee(id, feeId, { [field]: value });
      } catch (err) {
        showToast('error', 'Cập nhật dịch vụ thất bại');
        loadData(); // revert
      }
    }
  };

  const handleChangeLineVariant = async (lineId, key, variantId) => {
    if (!variantId) {
      if (isNew) {
        setPendingLines(prev => prev.map(l => ((l.id && l.id === lineId) || (l._key && l._key === key)) ? {
          ...l,
          componentVariantId: null,
          _label: '',
          _unitName: '',
          _salePrice: 0,
          unitPrice: 0
        } : l));
      } else {
        setRepair(prev => ({
          ...prev,
          lines: prev.lines.map(l => l.id === lineId ? {
            ...l,
            componentVariantId: null,
            componentVariant: null,
            unitPrice: 0
          } : l)
        }));
      }
      return;
    }

    const variant = variants.find(v => String(v.id) === String(variantId));
    if (!variant) return;

    if (isNew) {
      setPendingLines(prev => prev.map(l => ((l.id && l.id === lineId) || (l._key && l._key === key)) ? {
        ...l,
        componentVariantId: variantId,
        _label: variant.productName,
        _unitName: variant.unitName,
        _salePrice: variant.salePrice,
        unitPrice: l.isFreeWarranty ? 0 : variant.salePrice
      } : l));
    } else {
      // Optimistic update
      const existingLine = repair.lines.find(l => l.id === lineId);
      const isFree = existingLine ? existingLine.isFreeWarranty : false;

      setRepair(prev => ({
        ...prev,
        lines: prev.lines.map(l => l.id === lineId ? {
          ...l,
          componentVariantId: variantId,
          componentVariant: { ...l.componentVariant, id: variantId, productName: variant.productName, unitName: variant.unitName, salePrice: variant.salePrice },
          unitPrice: l.isFreeWarranty ? 0 : variant.salePrice
        } : l)
      }));
      try {
        await repairApi.updateRepairLine(id, lineId, {
          componentVariantId: variantId,
          unitPrice: isFree ? 0 : variant.salePrice
        }); // backend expects these
      } catch (err) {
        showToast('error', 'Cập nhật linh kiện thất bại');
        loadData(); // revert
      }
    }
  };

  const handleToggleGlobalWarranty = async (isChecked) => {
    handleFormChange('underWarranty', isChecked);

    if (isNew) {
      setPendingLines(prev => prev.map(l => ({
        ...l,
        isFreeWarranty: isChecked,
        unitPrice: isChecked ? 0 : (l._salePrice || 0)
      })));
      setPendingFees(prev => prev.map(f => ({
        ...f,
        isFreeWarranty: isChecked,
        feeAmount: isChecked ? 0 : (f._originalAmount || f.feeAmount)
      })));
    } else {
      // Optimistic update
      setRepair(prev => ({
        ...prev,
        lines: (prev.lines || []).map(l => ({
          ...l,
          isFreeWarranty: isChecked,
          unitPrice: isChecked ? 0 : (l.componentVariant?.salePrice || 0)
        })),
        fees: (prev.fees || []).map(f => ({
          ...f,
          isFreeWarranty: isChecked,
          feeAmount: isChecked ? 0 : (f._originalAmount || products.find(p => p.productName === f.feeName)?.salePrice || f.feeAmount || 0)
        }))
      }));

      // Background API calls
      try {
        const promises = [];
        (repair.lines || []).forEach(l => {
          promises.push(repairApi.updateRepairLine(id, l.id, { isFreeWarranty: isChecked, unitPrice: isChecked ? 0 : (l.componentVariant?.salePrice || 0) }));
        });
        await Promise.all(promises);
      } catch (err) {
        showToast('error', 'Cập nhật dòng thất bại');
        loadData();
      }
    }
  };

  const currentStatus = repair?.repairStatus || 'DRAFT';
  const isEditable = isNew || EDITABLE_STATUSES.includes(currentStatus);
  const showRepairCols = ['UNDER_REPAIR', 'DONE'].includes(currentStatus);
  const lines = isNew ? pendingLines : (repair?.lines || []);
  const fees = isNew ? pendingFees : (repair?.fees || []);

  const totalLinesAmount = lines.reduce((acc, l) => {
    if (l.isFreeWarranty || l.actionType !== 'ADD') return acc;
    const qty = ['UNDER_REPAIR', 'DONE'].includes(currentStatus)
      ? (l.isUsed ? Number(l.doneQuantity || 0) : 0)
      : Number(l.quantity || 0);
    return acc + (qty * Number(l.unitPrice));
  }, 0);
  const totalFeesAmount = fees.reduce((acc, f) => acc + (f.isFreeWarranty ? 0 : Number(f.quantity || 1) * Number(f.feeAmount)), 0);
  const totalAmount = totalLinesAmount + totalFeesAmount;

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* HEADER */}
        <div className={styles.pageTitleContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => handleGoBack()}
              className={styles.iconBtn}
              title="Quay lại"
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <h1 className={styles.pageTitle}>{isNew ? 'Thêm mới Lệnh sửa chữa' : `Lệnh sửa chữa: ${repair?.repairCode}`}</h1>
            {!isNew && (
              <span className={`${styles.badge} ${
                ['CONFIRMED', 'DONE'].includes(currentStatus) ? styles.badgeSuccess :
                currentStatus === 'UNDER_REPAIR' ? styles.badgeWarning :
                currentStatus === 'CANCELLED' ? styles.badgeDanger :
                currentStatus === 'QUOTATION' ? styles.badgePrimary :
                styles.badgeInfo
              }`}>
                {STAGE_LABELS[currentStatus]}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
                    options={customers.map(c => ({ value: c.id, label: [c.name, c.phone].filter(Boolean).join(' - ') }))}
                    value={customers.find(c => String(c.id) === String(formData.partnerId)) ? { value: formData.partnerId, label: [customers.find(c => String(c.id) === String(formData.partnerId)).name, customers.find(c => String(c.id) === String(formData.partnerId)).phone].filter(Boolean).join(' - ') } : null}
                    onChange={opt => handleFormChange('partnerId', opt ? opt.value : '')}
                    placeholder="Chọn khách hàng..."
                    isClearable styles={customSelectStyles}
                  />
                </div>
              </div>
              <div className="misa-form-row" style={{ marginBottom: '8px' }}>
                <div className="misa-form-group" style={{ flex: 1 }}>
                  <label className="misa-label">Sản phẩm cần sửa <span className="required">*</span></label>
                  <ProductGridSelect
                    disabled={!isEditable}
                    products={filteredProductsList}
                    value={formData.productId}
                    hideStock={true}
                    fullWidthPopover={true}
                    onChange={(selected) => {
                      handleFormChange('productId', selected ? selected.id : '');
                      if (selected && selected.unitName) {
                        handleFormChange('productUnit', selected.unitName);
                      } else {
                        handleFormChange('productUnit', '');
                      }
                    }}
                    displayMode="code-name"
                    placeholder="Chọn sản phẩm..."
                  />
                </div>
              </div>
              <div className="misa-form-row" style={{ marginBottom: '8px', gap: '12px' }}>
                <div className="misa-form-group" style={{ flex: '2' }}>
                  <label className="misa-label">Kho thực hiện sửa chữa <span className="required">*</span></label>
                  <Select
                    isDisabled={!isEditable}
                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                    value={warehouses.find(w => String(w.id) === String(formData.warehouseId)) ? { value: formData.warehouseId, label: `${warehouses.find(w => String(w.id) === String(formData.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(formData.warehouseId)).name}` } : null}
                    onChange={opt => handleFormChange('warehouseId', opt ? opt.value : '')}
                    placeholder="Chọn kho..."
                    isClearable styles={customSelectStyles}
                  />
                </div>
                <div className="misa-form-group" style={{ flex: '1' }}>
                  <label className="misa-label">Số lượng <span className="required">*</span></label>
                  <input type="number" min="1" max={maxWarrantyQuantity || ''} className="misa-input" disabled={!isEditable} value={formData.productQuantity} onChange={e => {
                    let val = e.target.value;
                    if (val !== '' && maxWarrantyQuantity !== null && Number(val) > maxWarrantyQuantity) {
                      val = maxWarrantyQuantity;
                      showToast('warning', `Số lượng tối đa được phép bảo hành là ${maxWarrantyQuantity}`);
                    }
                    handleFormChange('productQuantity', val);
                  }} />
                </div>
                <div className="misa-form-group" style={{ flex: '1' }}>
                  <label className="misa-label">Đơn vị</label>
                  <input type="text" className="misa-input" disabled={!isEditable} value={formData.productUnit} onChange={e => handleFormChange('productUnit', e.target.value)} />
                </div>
              </div>
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
                <label className="misa-label">Mô tả <span style={{ color: 'red' }}>*</span></label>
                <textarea className="misa-textarea" disabled={!isEditable} value={formData.issueDescription} onChange={e => handleFormChange('issueDescription', e.target.value)} style={{ minHeight: '60px' }}></textarea>
              </div>
              <div className="misa-form-row" style={{ marginBottom: '8px', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="underWarranty" className="misa-label" style={{ marginBottom: 0, width: 'auto', fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Có bảo hành</label>
                  <input type="checkbox" id="underWarranty" disabled={!isEditable} checked={formData.underWarranty} onChange={e => handleToggleGlobalWarranty(e.target.checked)} />
                </div>
              </div>
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
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
                    <span 
                      style={{ color: 'var(--color-primary)', fontWeight: '500', cursor: 'pointer' }} 
                      onClick={() => window.open(`/warranties/${formData.referenceId}`, '_blank')}
                      title="Xem chứng từ tham chiếu"
                    >
                      <i className="bi bi-file-earmark-text"></i> {formData.referenceCode}
                    </span>
                    {isEditable && (
                      <i
                        className="bi bi-x-circle-fill"
                        style={{ color: '#dc3545', cursor: 'pointer', fontSize: '14px' }}
                        onClick={() => {
                          handleFormChange('referenceId', '');
                          handleFormChange('warrantyId', null);
                        }}
                        title="Xóa tham chiếu"
                      ></i>
                    )}
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
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
                <label className="misa-label">Số phiếu</label>
                <input className="misa-input" disabled={!isNew} value={formData.repairCode} onChange={e => handleCodeChange(e.target.value)} placeholder="Tự sinh nếu để trống" />
                {codeError && <span style={{ color: 'red', fontSize: '12px' }}>{codeError}</span>}
              </div>
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
                <label className="misa-label">Ngày tiếp nhận</label>
                <input type="date" className="misa-input" disabled={!isEditable} value={formData.receivedDate} onChange={e => handleFormChange('receivedDate', e.target.value)} />
              </div>
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
                <label className="misa-label">Ngày dự kiến</label>
                <input type="date" className="misa-input" disabled={!isEditable} value={formData.expectedDate} onChange={e => handleFormChange('expectedDate', e.target.value)} />
              </div>
              <div className="misa-form-group" style={{ marginBottom: '8px' }}>
                <label className="misa-label">Người chịu trách nhiệm <span style={{ color: 'red' }}>*</span></label>
                <input type="text" className="misa-input" disabled={!isEditable} placeholder="Nhập tên nhân viên..." value={formData.responsiblePerson} onChange={e => handleFormChange('responsiblePerson', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG HÀNG HÓA */}
        <div className={styles.card} style={{ marginTop: '16px' }}>
          <div className={styles.cardHeader}>
            <i className="bi bi-list-check text-gray-500"></i>
            <h3 className={styles.cardTitle}>Chi tiết linh kiện & dịch vụ</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Loại</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Hạng mục (Linh kiện / Dịch vụ)</th>
                      {showRepairCols && isEditable && <th style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Tồn kho</th>}
                      <th style={{ width: '80px', textAlign: 'right', whiteSpace: 'nowrap' }}>Yêu cầu</th>
                      {showRepairCols && <th style={{ width: '100px', textAlign: 'right', whiteSpace: 'nowrap' }}>Hoàn thành</th>}
                      <th style={{ whiteSpace: 'nowrap' }}>ĐVT</th>
                      {showRepairCols && <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Đã sử dụng</th>}
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Đơn giá / Phí</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Thành tiền</th>
                      <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Bảo hành</th>
                      {visibleColumns.description && <th style={{ whiteSpace: 'nowrap' }}>Ghi chú</th>}
                      {showRepairCols && visibleColumns.serialNumber && <th style={{ whiteSpace: 'nowrap' }}>Serial</th>}
                      <th style={{ width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                    </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                        <tr key={line.id || line._key}>
                          <td>
                            {isEditable ? (
                              <select className="misa-input" style={{ padding: '2px 4px', height: '28px', minWidth: '80px' }} value={line.actionType} onChange={(e) => handleUpdateLineField(line.id, line._key, 'actionType', e.target.value)}>
                                <option value="ADD">Thêm</option>
                                <option value="REMOVE">Loại bỏ</option>
                              </select>
                            ) : (line.actionType === 'ADD' ? 'Thêm' : 'Loại bỏ')}
                          </td>
                          <td style={{ minWidth: '220px' }}>
                            {isEditable ? (
                              <Select
                                options={variants.filter(p => p.productType === 'Hàng hóa' || p.productType === 'Thành phẩm').map(p => ({ value: p.id, label: `${p.productCode || p.sku} - ${p.productName}` }))}
                                value={(() => {
                                  const vId = line.componentVariantId || line.componentVariant?.id;
                                  if (!vId && !line._label) return null;
                                  const p = variants.find(x => String(x.id) === String(vId));
                                  if (p) return { value: vId, label: `${p.productCode || p.sku} - ${p.productName}` };
                                  return { value: vId, label: line.componentVariant?.productName || line._label };
                                })()}
                                onChange={(opt) => {
                                  if (!opt) {
                                    handleChangeLineVariant(line.id, line._key, null);
                                  } else {
                                    handleChangeLineVariant(line.id, line._key, opt.value);
                                  }
                                }}
                                placeholder="Chọn linh kiện..."
                                isClearable
                                styles={{...customSelectStyles, menuPortal: base => ({...base, zIndex: 9999})}}
                                menuPortalTarget={document.body}
                              />
                            ) : (
                              <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={line.componentVariant?.productName || line.componentName || line._label}>
                                {line.componentVariant?.productName || line.componentName || line._label}
                              </div>
                            )}
                          </td>
                          {showRepairCols && isEditable && (
                            <td align="right" style={{ color: (line.availableQuantity < line.quantity && line.actionType === 'ADD') ? 'red' : 'green', fontWeight: 'bold' }}>
                              {line.actionType === 'ADD' ? `${line.availableQuantity || 0}` : '-'}
                            </td>
                          )}
                          <td align="right">
                            {isEditable ? (
                              <input type="number" min="0" step="1" className="misa-input" style={{ width: '60px', textAlign: 'right', padding: '2px 4px', height: '28px' }} value={line.quantity} onChange={(e) => handleUpdateLineField(line.id, line._key, 'quantity', e.target.value)} />
                            ) : Number(line.quantity || 0)}
                          </td>
                          {showRepairCols && (
                            <td align="right">
                              {(isEditable || currentStatus === 'UNDER_REPAIR') ? (
                                <input type="number" min="0" step="1" className="misa-input" style={{ width: '80px', textAlign: 'right', padding: '2px 4px', height: '28px' }} value={line.doneQuantity || 0} onFocus={(e) => e.target.select()} onChange={(e) => handleUpdateLineField(line.id, line._key, 'doneQuantity', parseInt(e.target.value, 10) || 0)} />
                              ) : (Number(line.doneQuantity || 0))}
                            </td>
                          )}
                          <td>{variants.find(v => String(v.id) === String(line.componentVariantId))?.unitName || line.componentVariant?.unitName || line._unitName || '-'}</td>
                          {showRepairCols && (
                            <td align="center">
                              <input type="checkbox" disabled={!isEditable && currentStatus !== 'UNDER_REPAIR'} checked={line.isUsed || false} onChange={(e) => handleUpdateLineField(line.id, line._key, 'isUsed', e.target.checked)} />
                            </td>
                          )}
                          <td align="right">
                            {isEditable ? (
                              <input type="text" className="misa-input" style={{ width: '100px', textAlign: 'right', padding: '2px 4px', height: '28px' }} disabled={line.isFreeWarranty} value={line.isFreeWarranty ? 0 : money(line.unitPrice)} onChange={(e) => handleUpdateLineField(line.id, line._key, 'unitPrice', Number(e.target.value.replace(/\D/g, '')))} />
                            ) : money(line.unitPrice)}
                          </td>
                          <td align="right" style={{ fontWeight: '500' }}>
                            {(() => {
                              if (line.isFreeWarranty || line.actionType !== 'ADD') return money(0);
                              const qty = ['UNDER_REPAIR', 'DONE'].includes(currentStatus)
                                ? (line.isUsed ? Number(line.doneQuantity || 0) : 0)
                                : Number(line.quantity || 0);
                              return money(qty * Number(line.unitPrice));
                            })()}
                          </td>
                          <td align="center">
                            <input type="checkbox" disabled={!isEditable} checked={line.isFreeWarranty} onChange={(e) => {
                              const isChecked = e.target.checked;
                              handleUpdateLineField(line.id, line._key, 'isFreeWarranty', isChecked);
                              if (isChecked) {
                                handleUpdateLineField(line.id, line._key, 'unitPrice', 0);
                              } else {
                                const originalPrice = line.componentVariant?.salePrice || line._salePrice || 0;
                                handleUpdateLineField(line.id, line._key, 'unitPrice', originalPrice);
                              }
                            }} />
                          </td>
                          {visibleColumns.description && (
                            <td>
                              {isEditable ? (
                                <input type="text" className="misa-input" style={{ padding: '2px 4px', height: '28px' }} value={line.note || ''} onChange={(e) => handleUpdateLineField(line.id, line._key, 'note', e.target.value)} />
                              ) : line.note}
                            </td>
                          )}
                          {showRepairCols && visibleColumns.serialNumber && <td>
                            {(() => {
                              const variant = variants.find(v => String(v.id) === String(line.componentVariantId));
                              const trackSerial = variant ? variant.trackSerial : false;
                              if (!trackSerial) return '-';

                              if ((isEditable || currentStatus === 'UNDER_REPAIR') && (line.actionType === 'ADD' || line.actionType === 'REMOVE')) {
                                const hasSerial = Boolean(line.serialNumberId || line.serialNumber);
                                const btnStyle = hasSerial
                                  ? { padding: '2px 8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#22c55e', color: '#16a34a', backgroundColor: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }
                                  : { padding: '2px 8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#f97316', color: '#ea580c', backgroundColor: '#fff7ed', border: '1px solid #f97316', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' };
                                return (
                                  <button
                                    type="button"
                                    onClick={() => openSerialModal(line, idx)}
                                    style={btnStyle}
                                  >
                                    <i className="bi bi-upc-scan"></i> {hasSerial ? '1' : '0'} / {Number(line.doneQuantity || 0)}
                                  </button>
                                );
                              }
                              return line.serialNumber || '';
                            })()}
                          </td>}

                          <td align="center">
                            {isEditable && (
                              <button className={styles.iconBtnDanger} onClick={() => handleDeleteLine(line.id, idx)}><i className="bi bi-trash"></i></button>
                            )}
                          </td>
                          <td></td>
                        </tr>
                      ))}

                      {/* Phí Dịch vụ */}
                      {fees.map((fee, idx) => (
                        <tr key={fee.id || fee._key} style={{ backgroundColor: '#fdf8f6' }}>
                          <td>
                            <span style={{ padding: '2px 6px', backgroundColor: '#f97316', color: 'white', borderRadius: '4px', fontSize: '11px' }}>Dịch vụ</span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fee.feeName}>
                            {fee.feeName}
                          </td>
                          {showRepairCols && <td align="right">-</td>}
                          <td align="right">{fee.quantity || 1}</td>
                          {showRepairCols && <td align="right">-</td>}
                          <td>{fee.unitName}</td>
                          {showRepairCols && <td align="center">-</td>}
                          <td align="right">
                            {isEditable ? (
                              <input type="text" className="misa-input" style={{ width: '100px', textAlign: 'right', padding: '2px 4px', height: '28px' }} disabled={fee.isFreeWarranty} value={fee.isFreeWarranty ? 0 : money(fee.feeAmount)} onChange={(e) => handleUpdateFeeField(fee.id, fee._key, 'feeAmount', Number(e.target.value.replace(/\D/g, '')))} />
                            ) : money(fee.feeAmount)}
                          </td>
                          <td align="right" style={{ fontWeight: '500' }}>
                            {money((fee.isFreeWarranty ? 0 : Number(fee.quantity || 1) * Number(fee.feeAmount)))}
                          </td>
                          <td align="center">
                            <input type="checkbox" disabled={!isEditable} checked={fee.isFreeWarranty} onChange={(e) => handleUpdateFeeField(fee.id, fee._key, 'isFreeWarranty', e.target.checked)} />
                          </td>
                          {visibleColumns.description && <td>{fee.note}</td>}
                          {showRepairCols && visibleColumns.serialNumber && <td></td>}

                          <td align="center">
                            {isEditable && (
                              <button className={styles.iconBtnDanger} onClick={() => handleDeleteFee(fee.id, idx)}><i className="bi bi-trash"></i></button>
                            )}
                          </td>
                          <td></td>
                        </tr>
                      ))}

                      {addingType === 'PART' && (
                        <NewInlineRow repair={repair} type="PART" variants={variants.filter(v => v.productType === 'Hàng hóa').map(v => ({ value: v.id, label: `${v.sku || v.productCode} - ${v.productName}`, unitName: v.unitName, salePrice: v.salePrice }))} onSave={handleSaveLine} onCancel={() => setAddingType(null)} underWarranty={formData.underWarranty} visibleColumns={visibleColumns} />
                      )}
                      {addingType === 'FEE' && (
                        <NewInlineRow repair={repair} type="FEE" variants={products.filter(p => p.productType === 'Dịch vụ').map(v => ({ value: v.id, label: v.productName, unitName: v.unitName, salePrice: v.salePrice, productName: v.productName }))} onSave={handleSaveFee} onCancel={() => setAddingType(null)} underWarranty={formData.underWarranty} visibleColumns={visibleColumns} />
                      )}
                </tbody>
              </table>
          </div>
          <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            {isEditable && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button className={styles.btnOutlineBlue} onClick={() => setAddingType('PART')}>
                  <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Thêm linh kiện
                </button>
                <button className={styles.btnOutlineBlue} style={{ borderColor: '#f97316', color: '#ea580c' }} onClick={() => setAddingType('FEE')}>
                  <i className="bi bi-plus" style={{ fontSize: '18px' }}></i> Thêm dịch vụ
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label className="misa-label">Ghi chú nội bộ</label>
                <textarea
                  className="misa-textarea"
                  style={{ width: '100%', minHeight: '80px', fontSize: '13px', padding: '8px', lineHeight: '1.5' }}
                  placeholder="Ghi chú dành riêng cho nội bộ cửa hàng..."
                  value={formData.internalNotes || ''}
                  onChange={(e) => handleFormChange('internalNotes', e.target.value)}
                  onBlur={() => handleUpdateInternalNotes()}
                ></textarea>
              </div>
              <div style={{ width: '300px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px', alignSelf: 'flex-end', marginBottom: '8px' }}>
                Tổng cộng toàn bộ đơn:<br/>
                <span style={{ color: '#017e84', fontSize: '24px', display: 'inline-block', marginTop: '4px' }}>{money(totalAmount)} đ</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => handleGoBack()} style={{ marginRight: '8px' }}>Hủy bỏ</button>
            {!isNew && currentStatus === 'DONE' && (
              <>
                <button className="btn-misa-outline" onClick={() => navigate('/export-slips', { state: { filterDocCode: 'REP-EX-' + repair.repairCode } })} style={{ marginRight: '8px' }}><i className="bi bi-box-arrow-up-right"></i> Xem phiếu xuất kho</button>
                <button className="btn-misa-outline" onClick={() => navigate('/import-history', { state: { filterDocCode: 'REP-SCRAP-' + repair.repairCode } })}><i className="bi bi-box-arrow-in-down-left"></i> Xem phiếu nhập phế liệu</button>
              </>
            )}
          </div>
          <div className={styles.footerRight}>
            {!isNew && repair && repair.repairStatus === 'DRAFT' && (
              <>
                <button className="btn-misa-post" style={{ marginRight: '8px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }} onClick={handlePrintQuote}>
                  <i className="bi bi-printer" style={{ marginRight: '4px' }}></i> In báo giá
                </button>
                <button className="btn-misa-post" style={{ marginRight: '8px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={handleCopyPublicLink}>
                  <i className="bi bi-link-45deg" style={{ marginRight: '4px' }}></i> Chia sẻ link
                </button>

                <button className="btn-misa-post" disabled={saving} onClick={() => handleChangeStatus('CONFIRMED')} style={{ marginRight: '8px', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                  Xác nhận sửa chữa
                </button>
                <button className="btn-misa-cancel" style={{ marginRight: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#f87171' }} disabled={saving} onClick={() => handleChangeStatus('CANCELLED')}>
                  Hủy đơn
                </button>
              </>
            )}

            {!isNew && repair && repair.repairStatus === 'QUOTATION' && (
              <>
                <button className="btn-misa-post" style={{ marginRight: '8px', backgroundColor: '#3b82f6', borderColor: '#3b82f6' }} onClick={handlePrintQuote}>
                  <i className="bi bi-printer" style={{ marginRight: '4px' }}></i> In báo giá
                </button>
                <button className="btn-misa-post" style={{ marginRight: '8px', backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={handleCopyPublicLink}>
                  <i className="bi bi-link-45deg" style={{ marginRight: '4px' }}></i> Chia sẻ link
                </button>
                <button className="btn-misa-post" disabled={saving} onClick={() => handleChangeStatus('CONFIRMED')} style={{ marginRight: '8px', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                  Xác nhận sửa chữa
                </button>
                <button className="btn-misa-cancel" style={{ marginRight: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#f87171' }} disabled={saving} onClick={() => handleChangeStatus('CANCELLED')}>
                  Hủy đơn
                </button>
              </>
            )}

            {!isNew && repair && repair.repairStatus === 'CONFIRMED' && (
              <>
                <button className="btn-misa-post" style={{ marginRight: '8px' }} disabled={saving} onClick={() => handleChangeStatus('UNDER_REPAIR')}>
                  Bắt đầu sửa chữa
                </button>
                <button className="btn-misa-cancel" style={{ marginRight: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#f87171' }} disabled={saving} onClick={() => handleChangeStatus('CANCELLED')}>
                  Hủy lệnh
                </button>
              </>
            )}
            {!isNew && repair && repair.repairStatus === 'UNDER_REPAIR' && (
              <>
                <button className="btn-misa-post" disabled={saving} onClick={() => handleChangeStatus('DONE')} style={{ marginRight: '8px' }}>
                  Kết thúc sửa chữa
                </button>
              </>
            )}
            {isEditable && (
              <button className="btn-misa-post" disabled={saving || !!codeError} onClick={handleSave}>
                <i className="bi bi-save"></i> {isNew ? 'Lưu mới' : 'Lưu lại'}
              </button>
            )}
          </div>
        </div>
      </div>
      {toast.isVisible && <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />}
      <CustomerModal isOpen={isCustomerModalOpen} onClose={closeCustomerModal} onSaved={handleCustomerSaved} />
      {serialModalData.isOpen && (
        <RepairSerialModal
          isOpen={serialModalData.isOpen}
          onClose={closeSerialModal}
          productName={serialModalData.productName}
          warehouseId={serialModalData.warehouseId}
          variantId={serialModalData.variantId}
          initialSerialObj={serialModalData.initialSerialObj}
          actionType={serialModalData.actionType}
        />
      )}
      <div style={{ display: 'none' }}>
        <RepairQuotationTemplate ref={printRef} repair={repair} />
      </div>
    </AdminLayout>
  );
}
function NewInlineRow({ repair, type, variants, onSave, onCancel, underWarranty, visibleColumns = {} }) {
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
        <select className="misa-input" value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value })} style={{ width: '100%', minWidth: '90px', height: '28px' }}>
          <option value="ADD">Thêm</option>
          <option value="REMOVE">Loại bỏ</option>
        </select>
      </td>
      <td>
        <Select
          options={variants}
          onChange={async opt => {
            if (opt) {
              const newForm = { ...form, componentVariantId: opt.value, _label: opt.label, _unitName: opt.unitName, unitPrice: isFree ? 0 : opt.salePrice };
              await onSave(newForm);
            } else {
              onCancel();
            }
          }}
          placeholder="Chọn linh kiện..."
          isClearable styles={{ ...customSelectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
        />
      </td>
      {(repair && !['DRAFT', 'QUOTATION'].includes(repair.repairStatus)) && <td></td>}
      <td>
        <input type="number" className="misa-input" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={{ width: '60px', textAlign: 'right', padding: '2px 4px', height: '28px' }} />
      </td>
      <td>
        <input type="number" className="misa-input" disabled value="0" style={{ width: '80px', textAlign: 'right', padding: '2px 4px', height: '28px' }} />
      </td>
      <td>{variants.find(v => v.value === form.componentVariantId)?.unitName || ''}</td>
      <td align="center">
        <input type="checkbox" disabled />
      </td>
      <td>
        <input type="text" className="misa-input" disabled={isFree} value={isFree ? 0 : money(form.unitPrice)} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value.replace(/\D/g, '')) })} style={{ padding: '2px 4px', height: '28px', width: '100px', textAlign: 'right' }} />
      </td>
      <td align="right">{money((isFree || form.actionType !== 'ADD') ? 0 : form.quantity * form.unitPrice)}</td>
      <td align="center"><input type="checkbox" checked={form.isFreeWarranty} onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked })} /></td>
      {visibleColumns.description && (
        <td><input className="misa-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú..." style={{ padding: '2px 4px', height: '28px' }} /></td>
      )}
      {visibleColumns.serialNumber && <td></td>}

      <td align="center">
        <button className={styles.iconBtnDanger} onClick={onCancel} title="Xóa dòng">
          <i className="bi bi-trash"></i>
        </button>
      </td>
      <td></td>
    </tr>
  );

  return (
    <tr style={{ background: '#fdf8f6' }}>
      <td>
        <span style={{ padding: '2px 6px', backgroundColor: '#f97316', color: 'white', borderRadius: '4px', fontSize: '11px' }}>Dịch vụ</span>
      </td>
      <td>
        <Select
          options={variants}
          value={variants.find(v => v.productName === form.feeName) || null}
          onChange={async opt => {
            if (opt) {
              const newForm = { ...form, feeName: opt.productName, feeAmount: opt.salePrice, unitName: opt.unitName, quantity: form.quantity || 1 };
              await onSave(newForm);
            } else {
              onCancel();
            }
          }}
          placeholder="Chọn dịch vụ..."
          isClearable
          styles={{ ...customSelectStyles, menuPortal: base => ({ ...base, zIndex: 9999 }) }}
          menuPortalTarget={document.body}
        />
      </td>
      {(repair && !['DRAFT', 'QUOTATION'].includes(repair.repairStatus)) && <td></td>}
      <td align="right">
        <input type="number" min="1" className="misa-input" style={{ width: '60px', textAlign: 'right', padding: '2px 4px', height: '28px' }} value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: e.target.value, feeAmount: e.target.value * (variants.find(v => v.productName === form.feeName)?.salePrice || 0) })} />
      </td>
      <td align="right"></td>
      <td>{form.unitName || '-'}</td>
      <td align="center"></td>
      <td align="right">
        <input type="text" className="misa-input" disabled={isFree} style={{ width: '100px', textAlign: 'right', padding: '2px 4px', height: '28px' }} value={isFree ? 0 : money(form.feeAmount)} onChange={e => setForm({ ...form, feeAmount: Number(e.target.value.replace(/\D/g, '')) })} />
      </td>
      <td align="right">
        {money(isFree ? 0 : (form.quantity || 1) * form.feeAmount)}
      </td>
      <td align="center">
        <input type="checkbox" checked={form.isFreeWarranty} onChange={e => setForm({ ...form, isFreeWarranty: e.target.checked, feeAmount: e.target.checked ? 0 : form.feeAmount })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
      </td>
      {visibleColumns.description && (
        <td><input type="text" className="misa-input" placeholder="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ padding: '2px 4px', height: '28px' }} /></td>
      )}
      {visibleColumns.serialNumber && <td></td>}

      <td align="center">
        <button className={styles.iconBtnDanger} onClick={onCancel} title="Xóa dòng">
          <i className="bi bi-trash"></i>
        </button>
      </td>
      <td></td>
    </tr>
  );
}

export default RepairFormPage;
