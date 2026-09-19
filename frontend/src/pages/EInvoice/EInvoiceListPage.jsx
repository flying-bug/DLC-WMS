import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import CancelInvoiceModal from './components/CancelInvoiceModal';
import ReplaceInvoiceModal from './components/ReplaceInvoiceModal';
import AdjustInvoiceModal from './components/AdjustInvoiceModal';
import EInvoicePreviewModal from './components/EInvoicePreviewModal';
import * as einvoiceApi from '../../api/einvoiceApi';
import styles from './EInvoiceListPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';

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
  const [selectedInvoiceForReplace, setSelectedInvoiceForReplace] = useState(null);
  const [selectedInvoiceForAdjust, setSelectedInvoiceForAdjust] = useState(null);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const showToast = (type, message) => setToast({ isVisible: true, type, message });

  const loadData = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, [keyword, status, page, size]);
  useRealtimeRefresh(['E_INVOICE'], loadData);

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

  const columns = [
    {
      title: '#',
      width: '45px',
      align: 'center',
      render: (_, __, idx) => <span style={{ color: 'var(--wms-text-subtle)', fontSize: '12px' }}>{page * size + idx + 1}</span>
    },
    {
      title: 'Số HĐ',
      width: '110px',
      render: (_, inv) => (
        <span
          className={styles.invoiceNum}
          onClick={() => setSelectedInvoiceForPreview(inv)}
          title="Nhấn để xem bản thể hiện HĐĐT"
        >
          {inv.invoiceNumber || 'Chưa cấp số'}
        </span>
      )
    },
    {
      title: 'Ký hiệu',
      width: '90px',
      render: (_, inv) => <span className={styles.monoText} style={{ fontWeight: 600, color: 'var(--wms-text-muted)' }}>{inv.invoiceSeries}</span>
    },
    {
      title: 'Ngày lập',
      width: '105px',
      render: (_, inv) => <span className={styles.monoText}>{formatDateOnly(inv.invoiceDate)}</span>
    },
    {
      title: 'Người mua / Đơn vị',
      render: (_, inv) => (
        <div style={{ minWidth: '220px' }}>
          <div style={{ fontWeight: 600, color: 'var(--wms-text-title)' }}>
            {inv.buyerLegalName || inv.buyerName || 'Khách lẻ'}
          </div>
          {inv.buyerPhone && (
            <div style={{ fontSize: '11px', color: 'var(--wms-text-muted)', marginTop: '2px' }}>
              <i className="bi bi-telephone" style={{ marginRight: '4px' }} />{inv.buyerPhone}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Mã số thuế',
      width: '130px',
      render: (_, inv) => (
        inv.buyerTaxCode ? (
          <span className={styles.taxBadge} title="Mã số thuế doanh nghiệp">
            {inv.buyerTaxCode}
          </span>
        ) : (
          <span style={{ color: 'var(--wms-border-strong)' }}>—</span>
        )
      )
    },
    {
      title: 'Đơn bán hàng',
      width: '130px',
      render: (_, inv) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inv.soCode && (
            <span
              style={{ color: 'var(--color-info-hover)', cursor: 'pointer', fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}
              onClick={() => navigate(`/sales-orders/${inv.salesOrderId}`)}
              title="Xem chi tiết đơn bán hàng"
            >
              <i className="bi bi-cart3" style={{ marginRight: '4px' }} />{inv.soCode}
            </span>
          )}
          {inv.exportDocCode && (
            <span
              style={{ color: 'var(--wms-success)', cursor: 'pointer', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}
              onClick={() => navigate(`/exports/edit/${inv.inventoryDocumentId}`)}
              title="Xem phiếu xuất kho"
            >
              PXK: {inv.exportDocCode}
            </span>
          )}
          {!inv.soCode && !inv.exportDocCode && (
            <span style={{ color: 'var(--wms-border-strong)' }}>—</span>
          )}
        </div>
      )
    },
    {
      title: 'Tổng thanh toán',
      width: '140px',
      align: 'right',
      render: (_, inv) => <span className={styles.moneyText}>{Number(inv.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
    },
    {
      title: 'Cơ quan thuế',
      width: '150px',
      render: (_, inv) => (
        <>
          <div className={styles.cqtPill}>
            <i className="bi bi-shield-check" /> {inv.cqtCode ? 'Đã cấp mã' : 'Hợp lệ'}
          </div>
          {inv.cqtCode && (
            <div
              style={{ fontSize: '10px', color: 'var(--wms-text-muted)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', marginTop: '2px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={inv.cqtCode}
            >
              {inv.cqtCode}
            </div>
          )}
        </>
      )
    },
    {
      title: 'Trạng thái',
      width: '140px',
      render: (_, inv) => {
        const st = STATUS_MAP[inv.status] || { label: inv.status, className: styles.statusIssued, icon: 'bi-check' };
        return (
          <>
            <span className={`${styles.statusPill} ${st.className}`}>
              <span className={styles.statusDot} />
              {st.label}
            </span>
            {inv.status === 'CANCELED' && (
              <div className={styles.cancelInfoBox} title={`Hủy bởi: ${inv.canceledByName || 'Quản trị viên'}`}>
                <div><strong>Lý do:</strong> {inv.cancelReason || '—'}</div>
                {inv.canceledByName && <div style={{ color: 'var(--wms-text-muted)', fontSize: '10px' }}>Bởi: {inv.canceledByName}</div>}
              </div>
            )}
            {inv.originalInvoiceNumber && (
              <div style={{ fontSize: '10px', color: 'var(--wms-text-muted)', marginTop: '2px' }}>
                ← HĐ gốc: {inv.originalInvoiceNumber}
              </div>
            )}
          </>
        )
      }
    }
  ];

  const renderActions = (inv) => (
    <div className={styles.actionBtnGroup}>
      <button
        className={styles.actionBtn}
        title="Xem bản thể hiện HĐĐT"
        onClick={() => setSelectedInvoiceForPreview(inv)}
      >
        <i className="bi bi-eye" /> Xem
      </button>
      {/* TẠM ẨN CÁC NÚT THAY THẾ, ĐIỀU CHỈNH, HỦY THEO YÊU CẦU
      {inv.status === 'ISSUED' && (
        <>
          <button
            className={styles.actionBtn}
            title="Thay thế hóa đơn"
            onClick={() => setSelectedInvoiceForReplace(inv)}
          >
            <i className="bi bi-arrow-repeat" /> Thay thế
          </button>
          <button
            className={styles.actionBtn}
            title="Điều chỉnh hóa đơn"
            onClick={() => setSelectedInvoiceForAdjust(inv)}
          >
            <i className="bi bi-pencil-square" /> Điều chỉnh
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            title="Hủy hóa đơn"
            onClick={() => setSelectedInvoiceForCancel(inv)}
          >
            <i className="bi bi-x-circle" /> Hủy
          </button>
        </>
      )}
      */}
    </div>
  );

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
              <div className={styles.kpiIconWrapper} style={{ background: '#f0f9ff', color: 'var(--color-info-hover)' }}>
                <i className="bi bi-collection" />
              </div>
            </div>
            <div className={styles.kpiValue}>{kpis.total}</div>
            <div className={styles.kpiSub}>Toàn bộ bản ghi trên hệ thống</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiLabel}>Đã Phát Hành</span>
              <div className={styles.kpiIconWrapper} style={{ background: 'var(--wms-success-soft)', color: 'var(--color-success-alt)' }}>
                <i className="bi bi-check-circle" />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: 'var(--wms-success)' }}>{kpis.issued}</div>
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
              <div className={styles.kpiIconWrapper} style={{ background: '#eef2ff', color: 'var(--wms-primary)' }}>
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
            <ResponsiveTable
              columns={columns}
              data={invoices}
              loading={loading}
              emptyMessage="Không tìm thấy hóa đơn điện tử nào"
              actions={renderActions}
            />
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

        {/* Modal Thay thế HĐĐT */}
        <ReplaceInvoiceModal
          invoice={selectedInvoiceForReplace}
          isOpen={Boolean(selectedInvoiceForReplace)}
          onClose={() => setSelectedInvoiceForReplace(null)}
          onSuccess={() => {
            showToast('success', 'Thay thế hóa đơn điện tử thành công');
            loadData();
          }}
        />

        {/* Modal Điều chỉnh HĐĐT */}
        <AdjustInvoiceModal
          invoice={selectedInvoiceForAdjust}
          isOpen={Boolean(selectedInvoiceForAdjust)}
          onClose={() => setSelectedInvoiceForAdjust(null)}
          onSuccess={() => {
            showToast('success', 'Điều chỉnh hóa đơn điện tử thành công');
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


