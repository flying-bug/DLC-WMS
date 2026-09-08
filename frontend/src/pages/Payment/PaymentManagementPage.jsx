import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import TimeInfoBadge from '../../components/ui/TimeInfoBadge/TimeInfoBadge';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import * as customerApi from '../../api/customerApi';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import styles from './PaymentManagementPage.module.css';
import { formatDateTime, formatDateOnly } from '../../utils/dateFormat';
import { getDateRangePreset } from '../../utils/datePresets';
import { printPaymentReceipt } from '../../utils/printPaymentReceipt';
import { exportToExcel } from '../../utils/excelExport';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const formatMoneyInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};
const statusText = (status) => (status === 'POSTED' ? 'Đã ghi sổ' : status === 'DRAFT' ? 'Chờ ghi sổ' : status || '-');
const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    height: 38,
    fontSize: 13.5,
    borderColor: state.isFocused ? 'var(--color-primary, var(--wms-primary))' : 'var(--wms-border-strong)',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.12)' : 'none',
  }),
  valueContainer: (base) => ({ ...base, height: 38, padding: '0 10px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  indicatorsContainer: (base) => ({ ...base, height: 38 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

function PaymentManagementPage({ initialMode = 'RECEIPT' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Data sources
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const DEFAULT_FILTERS = useMemo(() => {
    const range = getDateRangePreset('THIS_YEAR');
    return {
      keyword: '',
      fromDate: range?.fromDate || '',
      toDate: range?.toDate || '',
      preset: 'THIS_YEAR',
      status: '',
      partnerId: '',
      paymentMethod: '',
    };
  }, []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form inputs inside modal
  const [formPartnerId, setFormPartnerId] = useState(null);
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formNote, setFormNote] = useState('');
  const [debtBalance, setDebtBalance] = useState(0);

  // Toast
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  // Load Lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [customerRes, supplierRes] = await Promise.allSettled([
          customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
          purchaseOrderApi.getSuppliers({ size: 1000 }),
        ]);
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (supplierRes.status === 'fulfilled') {
          setSuppliers(pageContent(unwrap(supplierRes.value)).filter(s => s.status !== 'INACTIVE'));
        }
      } catch (err) {
        console.error('Error loading lookups', err);
      }
    };
    loadLookups();
  }, []);

  // Fetch all payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await paymentApi.getAllPayments();
      const list = unwrap(res) || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error loading payments:', err);
      showToast('error', 'Không thể tải danh sách phiếu thu/chi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Reset selection & page on mode change
  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [mode]);

  // Load debt balance when formPartnerId changes in modal
  useEffect(() => {
    if (!formPartnerId) {
      setDebtBalance(0);
      return;
    }
    const loadDebt = async () => {
      try {
        const res = await paymentApi.getPartnerDebtBalance(formPartnerId);
        setDebtBalance(Number(unwrap(res) || 0));
      } catch (err) {
        console.error('Failed to load debt balance', err);
      }
    };
    loadDebt();
  }, [formPartnerId]);

  // Partner options for Select
  const partnerOptions = useMemo(() => {
    const source = mode === 'RECEIPT' ? customers : suppliers;
    return source.map(p => ({
      value: p.id,
      label: `${p.code || ''} - ${p.name || ''}${p.phone ? ` (${p.phone})` : ''}`,
    }));
  }, [customers, mode, suppliers]);

  const selectedPartner = partnerOptions.find(opt => opt.value === formPartnerId) || null;

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // 1. Filter by current mode
      if (p.type !== mode) return false;

      // 2. Filter by status
      if (filters.status && p.status !== filters.status) return false;

      // 3. Filter by partner
      if (filters.partnerId && String(p.partnerId) !== String(filters.partnerId)) return false;

      // 4. Filter by payment method
      if (filters.paymentMethod && p.paymentMethod !== filters.paymentMethod) return false;

      // 5. Filter by Date range
      if (filters.fromDate) {
        const from = new Date(filters.fromDate).setHours(0, 0, 0, 0);
        if (p.createdAt && new Date(p.createdAt).getTime() < from) return false;
      }
      if (filters.toDate) {
        const to = new Date(filters.toDate).setHours(23, 59, 59, 999);
        if (p.createdAt && new Date(p.createdAt).getTime() > to) return false;
      }

      // 6. Filter by Keyword
      if (filters.keyword && filters.keyword.trim()) {
        const kw = filters.keyword.trim().toLowerCase();
        const haystack = `${p.code || ''} ${p.partnerName || ''} ${p.note || ''}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }

      return true;
    });
  }, [payments, mode, filters]);

  // Pagination calculation
  const totalItems = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safePage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (safePage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = safePage - 1; i <= safePage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Checkbox handlers
  const isAllSelected = paginatedRows.length > 0 && paginatedRows.every(r => selectedIds.includes(r.id));
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !paginatedRows.some(r => r.id === id)));
    } else {
      const pageIds = paginatedRows.map(r => r.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormPartnerId(null);
    setFormAmount('');
    setFormPaymentMethod('CASH');
    setFormNote('');
    setDebtBalance(0);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleStartEdit = (item) => {
    setEditingItem(item);
    setFormPartnerId(item.partnerId);
    setFormAmount(String(item.amount || ''));
    setFormPaymentMethod(item.paymentMethod || 'CASH');
    setFormNote(item.note || '');
    setShowFormModal(true);
  };

  // Submit Form Modal
  const submitForm = async () => {
    if (!formPartnerId) {
      showToast('error', mode === 'RECEIPT' ? 'Vui lòng chọn khách hàng' : 'Vui lòng chọn nhà cung cấp');
      return;
    }
    const numericAmount = Number(digitsOnly(formAmount) || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast('error', 'Số tiền phải lớn hơn 0');
      return;
    }
    if (numericAmount > Number(debtBalance || 0)) {
      showToast('error', 'Số tiền không được vượt quá công nợ hiện tại');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        partnerId: Number(formPartnerId),
        amount: numericAmount,
        paymentMethod: formPaymentMethod,
        note: formNote || undefined,
        status: 'DRAFT',
      };

      if (editingItem) {
        await paymentApi.updatePayment(editingItem.id, payload);
        showToast('success', 'Cập nhật đề nghị thành công');
      } else {
        if (mode === 'RECEIPT') {
          await paymentApi.createReceipt(payload);
        } else {
          await paymentApi.createVoucher(payload);
        }
        showToast('success', 'Lập đề nghị thành công (Chuyển Thủ quỹ ghi sổ quỹ)');
      }

      setShowFormModal(false);
      setEditingItem(null);
      await fetchPayments();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể lưu đề nghị thu/chi');
    } finally {
      setSaving(false);
    }
  };

  // Delete Draft Payment
  const handleConfirmDelete = async () => {
    if (!deletingItem?.id) return;
    try {
      await paymentApi.deletePayment(deletingItem.id);
      showToast('success', `Đã xóa phiếu nháp ${deletingItem.code}`);
      setDeletingItem(null);
      await fetchPayments();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không thể xóa phiếu nháp');
    }
  };

  // Export to Excel
  const handleExport = () => {
    const listToExport = selectedIds.length > 0
      ? filteredPayments.filter(p => selectedIds.includes(p.id))
      : filteredPayments;

    if (listToExport.length === 0) {
      showToast('warning', 'Không có dữ liệu để xuất Excel');
      return;
    }

    const headers = ['Mã phiếu', 'Ngày lập', 'Loại phiếu', 'Đối tác', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ghi chú'];
    const data = listToExport.map(item => [
      item.code,
      item.createdAt ? formatDateOnly(item.createdAt) : '',
      item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi',
      item.partnerName || item.partnerCode || '',
      item.amount,
      item.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt',
      item.status === 'POSTED' ? 'Đã ghi sổ' : 'Chờ ghi sổ',
      item.note || ''
    ]);
    exportToExcel(headers, data, `Danh_sach_${mode === 'RECEIPT' ? 'phieu_thu' : 'phieu_chi'}_${new Date().toISOString().slice(0, 10)}`);
    showToast('success', `Đã xuất ${listToExport.length} phiếu ra Excel`);
  };

  // Bulk Print
  const handleBulkPrint = () => {
    const listToPrint = filteredPayments.filter(p => selectedIds.includes(p.id));
    if (listToPrint.length === 0) return;
    listToPrint.forEach(item => {
      printPaymentReceipt(item, { partnerName: item.partnerName, salespersonName: '' });
    });
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        {/* HEADER SECTION: TIÊU ĐỀ & CÁC NÚT ĐIỀU HƯỚNG */}
        <div className={styles.pageTitleContainer}>
          <div className={styles.titleWrapper}>
            <div className={styles.breadcrumb}>
              <span>Thu chi</span>
              <i className="bi bi-chevron-right" style={{ fontSize: 10, margin: '0 6px', color: 'var(--wms-text-subtle)' }} />
              <span style={{ color: 'var(--wms-text-title)', fontWeight: 600 }}>{mode === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}</span>
            </div>
            <h1 className={styles.pageTitle}>
              {mode === 'RECEIPT' ? 'Danh sách phiếu thu tiền' : 'Danh sách phiếu chi tiền'}
            </h1>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab} ${mode === 'RECEIPT' ? styles.modeTabActive : ''}`}
                onClick={() => navigate('/payments/receipt')}
              >
                <i className="bi bi-arrow-down-circle-fill" style={{ color: 'var(--wms-success)' }} /> Phiếu thu
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${mode === 'VOUCHER' ? styles.modeTabActive : ''}`}
                onClick={() => navigate('/payments/expense')}
              >
                <i className="bi bi-arrow-up-circle-fill" style={{ color: 'var(--wms-danger)' }} /> Phiếu chi
              </button>
            </div>

            <button
              type="button"
              className={styles.btnCashierLink}
              onClick={() => navigate('/cashier-workspace')}
              title="Mở Bàn làm việc Thủ quỹ"
            >
              <i className="bi bi-cash-stack" /> Bàn làm việc Thủ quỹ
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleOpenCreate}
            >
              <i className="bi bi-plus-lg" /> {mode === 'RECEIPT' ? 'Lập phiếu thu' : 'Lập phiếu chi'}
            </button>
          </div>
        </div>

        {/* FILTER SECTION: THANH LỌC CHUẨN ERP */}
        <div className={styles.filterSection}>
          <div className={styles.searchAndPopover}>
            <div className={styles.searchBox}>
              <i className="bi bi-search" />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Tìm theo mã phiếu, đối tác, ghi chú..."
                value={filters.keyword}
                onChange={(e) => {
                  setCurrentPage(1);
                  setFilters(prev => ({ ...prev, keyword: e.target.value }));
                }}
              />
              {filters.keyword && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setCurrentPage(1);
                    setFilters(prev => ({ ...prev, keyword: '' }));
                  }}
                >
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>

            <TimeInfoBadge filters={filters} />
          </div>

          <div className={styles.filterActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              title="Đặt lại bộ lọc"
            >
              <i className="bi bi-arrow-clockwise" />
            </button>

            <FilterPopover
              filters={filters}
              onApply={(newFilters) => {
                setCurrentPage(1);
                setFilters(newFilters);
              }}
              onReset={() => {
                setCurrentPage(1);
                setFilters(DEFAULT_FILTERS);
              }}
              partners={mode === 'RECEIPT' ? customers : suppliers}
              partnerLabel={mode === 'RECEIPT' ? 'Khách hàng' : 'Nhà cung cấp'}
              statusOptions={[
                { value: 'POSTED', label: 'Đã ghi sổ' },
                { value: 'DRAFT', label: 'Chờ ghi sổ' },
              ]}
              customSelects={[
                {
                  field: 'paymentMethod',
                  label: 'Phương thức',
                  options: [
                    { value: '', label: 'Tất cả' },
                    { value: 'CASH', label: 'Tiền mặt' },
                    { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
                  ],
                },
              ]}
              showDateRange={true}
            />

            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleExport}
              title="Xuất tệp Excel"
            >
              <i className="bi bi-file-earmark-excel" style={{ color: '#16a34a' }} />
            </button>
          </div>
        </div>

        {/* TABLE CONTAINER: KHUNG BẢNG TOÀN TRANG CHUẨN ERP */}
        <div className={styles.tableContainer}>
          <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: '130px' }}>Ngày lập</th>
                  <th style={{ width: '150px' }}>Số phiếu</th>
                  <th style={{ width: '110px' }}>Loại phiếu</th>
                  <th>{mode === 'RECEIPT' ? 'Khách hàng' : 'Nhà cung cấp'}</th>
                  <th style={{ width: '130px' }}>Phương thức</th>
                  <th style={{ width: '150px' }} className={styles.textRight}>Số tiền</th>
                  <th style={{ width: '120px' }} className={styles.textCenter}>Trạng thái</th>
                  <th>Ghi chú</th>
                  <th style={{ width: '110px' }} className={styles.textCenter}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className={styles.emptyTable}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: 'spin 1s linear infinite' }} />
                        <span>Đang tải dữ liệu chứng từ thu/chi...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={styles.emptyTable}>
                      Không tìm thấy phiếu thu/chi nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map(item => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                        />
                      </td>
                      <td>{formatPaymentDateTime(item.createdAt)}</td>
                      <td>
                        <span
                          className={styles.codeLink}
                          onClick={() => setDetailItem(item)}
                          title="Bấm để xem chi tiết phiếu"
                        >
                          {item.code}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: item.type === 'RECEIPT' ? 'var(--wms-success)' : 'var(--wms-danger)' }}>
                          {item.type === 'RECEIPT' ? 'Phiếu thu' : 'Phiếu chi'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--wms-text-title)' }}>
                          {item.partnerName || item.partnerCode || (item.partnerId ? `#${item.partnerId}` : '-')}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          <i className={item.paymentMethod === 'BANK_TRANSFER' ? 'bi bi-bank' : 'bi bi-cash'} />
                          {item.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </span>
                      </td>
                      <td className={styles.textRight}>
                        <span className={item.type === 'RECEIPT' ? styles.amountReceipt : styles.amountVoucher}>
                          {item.type === 'RECEIPT' ? '+' : '-'}{money(item.amount)} đ
                        </span>
                      </td>
                      <td className={styles.textCenter}>
                        <span className={`${styles.badge} ${item.status === 'POSTED' ? styles.badgeSuccess : styles.badgeDraft}`}>
                          {statusText(item.status)}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--wms-text-muted)' }} title={item.note || ''}>
                          {item.note || '-'}
                        </div>
                      </td>
                      <td className={styles.textCenter}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <i
                            className="bi bi-eye"
                            style={{ cursor: 'pointer', color: 'var(--wms-text-muted)', fontSize: 16, marginRight: 8 }}
                            title="Xem chi tiết"
                            onClick={() => setDetailItem(item)}
                          />
                          <i
                            className="bi bi-printer"
                            style={{ cursor: 'pointer', color: 'var(--color-info-hover)', fontSize: 16, marginRight: 8 }}
                            title="In phiếu"
                            onClick={() => printPaymentReceipt(item, { partnerName: item.partnerName, salespersonName: '' })}
                          />
                          {item.status === 'DRAFT' && (
                            <>
                              <i
                                className="bi bi-pencil"
                                style={{ cursor: 'pointer', color: 'var(--wms-primary)', fontSize: 16, marginRight: 8 }}
                                title="Sửa phiếu nháp"
                                onClick={() => handleStartEdit(item)}
                              />
                              <i
                                className="bi bi-trash"
                                style={{ cursor: 'pointer', color: 'var(--wms-danger)', fontSize: 16 }}
                                title="Xóa phiếu nháp"
                                onClick={() => setDeletingItem(item)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ACTION BAR NỔI KHI CHỌN NHIỀU BẢN GHI */}
          {selectedIds.length > 0 && (
            <div className={styles.actionBar}>
              <div className={styles.actionBarContent}>
                <span className={styles.actionText}>
                  Đã chọn <strong>{selectedIds.length}</strong> phiếu
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={styles.btnActionWhite}
                    onClick={() => setSelectedIds([])}
                  >
                    <i className="bi bi-x-circle" /> Bỏ chọn
                  </button>
                  <button
                    type="button"
                    className={styles.btnActionWhite}
                    onClick={handleBulkPrint}
                  >
                    <i className="bi bi-printer" /> In hàng loạt
                  </button>
                  <button
                    type="button"
                    className={styles.btnActionWhite}
                    onClick={handleExport}
                    style={{ color: '#16a34a' }}
                  >
                    <i className="bi bi-file-earmark-excel" /> Xuất Excel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PHÂN TRANG CHUẨN ERP */}
          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Hiển thị</span>
              <SearchableSelect
                className="misa-select"
                style={{ width: 70, height: 32, padding: '0 8px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </SearchableSelect>
              <span>trên tổng số {totalItems} bản ghi</span>
            </div>

            {totalPages > 1 && (
              <div className={styles.pageControls}>
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={styles.pageBtn}
                >
                  <i className="bi bi-chevron-left" />
                  <span>Trước</span>
                </button>

                <div className={styles.paginationNumbers}>
                  {getPageNumbers().map((num, idx) => (
                    num === safePage ? (
                      <input
                        key={idx}
                        className={`${styles.pageNumber} ${styles.active}`}
                        style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                        defaultValue={num}
                        title="Nhập số trang và nhấn Enter"
                        onBlur={(e) => { e.target.value = safePage; }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            let p = parseInt(e.target.value, 10);
                            if (!isNaN(p)) {
                              p = Math.max(1, Math.min(totalPages, p));
                              setCurrentPage(p);
                              e.target.blur();
                            } else {
                              e.target.value = safePage;
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
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={styles.pageBtn}
                >
                  <span>Sau</span>
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL LẬP / SỬA PHIẾU THU CHI */}
      {showFormModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFormModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className={mode === 'RECEIPT' ? 'bi bi-arrow-down-circle text-success' : 'bi bi-arrow-up-circle text-danger'} />
                {editingItem
                  ? `Chỉnh sửa phiếu nháp: ${editingItem.code}`
                  : (mode === 'RECEIPT' ? 'Lập đề nghị thu tiền khách hàng' : 'Lập đề nghị chi tiền nhà cung cấp')}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowFormModal(false)}>
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.fieldRow}>
                <label className={styles.label}>
                  {mode === 'RECEIPT' ? 'Khách hàng' : 'Nhà cung cấp'} <span>*</span>
                </label>
                <Select
                  options={partnerOptions}
                  value={selectedPartner}
                  onChange={opt => setFormPartnerId(opt?.value || null)}
                  isClearable
                  placeholder={mode === 'RECEIPT' ? 'Chọn khách hàng...' : 'Chọn nhà cung cấp...'}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>

              <div className={styles.debtPanel}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className={styles.debtPanelTitle}>Công nợ hiện tại</span>
                  {formPartnerId ? (
                    <span style={{ fontSize: 12, color: 'var(--wms-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/payments/history/${formPartnerId}?mode=${mode}`)}>
                      <i className="bi bi-box-arrow-up-right" /> Xem sổ nợ & hóa đơn đối tác
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--wms-text-subtle)' }}>(Chọn đối tác để kiểm tra công nợ)</span>
                  )}
                </div>
                <strong className={styles.debtAmount}>{money(debtBalance)} đ</strong>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fieldRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className={styles.label} style={{ margin: 0 }}>
                      Số tiền <span>*</span>
                    </label>
                    {Number(debtBalance || 0) > 0 && formPartnerId && (
                      <button
                        type="button"
                        className={styles.btnQuickFill}
                        onClick={() => setFormAmount(String(debtBalance))}
                        title="Điền toàn bộ số tiền công nợ"
                      >
                        <i className="bi bi-lightning-charge-fill" /> Điền hết nợ
                      </button>
                    )}
                  </div>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    type="text"
                    value={formatMoneyInput(formAmount)}
                    onChange={e => setFormAmount(digitsOnly(e.target.value))}
                    placeholder="Nhập số tiền"
                  />
                </div>

                <div className={styles.fieldRow}>
                  <label className={styles.label}>Phương thức</label>
                  <SearchableSelect
                    className={styles.input}
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                  </SearchableSelect>
                </div>
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.label}>Ghi chú / Diễn giải</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={formNote}
                  onChange={e => setFormNote(e.target.value)}
                  placeholder="Nhập nội dung thu/chi tiền..."
                />
              </div>

              <div className={styles.workflowHint}>
                <i className="bi bi-info-circle text-primary" />
                <span>
                  Phiếu sẽ được lưu ở trạng thái <strong>Chờ ghi sổ</strong> và chuyển sang Bàn làm việc Thủ quỹ để kiểm đếm thực tế.
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondaryModal}
                onClick={() => setShowFormModal(false)}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnPrimaryModal}
                onClick={submitForm}
                disabled={saving}
              >
                <i className={editingItem ? 'bi bi-check2' : 'bi bi-send-check'} />
                {editingItem ? 'Cập nhật đề nghị' : 'Lập đề nghị'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHIẾU THU CHI */}
      {detailItem && (
        <div className={styles.modalOverlay} onClick={() => setDetailItem(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bi bi-receipt" /> Chi tiết phiếu: {detailItem.code}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className={styles.btnSecondaryModal}
                  onClick={() => printPaymentReceipt(detailItem, { partnerName: detailItem.partnerName, salespersonName: '' })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="bi bi-printer" /> In phiếu
                </button>
                <button type="button" className={styles.modalClose} onClick={() => setDetailItem(null)}>
                  &times;
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Loại chứng từ</span>
                  <span className={styles.infoValue} style={{ color: detailItem.type === 'RECEIPT' ? 'var(--wms-success)' : 'var(--wms-danger)' }}>
                    {detailItem.type === 'RECEIPT' ? 'Phiếu thu tiền' : 'Phiếu chi tiền'}
                  </span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Trạng thái ghi sổ</span>
                  <span className={styles.infoValue}>
                    <span className={`${styles.badge} ${detailItem.status === 'POSTED' ? styles.badgeSuccess : styles.badgeDraft}`}>
                      {statusText(detailItem.status)}
                    </span>
                  </span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>{detailItem.type === 'RECEIPT' ? 'Khách hàng' : 'Nhà cung cấp'}</span>
                  <span className={styles.infoValue}>{detailItem.partnerName || detailItem.partnerCode || '-'}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Ngày giờ lập</span>
                  <span className={styles.infoValue}>{formatPaymentDateTime(detailItem.createdAt)}</span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Phương thức thanh toán</span>
                  <span className={styles.infoValue}>
                    {detailItem.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt'}
                  </span>
                </div>
                <div className={styles.infoBlock}>
                  <span className={styles.infoLabel}>Số tiền giao dịch</span>
                  <span className={styles.infoValue} style={{ fontSize: 18, color: detailItem.type === 'RECEIPT' ? 'var(--wms-success)' : 'var(--wms-danger)' }}>
                    {money(detailItem.amount)} đ
                  </span>
                </div>
              </div>

              <div className={styles.infoBlock}>
                <span className={styles.infoLabel}>Ghi chú / Diễn giải</span>
                <span style={{ fontSize: 13.5, color: 'var(--wms-text-body)', lineHeight: 1.5 }}>
                  {detailItem.note || 'Không có ghi chú diễn giải'}
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondaryModal}
                onClick={() => setDetailItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Xóa phiếu nháp"
        message={`Bạn có chắc chắn muốn xóa phiếu nháp "${deletingItem?.code}" số tiền ${money(deletingItem?.amount)} đ không? Thao tác này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
        confirmText="Xóa phiếu"
        isDanger={true}
      />

      {/* TOAST */}
      <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
    </AdminLayout>
  );
}

export default PaymentManagementPage;

