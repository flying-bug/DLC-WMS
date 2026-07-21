import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';

function StocktakeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [warehouses, setWarehouses] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

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

  const fetchStockData = async (selectedWhId) => {
    setLoadingStock(true);
    try {
      const response = await stocktakeApi.getProducts({ size: 1000 });
      const data = response?.data?.data?.content || response?.data?.data || response?.data || [];
      const productList = Array.isArray(data) ? data : [];

      if (productList.length > 0) {
        const formattedLines = productList.map((item, idx) => {
          const bookQty = Number(item.stockQty || item.quantityOnHand || item.quantity || 10);
          return {
            id: item.id || idx + 1,
            variantId: item.id,
            itemCode: item.productCode || `VT00${idx + 1}`,
            sku: item.sku || `SKU-${idx + 1}`,
            itemName: item.productName ? `${item.productName} ${item.variantName ? `(${item.variantName})` : ''}` : item.name || `Sản phẩm ${idx + 1}`,
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
        setLines([
          { id: 1, itemCode: 'VT001', sku: 'SKU-BP-001', itemName: 'Bàn phím cơ Logitech K845', unit: 'Cái', bookQty: 15, countQty: 15, diffQty: 0, good100: 15, bad: 0, lost: 0, action: 'Không xử lý' },
          { id: 2, itemCode: 'VT002', sku: 'SKU-CHUOT-002', itemName: 'Chuột máy tính Kingston', unit: 'Cái', bookQty: 20, countQty: 18, diffQty: -2, good100: 18, bad: 0, lost: 0, action: 'Xử lý chênh lệch' },
          { id: 3, itemCode: 'VT003', sku: 'SKU-CPU-003', itemName: 'CPU Intel Core i7-12700K', unit: 'Cái', bookQty: 5, countQty: 6, diffQty: 1, good100: 6, bad: 0, lost: 0, action: 'Xử lý chênh lệch' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load stock data', err);
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
    fetchStockData(formData.warehouseId);
  }, []);

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

  const handleCancel = () => {
    navigate('/stocktakes');
  };

  const handleSaveAndClose = () => {
    navigate('/stocktakes', { state: { toastMessage: 'Cập nhật bảng kiểm kê thành công!', toastType: 'success' } });
  };

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
            <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} onClick={() => {
              setIsSaved(true);
              showToast('success', 'Lưu bảng kiểm kê thành công!');
            }}>
              <i className="bi bi-check-circle"></i> Lưu lại
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

export default StocktakeDetailPage;
