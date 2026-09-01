import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import MasterDetailLayout from '../../components/ui/MasterDetailLayout/MasterDetailLayout';
import UnpostConfirmModal from '../../components/ui/UnpostConfirmModal/UnpostConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../utils/datePresets';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as stockTransferApi from '../../api/stockTransferApi';
import * as stocktakeApi from '../../api/stocktakeApi';
import styles from './WarehouseWorkspacePage.module.css';

export default function WarehouseWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'imports';

  // Master Data State
  const [masterList, setMasterList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodPreset, setPeriodPreset] = useState('ALL');

  // Detail State
  const [detailLines, setDetailLines] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Active Row Action Dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Unpost Modal State
  const [unpostModalOpen, setUnpostModalOpen] = useState(false);
  const [targetSlip, setTargetSlip] = useState(null);

  // Toast State
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  // Pagination State for Master Table
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch Master list
  const fetchMasterData = useCallback(async () => {
    try {
      setLoadingMaster(true);
      setSelectedItem(null);
      setDetailLines([]);
      setOpenDropdownId(null);
      setPage(1);

      const params = { keyword: searchTerm };
      if (periodPreset !== 'ALL') {
        const range = getDateRangePreset(periodPreset);
        if (range?.fromDate) params.fromDate = range.fromDate;
        if (range?.toDate) params.toDate = range.toDate;
      }

      if (activeTab === 'imports') {
        const res = await importApi.getImportHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (data.length > 0) setSelectedItem(data[0]);
      } else if (activeTab === 'exports') {
        const res = await exportApi.getExportHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (data.length > 0) setSelectedItem(data[0]);
      } else if (activeTab === 'transfers') {
        const res = await stockTransferApi.getTransferHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (data.length > 0) setSelectedItem(data[0]);
      } else if (activeTab === 'stocktakes') {
        const res = await stocktakeApi.getStocktakes(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (data.length > 0) setSelectedItem(data[0]);
      }
    } catch (err) {
      console.error('Error loading warehouse master list:', err);
      showToast('danger', 'Không thể tải danh sách chứng từ kho');
    } finally {
      setLoadingMaster(false);
    }
  }, [activeTab, searchTerm, periodPreset]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Fetch Detail when selected item changes
  useEffect(() => {
    if (!selectedItem?.id) {
      setDetailLines([]);
      return;
    }
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        if (activeTab === 'imports') {
          const res = await importApi.getImportDetail(selectedItem.id);
          const data = res.data?.data || res.data;
          setDetailLines(data.lines || []);
        } else if (activeTab === 'exports') {
          const res = await exportApi.getExportDetail(selectedItem.id);
          const data = res.data?.data || res.data;
          setDetailLines(data.lines || []);
        } else if (activeTab === 'transfers') {
          const res = await stockTransferApi.getTransferDetail(selectedItem.id);
          const data = res.data?.data || res.data;
          setDetailLines(data.lines || []);
        } else if (activeTab === 'stocktakes') {
          const res = await stocktakeApi.getStocktakeDetail(selectedItem.id);
          const data = res.data?.data || res.data;
          setDetailLines(data.lines || []);
        }
      } catch (err) {
        console.error('Error fetching detail:', err);
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchDetail();
  }, [selectedItem, activeTab]);

  // Handle Unpost
  const handleCheckDependency = () => {
    const slipToCheck = targetSlip || selectedItem;
    if (!slipToCheck) return Promise.reject();
    if (activeTab === 'imports') {
      return importApi.checkImportUnpost(slipToCheck.id);
    }
    return exportApi.checkExportUnpost(slipToCheck.id);
  };

  const handleConfirmUnpost = async (reason) => {
    const slipToUnpost = targetSlip || selectedItem;
    if (!slipToUnpost) return;
    try {
      if (activeTab === 'imports') {
        await importApi.unpostImportSlip(slipToUnpost.id, reason);
      } else {
        await exportApi.unpostExportSlip(slipToUnpost.id, reason);
      }
      showToast('success', `Đã bỏ ghi sổ chứng từ ${slipToUnpost.docCode || slipToUnpost.code}`);
      fetchMasterData();
    } catch (err) {
      showToast('danger', 'Lỗi bỏ ghi sổ: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrint = (slip) => {
    const s = slip || selectedItem;
    if (!s) {
      showToast('info', 'Vui lòng chọn một chứng từ để in');
      return;
    }
    if (activeTab === 'imports') {
      printImportSlip({ ...s, lines: detailLines });
    } else {
      printExportSlip({ ...s, lines: detailLines });
    }
  };

  // Open Form
  const handleOpenForm = (slip) => {
    if (!slip) return;
    navigate(`/warehouse-workspace/${activeTab === 'imports' ? 'imports' : 'exports'}/${slip.id}`);
  };

  // Status badge renderer
  const renderStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'POSTED' || s === 'COMPLETED') {
      return (
        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
          <i className="fas fa-check" style={{ marginRight: 4 }}></i>Đã ghi sổ
        </span>
      );
    }
    if (s === 'APPROVED') {
      return (
        <span className={`${styles.badge} ${styles.badgeInfo}`}>
          <i className="fas fa-check-double" style={{ marginRight: 4 }}></i>Đã duyệt
        </span>
      );
    }
    if (s === 'UNPOSTED') {
      return (
        <span className={`${styles.badge} ${styles.badgeWarning}`}>
          <i className="fas fa-undo" style={{ marginRight: 4 }}></i>Bỏ ghi sổ
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles.badgeDraft}`}>
        <i className="fas fa-clock" style={{ marginRight: 4 }}></i>Chờ ghi sổ
      </span>
    );
  };

  // MASTER COLUMNS
  const masterColumns = useMemo(() => [
    {
      key: 'postedDate',
      label: 'Ngày ghi sổ',
      width: '115px',
      render: (_, r) => {
        const isPosted = r.status === 'POSTED' || r.status === 'COMPLETED';
        return isPosted ? (r.postedAt ? new Date(r.postedAt).toLocaleDateString('vi-VN') : r.docDate || '-') : '-';
      }
    },
    { key: 'docDate', label: 'Ngày chứng từ', width: '110px' },
    {
      key: 'docCode',
      label: 'Số chứng từ',
      width: '125px',
      render: (v, r) => (
        <span className={styles.docCodeLink} onClick={() => handleOpenForm(r)} title="Mở chứng từ kho">
          {v || r.code}
        </span>
      )
    },
    {
      key: 'partnerCode',
      label: 'Mã đối tác',
      width: '110px',
      render: (_, r) => r.partnerCode || (r.partnerId ? `DT${String(r.partnerId).padStart(5, '0')}` : '-')
    },
    {
      key: 'partnerName',
      label: 'Đối tác / Khách hàng / NCC',
      width: '180px',
      render: (v) => (
        <span
          style={{
            display: 'block',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={v || '-'}
        >
          {v || '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '125px',
      render: (v) => renderStatus(v)
    },
    {
      key: 'note',
      label: 'Ghi chú',
      width: '220px',
      render: (v, r) => {
        const noteText = v || `${activeTab === 'imports' ? 'Nhập hàng từ' : 'Xuất hàng cho'} ${r.partnerName || ''}`;
        return (
          <span
            style={{
              display: 'block',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={noteText}
          >
            {noteText}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '100px',
      render: (_, r) => {
        const isPosted = r.status === 'POSTED' || r.status === 'COMPLETED';
        const isOpen = openDropdownId === r.id;

        return (
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.misaActionLink}
              onClick={() => setOpenDropdownId(isOpen ? null : r.id)}
            >
              {isPosted ? 'Xem' : 'Thực hiện'} <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }}></i>
            </button>

            {isOpen && (
              <div className={styles.actionDropdownMenu}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setOpenDropdownId(null);
                    handleOpenForm(r);
                  }}
                >
                  <i className="fas fa-edit"></i> {isPosted ? 'Xem chi tiết' : 'Ghi sổ / Quét Serial'}
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setOpenDropdownId(null);
                    handlePrint(r);
                  }}
                >
                  <i className="fas fa-print"></i> In phiếu
                </button>
                {isPosted && (
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    onClick={() => {
                      setOpenDropdownId(null);
                      setTargetSlip(r);
                      setUnpostModalOpen(true);
                    }}
                  >
                    <i className="fas fa-undo-alt"></i> Bỏ ghi sổ
                  </button>
                )}
              </div>
            )}
          </div>
        );
      }
    }
  ], [activeTab, openDropdownId, handleOpenForm, handlePrint]);

  // DETAIL COLUMNS
  const detailColumns = useMemo(() => [
    { key: 'stt', label: '#', width: '45px', render: (_, __, idx) => idx + 1 },
    {
      key: 'sku',
      label: 'Mã hàng (SKU)',
      width: '130px',
      render: (_, r) => <strong style={{ color: 'var(--color-primary)' }}>{r.sku || r.productSku || '-'}</strong>
    },
    {
      key: 'productName',
      label: 'Tên hàng hóa, quy cách',
      width: '240px',
      render: (_, r) => {
        const text = r.productName || r.variantName || '-';
        return (
          <span
            style={{
              display: 'block',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={text}
          >
            {text}
          </span>
        );
      }
    },
    { key: 'warehouseName', label: 'Kho hàng', width: '120px', render: (_, r) => r.warehouseName || r.warehouseCode || 'Kho chính' },
    { key: 'unitName', label: 'ĐVT', width: '80px', render: (_, r) => r.unitName || r.baseUnitName || 'Chiếc' },
    {
      key: 'expectedQuantity',
      label: 'SL Yêu cầu',
      width: '100px',
      render: (_, r) => (
        <span style={{ textAlign: 'right', display: 'block', fontWeight: '500' }}>
          {Number(r.expectedQuantity || r.quantity || 0).toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'actualQuantity',
      label: activeTab === 'imports' ? 'SL Thực nhập' : 'SL Thực xuất',
      width: '110px',
      render: (_, r) => (
        <span style={{ textAlign: 'right', display: 'block', fontWeight: '700', color: 'var(--color-primary)' }}>
          {Number(r.quantityIn || r.quantityOut || r.actualQuantity || r.expectedQuantity || 0).toLocaleString('vi-VN')}
        </span>
      )
    },
    {
      key: 'note',
      label: 'Ghi chú dòng',
      width: '180px',
      render: (v) => (
        <span
          style={{
            display: 'block',
            maxWidth: '180px',
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
  ], [activeTab]);

  return (
    <AdminLayout>
      <div className={styles.pageContainer} onClick={() => setOpenDropdownId(null)}>
        {/* HEADER BAR: TITLE & PERSONA BADGE */}
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Bàn làm việc Thủ kho</h1>
            <span className={styles.personaBadge}>
              <i className="fas fa-boxes"></i> Chế độ Thủ kho
            </span>
          </div>

          <div className={styles.headerRightActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={fetchMasterData}
              title="Tải lại dữ liệu"
            >
              <i className="fas fa-sync-alt"></i> Nạp lại
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => handlePrint(selectedItem)}
              title="In chứng từ đang chọn"
              disabled={!selectedItem}
            >
              <i className="fas fa-print"></i> In phiếu
            </button>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & DATE FILTER */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchBox}>
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo số phiếu, đối tác, ghi chú..."
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
            onRowDoubleClick={handleOpenForm}
            masterLoading={loadingMaster}
            detailTitle="Danh sách hàng hóa chi tiết"
            detailColumns={detailColumns}
            detailData={detailLines}
            detailLoading={loadingDetail}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
        </div>

        {/* UNPOST MODAL */}
        <UnpostConfirmModal
          open={unpostModalOpen}
          onClose={() => setUnpostModalOpen(false)}
          docCode={(targetSlip || selectedItem)?.docCode || (targetSlip || selectedItem)?.code}
          onCheckDependency={handleCheckDependency}
          onConfirmUnpost={handleConfirmUnpost}
          docType={activeTab === 'imports' ? 'nhập kho' : 'xuất kho'}
        />

        {/* TOAST FEEDBACK */}
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}
