import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as importApi from '../api/inventoryImportApi';
import * as exportApi from '../api/inventoryExportApi';
import * as assemblyOrderApi from '../api/assemblyOrderApi';
import * as stocktakeApi from '../api/stocktakeApi';
import * as stockTransferApi from '../api/stockTransferApi';

const DOC_TYPES = [
  { value: 'IMPORT_SLIP', label: 'Phiếu nhập kho' },
  { value: 'EXPORT_SLIP', label: 'Phiếu xuất kho' },
  { value: 'ASSEMBLY_ORDER', label: 'Lệnh sản xuất (BOM)' },
  { value: 'STOCKTAKE', label: 'Kiểm kê' },
  { value: 'STOCK_TRANSFER', label: 'Chuyển kho' },
];

const ReferenceDocumentModal = ({ isOpen, onClose, onSelect }) => {
  const [docType, setDocType] = useState('IMPORT_SLIP');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      const params = { page: page - 1, size: 10, keywordSearch: keyword };
      
      switch (docType) {
        case 'IMPORT_SLIP':
          res = await importApi.getImportHistory(params).catch(() => null);
          break;
        case 'EXPORT_SLIP':
          res = await exportApi.getExportHistory(params).catch(() => null);
          break;
        case 'ASSEMBLY_ORDER':
          res = await assemblyOrderApi.getAssemblyOrders({ ...params, keywordSearch: undefined, docCode: keyword }).catch(() => null);
          break;
        case 'STOCKTAKE':
          res = await stocktakeApi.getStocktakes().catch(() => null); 
          break;
        case 'STOCK_TRANSFER':
          res = await stockTransferApi.getTransferHistory(params).catch(() => null);
          break;
        default:
          break;
      }

      if (res) {
        const responseData = res.data?.data || res.data || {};
        const content = responseData.content || (Array.isArray(responseData) ? responseData : []);
        setData(content);
        setTotalPages(responseData.totalPages || 1);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching reference docs:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, docType]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDocuments();
    }
  }, [isOpen, page, docType, fetchDocuments]);

  const handleSearch = () => {
    setPage(1);
    fetchDocuments();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getDocDate = (item) => {
    const rawDate = item.docDate || item.date || item.createdAt;
    if (!rawDate) return '';
    if (typeof rawDate === 'string') return rawDate.substring(0, 10);
    if (Array.isArray(rawDate)) return `${rawDate[0]}-${String(rawDate[1]).padStart(2, '0')}-${String(rawDate[2]).padStart(2, '0')}`;
    return String(rawDate);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="modal-content" style={{ width: '850px', maxWidth: '95vw', backgroundColor: '#fff', borderRadius: '4px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#111827' }}>Chọn chứng từ tham chiếu</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f3f4f6' }}>
          
          {/* Top Filter Area (MISA Style) */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '16px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: '0 0 250px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Loại chứng từ</label>
                <select 
                  className="misa-input" 
                  value={docType} 
                  onChange={(e) => { setDocType(e.target.value); setPage(1); setKeyword(''); }}
                  style={{ width: '100%', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                >
                  {DOC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Search and Table Area */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '14px' }}></i>
                <input 
                  type="text" 
                  placeholder="Nhập từ khóa tìm kiếm" 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ width: '100%', padding: '6px 12px 6px 32px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <button 
                type="button" 
                onClick={handleSearch}
                style={{ padding: '6px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: '500', color: '#374151' }}
              >
                Lấy dữ liệu
              </button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', width: '60px' }}>Chọn</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', width: '150px' }}>NGÀY CHỨNG TỪ</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', width: '180px' }}>SỐ CHỨNG TỪ</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>DIỄN GIẢI</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Đang tải dữ liệu...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Không có dữ liệu</td></tr>
                  ) : data.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => {
                        onSelect({
                          referenceType: docType,
                          referenceId: item.id,
                          docCode: item.docCode || item.code || item.stocktakeCode
                        });
                        onClose();
                      }}>
                      <td style={{ padding: '10px 16px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                        <i className="bi bi-circle" style={{ color: '#d1d5db', fontSize: '14px' }}></i>
                      </td>
                      <td style={{ padding: '10px 16px', borderRight: '1px solid #e5e7eb', color: '#374151' }}>
                        {getDocDate(item)}
                      </td>
                      <td style={{ padding: '10px 16px', borderRight: '1px solid #e5e7eb', color: '#0070cc' }}>
                        {item.docCode || item.code || item.stocktakeCode}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#374151' }}>
                        {item.note || item.issuePurpose || item.description || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '12px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <button 
                  style={{ padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: '4px', background: page <= 1 ? '#f3f4f6' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                  disabled={page <= 1} 
                  onClick={() => setPage(p => p - 1)}
                >
                  Trước
                </button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px' }}>Trang {page} / {totalPages}</span>
                <button 
                  style={{ padding: '4px 12px', border: '1px solid #d1d5db', borderRadius: '4px', background: page >= totalPages ? '#f3f4f6' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                  disabled={page >= totalPages} 
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReferenceDocumentModal;
