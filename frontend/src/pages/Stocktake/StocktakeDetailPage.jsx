import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import * as XLSX from 'xlsx';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';

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
    toDate: searchParams.get('toDate') || new Date().toISOString().split('T')[0],
    createdDate: new Date().toISOString().slice(0, 16),
    conclusion: '',
    isProcessed: false,
    isValueStocktake: false
  });

  const [isSaved, setIsSaved] = useState(true);
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
          toDate: data.stocktakeDate || new Date().toISOString().split('T')[0],
          createdDate: data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
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

  const handleSave = async () => {
    try {
      const payload = buildPayload();
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

  const handleComplete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xử lý phiếu kiểm kê này? Số liệu kiểm kê sẽ được chốt và bạn có thể tạo phiếu Nhập/Xuất kho để điều chỉnh chênh lệch.")) {
      return;
    }
    try {
      const payload = buildPayload();
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
          lines: diffLackLines.map(l => ({
            variantId: l.variantId,
            sku: l.sku,
            productName: l.itemName,
            quantity: Math.abs(Number(l.diffQty)),
            note: `Hàng thiếu từ kiểm kê ${formData.code}`
          }))
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
          lines: diffSurplusLines.map(l => ({
            variantId: l.variantId,
            sku: l.sku,
            productName: l.itemName,
            quantity: Number(l.diffQty),
            note: `Hàng thừa từ kiểm kê ${formData.code}`
          }))
        }
      }
    });
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
                <select className={styles.formSelect} name="warehouseId" value={formData.warehouseId} onChange={handleChange} disabled={isSaved}>
                  <option value="all">Tất cả kho</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
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
                        <select
                          value={line.action}
                          onChange={(e) => handleActionChange(idx, e.target.value)}
                          style={{ border: '1px solid #cbd5e1', borderRadius: '3px', padding: '2px 4px' }}
                        >
                          <option value="Không xử lý">Không xử lý</option>
                          <option value="Xử lý chênh lệch">Xử lý chênh lệch</option>
                        </select>
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
                  <button className={styles.btnViewOutline} onClick={() => navigate(`/export-slips/${formData.referenceExportId}/edit`, { state: { returnUrl: `/stocktakes/${id}` } })}>
                    <i className="bi bi-box-arrow-up"></i> Xem phiếu xuất
                  </button>
                )}
                {formData.referenceImportId && (
                  <button className={styles.btnViewOutline} onClick={() => navigate(`/import-slips/${formData.referenceImportId}/edit`, { state: { returnUrl: `/stocktakes/${id}` } })}>
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
            <button className={styles.btnViewText} onClick={() => window.print()}>
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
      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </AdminLayout>
  );
}

export default StocktakeDetailPage;
