import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import BrandModal from './components/BrandModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './BrandListPage.module.css';

import axiosClient from '../../api/axiosClient';

const STATUS_LABELS = {
    APPROVED: { label: 'Äang hoáº¡t Ä‘á»™ng', code: 'success' },
    INACTIVE: { label: 'Ngá»«ng hoáº¡t Ä‘á»™ng', code: 'danger' },
};

const BrandListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [brands, setBrands] = useState([]);
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
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, brand: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchBrands = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/brands');
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.search) {
                const term = filters.search.toLowerCase();
                data = data.filter(b => 
                    b.name.toLowerCase().includes(term) || 
                    b.code.toLowerCase().includes(term)
                );
            }
            if (filters.status) {
                data = data.filter(b => b.status === filters.status);
            }
            setBrands(data);
            setSelectedIds([]);
        } catch (error) {
            console.error('Lá»—i táº£i danh sÃ¡ch thÆ°Æ¡ng hiá»‡u:', error);
            showToast('error', error.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch thÆ°Æ¡ng hiá»‡u');
        } finally {
            setLoading(false);
        }
    }, [filters.search, filters.status]);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = brands.map(item => {
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
        const headers = ['MÃ£ thÆ°Æ¡ng hiá»‡u', 'TÃªn thÆ°Æ¡ng hiá»‡u', 'Äiá»‡n thoáº¡i', 'Email', 'MÃ´ táº£', 'Tráº¡ng thÃ¡i'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.hotline || '',
            item.contactEmail || '',
            item.description || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_thuong_hieu');
        showToast('success', 'Xuáº¥t Excel thÃ nh cÃ´ng!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, brand) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, brand });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            data: item
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.brand) return;
        try {
            await axiosClient.delete(`/brands/${deleteConfirm.brand.id}`);
            showToast('success', `ÄÃ£ xÃ³a thÆ°Æ¡ng hiá»‡u ${deleteConfirm.brand.name}`);
            fetchBrands();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi xÃ³a thÆ°Æ¡ng hiá»‡u');
            if (error.response?.status === 409) {
                // Refresh list if it was a soft delete conflict
                fetchBrands();
            }
        } finally {
            setDeleteConfirm({ isOpen: false, brand: null });
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
                    <h1 className={styles.pageTitle}>Danh sÃ¡ch thÆ°Æ¡ng hiá»‡u</h1>
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
                                placeholder="TÃªn hoáº·c mÃ£ thÆ°Æ¡ng hiá»‡u..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchBrands()}
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
                        <button className={styles.btnOutline} onClick={() => { setFilters({ search: '', status: '' }); fetchBrands(); }}>
                            LÃ m má»›i
                        </button>
                        <button className={styles.btnOutline} onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel"></i> Xuáº¥t Excel
                        </button>
                        <button className={styles.btnPrimary} onClick={fetchBrands}>
                            <i className="bi bi-funnel"></i> Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsToolbar}>
                        <div className={styles.bulkText}>ÄÃ£ chá»n {selectedIds.length} thÆ°Æ¡ng hiá»‡u</div>
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
                                <th style={{ width: '160px' }}>MÃ£ ThÆ°Æ¡ng Hiá»‡u</th>
                                <th style={{ minWidth: '220px' }}>TÃªn ThÆ°Æ¡ng Hiá»‡u</th>
                                <th style={{ width: '150px' }}>Äiá»‡n Thoáº¡i</th>
                                <th style={{ width: '250px' }}>MÃ´ Táº£</th>
                                <th style={{ width: '140px' }}>Tráº¡ng ThÃ¡i</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao TÃ¡c</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Äang táº£i dá»¯ liá»‡u...</div>
                                    </td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y thÆ°Æ¡ng hiá»‡u nÃ o</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map(item => (
                                    <tr key={item.id} onClick={() => navigate(`/brands/${item.id}`)}>
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
                                        <td>{item.hotline || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</td>
                                        <td>
                                            <div className={styles.tooltipContainer} style={{ display: 'inline-block', maxWidth: '100%' }}>
                                                <span className={styles.noteText}>{item.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>KhÃ´ng cÃ³</span>}</span>
                                                {item.description && <span className={styles.tooltipText}>{item.description}</span>}
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
                                                onClick={(e) => { e.stopPropagation(); navigate(`/brands/${item.id}`); }}
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
                                                title="XÃ³a thÆ°Æ¡ng hiá»‡u" 
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
                <BrandModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data, isContinue = false) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                status: data.status || 'APPROVED',
                                hotline: cleanString(data.hotline),
                                contactEmail: cleanString(data.contactEmail),
                                description: cleanString(data.description)
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/brands/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cáº­p nháº­t thÆ°Æ¡ng hiá»‡u thÃ nh cÃ´ng!');
                                setModalConfig({ isOpen: false, data: null });
                            } else {
                                await axiosClient.post('/brands', payload);
                                showToast('success', 'ThÃªm má»›i thÆ°Æ¡ng hiá»‡u thÃ nh cÃ´ng!');
                                if (!isContinue) {
                                    setModalConfig({ isOpen: false, data: null });
                                } else {
                                    // if isContinue, close and reopen to reset form
                                    setModalConfig({ isOpen: false, data: null });
                                    setTimeout(() => setModalConfig({ isOpen: true, data: null }), 100);
                                }
                            }
                            
                            fetchBrands();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="XÃ¡c nháº­n xÃ³a"
                message={<span>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a thÆ°Æ¡ng hiá»‡u <strong>{deleteConfirm.brand?.name}</strong> {deleteConfirm.brand?.code ? `(${deleteConfirm.brand.code})` : ''} khÃ´ng? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, brand: null })}
                confirmText="XÃ³a"
                cancelText="Há»§y"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default BrandListPage;
