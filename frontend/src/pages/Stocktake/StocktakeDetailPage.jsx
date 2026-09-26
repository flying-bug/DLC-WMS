import { useEffect, useState, useRef } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as importApi from '../../api/inventoryImportApi';
import { loadXlsx } from '../../utils/lazyExcel';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
import { printStocktakeReport } from '../../utils/printStocktakeReport';
import { printExportSlip } from '../../utils/printExportSlip';
import { printImportSlip } from '../../utils/printImportSlip';
import { getTodayIsoDate, getCurrentDateTimeInput, toDateTimeInputValue, formatDateOnly, formatDateTime } from '../../utils/dateFormat';
import { getAuthRoles, getAuthUserId, getAuthFullName, hasPermission } from '../../auth/session';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import DateInput from '../../components/ui/DateInput/DateInput';

const ADJUSTMENT_STATUS_LABELS = { DRAFT: 'nháp', POSTED: 'đã ghi sổ', UNPOSTED: 'đã bỏ ghi sổ' };

function StocktakeDetailPage() {
  const navigate = useNavigate();
  const goBack = useGoBack('/stocktakes');
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const userRoles = getAuthRoles().map(r => String(r || '').toUpperCase());
  const isStorekeeper = userRoles.some(r => r.includes('STOREKEEPER'));
  const isAccountantOrAdmin = userRoles.some(r => r.includes('ACCOUNTANT') || r.includes('SUPER_ADMIN') || r.includes('MANAGER'));
  // Chỉ Manager / Super Admin được duyệt, từ chối hoặc hủy phiếu đang kiểm kê
  const isApprover = userRoles.some(r => r.includes('SUPER_ADMIN') || r.includes('MANAGER'));


  const [warehouses, setWarehouses] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    purpose: 'Kiểm kê vật tư hàng hóa định kỳ',
    code: id ? `KKK-000${id}` : 'KKK00002',
    warehouseId: searchParams.get('warehouseId') || 'all',
    toDate: searchParams.get('toDate') || getTodayIsoDate(),
    createdDate: getCurrentDateTimeInput(),
    conclusion: '',
    isProcessed: false,
    isValueStocktake: false
  });

  const isReadOnlyForStorekeeper = formData?.createdByAccountant && isStorekeeper && !isAccountantOrAdmin;

  // Vòng đời: PENDING_APPROVAL (chờ duyệt) -> COUNTING (đã duyệt, kho bị khóa, nhập số đếm) -> POSTED
  //           hoặc REJECTED / CANCELLED. DRAFT là phiếu cũ trước khi có bước duyệt.
  const stocktakeStatus = formData.status || 'DRAFT';
  const isPendingApproval = stocktakeStatus === 'PENDING_APPROVAL';
  const isCounting = stocktakeStatus === 'COUNTING';
  const canEditStocktake = hasPermission('stocktake:edit');
  const canWorkOnCounts = (isCounting || stocktakeStatus === 'DRAFT') && canEditStocktake;
  const canSubmitDraft = stocktakeStatus === 'DRAFT' && (hasPermission('stocktake:add') || canEditStocktake);
  const canCancelStocktake = (isPendingApproval || isCounting) && (isApprover || (isPendingApproval && formData.createdByCurrentUser));

  const [isSaved, setIsSaved] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
  };

  const [lines, setLines] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [participants, setParticipants] = useState([]);

  const fetchStocktakeData = async ({ silent } = {}) => {
    try {
      if (!silent) setLoadingStock(true);
      const res = await stocktakeApi.getStocktakeDetail(id);
      const data = res?.data?.data || res?.data;
      if (data) {
        setFormData({
          purpose: data.purpose || '',
          code: data.stocktakeCode,
          warehouseId: String(data.warehouseId),
          toDate: data.stocktakeDate || getTodayIsoDate(),
          createdDate: data.createdAt ? toDateTimeInputValue(data.createdAt) : getCurrentDateTimeInput(),
          conclusion: data.conclusion || '',
          isProcessed: data.status === 'POSTED',
          isValueStocktake: false,
          status: data.status,
          referenceImportId: data.referenceImportId,
          referenceExportId: data.referenceExportId,
          createdByAccountant: data.createdByAccountant,
          rejectReason: data.rejectReason,
          skippedDiffCount: data.skippedDiffCount || 0,
          waiverConfirmed: Boolean(data.waiverConfirmed),
          lastCountedBy: data.lastCountedBy,
          createdAtRaw: data.createdAt,
          createdByName: data.createdByName,
          approvedByName: data.approvedByName,
          approvedAt: data.approvedAt,
          waiverConfirmedByName: data.waiverConfirmedByName,
          waiverConfirmedAt: data.waiverConfirmedAt,
          lastCountedByName: data.lastCountedByName,
          needsImportAdjustment: Boolean(data.needsImportAdjustment),
          needsExportAdjustment: Boolean(data.needsExportAdjustment),
          importAdjustmentPosted: Boolean(data.importAdjustmentPosted),
          exportAdjustmentPosted: Boolean(data.exportAdjustmentPosted),
          // Phiếu điều chỉnh đã lập (chưa hủy) của lần kiểm kê: mở phiếu này thay vì lập phiếu mới
          importAdjustmentId: data.importAdjustmentId || null,
          importAdjustmentCode: data.importAdjustmentCode || '',
          importAdjustmentStatus: data.importAdjustmentStatus || '',
          exportAdjustmentId: data.exportAdjustmentId || null,
          exportAdjustmentCode: data.exportAdjustmentCode || '',
          exportAdjustmentStatus: data.exportAdjustmentStatus || '',
          createdByCurrentUser: Boolean(data.createdBy) && String(data.createdBy) === String(getAuthUserId())
        });

        if (data.lines) {
          setLines(data.lines.map(l => ({
            id: l.id,
            variantId: l.variantId,
            itemCode: l.itemCode,
            sku: l.sku,
            itemName: l.itemName,
            unit: l.unit,
            trackSerial: Boolean(l.trackSerial),
            bookQty: l.bookQty,
            countQty: l.countQty,
            diffQty: l.diffQty,
            good100: l.goodQty,
            bad: l.badQty,
            lost: l.lostQty,
            action: l.action,
            skipReason: l.skipReason,
            serials: l.serials || []
          })));
        }


        if (data.participants) {
          setParticipants(data.participants.map(p => ({
            name: p.fullName,
            title: p.title,
            represent: p.represent
          })));
        }

        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Không tải được chi tiết phiếu kiểm kê');
    } finally {
      if (!silent) setLoadingStock(false);
    }
  };
  // Chỉ tự làm mới khi đang xem (isSaved); ở chế độ sửa sẽ ghi đè dữ liệu người dùng đang nhập.
  useRealtimeRefresh({ STOCKTAKE: id }, fetchStocktakeData, { enabled: isSaved });

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await stocktakeApi.getWarehouses();
        const data = response?.data?.data?.content || response?.data?.data || response?.data || [];
        setWarehouses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load warehouses', err);
      }
    };
    loadWarehouses();
    fetchStocktakeData();
  }, [id]);



  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCountQtyChange = (index, value) => {
    // Số đếm thực tế không bao giờ âm: min="0" chỉ chặn nút tăng/giảm, gõ tay vẫn ra số âm.
    const countVal = value === '' ? '' : Math.max(0, Number(value) || 0);
    setLines(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      const countNum = Number(countVal || 0);
      const diff = countNum - line.bookQty;
      return {
        ...line,
        countQty: countVal,
        diffQty: diff,
        good100: countNum,
        bad: 0,
        lost: 0,
        action: diff !== 0 ? 'Xử lý chênh lệch' : 'Không xử lý'
      };
    }));
  };

  const handleQualityChange = (index, field, value) => {
    const valNum = value === '' ? '' : Number(value);
    setLines(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      return { ...line, [field]: valNum };
    }));
  };

  // Dòng có chênh lệch nhưng chọn "Không xử lý": không nằm trong phiếu nhập/xuất điều chỉnh, cần lý do + xác nhận.
  const isSkippedDiff = (l) => l.action === 'Không xử lý' && Number(l.diffQty || 0) !== 0;

  const handleSkipReasonChange = (index, reason) => {
    setLines(prev => prev.map((line, idx) => (idx === index ? { ...line, skipReason: reason } : line)));
  };

  const handleActionChange = (index, actionVal) => {
    setLines(prev => prev.map((line, idx) => (idx === index ? { ...line, action: actionVal } : line)));
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  // Serial Modal State & Logic
  const [serialModal, setSerialModal] = useState({
    isOpen: false,
    lineIndex: null,
    loading: false,
    scanInput: '',
    systemSerials: [],
    scannedList: [],
    filterTab: 'ALL'
  });

  const openSerialModal = async (lineIdx) => {
    const line = lines[lineIdx];
    if (!line || !line.variantId || !formData.warehouseId || formData.warehouseId === 'all') {
      showToast('error', 'Vui lòng chọn Kho và Sản phẩm trước khi quét Serial');
      return;
    }

    setSerialModal({
      isOpen: true,
      lineIndex: lineIdx,
      loading: true,
      scanInput: '',
      systemSerials: [],
      scannedList: line.serials ? line.serials.filter(s => s.scanStatus !== 'MISSING') : [],
      filterTab: 'ALL'
    });

    try {
      const res = await stocktakeApi.getAvailableSerials(formData.warehouseId, line.variantId);
      const sysSerials = res?.data?.data || res?.data || [];
      const sysList = Array.isArray(sysSerials) ? sysSerials : [];

      const initialScanned = line.serials ? line.serials.filter(s => s.scanStatus !== 'MISSING') : [];

      setSerialModal(prev => ({
        ...prev,
        loading: false,
        systemSerials: sysList,
        scannedList: initialScanned
      }));
    } catch (err) {
      console.error('Failed to load available serials', err);
      setSerialModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleScanSerialSubmit = (e) => {
    if (e) e.preventDefault();
    const code = serialModal.scanInput.trim();
    if (!code) return;

    const exists = serialModal.scannedList.find(s => s.serialNumber.toLowerCase() === code.toLowerCase());
    if (exists) {
      showToast('warning', `Serial ${code} đã được quét trước đó`);
      setSerialModal(prev => ({ ...prev, scanInput: '' }));
      return;
    }

    const sysMatch = serialModal.systemSerials.find(s => s.serialNumber.toLowerCase() === code.toLowerCase());
    const newEntry = {
      serialNumberId: sysMatch ? sysMatch.id : null,
      serialNumber: sysMatch ? sysMatch.serialNumber : code,
      scanStatus: sysMatch ? 'MATCHED' : 'UNEXPECTED'
    };

    setSerialModal(prev => ({
      ...prev,
      scanInput: '',
      scannedList: [...prev.scannedList, newEntry]
    }));
  };

  const handleRemoveScannedSerial = (serialNum) => {
    setSerialModal(prev => ({
      ...prev,
      scannedList: prev.scannedList.filter(s => s.serialNumber !== serialNum)
    }));
  };

  const handleSaveSerialModal = () => {
    if (serialModal.lineIndex === null) return;
    const idx = serialModal.lineIndex;

    const scannedSet = new Set(serialModal.scannedList.map(s => s.serialNumber.toLowerCase()));
    const missingSerials = serialModal.systemSerials
      .filter(s => !scannedSet.has(s.serialNumber.toLowerCase()))
      .map(s => ({
        serialNumberId: s.id,
        serialNumber: s.serialNumber,
        scanStatus: 'MISSING'
      }));

    const finalSerials = [...serialModal.scannedList, ...missingSerials];
    const validCount = serialModal.scannedList.length;

    setLines(prev => prev.map((line, lIdx) => {
      if (lIdx !== idx) return line;
      const diff = validCount - line.bookQty;
      return {
        ...line,
        countQty: validCount,
        diffQty: diff,
        good100: serialModal.scannedList.filter(s => s.scanStatus === 'MATCHED').length,
        bad: serialModal.scannedList.filter(s => s.scanStatus === 'UNEXPECTED').length,
        lost: missingSerials.length,
        action: diff !== 0 ? 'Xử lý chênh lệch' : 'Không xử lý',
        serials: finalSerials
      };
    }));

    setSerialModal({ isOpen: false, lineIndex: null, loading: false, scanInput: '', systemSerials: [], scannedList: [], filterTab: 'ALL' });
  };

  const handleExportExcel = async () => {
    const XLSX = await loadXlsx();
    if (lines.length === 0) {
      showToast('warning', 'Không có dữ liệu vật tư hàng hóa để xuất');
      return;
    }
    const exportData = lines.map((l, index) => ({
      'STT': index + 1,
      'MÃ HÀNG': l.itemCode,
      'SKU': l.sku,
      'TÊN HÀNG HÓA': l.itemName,
      'ĐVT': l.unit,
      'SỔ SÁCH': l.bookQty,
      'KIỂM KÊ THỰC TẾ': l.countQty !== undefined ? l.countQty : '',
      'TỐT 100%': l.good100 !== undefined ? l.good100 : '',
      'KÉM CẤP': l.bad !== undefined ? l.bad : '',
      'HỎNG/MẤT': l.lost !== undefined ? l.lost : '',
      'GHI CHÚ': ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KiemKe");
    XLSX.writeFile(wb, `Kiem_Ke_VTHH_${formData.code}_${new Date().getTime()}.xlsx`);
  };

  const handlePrint = () => {
    const whObj = warehouses.find(w => String(w.id) === String(formData.warehouseId));
    const whName = whObj ? `${whObj.code} - ${whObj.name}` : (formData.warehouseId === 'all' ? 'Tất cả kho' : 'Chưa chọn kho');
    printStocktakeReport({
      stocktakeCode: formData.code,
      purpose: formData.purpose,
      warehouseName: whName,
      stocktakeDate: formData.toDate || formData.createdDate,
      conclusion: formData.conclusion,
      lines,
      participants,
      records: {
        createdByName: formData.createdByName,
        createdAt: formData.createdAtRaw,
        approvedByName: formData.approvedByName,
        approvedAt: formData.approvedAt,
        rejected: stocktakeStatus === 'REJECTED',
        waiverConfirmedByName: formData.waiverConfirmedByName,
        waiverConfirmedAt: formData.waiverConfirmedAt
      },
      onError: (msg) => showToast('error', msg)
    });
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await loadXlsx();
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data && data.length > 0) {
          let updatedCount = 0;
          setLines(prev => {
            const newLines = [...prev];
            data.forEach(row => {
              const sku = row['SKU'];
              const countQty = row['KIỂM KÊ THỰC TẾ'];
              if (sku && countQty !== undefined && countQty !== '') {
                const idx = newLines.findIndex(l => l.sku === String(sku));
                if (idx !== -1) {
                  const countNum = Number(countQty);
                  const diff = countNum - newLines[idx].bookQty;
                  newLines[idx] = {
                    ...newLines[idx],
                    countQty: countNum,
                    diffQty: diff,
                    good100: countNum,
                    bad: row['KÉM CẤP'] ? Number(row['KÉM CẤP']) : 0,
                    lost: row['HỎNG/MẤT'] ? Number(row['HỎNG/MẤT']) : 0,
                    action: diff !== 0 ? 'Xử lý chênh lệch' : 'Không xử lý'
                  };
                  updatedCount++;
                }
              }
            });
            return newLines;
          });
          showToast('success', `Đã nhập kết quả kiểm kê cho ${updatedCount} mặt hàng từ Excel`);
        } else {
          showToast('warning', 'File Excel không có dữ liệu hợp lệ');
        }
      } catch (error) {
        console.error(error);
        showToast('error', 'Lỗi khi đọc file Excel');
      }
      e.target.value = null; // reset file input
    };
    reader.readAsBinaryString(file);
  };

  const handleCancel = () => {
    goBack();
  };

  const buildPayload = () => ({
    stocktakeCode: formData.code,
    warehouseId: formData.warehouseId === 'all' ? null : Number(formData.warehouseId),
    purpose: formData.purpose,
    stocktakeDate: formData.createdDate ? formData.createdDate.split('T')[0] : null,
    conclusion: formData.conclusion,
    status: formData.status || 'DRAFT',
    lines: lines.map(l => ({
      variantId: l.variantId,
      bookQty: Number(l.bookQty || 0),
      countQty: Number(l.countQty || 0),
      diffQty: Number(l.diffQty || 0),
      goodQty: Number(l.good100 || 0),
      badQty: Number(l.bad || 0),
      lostQty: Number(l.lost || 0),
      action: l.action,
      skipReason: l.skipReason || null,
      serials: l.serials ? l.serials.map(s => ({
        serialNumberId: s.serialNumberId,
        serialNumber: s.serialNumber,
        scanStatus: s.scanStatus,
        note: s.note
      })) : []
    })),
    participants: participants.map(p => ({
      fullName: p.name,
      title: p.title,
      represent: p.represent
    }))
  });

  const validateForm = (payload) => {
    if (!payload.warehouseId && formData.warehouseId !== 'all') {
      showToast('error', 'Vui lòng chọn kho để kiểm kê');
      return false;
    }
    if (!payload.lines || payload.lines.length === 0) {
      showToast('error', 'Phiếu kiểm kê phải có ít nhất một dòng');
      return false;
    }
    const hasEmptyVariant = payload.lines.some(l => !l.variantId);
    if (hasEmptyVariant) {
      showToast('error', 'Vui lòng chọn sản phẩm cho tất cả các dòng kiểm kê hoặc xóa dòng trống');
      return false;
    }
    const variantSet = new Set();
    for (const l of payload.lines) {
      if (variantSet.has(String(l.variantId))) {
        showToast('error', 'Danh sách kiểm kê không được chứa sản phẩm trùng nhau');
        return false;
      }
      variantSet.add(String(l.variantId));
    }
    return true;
  };

  const handleSave = async () => {
    try {
      const payload = buildPayload();
      if (!validateForm(payload)) return;
      await stocktakeApi.updateStocktake(id, payload);
      setIsSaved(true);
      fetchStocktakeData();
      showToast('success', 'Lưu bảng kiểm kê thành công!');
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Lưu thất bại');
    }
  };

  const handleSaveAndClose = async () => {
    try {
      const payload = buildPayload();
      if (!validateForm(payload)) return;
      await stocktakeApi.updateStocktake(id, payload);
      if (formData.isProcessed) {
        await stocktakeApi.postStocktake(id);
      }
      navigate('/stocktakes', { replace: true, state: { toastMessage: 'Cập nhật bảng kiểm kê thành công!', toastType: 'success' } });
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Cập nhật thất bại');
    }
  };

  const runStocktakeAction = async (action, successMessage) => {
    try {
      await action();
      showToast('success', successMessage);
      fetchStocktakeData({ silent: true });
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Thao tác thất bại');
      fetchStocktakeData({ silent: true });
    }
  };

  const handleApproveStocktake = () => runStocktakeAction(
    () => stocktakeApi.approveStocktake(id), 'Đã duyệt. Kho đang được khóa để kiểm kê.');

  const handleRejectStocktake = () => {
    const reason = window.prompt('Nhập lý do từ chối phiếu kiểm kê:');
    if (reason === null) return;
    if (!reason.trim()) {
      showToast('error', 'Vui lòng nhập lý do từ chối');
      return;
    }
    runStocktakeAction(() => stocktakeApi.rejectStocktake(id, reason.trim()), 'Đã từ chối phiếu kiểm kê');
  };

  const handleCancelStocktake = () => {
    const message = isCounting
      ? 'Hủy đợt kiểm kê này? Kho sẽ được mở khóa và số đếm đã nhập sẽ không được áp dụng.'
      : 'Hủy yêu cầu kiểm kê này?';
    if (!window.confirm(message)) return;
    runStocktakeAction(() => stocktakeApi.cancelStocktake(id), 'Đã hủy phiếu kiểm kê');
  };

  // "Hoàn thành kiểm kê": mọi trường hợp (khớp / lệch cần phiếu / lệch không xử lý) đều đi qua một hộp thoại tổng kết.
  const handleFinishClick = async () => {
    if (!isSaved) {
      const payload = buildPayload();
      if (!validateForm(payload)) return;
      try {
        await stocktakeApi.updateStocktake(id, payload);
        setIsSaved(true);
        await fetchStocktakeData({ silent: true });
      } catch (err) {
        console.error(err);
        showToast('error', err.response?.data?.userMessage || 'Lưu thất bại');
        return;
      }
    }
    setShowFinishModal(true);
  };

  const finishWith = async (action, successMessage) => {
    setShowFinishModal(false);
    await runStocktakeAction(action, successMessage);
  };

  const handleAddMeAsParticipant = () => {
    const name = getAuthFullName();
    if (!name) return;
    if (participants.some(p => (p.name || '').trim().toLowerCase() === name.trim().toLowerCase())) return;
    const title = userRoles.some(r => r.includes('SUPER_ADMIN') || r.includes('MANAGER')) ? 'Quản lý'
      : userRoles.some(r => r.includes('ACCOUNTANT')) ? 'Kế toán'
        : userRoles.some(r => r.includes('WAREHOUSE')) ? 'Thủ kho' : '';
    const nonEmpty = participants.filter(p => (p.name || '').trim() || (p.title || '').trim() || (p.represent || '').trim());
    setParticipants([...nonEmpty, { name, title, represent: '' }]);
  };

  const handleSubmitStocktake = () => runStocktakeAction(
    () => stocktakeApi.submitStocktake(id),
    isApprover ? 'Đã bắt đầu kiểm kê, kho đang bị khóa' : 'Đã gửi yêu cầu kiểm kê, chờ quản lý duyệt');


  // Mỗi lần kiểm kê chỉ có một phiếu nhập và một phiếu xuất điều chỉnh (backend cũng chặn lập / ghi sổ phiếu thứ hai)
  const adjustmentSlip = (kind) => kind === 'import'
    ? { id: formData.importAdjustmentId, code: formData.importAdjustmentCode, status: formData.importAdjustmentStatus }
    : { id: formData.exportAdjustmentId, code: formData.exportAdjustmentCode, status: formData.exportAdjustmentStatus };

  const adjustmentSlipLabel = (kind) => {
    const slip = adjustmentSlip(kind);
    const status = ADJUSTMENT_STATUS_LABELS[slip.status] || slip.status;
    return `${kind === 'import' ? 'Phiếu nhập' : 'Phiếu xuất'} ${slip.code}${status ? ` (${status})` : ''}`;
  };

  const openAdjustmentSlip = (kind) => {
    const slip = adjustmentSlip(kind);
    if (slip.id) navigate(kind === 'import' ? `/import-slips/${slip.id}/edit` : `/export-slips/${slip.id}/edit`);
  };

  const handleCreateExportSlip = () => {
    if (formData.exportAdjustmentId) {
      openAdjustmentSlip('export');
      return;
    }
    const diffLackLines = lines.filter(l => !isSkippedDiff(l) && (Number(l.diffQty || 0) < 0
      || (l.serials || []).some(s => s.scanStatus === 'MISSING')));
    if (diffLackLines.length === 0) {
      showToast('warning', 'Không có sản phẩm nào bị thiếu/hỏng để lập phiếu xuất kho xử lý!');
      return;
    }
    navigate('/export-slips/create?type=OTHER', {
      state: {
        returnUrl: `/stocktakes/${id}`,
        stocktakeData: {
          id: id || formData.id,
          code: formData.code,
          warehouseId: formData.warehouseId === 'all' ? '' : formData.warehouseId,
          reason: `Phiếu xuất kho xử lý chênh lệch kiểm kê ${formData.code}`,
          lines: diffLackLines.map(l => {
            const rawSerials = l.serials || [];
            // Chỉ các serial báo thiếu. Không lấy dự phòng cả danh sách: trong đó có serial đã quét thấy (còn trong kho),
            // xuất chúng là trừ nhầm hàng còn. Không có serial thiếu thì để trống cho thủ kho chọn.
            const serialList = rawSerials
              .filter(s => s.scanStatus === 'MISSING')
              .map(s => (typeof s === 'string' ? s : s.serialNumber))
              .filter(Boolean);
            const missingSerials = serialList;
            return {
              variantId: l.variantId,
              sku: l.sku,
              productName: l.itemName,
              quantity: missingSerials.length || Math.abs(Number(l.diffQty)),
              serials: serialList,
              serialNumbers: serialList,
              note: `Hàng thiếu từ kiểm kê ${formData.code}`
            };
          })
        }
      }
    });
  };

  const handleCreateImportSlip = () => {
    if (formData.importAdjustmentId) {
      openAdjustmentSlip('import');
      return;
    }
    const diffSurplusLines = lines.filter(l => !isSkippedDiff(l) && (Number(l.diffQty || 0) > 0
      || (l.serials || []).some(s => s.scanStatus === 'UNEXPECTED')));
    if (diffSurplusLines.length === 0) {
      showToast('warning', 'Không có sản phẩm nào bị thừa để lập phiếu nhập kho điều chỉnh!');
      return;
    }
    navigate('/import-history/create?type=STOCKTAKE_ADD', {
      state: {
        returnUrl: `/stocktakes/${id}`,
        stocktakeData: {
          id: id || formData.id,
          code: formData.code,
          warehouseId: formData.warehouseId === 'all' ? '' : formData.warehouseId,
          reason: `Phiếu nhập kho điều chỉnh tăng tồn kho theo kiểm kê ${formData.code}`,
          lines: diffSurplusLines.map(l => {
            const rawSerials = l.serials || [];
            // Chỉ các serial báo thừa (không lấy cả danh sách: serial khớp sổ đã có trong kho, nhập lại là trùng).
            const serialList = rawSerials
              .filter(s => s.scanStatus === 'UNEXPECTED')
              .map(s => (typeof s === 'string' ? s : s.serialNumber))
              .filter(Boolean);
            const surplusSerials = serialList;
            return {
              variantId: l.variantId,
              sku: l.sku,
              productName: l.itemName,
              quantity: surplusSerials.length || Number(l.diffQty),
              serials: serialList,
              serialNumbers: serialList,
              note: `Hàng thừa từ kiểm kê ${formData.code}`
            };
          })
        }
      }
    });
  };

  const [viewingDoc, setViewingDoc] = useState(null);

  const handleViewExportSlip = async () => {
    if (!formData.referenceExportId) return;
    try {
      setLoadingStock(true);
      const res = await exportApi.getExportDetail(formData.referenceExportId);
      const detail = res?.data?.data || res?.data;
      if (detail) {
        setViewingDoc({ type: 'EXPORT', data: detail });
      }
    } catch (err) {
      showToast('error', 'Không thể tải thông tin phiếu xuất kho');
    } finally {
      setLoadingStock(false);
    }
  };

  const handleViewImportSlip = async () => {
    if (!formData.referenceImportId) return;
    try {
      setLoadingStock(true);
      const res = await importApi.getImportDetail(formData.referenceImportId);
      const detail = res?.data?.data || res?.data;
      if (detail) {
        setViewingDoc({ type: 'IMPORT', data: detail });
      }
    } catch (err) {
      showToast('error', 'Không thể tải thông tin phiếu nhập kho');
    } finally {
      setLoadingStock(false);
    }
  };

  const handlePrintDoc = () => {
    if (!viewingDoc?.data) return;
    const currentWarehouse = warehouses.find(w => String(w.id) === String(viewingDoc.data.warehouseId));
    if (viewingDoc.type === 'EXPORT') {
      printExportSlip(viewingDoc.data, {
        warehouseName: currentWarehouse?.name || `Kho #${viewingDoc.data.warehouseId}`,
      });
    } else {
      printImportSlip(viewingDoc.data, {
        warehouseName: currentWarehouse?.name || `Kho #${viewingDoc.data.warehouseId}`,
      });
    }
  };

  const totalBookQty = lines.reduce((acc, l) => acc + (Number(l.bookQty) || 0), 0);
  const totalCountQty = lines.reduce((acc, l) => acc + (Number(l.countQty) || 0), 0);
  const totalDiffQty = lines.reduce((acc, l) => acc + (Number(l.diffQty) || 0), 0);


  const participantsColumns = [
    { title: 'STT', width: '50px', align: 'center', render: (_, __, idx) => idx + 1 },
    { title: 'HỌ VÀ TÊN', render: (_, p, idx) => (
        <input type="text" value={p.name} disabled={isSaved} onChange={(e) => {
          const newP = [...participants]; newP[idx].name = e.target.value; setParticipants(newP);
        }} />
      )
    },
    { title: 'CHỨC DANH', render: (_, p, idx) => (
        <input type="text" value={p.title} disabled={isSaved} onChange={(e) => {
          const newP = [...participants]; newP[idx].title = e.target.value; setParticipants(newP);
        }} />
      )
    },
    { title: 'ĐẠI DIỆN', render: (_, p, idx) => (
        <input type="text" value={p.represent} disabled={isSaved} onChange={(e) => {
          const newP = [...participants]; newP[idx].represent = e.target.value; setParticipants(newP);
        }} />
      )
    }
  ];
  if (!isSaved) {
    participantsColumns.push({
      title: 'XÓA', width: '50px', align: 'center', render: (_, __, idx) => (
        <button type="button" style={{ border: 'none', background: 'none', color: 'var(--wms-danger)', cursor: 'pointer' }} onClick={() => setParticipants(participants.filter((___, i) => i !== idx))}>
          <i className="bi bi-trash"></i>
        </button>
      )
    });
  }

  const linesColumns = [
    { title: 'MÃ HÀNG', width: '8%', render: (_, line) => line.itemCode },
    { title: 'SKU', width: '10%', render: (_, line) => <span style={{ fontWeight: 600, color: 'var(--color-info-hover)' }}>{line.sku}</span> },
    { title: 'TÊN HÀNG HÓA', width: '20%', render: (_, line, idx) => (
        <span>
          {line.itemName}
          {/* Khi đang kiểm kê, nút quét ở cột THỰC TẾ là lối vào duy nhất - nhãn này chỉ để
              đánh dấu hàng theo serial. Phiếu đã lưu thì không còn nút đó nên nhãn mở modal xem. */}
          {line.trackSerial && (
            <span
              className={styles.serialBadge}
              style={isSaved ? { cursor: 'pointer' } : undefined}
              onClick={isSaved ? () => openSerialModal(idx) : undefined}
              title={isSaved ? 'Bấm để xem chi tiết Serial' : 'Hàng quản lý theo serial'}
            >
              <i className="bi bi-upc-scan"></i> Serial
            </span>
          )}
        </span>
      )
    },
    { title: 'ĐVT', width: '6%', render: (_, line) => line.unit },
    { title: 'SỔ SÁCH', align: 'center', render: (_, line) => <span className={styles.numberCol}>{line.bookQty}</span> },
    { title: 'THỰC TẾ', align: 'center', render: (_, line, idx) => (
        isSaved ? <span className={styles.numberCol}>{line.countQty}</span> : line.trackSerial ? (
          <span className={styles.countCell}>
            <span className={styles.countValue}>{line.countQty}</span>
            <button
              type="button"
              className={styles.btnScanSerialIcon}
              onClick={() => openSerialModal(idx)}
              title="Quét serial để đếm số thực tế"
              aria-label="Quét serial để đếm số thực tế"
            >
              <i className="bi bi-upc-scan"></i>
            </button>
          </span>
        ) : (
          <input type="number" min="0" step="1" style={{ fontWeight: 600, color: 'var(--wms-text-strong)', background: 'var(--wms-bg-soft)', border: '1px solid var(--wms-border-strong)', borderRadius: '3px', padding: '4px 6px', width: '100%', textAlign: 'center' }} value={line.countQty} onChange={(e) => handleCountQtyChange(idx, e.target.value)} />
        )
      )
    },
    { title: 'CHÊNH LỆCH', align: 'center', render: (_, line) => (
        <span className={styles.numberCol} style={{ fontWeight: 700, color: Number(line.diffQty) > 0 ? '#16a34a' : Number(line.diffQty) < 0 ? 'var(--wms-danger)' : 'var(--wms-text-muted)' }}>
          {Number(line.diffQty) > 0 ? `+${line.diffQty}` : line.diffQty}
        </span>
      )
    },

    { title: 'XỬ LÝ', width: '12%', render: (_, line, idx) => (
        isSaved ? line.action : (
          <SearchableSelect value={line.action} onChange={(e) => handleActionChange(idx, e.target.value)} style={{ border: '1px solid var(--wms-border-strong)', borderRadius: '3px', padding: '2px 4px', width: '100%' }}>
            <option value="Không xử lý">Không xử lý</option>
            <option value="Xử lý chênh lệch">Xử lý chênh lệch</option>
          </SearchableSelect>
        )
      )
    }
  ];
  // Lý do không xử lý chênh lệch: chỉ hiện ở dòng lệch được chọn "Không xử lý"
  linesColumns.push({
    title: 'LÝ DO KHÔNG XỬ LÝ', width: '16%', render: (_, line, idx) => (
      isSkippedDiff(line) ? (
        isSaved ? <span>{line.skipReason || ''}</span> : (
          <input
            type="text"
            maxLength={500}
            placeholder="Bắt buộc nhập lý do"
            value={line.skipReason || ''}
            onChange={(e) => handleSkipReasonChange(idx, e.target.value)}
            style={{ width: '100%', border: '1px solid var(--wms-border-strong)', borderRadius: '3px', padding: '2px 4px' }}
          />
        )
      ) : null
    )
  });

  if (!isSaved) {
    linesColumns.push({
      title: 'XÓA', width: '4%', align: 'center', render: (_, __, idx) => (
        <button type="button" style={{ border: 'none', background: 'none', color: 'var(--wms-danger)', cursor: 'pointer' }} onClick={() => handleRemoveLine(idx)} title="Xóa dòng">
          <i className="bi bi-trash"></i>
        </button>
      )
    });
  }

  const renderLinesSummaryDesktop = () => (
    <tr style={{ fontWeight: 700, backgroundColor: 'var(--wms-bg-hover)', borderTop: '2px solid var(--wms-border-strong)' }}>
      <td colSpan={4} style={{ textAlign: 'right' }}>TỔNG CỘNG:</td>
      <td className={styles.numberCol} style={{ textAlign: 'center' }}>{totalBookQty}</td>
      <td className={styles.numberCol} style={{ textAlign: 'center' }}>{totalCountQty}</td>
      <td className={styles.numberCol} style={{ textAlign: 'center', color: totalDiffQty > 0 ? '#16a34a' : totalDiffQty < 0 ? 'var(--wms-danger)' : 'inherit' }}>
        {totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty}
      </td>

      <td colSpan={isSaved ? 1 : 2}></td>
    </tr>
  );

  const renderLinesSummaryMobile = () => (
    <div style={{ marginTop: 12, padding: 12, borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>TỔNG CHÊNH LỆCH:</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: totalDiffQty > 0 ? '#16a34a' : totalDiffQty < 0 ? 'var(--wms-danger)' : 'inherit' }}>
          {totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty}
        </span>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className={styles.pageBody}>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={handleCancel} title="Quay lại">
            <i className="bi bi-arrow-left"></i>
            <h1 className={styles.pageTitle}>
              Chi tiết Bảng kiểm kê {formData.code}
            </h1>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isReadOnlyForStorekeeper && (
              <div className={styles.processedStamp} style={{ backgroundColor: 'var(--wms-bg-subtle)', borderColor: 'var(--wms-border-base)', color: 'var(--wms-text-muted)', fontSize: '12px', padding: '4px 8px' }}>
                <i className="bi bi-lock"></i> Kế toán tạo - Chỉ xem
              </div>
            )}
            {formData.isProcessed ? (
              <div className={styles.processedStamp}>Đã xử lý chênh lệch</div>
            ) : isPendingApproval ? (
              <div className={styles.processedStamp} style={{ backgroundColor: 'var(--color-warning)', borderColor: '#d97706' }}>Chờ duyệt</div>
            ) : isCounting ? (
              <div className={styles.processedStamp} style={{ backgroundColor: 'var(--color-warning)', borderColor: '#d97706' }}><i className="bi bi-lock-fill"></i> Đang kiểm kê - kho đang bị khóa</div>
            ) : stocktakeStatus === 'REJECTED' ? (
              <div className={styles.processedStamp} style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#b91c1c' }}>Bị từ chối</div>
            ) : stocktakeStatus === 'CANCELLED' ? (
              <div className={styles.processedStamp} style={{ backgroundColor: 'var(--wms-bg-subtle)', borderColor: 'var(--wms-border-base)', color: 'var(--wms-text-muted)' }}>Đã hủy</div>
            ) : (
              <div className={styles.processedStamp} style={{ backgroundColor: 'var(--color-warning)', borderColor: '#d97706' }}>Chờ xử lý chênh lệch</div>
            )}
          </div>
        </div>

        {stocktakeStatus === 'REJECTED' && (
          <div className={`${styles.noteBox} ${styles.noteDanger}`}>
            <b>Phiếu bị Manager từ chối.</b> {formData.rejectReason ? `Lý do: ${formData.rejectReason}` : ''}
          </div>
        )}
        {stocktakeStatus === 'DRAFT' && (
          <div className={`${styles.noteBox} ${styles.noteWarning}`}>
            Phiếu lưu tạm <b>chưa được gửi cho Manager</b>. Bấm "{isApprover ? 'Bắt đầu kiểm kê' : 'Gửi Manager duyệt'}" để {isApprover ? 'khóa kho và bắt đầu kiểm kê' : 'Manager nhận thông báo và duyệt'}.
          </div>
        )}
        {isPendingApproval && (
          <div className={`${styles.noteBox} ${styles.noteWarning}`}>
            Yêu cầu kiểm kê đang chờ quản lý duyệt. Kho chỉ bị khóa và thủ kho chỉ nhập được số đếm sau khi được duyệt.
          </div>
        )}
        {isCounting && formData.skippedDiffCount > 0 && (
          <div className={`${styles.noteBox} ${formData.waiverConfirmed ? styles.noteSuccess : styles.noteWarning}`}>
            {formData.waiverConfirmed
              ? `${formData.skippedDiffCount} dòng chênh lệch bỏ qua đã được Manager/Kế toán xác nhận.`
              : `${formData.skippedDiffCount} dòng chênh lệch chọn "Không xử lý" đang chờ Manager/Kế toán xác nhận (không lập phiếu điều chỉnh cho các dòng này).`}
          </div>
        )}
        {isCounting && (
          <div className={`${styles.noteBox} ${styles.noteInfo}`}>
            Kho đang được kiểm kê: không thể ghi sổ nhập/xuất/chuyển kho cho tới khi phiếu này hoàn thành hoặc bị hủy. Số sổ sách đã được chốt lúc duyệt.
          </div>
        )}

        <div className={styles.historyBox}>
          <div className={styles.historyTitle}>Lịch sử xử lý</div>
          <div className={styles.historyRow}>
            <span className={styles.historyLabel}>Tạo phiếu</span>
            <span>{formData.createdByName || '—'}{formData.createdAtRaw ? ` · ${formatDateTime(formData.createdAtRaw)}` : ''}</span>
          </div>
          {formData.approvedAt && (
            <div className={styles.historyRow}>
              <span className={styles.historyLabel}>{stocktakeStatus === 'REJECTED' ? 'Từ chối kiểm kê' : 'Duyệt kiểm kê (khóa kho)'}</span>
              <span>
                {formData.approvedByName || '—'} · {formatDateTime(formData.approvedAt)}
                {stocktakeStatus === 'REJECTED' && formData.rejectReason ? <span className={styles.historyReason}> — lý do: {formData.rejectReason}</span> : null}
              </span>
            </div>
          )}
          {formData.lastCountedByName && (
            <div className={styles.historyRow}>
              <span className={styles.historyLabel}>Người nhập số đếm gần nhất</span>
              <span>{formData.lastCountedByName}</span>
            </div>
          )}
          {formData.waiverConfirmedAt && formData.skippedDiffCount > 0 && (
            <div className={styles.historyRow}>
              <span className={styles.historyLabel}>Xác nhận bỏ qua chênh lệch</span>
              <span>{formData.waiverConfirmedByName || '—'} · {formatDateTime(formData.waiverConfirmedAt)} ({formData.skippedDiffCount} dòng)</span>
            </div>
          )}
        </div>

        {/* Master Data Section */}
        <div className={styles.masterForm}>
          <div className={styles.formGridLeft}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mục đích</label>
              <input type="text" className={styles.formInput} name="purpose" value={formData.purpose} onChange={handleChange} disabled={isSaved} />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kiểm kê kho</label>
                <SearchableSelect className={styles.formSelect} name="warehouseId" value={formData.warehouseId} onChange={handleChange} disabled={isSaved}>
                  <option value="all">Tất cả kho</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </SearchableSelect>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Đến ngày</label>
                <DateInput className={styles.formInput} name="toDate" value={formData.toDate} onChange={handleChange} disabled={isSaved} />
              </div>
            </div>
          </div>

          <div className={styles.formGridRight}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Số phiếu kiểm kê</label>
              <input type="text" className={styles.formInput} value={formData.code} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ngày kiểm kê</label>
              <input type="datetime-local" className={styles.formInput} name="createdDate" value={formData.createdDate} onChange={handleChange} disabled={isSaved} />
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div
          className={styles.sectionHeader}
          onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
        >
          <i className={isParticipantsExpanded ? "bi bi-caret-down-fill" : "bi bi-caret-right-fill"}></i> Thành viên tham gia kiểm kê ({participants.length})
        </div>

        {isParticipantsExpanded && (
            <div style={{ overflowX: 'auto', padding: '0 12px 12px' }}>
              <ResponsiveTable
                columns={participantsColumns}
                data={participants}
              />
              {!isSaved && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={() => setParticipants([...participants, { name: '', title: '', represent: '' }])}
                  >
                    <i className="bi bi-plus"></i> Thêm thành viên
                  </button>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={handleAddMeAsParticipant}
                  >
                    <i className="bi bi-person-plus"></i> Thêm tôi
                  </button>
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={() => setParticipants([])}
                  >
                    Xóa hết thành viên
                  </button>
                </div>
              )}
            </div>
        )}

        {/* Details Section */}
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, color: 'var(--wms-text-body)', fontSize: '15px' }}>
              Chi tiết Vật tư, hàng hóa kiểm kê
            </div>
          </div>

          {!isSaved && (
            <div className={styles.detailToolbar} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div className={styles.toolbarActions} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                />
                <button className={styles.btnOutline} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                  <i className="bi bi-upload"></i> Nhập từ Excel
                </button>
                <button className={styles.btnOutline} onClick={handleExportExcel} disabled={lines.length === 0}>
                  <i className="bi bi-download"></i> Tải danh sách VTHH
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto', padding: '0 12px 12px' }}>
            <ResponsiveTable
              columns={linesColumns}
              data={lines}
              emptyMessage="Không có dòng kiểm kê nào"
              summaryRow={renderLinesSummaryDesktop()}
              summaryMobile={renderLinesSummaryMobile()}
            />
          </div>
        </div>

        {/* Conclusion Section */}
        <div className={styles.conclusionSection}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kết luận kiểm kê</label>
            <textarea
              className={styles.textareaControl}
              name="conclusion"
              value={formData.conclusion}
              onChange={handleChange}
              disabled={isSaved}
            />
          </div>
        </div>

      </div>

      {/* Fixed Footer */}
      {isSaved ? (
        <div className={styles.pageFooterView}>
          <div className={styles.footerViewLeft}>
            <button className={styles.btnViewIcon} onClick={handleCancel} title="Quay lại danh sách"><i className="bi bi-arrow-left"></i></button>
            {formData.isProcessed ? (
              <>
                {formData.referenceExportId && (
                  <button className={styles.btnViewOutline} onClick={handleViewExportSlip}>
                    <i className="bi bi-box-arrow-up"></i> Xem phiếu xuất
                  </button>
                )}
                {formData.referenceImportId && (
                  <button className={styles.btnViewOutline} onClick={handleViewImportSlip}>
                    <i className="bi bi-box-arrow-in-down"></i> Xem phiếu nhập
                  </button>
                )}
              </>
            ) : (
              <>
                {canSubmitDraft && (
                  <button className={styles.btnViewPrimary} style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }} onClick={handleSubmitStocktake}>
                    <i className="bi bi-send"></i> {isApprover ? 'Bắt đầu kiểm kê' : 'Gửi Manager duyệt'}
                  </button>
                )}
                {isPendingApproval && isApprover && (
                  <>
                    <button className={styles.btnViewPrimary} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }} onClick={handleApproveStocktake}>
                      <i className="bi bi-check-lg"></i> Đồng ý kiểm kê
                    </button>
                    <button className={styles.btnViewOutline} onClick={handleRejectStocktake}>
                      <i className="bi bi-x-lg"></i> Từ chối
                    </button>
                  </>
                )}
                {canCancelStocktake && (
                  <button className={styles.btnViewOutline} onClick={handleCancelStocktake}>
                    <i className="bi bi-slash-circle"></i> {isCounting ? 'Hủy kiểm kê (mở khóa kho)' : 'Hủy yêu cầu'}
                  </button>
                )}
                {isCounting && !canWorkOnCounts && isAccountantOrAdmin && (
                  <button className={styles.btnViewPrimary} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleFinishClick}>
                    <i className="bi bi-check2-all"></i> Hoàn thành kiểm kê
                  </button>
                )}
                {canWorkOnCounts && !isReadOnlyForStorekeeper && (
                  <>
                    <button className={styles.btnViewPrimary} onClick={() => setIsSaved(false)}>
                      <i className="bi bi-pencil"></i> Sửa
                    </button>
                    {formData.exportAdjustmentId ? (
                      <button className={styles.btnViewOutline} onClick={() => openAdjustmentSlip('export')} title="Lần kiểm kê này đã có phiếu xuất điều chỉnh - mở phiếu đó">
                        <i className="bi bi-box-arrow-up"></i> {adjustmentSlipLabel('export')}
                      </button>
                    ) : lines.some(l => !isSkippedDiff(l) && (Number(l.diffQty || 0) < 0
                      || (l.serials || []).some(s => s.scanStatus === 'MISSING'))) && (
                      <button className={styles.btnViewOutline} onClick={handleCreateExportSlip} title="Tạo phiếu xuất kho cho hàng thiếu/hỏng">
                        <i className="bi bi-box-arrow-up"></i> Lập phiếu xuất
                      </button>
                    )}
                    {formData.importAdjustmentId ? (
                      <button className={styles.btnViewOutline} onClick={() => openAdjustmentSlip('import')} title="Lần kiểm kê này đã có phiếu nhập điều chỉnh - mở phiếu đó">
                        <i className="bi bi-box-arrow-in-down"></i> {adjustmentSlipLabel('import')}
                      </button>
                    ) : lines.some(l => !isSkippedDiff(l) && (Number(l.diffQty || 0) > 0
                      || (l.serials || []).some(s => s.scanStatus === 'UNEXPECTED'))) && (
                      <button className={styles.btnViewOutline} onClick={handleCreateImportSlip} title="Tạo phiếu nhập kho cho hàng thừa">
                        <i className="bi bi-box-arrow-in-down"></i> Lập phiếu nhập
                      </button>
                    )}
                    {(
                      <button className={styles.btnViewPrimary} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleFinishClick}>
                        <i className="bi bi-check2-all"></i> Hoàn thành kiểm kê
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <div className={styles.footerViewRight}>
            <button className={styles.btnViewText} onClick={handlePrint}>
              <i className="bi bi-printer"></i> In bảng kiểm kê
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.pageFooter}>
          <div className={styles.footerLeft}>
            <button className={`${styles.btnFooter} ${styles.btnFooterCancel}`} onClick={handleCancel}>Hủy bỏ</button>
          </div>
          <div className={styles.footerRight}>
            <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} onClick={handleSave}>
              <i className="bi bi-check-circle"></i> Lưu lại
            </button>
            <button className={`${styles.btnFooter} ${styles.btnFooterPost}`} onClick={handleSaveAndClose}>
              <i className="bi bi-box-arrow-right"></i> Lưu và Đóng
            </button>
            {(
              <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleFinishClick}>
                <i className="bi bi-check2-all"></i> Hoàn thành kiểm kê
              </button>
            )}
          </div>
        </div>
      )}

      {/* View-Only Modal for Export / Import Slips */}
      {viewingDoc && (
        <Modal
          isOpen={Boolean(viewingDoc)}
          onClose={() => setViewingDoc(null)}
          dialogStyle={{ maxWidth: '900px', width: '95%', padding: '0', borderRadius: '8px', overflow: 'hidden' }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--wms-border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--wms-bg-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className={`bi ${viewingDoc.type === 'EXPORT' ? 'bi-box-arrow-up' : 'bi-box-arrow-in-down'}`} style={{ fontSize: '20px', color: '#0070cc' }}></i>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--wms-text-title)' }}>
                {viewingDoc.type === 'EXPORT' ? 'Chi tiết phiếu xuất kho xử lý kiểm kê' : 'Chi tiết phiếu nhập kho xử lý kiểm kê'}: {viewingDoc.data.docCode}
              </h3>
              <span className={`${styles.badge} ${viewingDoc.data.status === 'POSTED' ? styles.badgeSuccess : styles.badgeInfo}`}>
                {viewingDoc.data.status === 'POSTED' ? 'Ghi sổ' : 'Lưu tạm'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handlePrintDoc}
                style={{ padding: '6px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}
              >
                <i className="bi bi-printer"></i> In phiếu
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--wms-text-muted)', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
          </div>

          <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Summary info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--wms-bg-soft)', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid var(--wms-bg-hover)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Ngày chứng từ</span>
                <strong style={{ fontSize: '14px', color: 'var(--wms-text-title)' }}>{formatDateOnly(viewingDoc.data.docDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Kho hàng</span>
                <strong style={{ fontSize: '14px', color: '#0070cc' }}>
                  {warehouses.find(w => String(w.id) === String(viewingDoc.data.warehouseId))?.name || `Kho #${viewingDoc.data.warehouseId}`}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Loại phiếu</span>
                <strong style={{ fontSize: '14px', color: 'var(--wms-text-title)' }}>
                  {viewingDoc.type === 'EXPORT' ? 'Xuất điều chỉnh kiểm kê' : 'Nhập điều chỉnh kiểm kê'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Tham chiếu kiểm kê</span>
                <strong style={{ fontSize: '14px', color: '#16a34a' }}>
                  {viewingDoc.data.referenceCode || formData.code}
                </strong>
              </div>
              {viewingDoc.data.salespersonName && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Người thực hiện</span>
                  <strong style={{ fontSize: '14px', color: 'var(--wms-text-title)' }}>{viewingDoc.data.salespersonName}</strong>
                </div>
              )}
              {viewingDoc.data.note && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '12px', color: 'var(--wms-text-muted)', display: 'block' }}>Ghi chú</span>
                  <span style={{ fontSize: '13px', color: 'var(--wms-text-body)' }}>{viewingDoc.data.note}</span>
                </div>
              )}
            </div>

            {/* Line items table */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', color: 'var(--wms-text-strong)' }}>
              Danh sách hàng hóa ({viewingDoc.data.lines?.length || 0})
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--wms-bg-hover)', color: 'var(--wms-text-muted)', textAlign: 'left', borderBottom: '2px solid var(--wms-border-strong)' }}>
                  <th style={{ padding: '8px 12px', width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 12px', width: '140px' }}>Mã SKU</th>
                  <th style={{ padding: '8px 12px' }}>Tên hàng hóa</th>
                  <th style={{ padding: '8px 12px', width: '100px', textAlign: 'right' }}>Số lượng</th>
                  <th style={{ padding: '8px 12px', width: '220px' }}>Danh sách Serial</th>
                </tr>
              </thead>
              <tbody>
                {(viewingDoc.data.lines || []).map((line, idx) => {
                  const qty = viewingDoc.type === 'EXPORT' ? (line.quantityOut || line.quantity) : (line.quantityIn || line.quantity);
                  const matchedStocktakeLine = lines.find(sl => String(sl.variantId) === String(line.variantId));
                  return (
                    <tr key={line.id || idx} style={{ borderBottom: '1px solid var(--wms-border-base)' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '500', color: '#0070cc' }}>
                        {line.sku || matchedStocktakeLine?.sku || `SKU #${line.variantId}`}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                        {line.productName || matchedStocktakeLine?.itemName || 'Sản phẩm'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: 'var(--wms-text-title)' }}>
                        {Number(qty || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--wms-text-muted)' }}>
                        {line.serialNumbers && line.serialNumbers.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {line.serialNumbers.map((s, si) => (
                              <span key={si} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--wms-text-subtle)', fontStyle: 'italic' }}>Không có serial</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total summary */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '14px' }}>
              <div>
                <span style={{ color: 'var(--wms-text-muted)' }}>Tổng số lượng: </span>
                <strong style={{ color: '#0070cc', fontSize: '16px' }}>
                  {(viewingDoc.data.lines || []).reduce((sum, l) => sum + Number((viewingDoc.type === 'EXPORT' ? l.quantityOut : l.quantityIn) || l.quantity || 0), 0).toLocaleString('vi-VN')}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--wms-border-base)', background: 'var(--wms-bg-soft)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setViewingDoc(null)}
              style={{ padding: '8px 20px', background: 'var(--wms-border-base)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: 'var(--wms-text-body)' }}
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {serialModal.isOpen && (() => {
        const scannedSet = new Set(serialModal.scannedList.map(s => s.serialNumber.toLowerCase()));
        const missingList = serialModal.systemSerials
          .filter(sys => !scannedSet.has(sys.serialNumber.toLowerCase()))
          .map(sys => ({
            serialNumberId: sys.id,
            serialNumber: sys.serialNumber,
            scanStatus: 'MISSING'
          }));

        const combinedSerials = [...serialModal.scannedList, ...missingList];
        const matchedCount = serialModal.scannedList.filter(s => s.scanStatus === 'MATCHED').length;
        const missingCount = missingList.length;
        const unexpectedCount = serialModal.scannedList.filter(s => s.scanStatus === 'UNEXPECTED').length;

        const displaySerials = combinedSerials.filter(s => {
          if (serialModal.filterTab === 'MATCHED') return s.scanStatus === 'MATCHED';
          if (serialModal.filterTab === 'MISSING') return s.scanStatus === 'MISSING';
          if (serialModal.filterTab === 'UNEXPECTED') return s.scanStatus === 'UNEXPECTED';
          return true;
        });

        return (
          <div className={styles.modalOverlay}>
            <div className={styles.serialModalCard}>
              <div className={styles.modalHeader}>
                <h3>
                  <i className="bi bi-upc-scan" style={{ marginRight: '8px', color: 'var(--color-info-hover)' }}></i>
                  Kiểm kê Serial - {lines[serialModal.lineIndex]?.itemName} (SKU: {lines[serialModal.lineIndex]?.sku})
                </h3>
                <button className={styles.modalCloseBtn} onClick={() => setSerialModal({ ...serialModal, isOpen: false })}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <div className={styles.modalBody}>
                {!isSaved && (
                  <form onSubmit={handleScanSerialSubmit} className={styles.scanInputRow}>
                    <input
                      type="text"
                      className={styles.scanInput}
                      placeholder="Quét mã vạch hoặc nhập mã Serial rồi nhấn Enter..."
                      value={serialModal.scanInput}
                      onChange={(e) => setSerialModal({ ...serialModal, scanInput: e.target.value })}
                      autoFocus
                    />
                    <button type="submit" className={styles.btnScanSerial} style={{ padding: '0 20px', fontSize: '14px' }}>
                      <i className="bi bi-plus-circle"></i> Thêm Serial
                    </button>
                  </form>
                )}

                <div className={styles.badgeRow}>
                  <div
                    className={`${styles.badgeStat} ${styles.badgeBook} ${serialModal.filterTab === 'ALL' ? styles.badgeActive : ''}`}
                    onClick={() => setSerialModal(prev => ({ ...prev, filterTab: 'ALL' }))}
                    title="Bấm để xem tất cả Serial"
                  >
                    Tất cả ({combinedSerials.length})
                  </div>
                  <div
                    className={`${styles.badgeStat} ${styles.badgeMatch} ${serialModal.filterTab === 'MATCHED' ? styles.badgeActive : ''}`}
                    onClick={() => setSerialModal(prev => ({ ...prev, filterTab: 'MATCHED' }))}
                    title="Bấm để chỉ xem Serial Khớp"
                  >
                    Khớp ({matchedCount})
                  </div>
                  <div
                    className={`${styles.badgeStat} ${styles.badgeMissing} ${serialModal.filterTab === 'MISSING' ? styles.badgeActive : ''}`}
                    onClick={() => setSerialModal(prev => ({ ...prev, filterTab: 'MISSING' }))}
                    title="Bấm để chỉ xem Serial Thiếu"
                  >
                    Thiếu ({missingCount})
                  </div>
                  <div
                    className={`${styles.badgeStat} ${styles.badgeUnexpected} ${serialModal.filterTab === 'UNEXPECTED' ? styles.badgeActive : ''}`}
                    onClick={() => setSerialModal(prev => ({ ...prev, filterTab: 'UNEXPECTED' }))}
                    title="Bấm để chỉ xem Serial Thừa/Lạ"
                  >
                    Thừa / Lạ ({unexpectedCount})
                  </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--wms-border-base)', borderRadius: '4px' }}>
                  <table className={styles.table} style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '10%', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '50%' }}>MÃ SERIAL</th>
                        <th style={{ width: '30%', textAlign: 'center' }}>TRẠNG THÁI</th>
                        <th style={{ width: '10%', textAlign: 'center' }}>XÓA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displaySerials.map((s, sIdx) => (
                        <tr key={sIdx}>
                          <td style={{ textAlign: 'center' }}>{sIdx + 1}</td>
                          <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{s.serialNumber}</td>
                          <td style={{ textAlign: 'center' }}>
                            {s.scanStatus === 'MATCHED' && <span style={{ color: '#16a34a', fontWeight: 600 }}><i className="bi bi-check-circle-fill"></i> Khớp</span>}
                            {s.scanStatus === 'MISSING' && <span style={{ color: 'var(--wms-danger)', fontWeight: 600 }}><i className="bi bi-x-circle-fill"></i> Thiếu (Chưa quét)</span>}
                            {s.scanStatus === 'UNEXPECTED' && <span style={{ color: '#d97706', fontWeight: 600 }}><i className="bi bi-exclamation-triangle-fill"></i> Thừa / Lạ</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {s.scanStatus !== 'MISSING' && !isSaved && (
                              <button
                                type="button"
                                style={{ border: 'none', background: 'none', color: 'var(--wms-danger)', cursor: 'pointer' }}
                                onClick={() => handleRemoveScannedSerial(s.serialNumber)}
                                title="Hủy quét Serial này"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {displaySerials.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--wms-text-muted)' }}>
                            Không có Serial nào thuộc mục đã chọn.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnOutline} onClick={() => setSerialModal({ ...serialModal, isOpen: false })}>
                  {isSaved ? 'Đóng' : 'Hủy'}
                </button>
                {!isSaved && (
                  <button type="button" className={styles.btnScanSerial} onClick={handleSaveSerialModal}>
                    Xác nhận kết quả đếm ({serialModal.scannedList.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      {showFinishModal && (() => {
        const diffLines = lines.filter(l => Number(l.diffQty || 0) !== 0);
        const skippedLines = diffLines.filter(isSkippedDiff);
        const adjustLines = diffLines.filter(l => !isSkippedDiff(l));
        const matchedCount = lines.length - diffLines.length;
        const importPending = formData.needsImportAdjustment && !formData.importAdjustmentPosted;
        const exportPending = formData.needsExportAdjustment && !formData.exportAdjustmentPosted;
        const isSuperAdminUser = userRoles.some(r => r.includes('SUPER_ADMIN'));
        const iCountedLast = !isSuperAdminUser && String(formData.lastCountedBy || '') === String(getAuthUserId() || '');
        const canConfirmNow = isAccountantOrAdmin && !iCountedLast;
        const waitingConfirm = skippedLines.length > 0 && !formData.waiverConfirmed;
        const participantCount = participants.filter(p => (p.name || '').trim()).length;
        // Tên hàng hóa đôi khi là "X (X)" (tên sản phẩm lặp lại tên biến thể): chỉ hiện một lần
        const shortName = (name) => String(name || '').replace(/^(.*) \(\1\)$/, '$1');
        const close = () => setShowFinishModal(false);
        const note = (kind, content) => <div className={`${styles.noteBox} ${styles.finishNote} ${styles[kind]}`}>{content}</div>;
        const actions = (...buttons) => <div className={styles.finishActions}>{buttons}</div>;
        const btnClose = <button key="close" type="button" className={`${styles.btnOutline} ${styles.btnFinishOutline}`} onClick={close}>Đóng</button>;
        const btnPrimary = (label, onClick) => <button key={label} type="button" className={styles.btnFinishPrimary} onClick={onClick}>{label}</button>;
        const btnSecondary = (label, onClick) => <button key={label} type="button" className={`${styles.btnOutline} ${styles.btnFinishOutline}`} onClick={onClick}>{label}</button>;
        const completeAction = () => finishWith(() => stocktakeApi.postStocktake(id), 'Đã hoàn thành kiểm kê, kho được mở khóa');

        let body;
        if (participantCount < 1) {
          body = (
            <>
              {note('noteWarning', <>Chưa có <b>thành viên tham gia kiểm kê</b>. Cần ghi nhận ít nhất 1 thành viên (họ tên) để lập biên bản trước khi hoàn thành.</>)}
              {actions(btnClose, canEditStocktake && btnPrimary('Thêm thành viên', () => {
                close();
                setIsParticipantsExpanded(true);
                setIsSaved(false);
                if (participants.length === 0) setParticipants([{ name: '', title: '', represent: '' }]);
              }))}
            </>
          );
        } else if (diffLines.length === 0) {
          body = (
            <>
              {note('noteSuccess', <>Tất cả {lines.length} dòng đều khớp sổ sách. Không cần phiếu điều chỉnh.</>)}
              {actions(btnClose, btnPrimary('Hoàn thành kiểm kê', completeAction))}
            </>
          );
        } else if (importPending || exportPending) {
          body = (
            <>
              {note('noteDanger', (
                <>
                  <b>Chưa thể hoàn thành:</b> còn {adjustLines.length} dòng lệch cần xử lý. Chọn một trong hai cách cho từng dòng:
                  <ul style={{ margin: '6px 0 0 18px' }}>
                    <li>Lập phiếu {importPending && exportPending ? 'nhập/xuất' : importPending ? 'nhập' : 'xuất'} điều chỉnh và <b>ghi sổ</b> phiếu đó, hoặc</li>
                    <li>Bấm Đóng → Sửa → đổi cột "Xử lý" sang <b>"Không xử lý"</b> và nhập lý do (cần Manager/Kế toán khác xác nhận).</li>
                  </ul>
                </>
              ))}
              {actions(
                btnClose,
                importPending && btnSecondary(
                  formData.importAdjustmentId ? `Mở ${adjustmentSlipLabel('import')}` : 'Lập phiếu nhập',
                  () => { close(); handleCreateImportSlip(); }),
                exportPending && btnSecondary(
                  formData.exportAdjustmentId ? `Mở ${adjustmentSlipLabel('export')}` : 'Lập phiếu xuất',
                  () => { close(); handleCreateExportSlip(); })
              )}
            </>
          );
        } else if (waitingConfirm && stocktakeStatus !== 'COUNTING') {
          body = (
            <>
              {note('noteWarning', <>Phiếu chưa được duyệt kiểm kê. Hãy bấm "Gửi Manager duyệt" trước khi hoàn thành.</>)}
              {actions(btnClose)}
            </>
          );
        } else if (waitingConfirm && canConfirmNow) {
          body = (
            <>
              {note('noteInfo', <>Bạn đang <b>xác nhận bỏ qua {skippedLines.length} dòng chênh lệch</b> ở trên (không lập phiếu điều chỉnh, số sổ sách giữ nguyên). Lý do đã được ghi lại kèm tên bạn.</>)}
              {actions(btnClose, btnPrimary('Xác nhận bỏ qua & Hoàn thành', () => finishWith(() => stocktakeApi.confirmWaivers(id), 'Đã xác nhận bỏ qua chênh lệch')))}
            </>
          );
        } else if (waitingConfirm) {
          body = (
            <>
              {note('noteWarning', (
                <>
                  {iCountedLast
                    ? 'Bạn là người vừa nhập số đếm / chọn "Không xử lý" nên không tự xác nhận được. '
                    : 'Cần người có thẩm quyền xác nhận. '}
                  Gửi yêu cầu để <b>Manager hoặc Kế toán khác</b> xem lý do và xác nhận.
                </>
              ))}
              {actions(btnClose, btnPrimary('Gửi yêu cầu xác nhận', () => finishWith(() => stocktakeApi.requestWaiverConfirmation(id), 'Đã gửi yêu cầu xác nhận tới Manager và Kế toán')))}
            </>
          );
        } else {
          body = (
            <>
              {note('noteSuccess', <>Mọi dòng lệch đã được xử lý{skippedLines.length > 0 ? ' (các dòng bỏ qua đã được xác nhận)' : ''}. Sẵn sàng hoàn thành.</>)}
              {actions(btnClose, btnPrimary('Hoàn thành kiểm kê', completeAction))}
            </>
          );
        }

        return (
          <Modal
            isOpen
            onClose={close}
            dialogStyle={{ maxWidth: '820px', width: '95%', padding: '20px 24px', borderRadius: '8px' }}
          >
            <h3 className={styles.finishTitle}>Kết thúc kiểm kê {formData.code}</h3>
            <div className={styles.finishSub}>
              {lines.length} dòng: {matchedCount} khớp, {diffLines.length} lệch
              {skippedLines.length > 0 ? ` (${skippedLines.length} dòng chọn "Không xử lý")` : ''}
              {` · ${participantCount} thành viên tham gia`}
            </div>
            {diffLines.length > 0 && (
              <div className={styles.finishTableWrap}>
                <table className={styles.finishTable}>
                  <thead>
                    <tr>
                      <th>Hàng hóa</th>
                      <th className={styles.finishNum}>Sổ</th>
                      <th className={styles.finishNum}>Thực tế</th>
                      <th className={styles.finishNum}>Lệch</th>
                      <th>Cách xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffLines.map(l => (
                      <tr key={l.id || l.variantId}>
                        <td className={styles.finishName}>{l.sku} - {shortName(l.itemName)}</td>
                        <td className={styles.finishNum}>{l.bookQty}</td>
                        <td className={styles.finishNum}>{l.countQty}</td>
                        <td className={`${styles.finishNum} ${Number(l.diffQty) > 0 ? styles.finishDiffPlus : styles.finishDiffMinus}`}>
                          {Number(l.diffQty) > 0 ? `+${l.diffQty}` : l.diffQty}
                        </td>
                        <td className={styles.finishHandling}>
                          {isSkippedDiff(l)
                            ? <span><b>Không xử lý</b> - lý do: {l.skipReason || '(chưa nhập)'}{formData.waiverConfirmed ? ' ✓ đã xác nhận' : ''}</span>
                            : <span>Lập phiếu {Number(l.diffQty) > 0 ? 'nhập' : 'xuất'} điều chỉnh</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {body}
          </Modal>
        );
      })()}
    </AdminLayout>
  );
}

export default StocktakeDetailPage;
