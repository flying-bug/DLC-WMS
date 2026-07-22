import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as stocktakeApi from '../../api/stocktakeApi';
import styles from './CreateStocktakePage.module.css';
import Toast from '../../components/ui/Toast/Toast';

function CreateStocktakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [warehouses, setWarehouses] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const [formData, setFormData] = useState(() => ({
    purpose: 'Kiá»ƒm kÃª váº­t tÆ° hÃ ng hÃ³a Ä‘á»‹nh ká»³',
    code: `KKK${Math.floor(10000 + Math.random() * 90000)}`,
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
    { name: 'Nguyá»…n VÄƒn A', title: 'Thá»§ kho', represent: 'Kho chÃ­nh' }
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
            itemName: item.productName ? `${item.productName} ${item.variantName ? `(${item.variantName})` : ''}` : item.name || `Sáº£n pháº©m ${idx + 1}`,
            unit: item.unitName || 'CÃ¡i',
            bookQty: bookQty,
            countQty: bookQty,
            diffQty: 0,
            good100: bookQty,
            bad: 0,
            lost: 0,
            action: 'KhÃ´ng xá»­ lÃ½'
          };
        });
        setLines(formattedLines);
      } else {
        // Mock fallback if product list is empty
        setLines([
          { id: 1, itemCode: 'VT001', sku: 'SKU-BP-001', itemName: 'BÃ n phÃ­m cÆ¡ Logitech K845', unit: 'CÃ¡i', bookQty: 15, countQty: 15, diffQty: 0, good100: 15, bad: 0, lost: 0, action: 'KhÃ´ng xá»­ lÃ½' },
          { id: 2, itemCode: 'VT002', sku: 'SKU-CHUOT-002', itemName: 'Chuá»™t mÃ¡y tÃ­nh Kingston', unit: 'CÃ¡i', bookQty: 20, countQty: 18, diffQty: -2, good100: 18, bad: 0, lost: 0, action: 'Xá»­ lÃ½ chÃªnh lá»‡ch' },
          { id: 3, itemCode: 'VT003', sku: 'SKU-CPU-003', itemName: 'CPU Intel Core i7-12700K', unit: 'CÃ¡i', bookQty: 5, countQty: 6, diffQty: 1, good100: 6, bad: 0, lost: 0, action: 'Xá»­ lÃ½ chÃªnh lá»‡ch' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load stock data', err);
      showToast('error', 'CÃ³ lá»—i khi táº£i danh sÃ¡ch hÃ ng hÃ³a.');
    } finally {
      setLoadingStock(false);
    }
  };

  // Load Warehouses & Load Stock Items
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
        action: diff !== 0 ? 'Xá»­ lÃ½ chÃªnh lá»‡ch' : 'KhÃ´ng xá»­ lÃ½'
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
        itemCode: `VT_${prev.length + 1}`,
        sku: `SKU_${prev.length + 1}`,
        itemName: 'HÃ ng hÃ³a bá»• sung',
        unit: 'CÃ¡i',
        bookQty: 0,
        countQty: 1,
        diffQty: 1,
        good100: 1,
        bad: 0,
        lost: 0,
        action: 'Xá»­ lÃ½ chÃªnh lá»‡ch'
      }
    ]);
  };

  const handleRemoveLine = (index) => {
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllLines = () => {
    if (window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a táº¥t cáº£ cÃ¡c dÃ²ng kiá»ƒm kÃª?')) {
      setLines([]);
    }
  };

  const handleCancel = () => {
    navigate('/stocktakes');
  };

  const handleSaveAndClose = () => {
    navigate('/stocktakes', { state: { toastMessage: 'LÆ°u vÃ  ÄÃ³ng thÃ nh cÃ´ng!', toastType: 'success' } });
  };

  // Navigation for Export/Import Slips
  const handleCreateExportSlip = () => {
    const diffLackLines = lines.filter(l => Number(l.diffQty || 0) < 0);
    if (diffLackLines.length === 0) {
      showToast('warning', 'KhÃ´ng cÃ³ sáº£n pháº©m nÃ o bá»‹ thiáº¿u/há»ng Ä‘á»ƒ láº­p phiáº¿u xuáº¥t kho xá»­ lÃ½!');
      return;
    }
    navigate('/inventory/export/create', {
      state: {
        reason: `Phiáº¿u xuáº¥t kho xá»­ lÃ½ chÃªnh lá»‡ch kiá»ƒm kÃª ${formData.code}`,
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
      showToast('warning', 'KhÃ´ng cÃ³ sáº£n pháº©m nÃ o bá»‹ thá»«a Ä‘á»ƒ láº­p phiáº¿u nháº­p kho Ä‘iá»u chá»‰nh!');
      return;
    }
    navigate('/inventory/import/create', {
      state: {
        reason: `Phiáº¿u nháº­p kho Ä‘iá»u chá»‰nh tÄƒng tá»“n kho theo kiá»ƒm kÃª ${formData.code}`,
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
          <button className={styles.backBtn} onClick={handleCancel} title="Quay láº¡i">
            <i className="bi bi-arrow-left"></i>
            <h1 className={styles.pageTitle}>
              Báº£ng kiá»ƒm kÃª váº­t tÆ°, hÃ ng hÃ³a {formData.code}
            </h1>
          </button>
          {formData.isProcessed && (
            <div className={styles.processedStamp}>ÄÃ£ xá»­ lÃ½ chÃªnh lá»‡ch</div>
          )}
        </div>

        {/* Master Data Section */}
        <div className={styles.masterForm}>
          <div className={styles.formGridLeft}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Má»¥c Ä‘Ã­ch</label>
              <input type="text" className={styles.formInput} name="purpose" value={formData.purpose} onChange={handleChange} disabled={isSaved} />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kiá»ƒm kÃª kho</label>
                <select className={styles.formSelect} name="warehouseId" value={formData.warehouseId} onChange={handleChange} disabled={isSaved}>
                  <option value="all">Táº¥t cáº£ kho</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Äáº¿n ngÃ y</label>
                <input type="date" className={styles.formInput} name="toDate" value={formData.toDate} onChange={handleChange} disabled={isSaved} />
              </div>
            </div>
          </div>

          <div className={styles.formGridRight}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Sá»‘ phiáº¿u kiá»ƒm kÃª</label>
              <input type="text" className={styles.formInput} value={formData.code} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>NgÃ y kiá»ƒm kÃª</label>
              <input type="datetime-local" className={styles.formInput} name="createdDate" value={formData.createdDate} onChange={handleChange} disabled={isSaved} />
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div
          className={styles.sectionHeader}
          onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
        >
          <i className={isParticipantsExpanded ? "bi bi-caret-down-fill" : "bi bi-caret-right-fill"}></i> ThÃ nh viÃªn tham gia kiá»ƒm kÃª ({participants.length})
        </div>

        {isParticipantsExpanded && (
          <div className={styles.participantsSection}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '30%' }}>Há»Œ VÃ€ TÃŠN</th>
                    <th style={{ width: '30%' }}>CHá»¨C DANH</th>
                    <th style={{ width: '30%' }}>Äáº I DIá»†N</th>
                    {!isSaved && <th style={{ width: '5%', textAlign: 'center' }}>XÃ“A</th>}
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
                        ChÆ°a cÃ³ thÃ nh viÃªn nÃ o tham gia
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
                  <i className="bi bi-plus"></i> ThÃªm thÃ nh viÃªn
                </button>
                <button
                  className={styles.btnOutline}
                  onClick={() => setParticipants([])}
                >
                  XÃ³a háº¿t thÃ nh viÃªn
                </button>
              </div>
            )}
          </div>
        )}

        {/* Details Section */}
        <div className={styles.detailSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>
              Danh sÃ¡ch Váº­t tÆ°, hÃ ng hÃ³a kiá»ƒm kÃª
            </div>
            {loadingStock && <span style={{ fontSize: '13px', color: '#0284c7' }}>Äang táº£i sá»‘ tá»“n kho...</span>}
          </div>

          {!isSaved && (
            <div className={styles.detailToolbar}>
              <label className={styles.toolbarCheckbox}>
                <input type="checkbox" name="isValueStocktake" checked={formData.isValueStocktake} onChange={handleChange} />
                Kiá»ƒm kÃª kÃ¨m GiÃ¡ trá»‹
              </label>
              <div className={styles.toolbarActions}>
                <button className={styles.btnOutline} onClick={() => fetchStockData(formData.warehouseId)}>
                  <i className="bi bi-arrow-clockwise"></i> Láº¥y láº¡i sá»‘ tá»“n
                </button>
                <button className={styles.btnOutline} onClick={() => fetchStockData(formData.warehouseId)}>
                  <i className="bi bi-download"></i> Táº£i danh sÃ¡ch VTHH
                </button>
              </div>
            </div>
          )}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '8%' }}>MÃƒ HÃ€NG</th>
                  <th rowSpan={2} style={{ width: '10%' }}>SKU</th>
                  <th rowSpan={2} style={{ width: '20%' }}>TÃŠN HÃ€NG HÃ“A</th>
                  <th rowSpan={2} style={{ width: '6%' }}>ÄVT</th>
                  <th colSpan={3}>Sá» LÆ¯á»¢NG KHO</th>
                  <th colSpan={3}>PHáº¨M CHáº¤T THá»°C Táº¾</th>
                  <th rowSpan={2} style={{ width: '12%' }}>Xá»¬ LÃ</th>
                  {!isSaved && <th rowSpan={2} style={{ width: '4%', textAlign: 'center' }}>XÃ“A</th>}
                </tr>
                <tr>
                  <th>Sá»” SÃCH</th>
                  <th>KIá»‚M KÃŠ THá»°C Táº¾</th>
                  <th>CHÃŠNH Lá»†CH</th>
                  <th>Tá»T 100%</th>
                  <th>KÃ‰M Cáº¤P</th>
                  <th>Há»ŽNG/Máº¤T</th>
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
                          <option value="KhÃ´ng xá»­ lÃ½">KhÃ´ng xá»­ lÃ½</option>
                          <option value="Xá»­ lÃ½ chÃªnh lá»‡ch">Xá»­ lÃ½ chÃªnh lá»‡ch</option>
                        </select>
                      )}
                    </td>
                    {!isSaved && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => handleRemoveLine(idx)}
                          title="XÃ³a dÃ²ng"
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
                      ChÆ°a cÃ³ dá»¯ liá»‡u hÃ ng hÃ³a. Vui lÃ²ng báº¥m "Láº¥y láº¡i sá»‘ tá»“n" hoáº·c "ThÃªm dÃ²ng".
                    </td>
                  </tr>
                )}
                {/* Dynamic Summary Total Row */}
                <tr style={{ fontWeight: 700, backgroundColor: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>Tá»”NG Cá»˜NG:</td>
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
            <span style={{ fontSize: '13px', color: '#64748b' }}>Tá»•ng sá»‘: <strong>{lines.length}</strong> dÃ²ng sáº£n pháº©m</span>
          </div>

          {!isSaved && (
            <div className={styles.tableFooterActions}>
              <button className={styles.btnOutline} onClick={handleAddLine}>
                <i className="bi bi-plus-lg"></i> ThÃªm dÃ²ng sáº£n pháº©m
              </button>
              <button className={styles.btnOutline} onClick={handleClearAllLines}>
                <i className="bi bi-trash"></i> XÃ³a háº¿t dÃ²ng
              </button>
            </div>
          )}
        </div>

        {/* Conclusion Section */}
        <div className={styles.conclusionSection}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Káº¿t luáº­n kiá»ƒm kÃª</label>
            <textarea
              className={styles.textareaControl}
              name="conclusion"
              placeholder="Nháº­p káº¿t luáº­n Ä‘Ã¡nh giÃ¡ cháº¥t lÆ°á»£ng kho hoáº·c nguyÃªn nhÃ¢n chÃªnh lá»‡ch..."
              value={formData.conclusion}
              onChange={handleChange}
              disabled={isSaved}
            />
          </div>

          <label className={styles.toolbarCheckbox} style={{ marginBottom: '8px' }}>
            <input type="checkbox" name="isProcessed" checked={formData.isProcessed} onChange={handleChange} disabled={isSaved} />
            ÄÃ£ hoÃ n thÃ nh xá»­ lÃ½ chÃªnh lá»‡ch
          </label>
        </div>

      </div>

      {/* Fixed Footer */}
      {isSaved ? (
        <div className={styles.pageFooterView}>
          <div className={styles.footerViewLeft}>
            <button className={styles.btnViewIcon} onClick={handleCancel} title="Quay láº¡i danh sÃ¡ch"><i className="bi bi-arrow-left"></i></button>
            <button className={styles.btnViewOutline} onClick={handleCreateExportSlip} title="Táº¡o phiáº¿u xuáº¥t kho cho hÃ ng thiáº¿u/há»ng">
              <i className="bi bi-box-arrow-up"></i> Láº­p phiáº¿u xuáº¥t
            </button>
            <button className={styles.btnViewOutline} onClick={handleCreateImportSlip} title="Táº¡o phiáº¿u nháº­p kho cho hÃ ng thá»«a">
              <i className="bi bi-box-arrow-in-down"></i> Láº­p phiáº¿u nháº­p
            </button>
            <button className={styles.btnViewPrimary} onClick={() => setIsSaved(false)}>
              <i className="bi bi-pencil"></i> Sá»­a láº¡i
            </button>
          </div>
          <div className={styles.footerViewRight}>
            <button className={styles.btnViewText} onClick={() => window.print()}>
              <i className="bi bi-printer"></i> In báº£ng kiá»ƒm kÃª
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.pageFooter}>
          <div className={styles.footerLeft}>
            <button className={`${styles.btnFooter} ${styles.btnFooterCancel}`} onClick={handleCancel}>Há»§y bá»</button>
          </div>
          <div className={styles.footerRight}>
            <button className={`${styles.btnFooter} ${styles.btnFooterDraft}`} onClick={() => showToast('info', 'ÄÃ£ lÆ°u nhÃ¡p báº£ng kiá»ƒm kÃª!')}>
              <i className="bi bi-box-arrow-in-down"></i> LÆ°u táº¡m
            </button>
            <button className={`${styles.btnFooter} ${styles.btnFooterSave}`} onClick={() => {
              setIsSaved(true);
              showToast('success', 'LÆ°u báº£ng kiá»ƒm kÃª thÃ nh cÃ´ng!');
            }}>
              <i className="bi bi-check-circle"></i> LÆ°u kiá»ƒm kÃª
            </button>
            <button className={`${styles.btnFooter} ${styles.btnFooterPost}`} onClick={handleSaveAndClose}>
              <i className="bi bi-printer"></i> LÆ°u vÃ  ÄÃ³ng
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
