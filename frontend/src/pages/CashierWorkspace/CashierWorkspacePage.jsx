import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import MasterDetailLayout from '../../components/ui/MasterDetailLayout/MasterDetailLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import { printPaymentReceipt } from '../../utils/printPaymentReceipt';
import * as paymentApi from '../../api/paymentApi';
import styles from './CashierWorkspacePage.module.css';


export default function CashierWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'requests';
  const [requestFilterType, setRequestFilterType] = useState('ALL'); // 'ALL' | 'RECEIPT' | 'VOUCHER'

  // Master State
  const [rawList, setRawList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodPreset, setPeriodPreset] = useState('THIS_MONTH');
  const [fromDate, setFromDate] = useState(() => getDateRangePreset('THIS_MONTH')?.fromDate || '');
  const [toDate, setToDate] = useState(() => getDateRangePreset('THIS_MONTH')?.toDate || '');

  const handlePeriodPresetChange = (val) => {
    setPeriodPreset(val);
    if (val === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (val !== 'CUSTOM') {
      const range = getDateRangePreset(val);
      if (range) {
        setFromDate(range.fromDate || '');
        setToDate(range.toDate || '');
      }
    }
  };

  // Detail State
  const [detailData, setDetailData] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Active Row Action Dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toast & Modal State
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const [confirmPostItem, setConfirmPostItem] = useState(null);
  const [unpostItem, setUnpostItem] = useState(null);
  const [unpostReason, setUnpostReason] = useState('');
  const [submittingUnpost, setSubmittingUnpost] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  // Fetch Master Data
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      setSelectedItem(null);
      setDetailData([]);
      setPage(1);

      const res = await paymentApi.getAllPayments();
      const data = res.data?.data || res.data || [];
      setRawList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading payments list:', err);
      showToast('danger', 'Không thể tải danh sách phiếu thu/chi');
    } finally {
      setLoadingMaster(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Reset page when activeTab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Filtered master list based on activeTab, requestFilterType, searchTerm, and date range
  const filteredList = useMemo(() => {
    let list = [...rawList];

    // 1. Filter by activeTab and requestFilterType (Thu / Chi / Tất cả)
    if (activeTab === 'requests' || activeTab === 'receipts' || activeTab === 'vouchers') {
      if (requestFilterType === 'RECEIPT') {
        list = list.filter((p) => p.type === 'RECEIPT');
      } else if (requestFilterType === 'VOUCHER') {
        list = list.filter((p) => p.type === 'VOUCHER');
      }
    } else if (activeTab === 'cash-book') {
      list = list.filter((p) => p.paymentMethod === 'CASH');
    } else if (activeTab === 'bank') {
      list = list.filter((p) => p.paymentMethod === 'BANK_TRANSFER');
    }

    // 2. Filter by fromDate & toDate
    if (fromDate) {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(toDate).setHours(23, 59, 59, 999);
      list = list.filter((p) => p.createdAt && new Date(p.createdAt).getTime() <= to);
    }

    // 3. Filter by searchTerm
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.code && p.code.toLowerCase().includes(term)) ||
          (p.partnerName && p.partnerName.toLowerCase().includes(term)) ||
          (p.note && p.note.toLowerCase().includes(term))
      );
    }

    return list;
  }, [rawList, activeTab, requestFilterType, fromDate, toDate, searchTerm]);

  // Keep selectedItem in sync
  useEffect(() => {
    if (filteredList.length > 0) {
      const exists = filteredList.some((item) => item.id === selectedItem?.id);
      if (!exists) {
        setSelectedItem(filteredList[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filteredList, selectedItem]);


  // KPI summary based on filtered list (or current period)
  const kpiStats = useMemo(() => {
    let totalReceipt = 0;
    let totalVoucher = 0;
    let pendingCount = 0;

    filteredList.forEach((p) => {
      const amt = Number(p.amount) || 0;
      if (p.type === 'RECEIPT') totalReceipt += amt;
      else if (p.type === 'VOUCHER') totalVoucher += amt;
      if (p.status === 'DRAFT') pendingCount += 1;
    });

    return {
      totalReceipt,
      totalVoucher,
      netFlow: totalReceipt - totalVoucher,
      pendingCount,
    };
  }, [filteredList]);

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
        setDetailData(Array.isArray(data) ? data : []);
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

  // Handle Unpost / Bỏ ghi sổ quỹ
  const handleConfirmUnpost = async () => {
    if (!unpostItem) return;
    if (!unpostReason.trim()) {
      showToast('warning', 'Vui lòng nhập lý do bỏ ghi sổ');
      return;
    }
    setSubmittingUnpost(true);
    try {
      await paymentApi.unpostPayment(unpostItem.id, unpostReason.trim());
      showToast('success', `Đã bỏ ghi sổ cho phiếu ${unpostItem.code || unpostItem.id}. Hoàn tác dòng tiền và trả về Chờ ghi sổ thành công.`);
      setUnpostItem(null);
      setUnpostReason('');
      fetchMasterData();
    } catch (err) {
      showToast('danger', 'Lỗi bỏ ghi sổ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingUnpost(false);
    }
  };

  // Handle Print Receipt / Voucher
  const handlePrint = (slip) => {
    const item = slip || selectedItem;
    if (!item) {
      showToast('info', 'Vui lòng chọn một phiếu để in');
      return;
    }
    printPaymentReceipt(item, {
      partnerName: item.partnerName || 'Chưa rõ',
      onError: (msg) => showToast('danger', msg),
    });
  };

  const renderStatus = (status) => {
    if (!status) return '-';
    const s = String(status).toUpperCase();
    if (s === 'POSTED') {
      return (
        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
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

  const renderEntityType = (type) => {
    switch (type) {
      case 'PAYMENT_RECEIPT':
        return <span style={{ color: 'var(--color-success-deep)', fontWeight: 600 }}>Phiếu thu tiền</span>;
      case 'PAYMENT_VOUCHER':
        return <span style={{ color: 'var(--color-danger-deep)', fontWeight: 600 }}>Phiếu chi tiền</span>;
      case 'SALES_INVOICE':
        return <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Hóa đơn bán hàng</span>;
      case 'IMPORT_INVOICE':
        return <span style={{ color: '#854d0e', fontWeight: 600 }}>Hóa đơn mua hàng</span>;
      default:
        return type || '-';
    }
  };

  // Master Columns
  const masterColumns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Ngày chứng từ',
        width: '120px',
        render: (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-'),
      },
      {
        key: 'code',
        label: 'Số phiếu',
        width: '130px',
        render: (v) => <strong style={{ color: 'var(--color-primary)' }}>{v}</strong>,
      },
      {
        key: 'type',
        label: 'Loại nghiệp vụ',
        width: '120px',
        render: (v) => (
          <span
            style={{
              fontWeight: 600,
              color: v === 'RECEIPT' ? 'var(--color-success-deep)' : 'var(--color-danger-deep)',
            }}
          >
            {v === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
          </span>
        ),
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
        ),
      },
      {
        key: 'paymentMethod',
        label: 'Hình thức',
        width: '120px',
        render: (v) =>
          v === 'BANK_TRANSFER' ? (
            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
              <i className="fas fa-credit-card" style={{ marginRight: 4 }}></i>Chuyển khoản
            </span>
          ) : (
            <span style={{ color: 'var(--color-success-deep)', fontWeight: 500 }}>
              <i className="fas fa-money-bill-wave" style={{ marginRight: 4 }}></i>Tiền mặt
            </span>
          ),
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
              whiteSpace: 'nowrap',
            }}
            title={v || '-'}
          >
            {v || '-'}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Thao tác',
        width: '130px',
        render: (_, row) => {
          const isOpen = openDropdownId === row.id;
          return (
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.misaActionLink}
                onClick={() => setOpenDropdownId(isOpen ? null : row.id)}
              >
                Xem <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }}></i>
              </button>
              {isOpen && (
                <div className={styles.actionDropdownMenu}>
                  {row.status === 'DRAFT' && (
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => {
                        setOpenDropdownId(null);
                        setConfirmPostItem(row);
                      }}
                    >
                      <i className="fas fa-check"></i> Ghi sổ quỹ
                    </button>
                  )}
                  {row.status === 'POSTED' && (
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={() => {
                        setOpenDropdownId(null);
                        setUnpostItem(row);
                        setUnpostReason('');
                      }}
                    >
                      <i className="fas fa-undo"></i> Bỏ ghi sổ
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setOpenDropdownId(null);
                      handlePrint(row);
                    }}
                  >
                    <i className="fas fa-print"></i> In phiếu
                  </button>
                </div>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // Detail Columns (Sổ công nợ / Hạch toán chi tiết đối tác)
  const detailColumns = useMemo(
    () => [
      {
        key: 'createdAt',
        label: 'Ngày phát sinh',
        width: '120px',
        render: (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '-'),
      },
      {
        key: 'referenceCode',
        label: 'Số chứng từ',
        width: '140px',
        render: (v) => <strong style={{ color: 'var(--color-primary)' }}>{v || '-'}</strong>,
      },
      {
        key: 'entityType',
        label: 'Loại nghiệp vụ',
        width: '150px',
        render: renderEntityType,
      },
      {
        key: 'amountDebt',
        label: 'Phát sinh Tăng (Nợ)',
        width: '150px',
        render: (v) => (
          <span style={{ color: 'var(--color-danger)', fontWeight: 600, textAlign: 'right', display: 'block' }}>
            {Number(v) > 0 ? formatCurrency(v) : '-'}
          </span>
        ),
      },
      {
        key: 'amountReceipt',
        label: 'Phát sinh Giảm (Có)',
        width: '150px',
        render: (v) => (
          <span style={{ color: 'var(--color-success)', fontWeight: 600, textAlign: 'right', display: 'block' }}>
            {Number(v) > 0 ? formatCurrency(v) : '-'}
          </span>
        ),
      },
      {
        key: 'balanceAfter',
        label: 'Dư nợ sau GD',
        width: '150px',
        render: (v) => (
          <span style={{ fontWeight: 700, color: 'var(--color-text-strong)', textAlign: 'right', display: 'block' }}>
            {formatCurrency(v)}
          </span>
        ),
      },
      {
        key: 'note',
        label: 'Ghi chú / Diễn giải',
        width: '240px',
        render: (v) => (
          <span
            style={{
              display: 'block',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={v || '-'}
          >
            {v || '-'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <AdminLayout>
      <div className={styles.pageContainer} onClick={() => setOpenDropdownId(null)}>
        {/* HEADER ROW: TITLE & ACTION BUTTONS */}
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              {activeTab === 'cash-book'
                ? 'Sổ quỹ tiền mặt'
                : activeTab === 'bank'
                  ? 'Tiền gửi ngân hàng'
                  : 'Đề nghị thu, chi tiền'}
            </h1>
            <span className={styles.personaBadge}>
              <i className="fas fa-cash-register"></i> Chế độ Thủ quỹ
            </span>
          </div>

          <div className={styles.headerRightActions}>
            <button
              type="button"
              className={styles.btnReceipt}
              onClick={() => navigate('/payments/receipt')}
              title="Lập phiếu thu tiền mới"
            >
              <i className="fas fa-plus"></i> Lập phiếu thu
            </button>

            <button
              type="button"
              className={styles.btnVoucher}
              onClick={() => navigate('/payments/expense')}
              title="Lập phiếu chi tiền mới"
            >
              <i className="fas fa-plus"></i> Lập phiếu chi
            </button>

            <button
              type="button"
              className={styles.btnPrint}
              disabled={!selectedItem}
              onClick={() => handlePrint()}
              title="In phiếu đang chọn"
            >
              <i className="fas fa-print"></i> In phiếu
            </button>

            {selectedItem && selectedItem.status === 'DRAFT' && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setConfirmPostItem(selectedItem)}
              >
                <i className="fas fa-check"></i> Ghi sổ quỹ
              </button>
            )}

            {selectedItem && selectedItem.status === 'POSTED' && (
              <button
                type="button"
                className={styles.btnUnpost}
                onClick={() => {
                  setUnpostItem(selectedItem);
                  setUnpostReason('');
                }}
                title="Bỏ ghi sổ để hoàn tác dòng tiền và đưa về trạng thái Chờ ghi sổ"
              >
                <i className="fas fa-undo"></i> Bỏ ghi sổ
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

        {/* KPI SUMMARY CARDS */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ background: 'var(--wms-success-soft)', color: 'var(--wms-success)' }}>
              <i className="fas fa-arrow-down"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Tổng thu trong kỳ</span>
              <span className={styles.kpiValue} style={{ color: 'var(--wms-success)' }}>
                {formatCurrency(kpiStats.totalReceipt)}
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ background: '#fef2f2', color: 'var(--wms-danger)' }}>
              <i className="fas fa-arrow-up"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Tổng chi trong kỳ</span>
              <span className={styles.kpiValue} style={{ color: 'var(--wms-danger)' }}>
                {formatCurrency(kpiStats.totalVoucher)}
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ background: 'var(--color-primary-soft)', color: 'var(--wms-primary)' }}>
              <i className="fas fa-wallet"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Dòng tiền ròng (Thu - Chi)</span>
              <span
                className={styles.kpiValue}
                style={{ color: kpiStats.netFlow >= 0 ? 'var(--wms-success)' : 'var(--wms-danger)' }}
              >
                {formatCurrency(kpiStats.netFlow)}
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ background: 'var(--wms-warning-soft)', color: '#d97706' }}>
              <i className="fas fa-clock"></i>
            </div>
            <div className={styles.kpiContent}>
              <span className={styles.kpiLabel}>Chờ ghi sổ quỹ</span>
              <span className={styles.kpiValue} style={{ color: '#d97706' }}>
                {kpiStats.pendingCount} phiếu
              </span>
            </div>
          </div>
        </div>

        {/* TOOLBAR: PERIOD FILTER (3 time fields: Kỳ, Từ ngày, Đến ngày) & TOGGLE THU/CHI & SEARCH */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* Nút toggle lọc nhanh: Tất cả / Thu tiền / Chi tiền khi ở tab Đề nghị thu, chi */}
            {(activeTab === 'requests' || activeTab === 'receipts' || activeTab === 'vouchers') && (
              <div className={styles.segmentedFilter}>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${requestFilterType === 'ALL' ? styles.activeSegment : ''}`}
                  onClick={() => {
                    setRequestFilterType('ALL');
                    setPage(1);
                  }}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${requestFilterType === 'RECEIPT' ? styles.activeSegment : ''}`}
                  onClick={() => {
                    setRequestFilterType('RECEIPT');
                    setPage(1);
                  }}
                >
                  <i className="fas fa-arrow-down" style={{ color: 'var(--wms-success)', marginRight: 4 }}></i>
                  Thu tiền
                </button>
                <button
                  type="button"
                  className={`${styles.segmentBtn} ${requestFilterType === 'VOUCHER' ? styles.activeSegment : ''}`}
                  onClick={() => {
                    setRequestFilterType('VOUCHER');
                    setPage(1);
                  }}
                >
                  <i className="fas fa-arrow-up" style={{ color: 'var(--wms-danger)', marginRight: 4 }}></i>
                  Chi tiền
                </button>
              </div>
            )}

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Kỳ:</span>
              <select
                className={styles.periodSelect}
                value={periodPreset}
                onChange={(e) => handlePeriodPresetChange(e.target.value)}
              >
                {DATE_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Từ:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={fromDate}
                onChange={(e) => {
                  setPeriodPreset('CUSTOM');
                  setFromDate(e.target.value);
                }}
              />
            </div>

            <div className={styles.filterField}>
              <span className={styles.filterLabel}>Đến:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={toDate}
                onChange={(e) => {
                  setPeriodPreset('CUSTOM');
                  setToDate(e.target.value);
                }}
              />
            </div>

            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo mã phiếu, đối tác, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* MASTER - DETAIL LAYOUT */}
        <div className={styles.workspaceLayoutWrapper}>
          <MasterDetailLayout
            masterColumns={masterColumns}
            masterData={filteredList}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            onRowDoubleClick={(item) => handlePrint(item)}
            masterLoading={loadingMaster}
            detailTitle={
              selectedItem
                ? `Lịch sử đối soát công nợ: ${selectedItem.partnerName || ''} (Dư nợ hiện tại: ${formatCurrency(selectedItem.partnerDebtBalance)})`
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

        {/* UNPOST MODAL */}
        {unpostItem && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  <i className="fas fa-undo" style={{ color: 'var(--wms-danger)', marginRight: 8 }}></i>
                  Bỏ ghi sổ phiếu: {unpostItem.code}
                </h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={() => {
                    setUnpostItem(null);
                    setUnpostReason('');
                  }}
                >
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p style={{ color: '#4b5563', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
                  Phiếu này sẽ được <strong>hoàn tác dòng tiền và công nợ đối tác</strong> trên Sổ cái, đồng thời chuyển trạng thái về <strong>Chờ ghi sổ (DRAFT)</strong> để Kế toán chỉnh sửa hoặc xóa.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--color-text-heading)' }}>
                    Lý do bỏ ghi sổ <span style={{ color: 'var(--wms-danger)' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    className={styles.modalTextarea}
                    placeholder="Nhập lý do (VD: Sai số tiền, sai đối tác, chuyển khoản nhầm...)"
                    value={unpostReason}
                    onChange={(e) => setUnpostReason(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setUnpostItem(null);
                    setUnpostReason('');
                  }}
                  disabled={submittingUnpost}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={handleConfirmUnpost}
                  disabled={submittingUnpost || !unpostReason.trim()}
                >
                  {submittingUnpost ? 'Đang hoàn tác...' : 'Xác nhận Bỏ ghi sổ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}
