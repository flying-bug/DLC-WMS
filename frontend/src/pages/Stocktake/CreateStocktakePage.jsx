import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';

function CreateStocktakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => ({
    purpose: 'Kiểm kê vật tư hàng hóa định kỳ',
    code: '',
    warehouseId: searchParams.get('warehouseId') || 'all',
    toDate: searchParams.get('toDate') || new Date().toISOString().split('T')[0],
    createdDate: new Date().toISOString().slice(0, 16),
    conclusion: '',
    isProcessed: false,
    isValueStocktake: false
  }));

  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
  };

  const [lines, setLines] = useState([]);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const [participants, setParticipants] = useState([
    { name: 'Nguyễn Văn A', title: 'Thủ kho', represent: 'Kho chính' }
  ]);

  const fetchStockData = async (selectedWhId) => {
    if (!selectedWhId || selectedWhId === 'all') {
      setLines([]);
      return;
    }
    setLoadingStock(true);
    try {
      const response = await stocktakeApi.getInventoryReport({ warehouseId: selectedWhId });
      const data = response?.data?.data || response?.data || [];
      const stockList = Array.isArray(data) ? data : [];

      if (stockList.length > 0) {
        const formattedLines = stockList.map((item, idx) => {
          const bookQty = Number(item.totalQuantity || 0);
          return {
            id: item.variantId || idx + 1,
            variantId: item.variantId,
            itemCode: item.itemCode || `VT00${idx + 1}`,
            sku: item.sku || `SKU-${idx + 1}`,
            itemName: item.itemName || `Sản phẩm ${idx + 1}`,
            unit: item.unitName || 'Cái',
            bookQty: bookQty,
            countQty: bookQty,
            diffQty: 0,
            good100: bookQty,
            bad: 0,
            lost: 0,
            action: 'Không xử lý'
          };
        });
        setLines(formattedLines);
      } else {
        setLines([]);
      }
    } catch (err) {
      console.error('Failed to load stock data', err);
      showToast('error', 'Có lỗi khi tải danh sách hàng hóa trong kho.');
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [whRes, prodRes] = await Promise.all([
          stocktakeApi.getWarehouses(),
          stocktakeApi.getProducts({ size: 10000 })
        ]);
        
        const whData = whRes?.data?.data?.content || whRes?.data?.data || whRes?.data || [];
        setWarehouses(Array.isArray(whData) ? whData : []);
        
        const prodData = prodRes?.data?.data?.content || prodRes?.data?.data || prodRes?.data || [];
        setProducts(Array.isArray(prodData) ? prodData : []);
      } catch (err) {
        console.error('Failed to load master data', err);
      }
    };
    loadMasterData();
    fetchStockData(formData.warehouseId);
  }, []);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'warehouseId') {
      fetchStockData(value);
    }
  };

  // Input Change Handlers for Table Rows
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
      return {
        ...line,
        [field]: valNum
      };
    }));
  };

  const handleActionChange = (index, actionVal) => {
    setLines(prev => prev.map((line, idx) => (idx === index ? { ...line, action: actionVal } : line)));
  };

  const handleAddLine = () => {
    const newId = Date.now();
    setLines(prev => [
      ...prev,
      {
        id: newId,
        isNew: true,
        variantId: '',
        itemCode: '',
        sku: '',
        itemName: '',
        unit: 'Cái',
        bookQty: 0,
        countQty: 1,
        diffQty: 1,
        good100: 1,
        bad: 0,
        lost: 0,
        action: 'Xử lý chênh lệch'
      }
    ]);
  };

  const handleProductSelect = (index, variantId) => {
    const selectedProduct = products.find(p => String(p.id) === String(variantId));
    if (!selectedProduct) return;
    
    setLines(prev => prev.map((line, idx) => {
      if (idx !== index) return line;
      return {
        ...line,
        variantId: selectedProduct.id,
        itemCode: selectedProduct.productCode || `VT-${selectedProduct.id}`,
        sku: selectedProduct.sku || `SKU-${selectedProduct.id}`,
        itemName: selectedProduct.productName ? `${selectedProduct.productName} ${selectedProduct.variantName ? `(${selectedProduct.variantName})` : ''}` : selectedProduct.name,
        unit: selectedProduct.unitName || 'Cái'
      };
    }));
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllLines = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả các dòng kiểm kê?')) {
      setLines([]);
    }
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
    status: 'DRAFT',
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

  const handleDraft = async () => {
    try {
      const payload = buildPayload();
      if (!payload.warehouseId) {
         showToast('error', 'Vui lòng chọn kho để kiểm kê');
         return;
      }
      const response = await stocktakeApi.createStocktake(payload);
      navigate(`/stocktakes/${response.data.data.id}`, { state: { toastMessage: 'Lưu nháp thành công!', toastType: 'success' } });
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Có lỗi xảy ra khi lưu nháp');
    }
  };

  const handleSaveAndClose = async () => {
    try {
      const payload = buildPayload();
      if (!payload.warehouseId) {
         showToast('error', 'Vui lòng chọn kho để kiểm kê');
         return;
      }
      const response = await stocktakeApi.createStocktake(payload);
      if (formData.isProcessed) {
         await stocktakeApi.postStocktake(response.data.data.id);
      }
      navigate('/stocktakes', { state: { toastMessage: 'Lưu và Đóng thành công!', toastType: 'success' } });
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.userMessage || 'Có lỗi xảy ra khi lưu');
    }
  };

  // Navigation for Export/Import Slips
  const handleCreateExportSlip = () => {
    const diffLackLines = lines.filter(l => Number(l.diffQty || 0) < 0);
    if (diffLackLines.length === 0) {
      showToast('warning', 'Không có sản phẩm nào bị thiếu/hỏng để lập phiếu xuất kho xử lý!');
      return;
    }
    navigate('/inventory/export/create', {
      state: {
        reason: `Phiếu xuất kho xử lý chênh lệch kiểm kê ${formData.code}`,
        items: diffLackLines.map(l => ({
          variantId: l.variantId,
          sku: l.sku,
          productName: l.itemName,
          quantity: Math.abs(Number(l.diffQty))
        }))
      }
    });
  };

  const handleCreateImportSlip = () => {
    const diffSurplusLines = lines.filter(l => Number(l.diffQty || 0) > 0);
    if (diffSurplusLines.length === 0) {
      showToast('warning', 'Không có sản phẩm nào bị thừa để lập phiếu nhập kho điều chỉnh!');
      return;
    }
    navigate('/inventory/import/create', {
      state: {
        reason: `Phiếu nhập kho điều chỉnh tăng tồn kho theo kiểm kê ${formData.code}`,
        items: diffSurplusLines.map(l => ({
          variantId: l.variantId,
          sku: l.sku,
          productName: l.itemName,
          quantity: Number(l.diffQty)
        }))
      }
    });
  };

  // Calculate Summary Row Totals
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
              Bảng kiểm kê vật tư, hàng hóa {formData.code}
            </h1>
          </button>
          {formData.isProcessed && (
            <div className={styles.processedStamp}>Đã xử lý chênh lệch</div>
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
              <input type="text" className={styles.formInput} value={formData.code} disabled placeholder="Tự động sinh" />
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
                  {participants.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                        Chưa có thành viên nào tham gia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!isSaved && (
              <div className={styles.tableFooterActions} style={{ marginBottom: '16px' }}>
                <button
                  className={styles.btnOutline}
                  onClick={() => setParticipants([...participants, { name: '', title: '', represent: '' }])}
                >
                  <i className="bi bi-plus"></i> Thêm thành viên
                </button>
                <button
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
            <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>
              Danh sách Vật tư, hàng hóa kiểm kê
            </div>
            {loadingStock && <span style={{ fontSize: '13px', color: '#0284c7' }}>Đang tải số tồn kho...</span>}
          </div>

          {!isSaved && (
            <div className={styles.detailToolbar}>
              <label className={styles.toolbarCheckbox}>
                <input type="checkbox" name="isValueStocktake" checked={formData.isValueStocktake} onChange={handleChange} />
                Kiểm kê kèm Giá trị
              </label>
              <div className={styles.toolbarActions}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                />
                <button className={styles.btnOutline} onClick={() => fetchStockData(formData.warehouseId)}>
                  <i className="bi bi-arrow-clockwise"></i> Lấy lại số tồn
                </button>
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
                    <td>
                      {line.isNew && !isSaved ? (
                        <Select
                          options={products.map(p => ({ value: p.id, label: `${p.productName} - ${p.sku || p.productCode}` }))}
                          value={products.find(p => String(p.id) === String(line.variantId)) ? { value: line.variantId, label: `${products.find(p => String(p.id) === String(line.variantId)).productName} - ${products.find(p => String(p.id) === String(line.variantId)).sku || products.find(p => String(p.id) === String(line.variantId)).productCode}` } : null}
                          onChange={(selected) => handleProductSelect(idx, selected ? selected.value : '')}
                          placeholder="Chọn vật tư / hàng hóa..."
                          isClearable
                          menuPortalTarget={document.body}
                          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        />
                      ) : (
                        line.itemName
                      )}
                    </td>
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
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      Chưa có dữ liệu hàng hóa. Vui lòng bấm "Lấy lại số tồn" hoặc "Thêm dòng".
                    </td>
                  </tr>
                )}
                {/* Dynamic Summary Total Row */}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Tổng số: <strong>{lines.length}</strong> dòng sản phẩm</span>
          </div>

          {!isSaved && (
            <div className={styles.tableFooterActions}>
              <button className={styles.btnOutline} onClick={handleAddLine}>
                <i className="bi bi-plus-lg"></i> Thêm dòng sản phẩm
              </button>
              <button className={styles.btnOutline} onClick={handleClearAllLines}>
                <i className="bi bi-trash"></i> Xóa hết dòng
              </button>
            </div>
          )}
        </div>

        {/* Conclusion Section */}
        <div className={styles.conclusionSection}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kết luận kiểm kê</label>
            <textarea
              className={styles.textareaControl}
              name="conclusion"
              placeholder="Nhập kết luận đánh giá chất lượng kho hoặc nguyên nhân chênh lệch..."
              value={formData.conclusion}
              onChange={handleChange}
              disabled={isSaved}
            />
          </div>

          <label className={styles.toolbarCheckbox} style={{ marginBottom: '8px' }}>
            <input type="checkbox" name="isProcessed" checked={formData.isProcessed} onChange={handleChange} disabled={isSaved} />
            Đã hoàn thành xử lý chênh lệch
          </label>
        </div>

      </div>

      {/* Fixed Footer */}
      {isSaved ? (
        <div className={styles.pageFooterView}>
          <div className={styles.footerViewLeft}>
            <button className={styles.btnViewIcon} onClick={handleCancel} title="Quay lại danh sách"><i className="bi bi-arrow-left"></i></button>
            <button className={styles.btnViewOutline} onClick={handleCreateExportSlip} title="Tạo phiếu xuất kho cho hàng thiếu/hỏng">
              <i className="bi bi-box-arrow-up"></i> Lập phiếu xuất
            </button>
            <button className={styles.btnViewOutline} onClick={handleCreateImportSlip} title="Tạo phiếu nhập kho cho hàng thừa">
              <i className="bi bi-box-arrow-in-down"></i> Lập phiếu nhập
            </button>
            <button className={styles.btnViewPrimary} onClick={() => setIsSaved(false)}>
              <i className="bi bi-pencil"></i> Sửa lại
            </button>
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
            <button className={`${styles.btnFooter} ${styles.btnFooterDraft}`} onClick={handleDraft}>
              <i className="bi bi-box-arrow-in-down"></i> Lưu tạm
            </button>
            <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} onClick={handleDraft}>
              <i className="bi bi-check-circle"></i> Lưu kiểm kê
            </button>
            <button className={`${styles.btnFooter} ${styles.btnFooterPost}`} onClick={handleSaveAndClose}>
              <i className="bi bi-printer"></i> Lưu và Đóng
            </button>
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

export default CreateStocktakePage;
