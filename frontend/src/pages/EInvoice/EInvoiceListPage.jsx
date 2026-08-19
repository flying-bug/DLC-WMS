import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import Pagination from '../../components/ui/Pagination/Pagination';
import CancelInvoiceModal from './components/CancelInvoiceModal';
import * as einvoiceApi from '../../api/einvoiceApi';
import { getBaseURL } from '../../api/axiosClient';
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
    } catch (err) {
      showToast('error', 'Không thể tải danh sách hóa đơn điện tử');
    } finally {
      setLoading(false);
    }
  }, [keyword, status, page, size]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPreview = (invoice) => {
    if (invoice.transactionUuid) {
      window.open(`${getBaseURL()}/einvoices/preview/${invoice.transactionUuid}`, '_blank');
    } else if (invoice.viewUrl) {
      window.open(invoice.viewUrl, '_blank');
    } else {
      showToast('warning', 'Không tìm thấy liên kết xem hóa đơn');
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className="bi bi-receipt" /> Quản Lý Hóa Đơn Điện Tử
          </h1>
        </div>

        {/* Filter Card */}
        <div className={styles.filterCard}>
          <div className={styles.searchBox}>
            <i className="bi bi-search" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo số HĐ, ký hiệu, tên người mua, MST hoặc mã đơn..."
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
            <option value="DRAFT">Nháp</option>
            <option value="CANCELED">Đã hủy</option>
          </select>
        </div>

        {/* Table Card */}
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ width: 110 }}>Số HĐ</th>
                  <th style={{ width: 90 }}>Ký hiệu</th>
                  <th style={{ width: 100 }}>Ngày lập</th>
                  <th>Người mua / Đơn vị</th>
                  <th style={{ width: 120 }}>Mã số thuế</th>
                  <th style={{ width: 120 }}>Đơn bán hàng</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Tổng thanh toán</th>
                  <th style={{ width: 130 }}>Trạng thái CQT</th>
                  <th style={{ width: 130 }}>Trạng thái</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      <i className="bi bi-arrow-repeat spin" style={{ marginRight: 8 }} /> Đang tải danh sách hóa đơn...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Không tìm thấy hóa đơn điện tử nào
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => {
                    const st = STATUS_MAP[inv.status] || { label: inv.status, className: styles.statusIssued, icon: 'bi-check' };
                    return (
                      <tr key={inv.id}>
                        <td style={{ textAlign: 'center', color: '#94a3b8' }}>{page * size + idx + 1}</td>
                        <td>
                          <strong style={{ color: '#1e40af', cursor: 'pointer' }} onClick={() => handleOpenPreview(inv)}>
                            {inv.invoiceNumber || 'Chưa cấp số'}
                          </strong>
                        </td>
                        <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{inv.invoiceSeries}</span></td>
                        <td>{inv.invoiceDate}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{inv.buyerLegalName || inv.buyerName || 'Khách lẻ'}</div>
                          {inv.buyerPhone && <div style={{ fontSize: '11px', color: '#64748b' }}>SĐT: {inv.buyerPhone}</div>}
                        </td>
                        <td>
                          {inv.buyerTaxCode ? (
                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                              {inv.buyerTaxCode}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {inv.soCode && (
                              <span
                                style={{ color: '#0284c7', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                                onClick={() => navigate(`/sales-orders/${inv.salesOrderId}`)}
                                title="Xem đơn bán hàng"
                              >
                                {inv.soCode}
                              </span>
                            )}
                            {inv.exportDocCode && (
                              <span
                                style={{ color: '#059669', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                                onClick={() => navigate(`/exports/edit/${inv.inventoryDocumentId}`)}
                                title="Xem phiếu xuất kho đợt giao này"
                              >
                                PXK: {inv.exportDocCode}
                              </span>
                            )}
                            {!inv.soCode && !inv.exportDocCode && (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>
                          {Number(inv.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <div className={styles.cqtBadge}>
                            <i className="bi bi-shield-check" /> {inv.cqtCode ? 'Đã cấp mã' : 'Hợp lệ'}
                          </div>
                          {inv.cqtCode && (
                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {inv.cqtCode}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${st.className}`}>
                            <i className={`bi ${st.icon}`} /> {st.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              className={styles.actionBtn}
                              title="Xem trực tuyến mẫu hóa đơn"
                              onClick={() => handleOpenPreview(inv)}
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

          <div className={styles.pagination}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Tổng số: <strong>{totalElements}</strong> hóa đơn điện tử
            </div>
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p - 1)}
            />
          </div>
        </div>

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
