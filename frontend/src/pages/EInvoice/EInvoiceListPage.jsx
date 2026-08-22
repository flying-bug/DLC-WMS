import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import Pagination from '../../components/ui/Pagination/Pagination';
import CancelInvoiceModal from './components/CancelInvoiceModal';
import EInvoicePreviewModal from './components/EInvoicePreviewModal';
import * as einvoiceApi from '../../api/einvoiceApi';
import styles from './EInvoiceListPage.module.css';

const STATUS_MAP = {
  ISSUED: { label: 'Đã phát hành', className: styles.statusIssued, icon: 'bi-check-circle-fill' },
  DRAFT: { label: 'Nháp', className: styles.statusDraft, icon: 'bi-clock-fill' },
  CANCELED: { label: 'Đã hủy', className: styles.statusCanceled, icon: 'bi-x-circle-fill' },
  REPLACED: { label: 'Đã thay thế', className: styles.statusCanceled, icon: 'bi-arrow-repeat' },
  ADJUSTED: { label: 'Đã điều chỉnh', className: styles.statusIssued, icon: 'bi-pencil-square' },
};

export default function EInvoiceListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState(null);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await einvoiceApi.getEInvoices({
        keyword: keyword.trim() || undefined,
        status: status || undefined,
        page,
        size,
      });
      const data = res.data?.data;
      if (data) {
        setInvoices(data.content || []);
        setTotalElements(data.totalElements || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      showToast('error', 'Không thể tải danh sách hóa đơn điện tử');
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute KPI metrics (Apex UI Pro)
  const kpis = useMemo(() => {
    const issuedCount = invoices.filter(i => i.status === 'ISSUED').length;
    const canceledCount = invoices.filter(i => i.status === 'CANCELED').length;
    const totalRevenue = invoices
      .filter(i => i.status === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

    return {
      total: totalElements,
      issued: issuedCount,
      canceled: canceledCount,
      revenue: totalRevenue,
    };
  }, [invoices, totalElements]);

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ─── Header Section ─── */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>
              <i className={`bi bi-receipt ${styles.titleIcon}`} /> Quản Lý Hóa Đơn Điện Tử
            </h1>
            <p className={styles.subtitle}>
              Theo dõi phát hành, tra cứu mã CQT và quản lý hóa đơn GTGT điện tử theo Nghị định 123/2020/NĐ-CP
            </p>
          </div>
        </div>

        {/* ─── KPI Metrics Cards ─── */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Tổng Hóa Đơn</span>
              <div className={styles.kpiIconWrapper} style={{ background: '#f0f9ff', color: '#0284c7' }}>
                <i className="bi bi-collection" />
              </div>
            </div>
            <div className={styles.kpiValue}>{kpis.total}</div>
            <div className={styles.kpiSub}>Toàn bộ bản ghi trên hệ thống</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Đã Phát Hành</span>
              <div className={styles.kpiIconWrapper} style={{ background: '#ecfdf5', color: '#10b981' }}>
                <i className="bi bi-check-circle" />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#059669' }}>{kpis.issued}</div>
            <div className={styles.kpiSub}>Hợp lệ & đã cấp mã CQT</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Đã Hủy</span>
              <div className={styles.kpiIconWrapper} style={{ background: '#fff1f2', color: '#f43f5e' }}>
                <i className="bi bi-x-circle" />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#e11d48' }}>{kpis.canceled}</div>
            <div className={styles.kpiSub}>Hóa đơn bị hủy có lý do</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Doanh Thu Hóa Đơn (Trang)</span>
              <div className={styles.kpiIconWrapper} style={{ background: '#eef2ff', color: '#6366f1' }}>
                <i className="bi bi-cash-stack" />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: '#4338ca' }}>
              {kpis.revenue.toLocaleString('vi-VN')} đ
            </div>
            <div className={styles.kpiSub}>Giá trị HĐĐT hợp lệ</div>
          </div>
        </div>

        {/* ─── Filter Bar ─── */}
        <div className={styles.filterCard}>
          <div className={styles.searchBox}>
            <i className="bi bi-search" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo số HĐ, ký hiệu, người mua, MST hoặc mã đơn..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(0);
              }}
            />
          </div>

          <select
            className={styles.selectInput}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="ISSUED">Đã phát hành</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="CANCELED">Đã hủy</option>
          </select>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => loadData()}
            title="Làm mới danh sách"
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'}`} /> Làm mới
          </button>
        </div>

        {/* ─── Table Section ─── */}
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '45px', minWidth: '45px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '110px', minWidth: '110px' }}>Số HĐ</th>
                  <th style={{ width: '90px', minWidth: '90px' }}>Ký hiệu</th>
                  <th style={{ width: '105px', minWidth: '105px' }}>Ngày lập</th>
                  <th style={{ minWidth: '220px' }}>Người mua / Đơn vị</th>
                  <th style={{ width: '130px', minWidth: '130px' }}>Mã số thuế</th>
                  <th style={{ width: '130px', minWidth: '130px' }}>Đơn bán hàng</th>
                  <th style={{ width: '140px', minWidth: '140px', textAlign: 'right' }}>Tổng thanh toán</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Cơ quan thuế</th>
                  <th style={{ width: '140px', minWidth: '140px' }}>Trạng thái</th>
                  <th style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <i className="bi bi-arrow-repeat spin" style={{ marginRight: 8, fontSize: '18px' }} /> Đang tải danh sách hóa đơn điện tử...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      <i className="bi bi-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
                      Không tìm thấy hóa đơn điện tử nào
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => {
                    const st = STATUS_MAP[inv.status] || { label: inv.status, className: styles.statusIssued, icon: 'bi-check' };
                    return (
                      <tr key={inv.id}>
                        <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          {page * size + idx + 1}
                        </td>
                        <td>
                          <span
                            className={styles.invoiceNum}
                            onClick={() => setSelectedInvoiceForPreview(inv)}
                            title="Nhấn để xem bản thể hiện HĐĐT"
                          >
                            {inv.invoiceNumber || 'Chưa cấp số'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.monoText} style={{ fontWeight: 600, color: '#475569' }}>
                            {inv.invoiceSeries}
                          </span>
                        </td>
                        <td className={styles.monoText}>
                          {inv.invoiceDate}
                        </td>
                        <td style={{ minWidth: '220px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {inv.buyerLegalName || inv.buyerName || 'Khách lẻ'}
                          </div>
                          {inv.buyerPhone && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              <i className="bi bi-telephone" style={{ marginRight: '4px' }} />{inv.buyerPhone}
                            </div>
                          )}
                        </td>
                        <td>
                          {inv.buyerTaxCode ? (
                            <span className={styles.taxBadge} title="Mã số thuế doanh nghiệp">
                              {inv.buyerTaxCode}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {inv.soCode && (
                              <span
                                style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
                                onClick={() => navigate(`/sales-orders/${inv.salesOrderId}`)}
                                title="Xem chi tiết đơn bán hàng"
                              >
                                <i className="bi bi-cart3" style={{ marginRight: '4px' }} />{inv.soCode}
                              </span>
                            )}
                            {inv.exportDocCode && (
                              <span
                                style={{ color: '#059669', cursor: 'pointer', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}
                                onClick={() => navigate(`/exports/edit/${inv.inventoryDocumentId}`)}
                                title="Xem phiếu xuất kho"
                              >
                                PXK: {inv.exportDocCode}
                              </span>
                            )}
                            {!inv.soCode && !inv.exportDocCode && (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td className={styles.moneyText}>
                          {Number(inv.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <div className={styles.cqtPill}>
                            <i className="bi bi-shield-check" /> {inv.cqtCode ? 'Đã cấp mã' : 'Hợp lệ'}
                          </div>
                          {inv.cqtCode && (
                            <div
                              style={{ fontSize: '10px', color: '#64748b', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={inv.cqtCode}
                            >
                              {inv.cqtCode}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.statusPill} ${st.className}`}>
                            <span className={styles.statusDot} />
                            {st.label}
                          </span>
                          {inv.status === 'CANCELED' && (
                            <div className={styles.cancelInfoBox} title={`Hủy bởi: ${inv.canceledByName || 'Quản trị viên'}`}>
                              <div><strong>Lý do:</strong> {inv.cancelReason || '—'}</div>
                              {inv.canceledByName && <div style={{ color: '#64748b', fontSize: '10px' }}>Bởi: {inv.canceledByName}</div>}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className={styles.actionBtnGroup}>
                            <button
                              className={styles.actionBtn}
                              title="Xem bản thể hiện HĐĐT"
                              onClick={() => setSelectedInvoiceForPreview(inv)}
                            >
                              <i className="bi bi-eye" /> Xem
                            </button>
                            {inv.status === 'ISSUED' && (
                              <button
                                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                title="Hủy hóa đơn"
                                onClick={() => setSelectedInvoiceForCancel(inv)}
                              >
                                <i className="bi bi-x-circle" /> Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={size}
            onPageChange={(newPage) => setPage(newPage)}
            onSizeChange={(newSize) => {
              setSize(newSize);
              setPage(0);
            }}
          />
        </div>

        {/* Modal Xem HĐĐT */}
        <EInvoicePreviewModal
          invoice={selectedInvoiceForPreview}
          isOpen={Boolean(selectedInvoiceForPreview)}
          onClose={() => setSelectedInvoiceForPreview(null)}
        />

        {/* Modal Hủy HĐĐT */}
        <CancelInvoiceModal
          invoice={selectedInvoiceForCancel}
          isOpen={Boolean(selectedInvoiceForCancel)}
          onClose={() => setSelectedInvoiceForCancel(null)}
          onSuccess={() => {
            showToast('success', 'Hủy hóa đơn điện tử thành công');
            loadData();
          }}
        />

        {toast.isVisible && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast((p) => ({ ...p, isVisible: false }))}
          />
        )}
      </div>
    </AdminLayout>
  );
}


