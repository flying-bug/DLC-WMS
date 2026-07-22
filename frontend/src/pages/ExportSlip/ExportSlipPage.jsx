import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './ExportSlipPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Lưu tạm', code: 'info' },
  APPROVED: { label: 'Đã duyệt', code: 'success' },
  POSTED: { label: 'Hoàn thành', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
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
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tải dữ liệu');
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
    const status = STATUS_LABELS[slip.status] || { label: slip.status || 'Không rõ', code: 'info' };
    return {
      ...slip,
      date: formatDate(slip.docDate),
      partner: customerById.get(slip.partnerId)?.name || (slip.partnerId ? `Khách hàng #${slip.partnerId}` : 'Chưa chọn'),
      warehouse: warehouseById.get(slip.warehouseId)?.name || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa chọn'),
      total: money(sumAmount(slip.lines)),
      statusLabel: status.label,
      statusCode: status.code,
    };
  });

  const handleExport = () => {
    const headers = ['Ngày hạch toán', 'Số chứng từ', 'Khách hàng', 'Diễn giải', 'Tổng tiền', 'Kho xuất', 'Trạng thái'];
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
    showToast('success', 'Xuất Excel thành công!');
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
          <h1 className={styles.pageTitle}>Danh sách phiếu xuất kho</h1>
          <button className={styles.btnPrimary} onClick={() => navigate('/export-slips/create')}>
            <i className="bi bi-plus"></i> Thêm mới
          </button>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌM KIẾM</span>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Mã phiếu..."
                value={filters.docCode}
                onChange={(event) => setFilters(prev => ({ ...prev, docCode: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TỪ NGÀY</span>
              <input
                type="date"
                className={styles.filterInput}
                value={filters.fromDate}
                onChange={(event) => setFilters(prev => ({ ...prev, fromDate: event.target.value }))}
              />
            </div>
            <div className={styles.filterField}>
              <span className={styles.filterLabel}>TÌNH TRẠNG</span>
              <select
                className={styles.filterSelect}
                value={filters.status}
                onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Lưu tạm</option>
                <option value="POSTED">Hoàn thành</option>
              </select>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button className={styles.btnOutline} onClick={() => setFilters({ docCode: '', fromDate: '', status: '' })}>
              Làm mới
            </button>
            <button className={styles.btnOutline} onClick={handleExport}>
              <i className="bi bi-file-earmark-excel"></i> Xuất Excel
            </button>
            <button className={styles.btnPrimary} onClick={loadSlips}>
              <i className="bi bi-funnel"></i> Lọc dữ liệu
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
                <th style={{ width: '120px' }}>Ngày Xuất</th>
                <th style={{ width: '180px' }}>Số Phiếu</th>
                <th style={{ width: '200px' }}>Khách Hàng</th>
                <th style={{ width: '120px' }}>Kho Xuất</th>
                <th className={styles.textRight} style={{ width: '110px' }}>Tổng Tiền</th>
                <th style={{ minWidth: '150px' }}>Ghi Chú</th>
                <th style={{ width: '120px' }}>Trạng Thái</th>
                <th className={styles.textCenter} style={{ width: '100px' }}>Thao Tác</th>
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
                      <span className={styles.noteText}>{slip.note || 'Không có ghi chú'}</span>
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
                    <i className="bi bi-eye" style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} title="Xem chi tiết" onClick={(event) => { event.stopPropagation(); setSelectedSlip(slip); }}></i>
                    <i className="bi bi-pencil" style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} title="Sửa phiếu xuất kho" onClick={(event) => {
                      event.stopPropagation();
                      if (slip.status !== 'DRAFT') {
                        showToast('error', 'Chỉ có thể cập nhật phiếu lưu tạm.');
                      } else {
                        navigate(`/export-slips/${slip.id}/edit`);
                      }
                    }}></i>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="9" className={styles.textCenter}>
                    {loading ? 'Đang tải dữ liệu...' : 'Không tìm thấy phiếu xuất nào'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Hiển thị</span>
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
              <span>trên tổng số {totalItems} bản ghi</span>
            </div>

            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={styles.pageBtn}
                >
                  <i className="bi bi-chevron-left"></i>
                  <span>Trước</span>
                </button>

                <div className={styles.paginationNumbers}>
                  {getPageNumbers().map((num, idx) => (
                    num === currentPage ? (
                      <input
                        key={idx}
                        className={`${styles.pageNumber} ${styles.active}`}
                        style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                        defaultValue={num}
                        title="Nhập số trang và nhấn Enter"
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
                      <i className="bi bi-printer" style={{ marginRight: '6px' }}></i> Ghi sổ
                    </button>
                  )}
                  <button className={styles.modalClose} onClick={() => setSelectedSlip(null)}>&times;</button>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Khách hàng</span>
                      <span className={styles.detailValue}>{customerById.get(selectedSlip.partnerId)?.name || (selectedSlip.partnerId ? `Khách hàng #${selectedSlip.partnerId}` : 'Chưa chọn')}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Người nhận hàng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientName || 'Chưa có thông tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Địa chỉ nhận hàng</span>
                      <span className={styles.detailValue}>{selectedSlip.recipientAddress || 'Chưa có thông tin'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Nhân viên xuất hàng</span>
                      <span className={styles.detailValue}>
                        {selectedSlip.salespersonName || userById.get(selectedSlip.salespersonId)?.fullName || userById.get(selectedSlip.salespersonId)?.username || (selectedSlip.salespersonId ? String(selectedSlip.salespersonId) : 'Chưa có thông tin')}
                      </span>
                    </div>
                    {(selectedSlip.referenceType && selectedSlip.referenceId) && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Kèm chứng từ</span>
                        <span className={styles.detailValue} style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>
                           <i className="bi bi-link-45deg"></i> {selectedSlip.referenceCode || selectedSlip.referenceId}
                        </span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Lý do xuất</span>
                      <span className={styles.detailValue}>{selectedSlip.note || 'Không có ghi chú'}</span>
                    </div>
                  </div>

                  <div className={styles.detailRight}>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>Ngày chứng từ</span>
                      <span className={styles.detailRightValue}>{formatDate(selectedSlip.docDate)}</span>
                    </div>
                    <div className={styles.detailRightRow}>
                      <span className={styles.detailRightLabel}>Kho xuất</span>
                      <span className={`${styles.detailRightValue} ${styles.textBlue}`}>{warehouseById.get(selectedSlip.warehouseId)?.name || `Kho #${selectedSlip.warehouseId}`}</span>
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.detailTable}>
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã hàng</th>
                        <th>Tên hàng</th>
                        <th>DVT</th>
                        <th className={styles.textCenter}>Số lượng</th>
                        <th className={styles.textRight}>Đơn giá</th>
                        <th className={styles.textRight}>Thành tiền</th>
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
                              {variantLabel(product) || 'Chưa có tên sản phẩm'}
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
                  <div className={styles.footerTotalLabel}>Tổng cộng hàng xuất:</div>
                  <div className={styles.footerQty}>{sumQuantity(selectedSlip.lines).toLocaleString('vi-VN')}</div>
                  <div className={styles.footerTotalLabel} style={{ flex: 0, whiteSpace: 'nowrap', paddingRight: '16px' }}>Tổng tiền:</div>
                  <div className={styles.footerMoney}>{money(sumAmount(selectedSlip.lines))}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={confirmPost}
          title="Xác nhận ghi sổ"
          message="Bạn có chắc chắn muốn ghi sổ phiếu xuất này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
          onConfirm={async () => {
            setConfirmPost(false);
            try {
              await exportApi.postExportSlip(selectedSlip.id);
              loadSlips();
              setSelectedSlip(prev => ({ ...prev, status: 'POSTED', statusLabel: STATUS_LABELS['POSTED'].label, statusCode: STATUS_LABELS['POSTED'].code }));
              showToast('success', 'Ghi sổ phiếu xuất thành công!');
            } catch (err) {
              showToast('error', err.response?.data?.userMessage || 'Không thể ghi sổ phiếu xuất kho');
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
