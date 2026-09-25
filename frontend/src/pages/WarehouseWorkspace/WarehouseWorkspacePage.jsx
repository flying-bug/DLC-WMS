import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import MasterDetailLayout from '../../components/ui/MasterDetailLayout/MasterDetailLayout';
import UnpostConfirmModal from '../../components/ui/UnpostConfirmModal/UnpostConfirmModal';
import RowActionMenu from '../../components/ui/RowActionMenu/RowActionMenu';
import Toast from '../../components/ui/Toast/Toast';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import { printStocktakeReports } from '../../utils/printStocktakeReports';
import { getDateRangePreset } from '../../utils/datePresets';
import { formatDateOnly } from '../../utils/dateFormat';
import {
  IMPORT_PURPOSE_OPTIONS,
  EXPORT_PURPOSE_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
  STOCKTAKE_STATUS_OPTIONS,
} from '../../utils/documentFilterOptions';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as stocktakeApi from '../../api/stocktakeApi';
import { getMyWarehouses } from '../../api/warehouseApi';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import styles from './WarehouseWorkspacePage.module.css';
import useSessionState from '../../hooks/useSessionState';

// Gộp các đối tác đã thấy trong danh sách để làm tùy chọn lọc (không cần quyền xem danh mục NCC/khách hàng).
function mergePartners(previous = [], rows = []) {
  const known = new Map(previous.map((partner) => [String(partner.id), partner]));
  rows.forEach((row) => {
    if (row.partnerId && !known.has(String(row.partnerId))) {
      known.set(String(row.partnerId), { id: row.partnerId, name: row.partnerName || `#${row.partnerId}` });
    }
  });
  if (known.size === previous.length) return previous;
  return [...known.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
}

export default function WarehouseWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'imports';

  // Master Data State
  const [masterList, setMasterList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  // Đổi tab (phiếu nhập <-> phiếu xuất) thì bỏ chọn ngay trong lượt render này: nếu để effect chi tiết chạy với phiếu
  // của tab cũ, nó gọi API của tab mới bằng id phiếu kia ("Không tìm thấy phiếu nhập/xuất kho", có thể hiện nhầm dòng).
  const [selectionTab, setSelectionTab] = useState(activeTab);
  if (selectionTab !== activeTab) {
    setSelectionTab(activeTab);
    setSelectedItem(null);
    setSelectedItems([]);
  }
  const selectedItemRef = useRef(selectedItem);
  useEffect(() => { selectedItemRef.current = selectedItem; }, [selectedItem]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useSessionState('searchTerm', '');
  const [periodPreset, setPeriodPreset] = useSessionState('periodPreset', 'ALL');
  const [fromDate, setFromDate] = useSessionState('fromDate', '');
  const [toDate, setToDate] = useSessionState('toDate', '');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useSessionState('selectedWarehouseId', '');
  // Bộ lọc riêng theo từng tab (trạng thái / loại phiếu / đối tác) - mỗi tab có bộ tùy chọn khác nhau.
  const [tabFilters, setTabFilters] = useSessionState('tabFilters', {});
  const [knownPartners, setKnownPartners] = useState({});
  const { status: statusFilter = '', issuePurpose: purposeFilter = '', partnerId: partnerFilter = '' } = tabFilters[activeTab] || {};

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
        setSelectedItems([]);
        setDetailLines([]);
        setOpenDropdownId(null);
        setPage(1);
      }

      const params = { keyword: searchTerm };
      if (selectedWarehouseId) {
        params.warehouseId = selectedWarehouseId;
      }
      if (statusFilter) params.status = statusFilter;
      if (activeTab !== 'stocktakes') {
        if (purposeFilter) params.issuePurpose = purposeFilter;
        if (partnerFilter) params.partnerId = partnerFilter;
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
        setKnownPartners((prev) => ({ ...prev, imports: mergePartners(prev.imports, data) }));
        if (!silent && data.length > 0) {
          setSelectedItem(data[0]);
        } else if (silent && selectedItemRef.current) {
          const fresh = data.find((it) => it.id === selectedItemRef.current.id);
          if (fresh) setSelectedItem({ ...fresh });
        }
      } else if (activeTab === 'exports') {
        const res = await exportApi.getExportHistory(params);
        const data = res.data?.data || res.data || [];
        setMasterList(data);
        setKnownPartners((prev) => ({ ...prev, exports: mergePartners(prev.exports, data) }));
        if (!silent && data.length > 0) {
          setSelectedItem(data[0]);
        } else if (silent && selectedItemRef.current) {
          const fresh = data.find((it) => it.id === selectedItemRef.current.id);
          if (fresh) setSelectedItem({ ...fresh });
        }
      } else if (activeTab === 'stocktakes') {
        const stParams = {
          stocktakeCode: searchTerm || undefined,
          warehouseId: selectedWarehouseId || undefined,
          status: statusFilter || undefined,
          fromDate: params.fromDate,
          toDate: params.toDate,
        };
        const res = await stocktakeApi.getStocktakes(stParams);
        const data = res.data?.data?.content || res.data?.content || res.data?.data || res.data || [];
        const arr = Array.isArray(data) ? data : [];
        setMasterList(arr);
        if (!silent && arr.length > 0) {
          setSelectedItem(arr[0]);
        } else if (silent && selectedItemRef.current) {
          const fresh = arr.find((it) => it.id === selectedItemRef.current.id);
          if (fresh) setSelectedItem({ ...fresh });
        }
      }
    } catch (err) {
      console.error('Error loading warehouse master list:', err);
      if (!silent) showToast('error', 'Không thể tải danh sách chứng từ kho');
    } finally {
      if (!silent) setLoadingMaster(false);
    }
  }, [activeTab, searchTerm, periodPreset, fromDate, toDate, selectedWarehouseId, statusFilter, purposeFilter, partnerFilter]);

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
      setLoadingDetail(false);
      return undefined;
    }
    // Chọn phiếu khác (hoặc đổi tab) trước khi phản hồi cũ về thì bỏ phản hồi đó, không ghi đè chi tiết phiếu đang chọn.
    let cancelled = false;
    const fetchDetail = async () => {
      try {
        setLoadingDetail(true);
        let res = null;
        if (activeTab === 'imports') {
          res = await importApi.getImportDetail(selectedItem.id);
        } else if (activeTab === 'exports') {
          res = await exportApi.getExportDetail(selectedItem.id);
        } else if (activeTab === 'stocktakes') {
          res = await stocktakeApi.getStocktakeDetail(selectedItem.id);
        }
        if (res && !cancelled) {
          const data = res.data?.data || res.data;
          setDetailLines(data.lines || []);
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching detail:', err);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    fetchDetail();
    return () => { cancelled = true; };
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

  const handlePrint = async (slip) => {
    const slips = slip
      ? [slip]
      : selectedItems.length > 0
        ? selectedItems
        : selectedItem
          ? [selectedItem]
          : [];
    if (slips.length === 0) {
      showToast('info', 'Vui lòng chọn ít nhất một chứng từ để in');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      showToast('error', 'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup để in phiếu.');
      return;
    }

    try {
      const documents = await Promise.all(slips.map(async (item) => {
        if (slips.length === 1 && item.id === selectedItem?.id && detailLines.length > 0) {
          return { ...item, lines: detailLines };
        }
        const response = activeTab === 'imports'
          ? await importApi.getImportDetail(item.id)
          : activeTab === 'exports'
            ? await exportApi.getExportDetail(item.id)
            : await stocktakeApi.getStocktakeDetail(item.id);
        const detail = response.data?.data || response.data || {};
        return { ...item, ...detail, lines: detail.lines || [] };
      }));

      if (activeTab === 'imports') {
        printImportSlip(documents, { printWindow, onError: (message) => showToast('error', message) });
      } else if (activeTab === 'exports') {
        printExportSlip(documents, { printWindow, onError: (message) => showToast('error', message) });
      } else {
        printStocktakeReports(documents, { printWindow, onError: (message) => showToast('error', message) });
      }
    } catch (error) {
      printWindow.close();
      console.error('Error loading documents for printing:', error);
      showToast('error', 'Không thể tải đủ dữ liệu để in chứng từ');
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
          render: (v) => v ? formatDateOnly(v) : '-'
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
          return isPosted ? (r.postedAt ? formatDateOnly(r.postedAt) : formatDateOnly(r.docDate) || '-') : '-';
        }
      },
      {
        key: 'docDate',
        label: 'Ngày chứng từ',
        width: '110px',
        render: (v) => v ? formatDateOnly(v) : '-'
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

  // Giữ tham chiếu ổn định để hộp lọc đang mở không bị reset mỗi lần danh sách tự làm mới.
  const popoverFilters = useMemo(() => ({
    preset: periodPreset,
    fromDate,
    toDate,
    warehouseId: selectedWarehouseId,
    status: statusFilter,
    issuePurpose: purposeFilter,
    partnerId: partnerFilter,
  }), [periodPreset, fromDate, toDate, selectedWarehouseId, statusFilter, purposeFilter, partnerFilter]);

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
              className={`${styles.btnSecondary} ${styles.iconOnlyButton}`}
              onClick={fetchMasterData}
              title="Tải lại dữ liệu"
              aria-label="Tải lại dữ liệu"
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => handlePrint()}
              title={selectedItems.length > 0 ? `In ${selectedItems.length} chứng từ đã chọn` : 'In chứng từ đang chọn'}
              disabled={!selectedItem && selectedItems.length === 0}
            >
              <i className="bi bi-printer"></i> In phiếu{selectedItems.length > 1 ? ` (${selectedItems.length})` : ''}
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
              filters={popoverFilters}
              onApply={(newFilters) => {
                setPeriodPreset(newFilters.preset || 'CUSTOM');
                setFromDate(newFilters.fromDate || '');
                setToDate(newFilters.toDate || '');
                setSelectedWarehouseId(newFilters.warehouseId || '');
                setTabFilters((prev) => ({
                  ...prev,
                  [activeTab]: {
                    status: newFilters.status || '',
                    issuePurpose: newFilters.issuePurpose || '',
                    partnerId: newFilters.partnerId || '',
                  },
                }));
              }}
              onReset={() => {
                setPeriodPreset('ALL');
                setFromDate('');
                setToDate('');
                setSelectedWarehouseId(warehouses.length === 1 ? String(warehouses[0].id) : '');
                setTabFilters((prev) => ({ ...prev, [activeTab]: {} }));
              }}
              warehouses={warehouses}
              partners={activeTab === 'stocktakes' ? [] : (knownPartners[activeTab] || [])}
              partnerLabel={activeTab === 'exports' ? 'Khách hàng' : 'Nhà cung cấp / Đối tác'}
              purposeOptions={activeTab === 'imports' ? IMPORT_PURPOSE_OPTIONS : activeTab === 'exports' ? EXPORT_PURPOSE_OPTIONS : []}
              purposeLabel={activeTab === 'exports' ? 'Loại phiếu xuất' : 'Loại phiếu nhập'}
              statusOptions={activeTab === 'stocktakes' ? STOCKTAKE_STATUS_OPTIONS : DOCUMENT_STATUS_OPTIONS}
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
            selectionMode="multiple"
            selectedItems={selectedItems}
            onSelectedItemsChange={setSelectedItems}
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
