import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as importApi from '../../api/inventoryImportApi';
import * as XLSX from 'xlsx';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import { printStocktakeReport } from '../../utils/printStocktakeReport';
import { printExportSlip } from '../../utils/printExportSlip';
import { printImportSlip } from '../../utils/printImportSlip';
import { getTodayIsoDate, getCurrentDateTimeInput, toDateTimeInputValue, formatDateOnly } from '../../utils/dateFormat';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


function StocktakeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

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

  const [isSaved, setIsSaved] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
  };

  const [lines, setLines] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [participants, setParticipants] = useState([
    { name: 'Nguyễn Văn A', title: 'Thủ kho', represent: 'Kho chính' }
  ]);

  const fetchStocktakeData = async () => {
    try {
      setLoadingStock(true);
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
          referenceExportId: data.referenceExportId
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
      setLoadingStock(false);
    }
  };

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
    const countVal = value === '' ? '' : Number(value);
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

  const handleActionChange = (index, actionVal) => {
    setLines(prev => prev.map((line, idx) => (idx === index ? { ...line, action: actionVal } : line)));
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleExportExcel = () => {
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
      onError: (msg) => showToast('error', msg)
    });
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
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
    navigate('/stocktakes');
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
      action: l.action
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
      navigate('/stocktakes', { state: { toastMessage: 'Cập nhật bảng kiểm kê thành công!', toastType: 'success' } });
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Cập nhật thất bại');
    }
  };

  const handleComplete = () => {
    setShowConfirmModal(true);
  };

  const confirmComplete = async () => {
    setShowConfirmModal(false);
    try {
      const payload = buildPayload();
      if (!validateForm(payload)) return;
      // Lưu lại thay đổi trước khi xử lý
      await stocktakeApi.updateStocktake(id, payload);
      // Gọi API xử lý đổi trạng thái
      await stocktakeApi.postStocktake(id);
      showToast('success', 'Xử lý phiếu kiểm kê thành công!');
      // Tải lại dữ liệu (chuyển sang chế độ view)
      fetchStocktakeData();
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Xử lý thất bại');
    }
  };

  const handleCreateExportSlip = () => {
    const diffLackLines = lines.filter(l => Number(l.diffQty || 0) < 0);
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
            const missingSerials = rawSerials
              .filter(s => s.scanStatus === 'MISSING' || !s.scanStatus)
              .map(s => (typeof s === 'string' ? s : s.serialNumber))
              .filter(Boolean);
            const serialList = missingSerials.length > 0 ? missingSerials : rawSerials.map(s => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean);
            return {
              variantId: l.variantId,
              sku: l.sku,
              productName: l.itemName,
              quantity: Math.abs(Number(l.diffQty)),
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
    const diffSurplusLines = lines.filter(l => Number(l.diffQty || 0) > 0);
    if (diffSurplusLines.length === 0) {
      showToast('warning', 'Không có sản phẩm nào bị thừa để lập phiếu nhập kho điều chỉnh!');
      return;
    }
    navigate('/import-history/create?type=OTHER', {
      state: {
        returnUrl: `/stocktakes/${id}`,
        stocktakeData: {
          id: id || formData.id,
          code: formData.code,
          warehouseId: formData.warehouseId === 'all' ? '' : formData.warehouseId,
          reason: `Phiếu nhập kho điều chỉnh tăng tồn kho theo kiểm kê ${formData.code}`,
          lines: diffSurplusLines.map(l => {
            const rawSerials = l.serials || [];
            const surplusSerials = rawSerials
              .filter(s => s.scanStatus === 'UNEXPECTED' || !s.scanStatus)
              .map(s => (typeof s === 'string' ? s : s.serialNumber))
              .filter(Boolean);
            const serialList = surplusSerials.length > 0 ? surplusSerials : rawSerials.map(s => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean);
            return {
              variantId: l.variantId,
              sku: l.sku,
              productName: l.itemName,
              quantity: Number(l.diffQty),
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
  const totalGood100 = lines.reduce((acc, l) => acc + (Number(l.good100) || 0), 0);
  const totalBad = lines.reduce((acc, l) => acc + (Number(l.bad) || 0), 0);
  const totalLost = lines.reduce((acc, l) => acc + (Number(l.lost) || 0), 0);

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
          {formData.isProcessed ? (
            <div className={styles.processedStamp}>Đã xử lý chênh lệch</div>
          ) : (
            <div className={styles.processedStamp} style={{ backgroundColor: '#f59e0b', borderColor: '#d97706' }}>Chờ xử lý chênh lệch</div>
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
                <input type="date" className={styles.formInput} name="toDate" value={formData.toDate} onChange={handleChange} disabled={isSaved} />
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
          <div className={styles.participantsSection}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '30%' }}>HỌ VÀ TÊN</th>
                    <th style={{ width: '30%' }}>CHỨC DANH</th>
                    <th style={{ width: '30%' }}>ĐẠI DIỆN</th>
                    {!isSaved && <th style={{ width: '5%', textAlign: 'center' }}>XÓA</th>}
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={p.name}
                          disabled={isSaved}
                          onChange={(e) => {
                            const newP = [...participants];
                            newP[idx].name = e.target.value;
                            setParticipants(newP);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={p.title}
                          disabled={isSaved}
                          onChange={(e) => {
                            const newP = [...participants];
                            newP[idx].title = e.target.value;
                            setParticipants(newP);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={p.represent}
                          disabled={isSaved}
                          onChange={(e) => {
                            const newP = [...participants];
                            newP[idx].represent = e.target.value;
                            setParticipants(newP);
                          }}
                        />
                      </td>
                      {!isSaved && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => setParticipants(participants.filter((_, i) => i !== idx))}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Section */}
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>
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

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '8%' }}>MÃ HÀNG</th>
                  <th rowSpan={2} style={{ width: '10%' }}>SKU</th>
                  <th rowSpan={2} style={{ width: '20%' }}>TÊN HÀNG HÓA</th>
                  <th rowSpan={2} style={{ width: '6%' }}>ĐVT</th>
                  <th colSpan={3}>SỐ LƯỢNG KHO</th>
                  <th colSpan={3}>PHẨM CHẤT THỰC TẾ</th>
                  <th rowSpan={2} style={{ width: '12%' }}>XỬ LÝ</th>
                  {!isSaved && <th rowSpan={2} style={{ width: '4%', textAlign: 'center' }}>XÓA</th>}
                </tr>
                <tr>
                  <th>SỔ SÁCH</th>
                  <th>KIỂM KÊ THỰC TẾ</th>
                  <th>CHÊNH LỆCH</th>
                  <th>TỐT 100%</th>
                  <th>KÉM CẤP</th>
                  <th>HỎNG/MẤT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td>{line.itemCode}</td>
                    <td style={{ fontWeight: 600, color: '#0284c7' }}>{line.sku}</td>
                    <td>{line.itemName}</td>
                    <td>{line.unit}</td>
                    <td className={styles.numberCol}>{line.bookQty}</td>
                    <td className={styles.numberCol}>
                      {isSaved ? (
                        line.countQty
                      ) : (
                        <input
                          type="number"
                          style={{
                            fontWeight: 600,
                            color: '#1e293b',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '3px',
                            padding: '4px 6px'
                          }}
                          value={line.countQty}
                          onChange={(e) => handleCountQtyChange(idx, e.target.value)}
                        />
                      )}
                    </td>
                    <td className={styles.numberCol} style={{
                      fontWeight: 700,
                      color: Number(line.diffQty) > 0 ? '#16a34a' : Number(line.diffQty) < 0 ? '#dc2626' : '#64748b'
                    }}>
                      {Number(line.diffQty) > 0 ? `+${line.diffQty}` : line.diffQty}
                    </td>
                    <td className={styles.numberCol}>
                      {isSaved ? line.good100 : (
                        <input
                          type="number"
                          value={line.good100}
                          onChange={(e) => handleQualityChange(idx, 'good100', e.target.value)}
                        />
                      )}
                    </td>
                    <td className={styles.numberCol}>
                      {isSaved ? line.bad : (
                        <input
                          type="number"
                          value={line.bad}
                          onChange={(e) => handleQualityChange(idx, 'bad', e.target.value)}
                        />
                      )}
                    </td>
                    <td className={styles.numberCol}>
                      {isSaved ? line.lost : (
                        <input
                          type="number"
                          value={line.lost}
                          onChange={(e) => handleQualityChange(idx, 'lost', e.target.value)}
                        />
                      )}
                    </td>
                    <td>
                      {isSaved ? line.action : (
                        <SearchableSelect
                          value={line.action}
                          onChange={(e) => handleActionChange(idx, e.target.value)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '2px 4px' }}
                        >
                          <option value="Không xử lý">Không xử lý</option>
                          <option value="Xử lý chênh lệch">Xử lý chênh lệch</option>
                        </SearchableSelect>
                      )}
                    </td>
                    {!isSaved && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => handleRemoveLine(idx)}
                          title="Xóa dòng"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {/* Summary Row */}
                <tr style={{ fontWeight: 700, backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>TỔNG CỘNG:</td>
                  <td className={styles.numberCol}>{totalBookQty}</td>
                  <td className={styles.numberCol}>{totalCountQty}</td>
                  <td className={styles.numberCol} style={{ color: totalDiffQty > 0 ? '#16a34a' : totalDiffQty < 0 ? '#dc2626' : 'inherit' }}>
                    {totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty}
                  </td>
                  <td className={styles.numberCol}>{totalGood100}</td>
                  <td className={styles.numberCol}>{totalBad}</td>
                  <td className={styles.numberCol}>{totalLost}</td>
                  <td colSpan={isSaved ? 1 : 2}></td>
                </tr>
              </tbody>
            </table>
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
                <button className={styles.btnViewPrimary} onClick={() => setIsSaved(false)}>
                  <i className="bi bi-pencil"></i> Sửa
                </button>
                {lines.some(l => Number(l.diffQty || 0) < 0) && (
                  <button className={styles.btnViewOutline} onClick={handleCreateExportSlip} title="Tạo phiếu xuất kho cho hàng thiếu/hỏng">
                    <i className="bi bi-box-arrow-up"></i> Lập phiếu xuất
                  </button>
                )}
                {lines.some(l => Number(l.diffQty || 0) > 0) && (
                  <button className={styles.btnViewOutline} onClick={handleCreateImportSlip} title="Tạo phiếu nhập kho cho hàng thừa">
                    <i className="bi bi-box-arrow-in-down"></i> Lập phiếu nhập
                  </button>
                )}
                {!lines.some(l => Number(l.diffQty || 0) !== 0) && (
                  <button className={styles.btnViewPrimary} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleComplete}>
                    <i className="bi bi-check2-all"></i> Hoàn thành kiểm kê
                  </button>
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
            {!lines.some(l => Number(l.diffQty || 0) !== 0) && (
              <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={handleComplete}>
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
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className={`bi ${viewingDoc.type === 'EXPORT' ? 'bi-box-arrow-up' : 'bi-box-arrow-in-down'}`} style={{ fontSize: '20px', color: '#0070cc' }}></i>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
                {viewingDoc.type === 'EXPORT' ? 'Chi tiết phiếu xuất kho xử lý kiểm kê' : 'Chi tiết phiếu nhập kho xử lý kiểm kê'}: {viewingDoc.data.docCode}
              </h3>
              <span className={`${styles.badge} ${viewingDoc.data.status === 'POSTED' ? styles.badgeSuccess : styles.badgeInfo}`}>
                {viewingDoc.data.status === 'POSTED' ? 'Ghi sổ' : 'Lưu tạm'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handlePrintDoc}
                style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}
              >
                <i className="bi bi-printer"></i> In phiếu
              </button>
              <button
                onClick={() => setViewingDoc(null)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
          </div>

          <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Summary info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Ngày chứng từ</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{formatDateOnly(viewingDoc.data.docDate)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Kho hàng</span>
                <strong style={{ fontSize: '14px', color: '#0070cc' }}>
                  {warehouses.find(w => String(w.id) === String(viewingDoc.data.warehouseId))?.name || `Kho #${viewingDoc.data.warehouseId}`}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Loại phiếu</span>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  {viewingDoc.type === 'EXPORT' ? 'Xuất điều chỉnh kiểm kê' : 'Nhập điều chỉnh kiểm kê'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Tham chiếu kiểm kê</span>
                <strong style={{ fontSize: '14px', color: '#16a34a' }}>
                  {viewingDoc.data.referenceCode || formData.code}
                </strong>
              </div>
              {viewingDoc.data.salespersonName && (
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Người thực hiện</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{viewingDoc.data.salespersonName}</strong>
                </div>
              )}
              {viewingDoc.data.note && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Ghi chú</span>
                  <span style={{ fontSize: '13px', color: '#334155' }}>{viewingDoc.data.note}</span>
                </div>
              )}
            </div>

            {/* Line items table */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>
              Danh sách hàng hóa ({viewingDoc.data.lines?.length || 0})
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
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
                    <tr key={line.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: '500', color: '#0070cc' }}>
                        {line.sku || matchedStocktakeLine?.sku || `SKU #${line.variantId}`}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                        {line.productName || matchedStocktakeLine?.itemName || 'Sản phẩm'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                        {Number(qty || 0).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', color: '#475569' }}>
                        {line.serialNumbers && line.serialNumbers.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {line.serialNumbers.map((s, si) => (
                              <span key={si} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '3px', fontSize: '11px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có serial</span>
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
                <span style={{ color: '#64748b' }}>Tổng số lượng: </span>
                <strong style={{ color: '#0070cc', fontSize: '16px' }}>
                  {(viewingDoc.data.lines || []).reduce((sum, l) => sum + Number((viewingDoc.type === 'EXPORT' ? l.quantityOut : l.quantityIn) || l.quantity || 0), 0).toLocaleString('vi-VN')}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setViewingDoc(null)}
              style={{ padding: '8px 20px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: '#334155' }}
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Xác nhận xử lý phiếu kiểm kê"
        message="Bạn có chắc chắn muốn xử lý phiếu kiểm kê này? Số liệu kiểm kê sẽ được chốt và bạn có thể tạo phiếu Nhập/Xuất kho để điều chỉnh chênh lệch."
        confirmText="Xử lý"
        cancelText="Hủy bỏ"
        onConfirm={confirmComplete}
        onCancel={() => setShowConfirmModal(false)}
      />
    </AdminLayout>
  );
}

export default StocktakeDetailPage;
