import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerModal from './components/CustomerModal';
import CustomerImportModal from './components/CustomerImportModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { searchCustomers, deactivateCustomer, activateCustomer, exportCustomersToExcel } from '../../api/customerApi';
import styles from './CustomerListPage.module.css';

const STATUS_LABELS = {
    APPROVED: { label: 'Äang hoáº¡t Ä‘á»™ng', code: 'success' },
    INACTIVE: { label: 'Ngá»«ng hoáº¡t Ä‘á»™ng', code: 'danger' },
};

const GROUP_LABELS = {
    RETAIL: 'KhÃ¡ch láº»',
    WHOLESALE: 'KhÃ¡ch thá»£',
    DISTRIBUTOR: 'Äáº¡i lÃ½'
};

const CustomerListPage = () => {
    const navigate = useNavigate();
    
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '', groupType: '' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: '' });

    const debounceRef = useRef(null);

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchCustomers = useCallback(async (currentFilters = filters, currentPage = page, currentSize = pageSize) => {
        try {
            setLoading(true);
            // API expects 0-indexed page
            const apiPage = Math.max(0, currentPage - 1);
            const response = await searchCustomers(
                currentFilters.search, 
                currentFilters.status, 
                currentFilters.groupType, 
                apiPage, 
                currentSize
            );
            const payload = response.data?.data ?? response.data;
            if (payload) {
                setCustomers(payload.content || []);
                setTotalPages(payload.totalPages || 0);
                setTotalElements(payload.totalElements || 0);
            }
            setSelectedIds([]);
        } catch (error) {
            console.error('Lá»—i táº£i danh sÃ¡ch khÃ¡ch hÃ ng:', error);
            showToast('error', error.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch khÃ¡ch hÃ ng');
        } finally {
            setLoading(false);
        }
    }, [filters, page, pageSize]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setFilters(prev => ({ ...prev, search: value }));
        setPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            await exportCustomersToExcel(
                { keyword: filters.search, status: filters.status, groupType: filters.groupType }, 
                selectedIds
            );
            showToast('success', 'ÄÃ£ xuáº¥t Excel thÃ nh cÃ´ng.');
        } catch (err) {
            showToast('error', 'CÃ³ lá»—i xáº£y ra khi xuáº¥t Excel.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? customers.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleToggleStatus = (e, customer) => {
        e.stopPropagation();
        const action = customer.status === 'APPROVED' ? 'vÃ´ hiá»‡u hÃ³a' : 'kÃ­ch hoáº¡t';
        setConfirmModal({ isOpen: true, customer, action });
    };

    const executeToggleStatus = async () => {
        if (!confirmModal.customer) return;
        try {
            if (confirmModal.customer.status === 'APPROVED') {
                await deactivateCustomer(confirmModal.customer.id);
                showToast('success', `ÄÃ£ vÃ´ hiá»‡u hÃ³a khÃ¡ch hÃ ng "${confirmModal.customer.name}".`);
            } else {
                await activateCustomer(confirmModal.customer.id);
                showToast('success', `ÄÃ£ kÃ­ch hoáº¡t láº¡i khÃ¡ch hÃ ng "${confirmModal.customer.name}".`);
            }
            fetchCustomers();
        } catch (error) {
            const msg = error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra. Vui lÃ²ng thá»­ láº¡i.';
            showToast('error', msg);
        } finally {
            setConfirmModal({ isOpen: false, customer: null, action: '' });
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
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
                    <h1 className={styles.pageTitle}>Danh sÃ¡ch khÃ¡ch hÃ ng</h1>
                    <button className={styles.btnPrimary} onClick={() => setModalConfig({ isOpen: true, data: null })}>
                        <i className="bi bi-plus"></i> ThÃªm má»›i
                    </button>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.filterGroup}>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÃŒM KIáº¾M</span>
                            <input
                                type="text"
                                className={styles.filterInput}
                                placeholder="TÃªn, mÃ£, SÄT khÃ¡ch hÃ ng..."
                                value={filters.search}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÃŒNH TRáº NG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">Táº¥t cáº£</option>
                                <option value="APPROVED">Äang hoáº¡t Ä‘á»™ng</option>
                                <option value="INACTIVE">Ngá»«ng hoáº¡t Ä‘á»™ng</option>
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>NHÃ“M KHÃCH</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.groupType}
                                onChange={(e) => handleFilterChange('groupType', e.target.value)}
                            >
                                <option value="">Táº¥t cáº£</option>
                                <option value="RETAIL">KhÃ¡ch láº»</option>
                                <option value="WHOLESALE">KhÃ¡ch thá»£</option>
                                <option value="DISTRIBUTOR">Äáº¡i lÃ½</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.btnOutline} onClick={() => { setFilters({ search: '', status: '', groupType: '' }); setPage(1); }}>
                            LÃ m má»›i
                        </button>
                        <button className={styles.btnOutline} onClick={() => setIsImportModalOpen(true)}>
                            <i className="bi bi-file-earmark-arrow-up"></i> Nháº­p Excel
                        </button>
                        <button className={styles.btnOutline} onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Xuáº¥t Excel
                        </button>
                        <button className={styles.btnPrimary} onClick={() => fetchCustomers()}>
                            <i className="bi bi-funnel"></i> Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsToolbar}>
                        <div className={styles.bulkText}>ÄÃ£ chá»n {selectedIds.length} khÃ¡ch hÃ ng</div>
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        checked={customers.length > 0 && selectedIds.length === customers.length} 
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                <th style={{ width: '150px' }}>MÃ£ KhÃ¡ch HÃ ng</th>
                                <th style={{ minWidth: '200px' }}>TÃªn KhÃ¡ch HÃ ng</th>
                                <th style={{ width: '130px' }}>NhÃ³m</th>
                                <th style={{ width: '130px' }}>Äiá»‡n Thoáº¡i</th>
                                <th style={{ minWidth: '200px' }}>Äá»‹a Chá»‰</th>
                                <th style={{ width: '140px' }}>Tráº¡ng ThÃ¡i</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao TÃ¡c</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && customers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Äang táº£i dá»¯ liá»‡u...</div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y khÃ¡ch hÃ ng nÃ o</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map(item => {
                                    const status = STATUS_LABELS[item.status] || { label: item.status || 'KhÃ´ng rÃµ', code: 'info' };
                                    return (
                                        <tr key={item.id} onClick={() => navigate(`/customers/${item.id}`)}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    className={styles.checkbox} 
                                                    checked={selectedIds.includes(item.id)} 
                                                    onChange={(e) => handleSelectRow(e, item.id)} 
                                                    onClick={(e) => e.stopPropagation()} 
                                                />
                                            </td>
                                            <td className={styles.textBlue} style={{ whiteSpace: 'nowrap' }}>{item.code}</td>
                                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                                            <td>{GROUP_LABELS[item.groupType] || item.groupType}</td>
                                            <td>{item.phone || '---'}</td>
                                            <td>
                                                <div className={styles.tooltipContainer} style={{ display: 'inline-block', maxWidth: '100%' }}>
                                                    <span className={styles.noteText}>{item.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>KhÃ´ng cÃ³</span>}</span>
                                                    {item.address && <span className={styles.tooltipText}>{item.address}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${status.code === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                                <i 
                                                    className="bi bi-eye" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                    title="Xem chi tiáº¿t" 
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/customers/${item.id}`); }}
                                                ></i>
                                                <i 
                                                    className="bi bi-pencil" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                                                    title="Chá»‰nh sá»­a" 
                                                    onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, data: item }); }}
                                                ></i>
                                                {item.status === 'APPROVED' ? (
                                                    <i 
                                                        className="bi bi-slash-circle" 
                                                        style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                                                        title="VÃ´ hiá»‡u hÃ³a" 
                                                        onClick={(e) => handleToggleStatus(e, item)}
                                                    ></i>
                                                ) : (
                                                    <i 
                                                        className="bi bi-check2-circle" 
                                                        style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                                                        title="KÃ­ch hoáº¡t láº¡i" 
                                                        onClick={(e) => handleToggleStatus(e, item)}
                                                    ></i>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Hiá»ƒn thá»‹</span>
                            <select
                                className="misa-select"
                                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>trÃªn tá»•ng sá»‘ {totalElements} báº£n ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                    <span>TrÆ°á»›c</span>
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                title="Nháº­p sá»‘ trang vÃ  nháº¥n Enter"
                                                onBlur={(e) => e.target.value = page}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = page;
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={idx}
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                                                onClick={() => num !== '...' && setPage(num)}
                                            >
                                                {num}
                                            </span>
                                        )
                                    ))}
                                </div>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className={styles.pageBtn}
                                >
                                    <span>Sau</span>
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CustomerModal
                isOpen={modalConfig.isOpen}
                editData={modalConfig.data}
                onClose={() => setModalConfig({ isOpen: false, data: null })}
                onSaved={(isEdit, isContinue) => {
                    showToast('success', isEdit ? 'Cáº­p nháº­t khÃ¡ch hÃ ng thÃ nh cÃ´ng!' : 'ThÃªm má»›i khÃ¡ch hÃ ng thÃ nh cÃ´ng!');
                    fetchCustomers();
                    if (!isContinue) setModalConfig({ isOpen: false, data: null });
                }}
            />

            <CustomerImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchCustomers()}
                showToast={(type, title, msg) => showToast(type, msg || title)}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={`XÃ¡c nháº­n ${confirmModal.action}`}
                message={<span>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n {confirmModal.action} khÃ¡ch hÃ ng <strong>{confirmModal.customer?.name}</strong> {confirmModal.customer?.code ? `(${confirmModal.customer.code})` : ''} khÃ´ng?</span>}
                onConfirm={executeToggleStatus}
                onCancel={() => setConfirmModal({ isOpen: false, customer: null, action: '' })}
                confirmText="Äá»“ng Ã½"
                cancelText="Há»§y"
                confirmButtonClass={confirmModal.action === 'vÃ´ hiá»‡u hÃ³a' ? 'btn-misa-danger' : 'btn-misa-primary'}
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default CustomerListPage;
