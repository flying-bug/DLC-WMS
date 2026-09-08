import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import MasterDetailLayout from '../../components/ui/MasterDetailLayout/MasterDetailLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import * as paymentApi from '../../api/paymentApi';
import styles from './CashierWorkspacePage.module.css';

export default function CashierWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'receipts';

  // Master State
  const [masterList, setMasterList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');

  // Detail State
  const [detailData, setDetailData] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toast & Modal State
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmPostItem, setConfirmPostItem] = useState(null);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  // Fetch Master Data
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      setSelectedItem(null);
      setDetailData([]);
      setPage(1);

      let type = '';
      if (activeTab === 'receipts') type = 'RECEIPT';
      else if (activeTab === 'vouchers') type = 'VOUCHER';
      else if (activeTab === 'cash-book') type = '';

      const params = { type, keyword: searchTerm };
      if (periodPreset !== 'ALL') {
        const range = getDateRangePreset(periodPreset);
        if (range?.fromDate) params.fromDate = range.fromDate;
        if (range?.toDate) params.toDate = range.toDate;
      }

      const res = await paymentApi.getAllPayments(params);
      const data = res.data?.data || res.data || [];
      setMasterList(data);
      if (data.length > 0) setSelectedItem(data[0]);
    } catch (err) {
      console.error('Error loading payments list:', err);
      showToast('danger', 'Không thể tải danh sách phiếu thu/chi');
    } finally {
      setLoadingMaster(false);
    }
  }, [activeTab, searchTerm, periodPreset]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Load Detail for selected payment
  useEffect(() => {
    if (!selectedItem?.partnerId) {
      setDetailData([]);
      return;
    }
    const fetchLedger = async () => {
      try {
        setLoadingDetail(true);
        const res = await paymentApi.getPartnerLedgerDetails(selectedItem.partnerId);
        const data = res.data?.data || res.data || [];
        setDetailData(data);
      } catch (err) {
        console.error('Error loading partner ledger:', err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchLedger();
  }, [selectedItem]);

  // Handle Post / Ghi sổ quỹ
  const handleConfirmPost = async () => {
    if (!confirmPostItem) return;
    try {
      await paymentApi.postPayment(confirmPostItem.id);
      showToast('success', `Đã ghi sổ quỹ thành công cho phiếu ${confirmPostItem.code || confirmPostItem.id}`);
      setConfirmPostItem(null);
      fetchMasterData();
    } catch (err) {
      showToast('danger', 'Lỗi ghi sổ quỹ: ' + (err.response?.data?.message || err.message));
    }
  };

  const renderStatus = (status) => {
    if (!status) return '-';
    const s = String(status).toUpperCase();
    if (s === 'POSTED') {
      return (
        <span className={`${styles.badge} ${styles.badgePosted}`}>
          <i className="fas fa-check" style={{ marginRight: 4 }}></i>Đã ghi sổ quỹ
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles.badgeDraft}`}>
        <i className="fas fa-clock" style={{ marginRight: 4 }}></i>Chờ ghi sổ
      </span>
    );
  };

  const formatCurrency = (val) => {
    if (val == null) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  // Master Columns
  const masterColumns = useMemo(() => [
    {
      key: 'createdAt',
      label: 'Ngày chứng từ',
      width: '120px',
      render: (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-')
    },
    {
      key: 'code',
      label: 'Số phiếu',
      width: '130px',
      render: (v) => <strong style={{ color: 'var(--color-primary)' }}>{v}</strong>
    },
    {
      key: 'type',
      label: 'Loại nghiệp vụ',
      width: '120px',
      render: (v) => (
        <span style={{ fontWeight: 600, color: v === 'RECEIPT' ? 'var(--color-success-deep)' : 'var(--color-danger-deep)' }}>
          {v === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
        </span>
      )
    },
    { key: 'partnerName', label: 'Đối tác / Người nộp / Nhận', width: '200px' },
    {
      key: 'amount',
      label: 'Số tiền (VNĐ)',
      width: '140px',
      render: (v) => (
        <span style={{ fontWeight: '700', color: 'var(--color-text-strong)', textAlign: 'right', display: 'block' }}>
          {formatCurrency(v)}
        </span>
      )
    },
    {
      key: 'paymentMethod',
      label: 'Hình thức',
      width: '120px',
      render: (v) => (v === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt')
    },
    { key: 'status', label: 'Trạng thái', width: '130px', render: renderStatus },
    {
      key: 'note',
      label: 'Ghi chú',
      width: '240px',
      render: (v) => (
        <span
          style={{
            display: 'block',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={v || '-'}
        >
          {v || '-'}
        </span>
      )
    }
  ], []);

  // Detail Columns (Sổ công nợ / Hạch toán chi tiết)
  const detailColumns = useMemo(() => [
    {
      key: 'docDate',
      label: 'Ngày phát sinh',
      width: '120px',
      render: (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-')
    },
    { key: 'docType', label: 'Loại nghiệp vụ', width: '150px' },
    { key: 'docCode', label: 'Mã chứng từ liên quan', width: '150px', render: (v) => <strong>{v}</strong> },
    {
      key: 'debitAmount',
      label: 'Phát sinh Tăng (Nợ)',
      width: '150px',
      render: (v) => (
        <span style={{ color: 'var(--color-danger)', fontWeight: 600, textAlign: 'right', display: 'block' }}>
          {formatCurrency(v)}
        </span>
      )
    },
    {
      key: 'creditAmount',
      label: 'Phát sinh Giảm (Có)',
      width: '150px',
      render: (v) => (
        <span style={{ color: 'var(--color-success)', fontWeight: 600, textAlign: 'right', display: 'block' }}>
          {formatCurrency(v)}
        </span>
      )
    },
    {
      key: 'description',
      label: 'Ghi chú',
      width: '220px',
      render: (v) => (
        <span
          style={{
            display: 'block',
            maxWidth: '220px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={v || '-'}
        >
          {v || '-'}
        </span>
      )
    }
  ], []);

  return (
    <AdminLayout>
      <div className={styles.pageContainer}>
        {/* HEADER BAR: TITLE & PERSONA BADGE */}
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Bàn làm việc Thủ quỹ</h1>
            <span className={styles.personaBadge}>
              <i className="fas fa-cash-register"></i> Chế độ Thủ quỹ
            </span>
          </div>

          <div className={styles.headerRightActions}>
            {selectedItem && selectedItem.status === 'DRAFT' && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setConfirmPostItem(selectedItem)}
              >
                <i className="fas fa-check"></i> Ghi sổ quỹ
              </button>
            )}

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={fetchMasterData}
              title="Tải lại dữ liệu"
            >
              <i className="fas fa-sync-alt"></i> Nạp lại
            </button>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & PERIOD FILTER */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo mã phiếu, đối tác..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className={styles.periodSelect}
              value={periodPreset}
              onChange={(e) => setPeriodPreset(e.target.value)}
            >
              <option value="ALL">Kỳ: Toàn bộ thời gian</option>
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Kỳ: {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MASTER - DETAIL LAYOUT */}
        <div className={styles.workspaceLayoutWrapper}>
          <MasterDetailLayout
            masterColumns={masterColumns}
            masterData={masterList}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            masterLoading={loadingMaster}
            detailTitle={
              selectedItem
                ? `Lịch sử đối soát công nợ đối tác: ${selectedItem.partnerName || ''}`
                : 'Chi tiết đối soát giao dịch'
            }
            detailColumns={detailColumns}
            detailData={detailData}
            detailLoading={loadingDetail}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        </div>

        {/* CONFIRM POST MODAL */}
        <ConfirmModal
          isOpen={!!confirmPostItem}
          title="Xác nhận Ghi sổ quỹ"
          message={`Xác nhận Ghi sổ quỹ cho phiếu "${confirmPostItem?.code}"? Tiền sẽ được cập nhật chính thức vào sổ quỹ.`}
          confirmText="Ghi sổ quỹ"
          onConfirm={handleConfirmPost}
          onCancel={() => setConfirmPostItem(null)}
        />

        {/* TOAST */}
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}
