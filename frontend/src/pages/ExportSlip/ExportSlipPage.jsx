import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './ExportSlipPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'LÆ°u táº¡m', code: 'info' },
  APPROVED: { label: 'ÄÃ£ duyá»‡t', code: 'success' },
  POSTED: { label: 'HoÃ n thÃ nh', code: 'success' },
  CANCELLED: { label: 'ÄÃ£ há»§y', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} Ä‘`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '');
const sumAmount = (lines = []) => lines.reduce((sum, line) => sum + Number(line.lineAmount || 0), 0);
const sumQuantity = (lines = []) => lines.reduce((sum, line) => sum + Number(line.quantityOut || 0), 0);
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

function ExportSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [slips, setSlips] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ docCode: location.state?.filterDocCode || '', fromDate: '', status: '' });
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmPost, setConfirmPost] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const warehouseById = useMemo(() => new Map(warehouses.map(item => [item.id, item])), [warehouses]);
  const productById = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);
  const customerById = useMemo(() => new Map(customers.map(item => [item.id, item])), [customers]);
  const userById = useMemo(() => new Map(users.map(item => [item.id, item])), [users]);

  const loadLookups = useCallback(async () => {
    const [warehouseRes, productRes, customerRes, userRes] = await Promise.allSettled([
      exportApi.getWarehouses({ size: 100 }),
      exportApi.getProducts({ size: 100 }),
      exportApi.getCustomers({ size: 1000 }),
      exportApi.getUsers({ size: 1000 }).catch(() => null),
    ]);

    if (warehouseRes.status === 'fulfilled') {
      setWarehouses(pageContent(unwrap(warehouseRes.value)));
    }
    if (productRes.status === 'fulfilled') {
      setProducts(pageContent(unwrap(productRes.value)));
    }
    if (customerRes.status === 'fulfilled') {
      setCustomers(pageContent(unwrap(customerRes.value)));
    }
    if (userRes.status === 'fulfilled' && userRes.value) {
      setUsers(pageContent(unwrap(userRes.value)));
    }
  }, []);

  const loadSlips = useCallback(async () => {
    setLoading(true);

    try {
      const response = await exportApi.getExportHistory({
        docCode: filters.docCode || undefined,
        fromDate: filters.fromDate || undefined,
        status: filters.status || undefined,
      });
      const data = unwrap(response) || [];
      setSlips(data);
      setSelectedSlip(current => data.find(item => item.id === current?.id) || null);
      setSelectedIds([]);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'CÃ³ lá»—i xáº£y ra khi táº£i dá»¯ liá»‡u');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
     
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
     
    loadSlips();
  }, [loadSlips]);

  useEffect(() => {
    if (location.state?.toastMessage) {
       
      showToast(location.state.toastType || 'success', location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const rows = slips.map(slip => {
    const status = STATUS_LABELS[slip.status] || { label: slip.status || 'KhÃ´ng rÃµ', code: 'info' };
    return {
      ...slip,
      date: formatDate(slip.docDate),
      partner: customerById.get(slip.partnerId)?.name || (slip.partnerId ? `KhÃ¡ch hÃ ng #${slip.partnerId}` : 'ChÆ°a chá»n'),
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'ChÆ°a chá»n'),
      total: money(sumAmount(slip.lines)),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['NgÃ y háº¡ch toÃ¡n', 'Sá»‘ chá»©ng tá»«', 'KhÃ¡ch hÃ ng', 'Diá»…n giáº£i', 'Tá»•ng tiá»n', 'Kho xuáº¥t', 'Tráº¡ng thÃ¡i'];
    const data = rows.map(item => [
      item.date,
      item.docCode,
      item.partner,
      item.note || '',
      item.total,
      item.warehouse,
      item.statusLabel
    ]);
    exportToExcel(headers, data, 'Danh_sach_phieu_xuat_kho');
    showToast('success', 'Xuáº¥t Excel thÃ nh cÃ´ng!');
  };

  const handleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? rows.map(row => row.id) : []);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };


  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Danh sÃ¡ch phiáº¿u xuáº¥t kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/export-slips/create')}>
            <i className="bi bi-plus"></i> ThÃªm má»›i
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÃŒM KIáº¾M</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="MÃ£ phiáº¿u..."
                value={filters.docCode}
                onChange={(event) => setFilters(prev => ({ ...prev, docCode: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Tá»ª NGÃ€Y</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(event) => setFilters(prev => ({ ...prev, fromDate: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÃŒNH TRáº NG</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Táº¥t cáº£</option>
                <option value="DRAFT">LÆ°u táº¡m</option>
                <option value="POSTED">HoÃ n thÃ nh</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.btnOutline} onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}>
              LÃ m má»›i
            </button>
            <button className={styles.btnOutline} onClick={handleExport}>
              <i className="bi bi-file-earmark-excel"></i> Xuáº¥t Excel
            </button>
            <button className={styles.btnPrimary} onClick={loadSlips}>
              <i className="bi bi-funnel"></i> Lá»c dá»¯ liá»‡u
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input type="checkbox" className={styles.checkbox} checked={rows.length > 0 && selectedIds.length === rows.length} onChange={handleSelectAll} />
                </th>
                <th style={{ width: '120px' }}>NgÃ y Xuáº¥t</th>
                <th style={{ width: '180px' }}>Sá»‘ Phiáº¿u</th>
                <th style={{ width: '200px' }}>KhÃ¡ch HÃ ng</th>
                <th style={{ width: '120px' }}>Kho Xuáº¥t</th>
                <th className={styles.textRight} style={{ width: '110px' }}>Tá»•ng Tiá»n</th>
                <th style={{ minWidth: '150px' }}>Ghi ChÃº</th>
                <th style={{ width: '120px' }}>Tráº¡ng ThÃ¡i</th>
                <th className={styles.textCenter} style={{ width: '100px' }}>Thao TÃ¡c</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? paginatedRows.map(slip => (
                <tr key={slip.id} className={selectedSlip?.id === slip.id ? styles.activeRow : ''} onClick={() => setSelectedSlip(slip)} style={{ cursor: 'pointer' }}>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" className={styles.checkbox} checked={selectedIds.includes(slip.id)} onChange={(event) => handleSelectRow(event, slip.id)} onClick={(event) => event.stopPropagation()} /></td>
                  <td>{slip.date}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a
                      href="#"
                      className={styles.link}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSelectedSlip(slip);
                      }}
                    >
                      {slip.docCode}
                    </a>
                  </td>
                  <td>{slip.partner}</td>
                  <td>{slip.warehouse}</td>
                  <td className={`${styles.money} ${styles.textRight}`}>{slip.total}</td>
                  <td style={{ maxWidth: '180px' }}>
                    <div className={styles.tooltipContainer}>
                      <span className={styles.noteText}>{slip.note || 'KhÃ´ng cÃ³ ghi chÃº'}</span>
                      {slip.note && <span className={styles.tooltipText}>{slip.note}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${slip.statusCode === 'success' ? styles.badgeSuccess :
                      slip.statusCode === 'info' ? styles.badgeInfo :
                        slip.statusCode === 'warning' ? styles.badgeWarning :
                          styles.badgeDanger
                      }`}>
                      {slip.statusLabel}
                    </span>
                  </td>
                  <td className={styles.textCenter}>
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiáº¿t" onClick={(event) => { event.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sá»­a phiáº¿u xuáº¥t kho" onClick={(event) => {
                      event.stopPropagation();
                      if (slip.status !== 'DRAFT') {
                        showToast('error', 'Chá»‰ cÃ³ thá»ƒ cáº­p nháº­t phiáº¿u lÆ°u táº¡m.');
                      } else {
                        navigate(`/export-slips/${slip.id}/edit`);
                      }
                    }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" className={styles.textCenter}>
                    {loading ? 'Äang táº£i dá»¯ liá»‡u...' : 'KhÃ´ng tÃ¬m tháº¥y phiáº¿u xuáº¥t nÃ o'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Hiá»ƒn thá»‹</span>
              <select
                className="misa-select"
                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>trÃªn tá»•ng sá»‘ {totalItems} báº£n ghi</span>
            </div>

            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={styles.pageBtn}
                >
                  <i className="bi bi-chevron-left"></i>
                  <span>TrÆ°á»›c</span>
                </button>

                <div className={styles.paginationNumbers}>
                  {getPageNumbers().map((num, idx) => (
                    num === currentPage ? (
                      <input
                        key={idx}
                        className={`${styles.pageNumber} ${styles.active}`}
                        style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                        defaultValue={num}
                        title="Nháº­p sá»‘ trang vÃ  nháº¥n Enter"
                        onBlur={(e) => e.target.value = currentPage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            let p = parseInt(e.target.value, 10);
                            if (!isNaN(p)) {
                              p = Math.max(1, Math.min(totalPages, p));
                              setCurrentPage(p);
                              e.target.blur();
                            } else {
                              e.target.value = currentPage;
                            }
                          }
                        }}
                      />
                    ) : (
                      <span
                        key={idx}
                        className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                        onClick={() => num !== '...' && setCurrentPage(num)}
                      >
                        {num}
                      </span>
                    )
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={styles.pageBtn}
                >
                  <span>Sau</span>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedSlip && (
          <div className={styles.modalOverlay} onClick={() => setSelectedSlip(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className={`bi bi-receipt ${styles.detailIcon}`}></i>
                  {selectedSlip.docCode}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedSlip.status === 'DRAFT' && (
                    <button
                      onClick={() => setConfirmPost(true)}
                      className={styles.btnPrimary}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      <i className="bi bi-printer" style={{ marginRight: '6px' }}></i> Ghi sá»•
                    </button>
                  )}
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>KhÃ¡ch hÃ ng</span>
                      <span className={styles.detailValue}>{customerById.get(selectedSlip.partnerId)?.name || (selectedSlip.partnerId ? `KhÃ¡ch hÃ ng #${selectedSlip.partnerId}` : 'ChÆ°a chá»n')}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>NgÆ°á»i nháº­n hÃ ng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientName || 'ChÆ°a cÃ³ thÃ´ng tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Äá»‹a chá»‰ nháº­n hÃ ng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientAddress || 'ChÆ°a cÃ³ thÃ´ng tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>NhÃ¢n viÃªn xuáº¥t hÃ ng</span>
                      <span className={styles.detailValue}>
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'ChÆ°a cÃ³ thÃ´ng tin')}
                      </span>
                    </div>
                    {(selectedSlip.referenceType && selectedSlip.referenceId) && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>KÃ¨m chá»©ng tá»«</span>
                        <span className={styles.detailValue} style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>
                           <i className="bi bi-link-45deg"></i> {selectedSlip.referenceCode || selectedSlip.referenceId}
                        </span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>LÃ½ do xuáº¥t</span>
                      <span className={styles.detailValue}>{selectedSlip.note || 'KhÃ´ng cÃ³ ghi chÃº'}</span>
                    </div>
                  </div>

                  <div className={styles.detailRight}>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>NgÃ y chá»©ng tá»«</span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>Kho xuáº¥t</span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.warehouseId)?.name || `Kho #${selectedSlip.warehouseId}`}</span>
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>MÃ£ hÃ ng</th>
                        <th>TÃªn hÃ ng</th>
                        <th>DVT</th>
                        <th className={styles.textCenter}>Sá»‘ lÆ°á»£ng</th>
                        <th className={styles.textRight}>ÄÆ¡n giÃ¡</th>
                        <th className={styles.textRight}>ThÃ nh tiá»n</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSlip.lines || []).map((line, index) => {
                        const product = productById.get(line.variantId);
                        return (
                          <tr key={line.id || index}>
                            <td>{index + 1}</td>
                            <td className={styles.textBlue}>{product?.sku || `SKU #${line.variantId}`}</td>
                            <td>
                              {variantLabel(product) || 'ChÆ°a cÃ³ tÃªn sáº£n pháº©m'}
                              {line.serialNumbers && line.serialNumbers.length > 0 && (
                                <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {line.serialNumbers.map(serial => (
                                    <span key={serial} style={{ fontSize: '11px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', color: '#475569' }}>
                                      <i className="bi bi-upc-scan" style={{ marginRight: '4px' }}></i>
                                      {serial}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>{product?.unitName || ''}</td>
                            <td className={styles.textCenter}>{Number(line.quantityOut || 0).toLocaleString('vi-VN')}</td>
                            <td className={styles.textRight}>{money(line.unitCost || line.unitPrice)}</td>
                            <td className={styles.textRight}>{money(line.lineAmount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.detailFooter}>
                  <div className={styles.footerTotalLabel}>Tá»•ng cá»™ng hÃ ng xuáº¥t:</div>
                  <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
                  <div className={styles.footerTotalLabel} style={{ flex: 0, whiteSpace: 'nowrap', paddingRight: '16px' }}>Tá»•ng tiá»n:</div>
                  <div className={styles.footerMoney}>{money(sumAmount(selectedSlip.lines))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={confirmPost}
          title="XÃ¡c nháº­n ghi sá»•"
          message="Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n ghi sá»• phiáº¿u xuáº¥t nÃ y khÃ´ng? Thao tÃ¡c nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c vÃ  sáº½ cáº­p nháº­t láº¡i sá»‘ lÆ°á»£ng hÃ ng hÃ³a trong kho."
          onConfirm={async () => {
            setConfirmPost(false);
            try {
              await exportApi.postExportSlip(selectedSlip.id);
              loadSlips();
              setSelectedSlip(prev => ({ ...prev, status: 'POSTED', statusLabel: STATUS_LABELS['POSTED'].label, statusCode: STATUS_LABELS['POSTED'].code }));
              showToast('success', 'Ghi sá»• phiáº¿u xuáº¥t thÃ nh cÃ´ng!');
            } catch (err) {
              showToast('error', err.response?.data?.userMessage || 'KhÃ´ng thá»ƒ ghi sá»• phiáº¿u xuáº¥t kho');
            }
          }}
          onCancel={() => setConfirmPost(false)}
        />
      </div>
      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}

export default ExportSlipPage;
