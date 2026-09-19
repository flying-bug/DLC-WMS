import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import MasterDetailLayout from '../../components/ui/MasterDetailLayout/MasterDetailLayout';
import UnpostConfirmModal from '../../components/ui/UnpostConfirmModal/UnpostConfirmModal';
import RowActionMenu from '../../components/ui/RowActionMenu/RowActionMenu';
import Toast from '../../components/ui/Toast/Toast';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import { getDateRangePreset } from '../../utils/datePresets';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as stocktakeApi from '../../api/stocktakeApi';
import { getMyWarehouses } from '../../api/warehouseApi';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

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

  // Load User Assigned Warehouses
  useEffect(() => {
    const loadWh = async () => {
      try {
        const res = await getMyWarehouses();
        const list = res.data?.data || res.data || [];
        setWarehouses(list);
        if (list.length === 1) {
          setSelectedWarehouseId(String(list[0].id));
        }
      } catch (err) {
        console.error('Failed to load user warehouses', err);
      }
    };
    loadWh();
  }, []);

  // Fetch Master list. `silent` skips the loading spinner and keeps the
  // current selection/page untouched, so the periodic background refresh
  // below doesn't yank the warehouse worker out of the row they're viewing.
  const fetchMasterData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoadingMaster(true);
        setSelectedItem(null);
        setDetailLines([]);
        setOpenDropdownId(null);
        setPage(1);
      }

      const params = { keyword: searchTerm };
      if (selectedWarehouseId) {
        params.warehouseId = selectedWarehouseId;
      }
      if (periodPreset === 'CUSTOM') {
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
      } else if (periodPreset !== 'ALL') {
        const range = getDateRangePreset(periodPreset);
        if (range?.fromDate) params.fromDate = range.fromDate;
        if (range?.toDate) params.toDate = range.toDate;
      }

      if (activeTab === 'imports') {
        const res = await importApi.getImportHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (!silent && data.length > 0) setSelectedItem(data[0]);
      } else if (activeTab === 'exports') {
        const res = await exportApi.getExportHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        if (!silent && data.length > 0) setSelectedItem(data[0]);
      } else if (activeTab === 'stocktakes') {
        const stParams = {
          stocktakeCode: searchTerm || undefined,
          warehouseId: selectedWarehouseId || undefined,
          fromDate: params.fromDate,
          toDate: params.toDate,
        };
        const res = await stocktakeApi.getStocktakes(stParams);
        const data = res.data?.data?.content || res.data?.content || res.data?.data || res.data || [];
        const arr = Array.isArray(data) ? data : [];
        setMasterList(arr);
        if (!silent && arr.length > 0) setSelectedItem(arr[0]);
      }
    } catch (err) {
      console.error('Error loading warehouse master list:', err);
      if (!silent) showToast('error', 'Không thể tải danh sách chứng từ kho');
    } finally {
      if (!silent) setLoadingMaster(false);
    }
  }, [activeTab, searchTerm, periodPreset, fromDate, toDate, selectedWarehouseId]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Tự làm mới danh sách khi phiếu nhập/xuất/kiểm kê đổi ở nơi khác (SSE data-changed), giữ nguyên dòng đang chọn.
  useRealtimeRefresh(
    ['IMPORT_DOCUMENT', 'EXPORT_DOCUMENT', 'STOCKTAKE'],
    ({ silent } = {}) => fetchMasterData(silent)
  );

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

  // Unpost cancels the old document and the backend returns the new DRAFT
  // document it was reissued as, so refresh the list (silently, so it doesn't
  // reset selection to whatever now sorts first) and select the new document.
  const handleConfirmUnpost = async (reason) => {
    const slipToUnpost = targetSlip || selectedItem;
    if (!slipToUnpost) return;
    try {
      const res = activeTab === 'imports'
        ? await importApi.unpostImportSlip(slipToUnpost.id, reason)
        : await exportApi.unpostExportSlip(slipToUnpost.id, reason);
      const newDoc = res.data?.data;
      showToast('success', `Đã bỏ ghi sổ. Đã tạo phiếu mới ${newDoc?.docCode || ''} để tiếp tục chỉnh sửa.`);
      await fetchMasterData(true);
      if (newDoc?.id) {
        setSelectedItem({ id: newDoc.id, docCode: newDoc.docCode });
      }
    } catch (err) {
      showToast('error', 'Lỗi bỏ ghi sổ: ' + (err.response?.data?.message || err.message));
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
    if (activeTab === 'stocktakes') {
      navigate(`/stocktakes/${slip.id}`);
      return;
    }
    navigate(`/warehouse-workspace/${activeTab === 'imports' ? 'imports' : 'exports'}/${slip.id}`);
  };

  // Status badge renderer
  const renderStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'POSTED' || s === 'COMPLETED') {
      return (
        <span className={`${styles.badge} ${styles.badgeSuccess}`}>
          <i className="bi bi-check" style={{ marginRight: 4 }}></i>Đã ghi sổ
        </span>
      );
    }
    if (s === 'APPROVED') {
      return (
        <span className={`${styles.badge} ${styles.badgeInfo}`}>
          <i className="bi bi-check2-all" style={{ marginRight: 4 }}></i>Đã duyệt
        </span>
      );
    }
    if (s === 'UNPOSTED') {
      return (
        <span className={`${styles.badge} ${styles.badgeWarning}`}>
          <i className="bi bi-arrow-counterclockwise" style={{ marginRight: 4 }}></i>Bỏ ghi sổ
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className={`${styles.badge} ${styles.badgeDanger}`}>
          <i className="bi bi-x-circle" style={{ marginRight: 4 }}></i>Đã hủy
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles.badgeDraft}`}>
        <i className="bi bi-clock" style={{ marginRight: 4 }}></i>Chờ ghi sổ
      </span>
    );
  };

  // MASTER COLUMNS
  const masterColumns = useMemo(() => {
    if (activeTab === 'stocktakes') {
      return [
        {
          key: 'stocktakeDate',
          label: 'Ngày kiểm kê',
          width: '120px',
          render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '-'
        },
        {
          key: 'stocktakeCode',
          label: 'Số kiểm kê',
          width: '130px',
          render: (v, r) => (
            <span className={styles.docCodeLink} onClick={() => handleOpenForm(r)} title="Mở bảng kiểm kê">
              {v || r.code}
            </span>
          )
        },
        {
          key: 'warehouseName',
          label: 'Kho kiểm kê',
          width: '160px',
          render: (v, r) => v || (r.warehouseId ? `Kho #${r.warehouseId}` : '-')
        },
        {
          key: 'purpose',
          label: 'Mục đích kiểm kê',
          width: '200px',
          render: (v) => (
            <span style={{ display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v || '-'}>
              {v || '-'}
            </span>
          )
        },
        {
          key: 'conclusion',
          label: 'Kết luận',
          width: '200px',
          render: (v) => (
            <span style={{ display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v || '-'}>
              {v || '-'}
            </span>
          )
        },
        {
          key: 'status',
          label: 'Trạng thái',
          width: '130px',
          render: (v) => {
            const isPosted = v === 'POSTED';
            return isPosted ? (
              <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                <i className="bi bi-check" style={{ marginRight: 4 }}></i>Đã xử lý
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeDraft}`}>
                <i className="bi bi-clock" style={{ marginRight: 4 }}></i>Lưu tạm
              </span>
            );
          }
        },
        {
          key: 'actions',
          label: 'Thao tác',
          width: '100px',
          render: (_, r) => {
            const isOpen = openDropdownId === r.id;
            return (
              <RowActionMenu
                open={isOpen}
                onToggle={() => setOpenDropdownId(isOpen ? null : r.id)}
                buttonClassName={styles.misaActionLink}
                menuClassName={styles.actionDropdownMenu}
              >
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setOpenDropdownId(null);
                    handleOpenForm(r);
                  }}
                >
                  <i className="bi bi-eye"></i> Xem chi tiết
                </button>
              </RowActionMenu>
            );
          }
        }
      ];
    }

    return [
      {
        key: 'postedDate',
        label: 'Ngày ghi sổ',
        width: '115px',
        render: (_, r) => {
          const isPosted = r.status === 'POSTED' || r.status === 'COMPLETED';
          return isPosted ? (r.postedAt ? new Date(r.postedAt).toLocaleDateString('vi-VN') : r.docDate || '-') : '-';
        }
      },
      {
        key: 'docDate',
        label: 'Ngày chứng từ',
        width: '110px',
        render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '-'
      },
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
          const isTransferDoc = r.issuePurpose === 'TRANSFER_EXPORT' || r.issuePurpose === 'TRANSFER_IMPORT';
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
              {isTransferDoc && (
                <span className={`${styles.badge} ${styles.badgeInfo}`} style={{ marginRight: 6 }}>
                  Chuyển kho
                </span>
              )}
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
            <RowActionMenu
              open={isOpen}
              onToggle={() => setOpenDropdownId(isOpen ? null : r.id)}
              buttonClassName={styles.misaActionLink}
              menuClassName={styles.actionDropdownMenu}
              label={isPosted ? 'Xem' : 'Thực hiện'}
            >
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setOpenDropdownId(null);
                  handleOpenForm(r);
                }}
              >
                <i className="bi bi-pencil"></i> {isPosted ? 'Xem chi tiết' : 'Ghi sổ / Quét Serial'}
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setOpenDropdownId(null);
                  handlePrint(r);
                }}
              >
                <i className="bi bi-printer"></i> In phiếu
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
                  <i className="bi bi-arrow-counterclockwise"></i> Bỏ ghi sổ
                </button>
              )}
            </RowActionMenu>
          );
        }
      }
    ];
  }, [activeTab, openDropdownId, handleOpenForm, handlePrint]);

  // DETAIL COLUMNS
  const detailColumns = useMemo(() => {
    if (activeTab === 'stocktakes') {
      return [
        { key: 'stt', label: '#', width: '45px', render: (_, __, idx) => idx + 1 },
        {
          key: 'sku',
          label: 'Mã hàng (SKU)',
          width: '130px',
          render: (_, r) => <strong style={{ color: 'var(--color-primary)' }}>{r.sku || r.itemCode || r.variantSku || '-'}</strong>
        },
        {
          key: 'productName',
          label: 'Tên hàng hóa, quy cách',
          width: '240px',
          render: (_, r) => {
            const text = r.itemName || r.productName || r.variantName || '-';
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
        { key: 'unitName', label: 'ĐVT', width: '80px', render: (_, r) => r.unit || r.unitName || r.baseUnitName || 'Chiếc' },
        {
          key: 'bookQty',
          label: 'SL Sổ sách',
          width: '110px',
          render: (_, r) => (
            <span style={{ textAlign: 'right', display: 'block', fontWeight: '500' }}>
              {Number(r.bookQty ?? r.bookQuantity ?? 0).toLocaleString('vi-VN')}
            </span>
          )
        },
        {
          key: 'countQty',
          label: 'SL Kiểm kê',
          width: '110px',
          render: (_, r) => (
            <span style={{ textAlign: 'right', display: 'block', fontWeight: '700', color: 'var(--color-primary)' }}>
              {Number(r.countQty ?? r.actualQuantity ?? 0).toLocaleString('vi-VN')}
            </span>
          )
        },
        {
          key: 'diffQty',
          label: 'Chênh lệch',
          width: '110px',
          render: (_, r) => {
            const diff = Number(r.diffQty ?? r.diffQuantity ?? 0);
            const color = diff > 0 ? '#16a34a' : diff < 0 ? 'var(--wms-danger)' : 'inherit';
            return (
              <span style={{ textAlign: 'right', display: 'block', fontWeight: '700', color }}>
                {diff > 0 ? `+${diff.toLocaleString('vi-VN')}` : diff.toLocaleString('vi-VN')}
              </span>
            );
          }
        },
        {
          key: 'action',
          label: 'Xử lý chênh lệch',
          width: '150px',
          render: (_, r) => r.action || '-'
        }
      ];
    }

    return [
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
    ];
  }, [activeTab]);

  return (
    <AdminLayout>
      <div className={styles.pageContainer} onClick={() => setOpenDropdownId(null)}>
        {/* HEADER BAR: TITLE & PERSONA BADGE */}
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Bàn làm việc Thủ kho</h1>
            <span className={styles.personaBadge}>
              <i className="bi bi-boxes"></i> Chế độ Thủ kho
            </span>
          </div>

          <div className={styles.headerRightActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={fetchMasterData}
              title="Tải lại dữ liệu"
            >
              <i className="bi bi-arrow-repeat"></i> Nạp lại
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => handlePrint(selectedItem)}
              title="In chứng từ đang chọn"
              disabled={!selectedItem}
            >
              <i className="bi bi-printer"></i> In phiếu
            </button>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & DATE FILTER */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchBox}>
              <i className={`bi bi-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo số phiếu, đối tác, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={() => setSearchTerm('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  title="Xóa tìm kiếm"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>

            <FilterPopover
              filters={{ preset: periodPreset, fromDate, toDate, warehouseId: selectedWarehouseId }}
              onApply={(newFilters) => {
                setPeriodPreset(newFilters.preset || 'CUSTOM');
                setFromDate(newFilters.fromDate || '');
                setToDate(newFilters.toDate || '');
                setSelectedWarehouseId(newFilters.warehouseId || '');
              }}
              onReset={() => {
                setPeriodPreset('ALL');
                setFromDate('');
                setToDate('');
                setSelectedWarehouseId(warehouses.length === 1 ? String(warehouses[0].id) : '');
              }}
              warehouses={warehouses}
            />
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
            sharedPagination
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
