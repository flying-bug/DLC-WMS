import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './SupplierListPage.module.css';

import axiosClient from '../../api/axiosClient';

const STATUS_LABELS = {
    APPROVED: { label: 'Äang hoáº¡t Ä‘á»™ng', code: 'success' },
    INACTIVE: { label: 'Ngá»«ng hoáº¡t Ä‘á»™ng', code: 'danger' },
};

const formatCurrency = (val) => {
    if (!val) return '0 Ä‘';
    return `${new Intl.NumberFormat('vi-VN').format(val)} Ä‘`;
};

const SupplierListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, supplier: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/suppliers', {
                params: { search: filters.search || undefined }
            });
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.status) {
                data = data.filter(s => s.status === filters.status);
            }
            setSuppliers(data);
            setSelectedIds([]);
        } catch (error) {
            console.error('Lá»—i táº£i danh sÃ¡ch NCC:', error);
            showToast('error', error.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch nhÃ  cung cáº¥p');
        } finally {
            setLoading(false);
        }
    }, [filters.search, filters.status]);

    useEffect(() => {
         
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        if (location.state?.toastMessage) {
             
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = suppliers.map(item => {
        const status = STATUS_LABELS[item.status] || { label: item.status || 'KhÃ´ng rÃµ', code: 'info' };
        return {
            ...item,
            statusLabel: status.label,
            statusCode: status.code
        };
    });

    const totalItems = rows.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

    const handleExport = () => {
        const headers = ['MÃ£ nhÃ  cung cáº¥p', 'TÃªn nhÃ  cung cáº¥p', 'Äá»‹a chá»‰', 'MÃ£ sá»‘ thuáº¿', 'Tráº¡ng thÃ¡i'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.address || '',
            item.taxCode || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_nha_cung_cap');
        showToast('success', 'Xuáº¥t Excel thÃ nh cÃ´ng!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, supplier) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, supplier });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            data: {
                ...item,
                tax_code: item.taxCode,
                group_type: item.groupType,
                bank_name: item.bankName,
                bank_account_number: item.bankAccountNumber,
                bank_beneficiary_name: item.bankBeneficiaryName
            }
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.supplier) return;
        try {
            await axiosClient.delete(`/suppliers/${deleteConfirm.supplier.id}`);
            showToast('success', `ÄÃ£ xÃ³a nhÃ  cung cáº¥p ${deleteConfirm.supplier.name}`);
            fetchSuppliers();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi xÃ³a nhÃ  cung cáº¥p');
        } finally {
            setDeleteConfirm({ isOpen: false, supplier: null });
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
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
                    <h1 className={styles.pageTitle}>Danh sÃ¡ch nhÃ  cung cáº¥p</h1>
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
                                placeholder="TÃªn hoáº·c mÃ£ NCC..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÃŒNH TRáº NG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Táº¥t cáº£</option>
                                <option value="APPROVED">Äang hoáº¡t Ä‘á»™ng</option>
                                <option value="INACTIVE">Ngá»«ng hoáº¡t Ä‘á»™ng</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.btnOutline} onClick={() => { setFilters({ search: '', status: '' }); fetchSuppliers(); }}>
                            LÃ m má»›i
                        </button>
                        <button className={styles.btnOutline} onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Xuáº¥t Excel
                        </button>
                        <button className={styles.btnPrimary} onClick={fetchSuppliers}>
                            <i className="bi bi-funnel"></i> Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsToolbar}>
                        <div className={styles.bulkText}>ÄÃ£ chá»n {selectedIds.length} nhÃ  cung cáº¥p</div>
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
                                        checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length} 
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                <th style={{ width: '160px' }}>MÃ£ NCC</th>
                                <th style={{ minWidth: '220px' }}>TÃªn NhÃ  Cung Cáº¥p</th>
                                <th style={{ width: '140px' }}>MÃ£ Sá»‘ Thuáº¿</th>
                                <th style={{ width: '250px' }}>Äá»‹a Chá»‰</th>
                                <th style={{ width: '140px' }}>Tráº¡ng ThÃ¡i</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao TÃ¡c</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Äang táº£i dá»¯ liá»‡u...</div>
                                    </td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y nhÃ  cung cáº¥p nÃ o</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map(item => (
                                    <tr key={item.id} onClick={() => navigate(`/suppliers/${item.id}`)}>
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
                                        <td>{item.taxCode || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</td>
                                        <td>
                                            <div className={styles.tooltipContainer} style={{ display: 'inline-block', maxWidth: '100%' }}>
                                                <span className={styles.noteText}>{item.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                                                {item.address && <span className={styles.tooltipText}>{item.address}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                {item.statusLabel}
                                            </span>
                                        </td>
                                        <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                            <i 
                                                className="bi bi-eye" 
                                                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Xem chi tiáº¿t" 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${item.id}`); }}
                                            ></i>
                                            <i 
                                                className="bi bi-pencil" 
                                                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Chá»‰nh sá»­a" 
                                                onClick={(e) => handleEditClick(e, item)}
                                            ></i>
                                            <i 
                                                className="bi bi-trash" 
                                                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                                                title="XÃ³a nhÃ  cung cáº¥p" 
                                                onClick={(e) => handleDeleteClick(e, item)}
                                            ></i>
                                        </td>
                                    </tr>
                                ))
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
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>trÃªn tá»•ng sá»‘ {totalItems} báº£n ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                    <span>TrÆ°á»›c</span>
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === currentPage ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                title="Nháº­p sá»‘ trang vÃ  nháº¥n Enter"
                                                onBlur={(e) => e.target.value = currentPage}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setCurrentPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = currentPage;
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
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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

            {modalConfig.isOpen && (
                <SupplierModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                phone: cleanString(data.phone),
                                email: cleanString(data.email),
                                address: cleanString(data.address),
                                taxCode: cleanString(data.tax_code),
                                groupType: cleanString(data.group_type) || 'RETAIL',
                                status: data.status || 'APPROVED',
                                bankName: cleanString(data.bank_name),
                                bankAccountNumber: cleanString(data.bank_account_number),
                                bankBeneficiaryName: cleanString(data.bank_beneficiary_name)
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/suppliers/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cáº­p nháº­t nhÃ  cung cáº¥p thÃ nh cÃ´ng!');
                            } else {
                                await axiosClient.post('/suppliers', payload);
                                showToast('success', 'ThÃªm má»›i nhÃ  cung cáº¥p thÃ nh cÃ´ng!');
                            }
                            
                            setModalConfig({ isOpen: false, data: null });
                            fetchSuppliers();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="XÃ¡c nháº­n xÃ³a"
                message={<span>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a nhÃ  cung cáº¥p <strong>{deleteConfirm.supplier?.name}</strong> {deleteConfirm.supplier?.code ? `(${deleteConfirm.supplier.code})` : ''} khÃ´ng? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, supplier: null })}
                confirmText="XÃ³a"
                cancelText="Há»§y"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default SupplierListPage;
