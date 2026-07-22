import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import axiosClient from '../../api/axiosClient';
import { exportToExcel } from '../../utils/excelExport';
import styles from './ProductCategoryPage.module.css';

const emptyForm = {
    id: null,
    parentId: '',
    code: '',
    name: '',
    status: 'APPROVED',
};

const statusOptions = [
    { value: 'APPROVED', label: 'Äang sá»­ dá»¥ng' },
    { value: 'INACTIVE', label: 'Ngá»«ng sá»­ dá»¥ng' },
];

const getErrorMessage = (error, fallback) => (
    error.response?.data?.userMessage
    || error.response?.data?.message
    || error.response?.data?.error
    || fallback
);

const ProductCategoryPage = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState('');

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [errorMsg, setErrorMsg] = useState('');
    const [openDropdownId, setOpenDropdownId] = useState(null);

    const activeCount = useMemo(
        () => categories.filter((item) => item.status === 'APPROVED').length,
        [categories]
    );

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchParentOptions = useCallback(async () => {
        try {
            const res = await axiosClient.get('/product-categories?page=0&size=1000');
            setParentOptions(res.data.content || []);
        } catch (error) {
            console.error('Lá»—i táº£i danh sÃ¡ch danh má»¥c cha:', error);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                page: String(page),
                size: String(size),
            });
            if (searchTerm.trim()) {
                query.set('search', searchTerm.trim());
            }

            const res = await axiosClient.get(`/product-categories?${query.toString()}`);
            setCategories(res.data.content || []);
            setTotalPages(res.data.totalPages || 0);
            setTotalElements(res.data.totalElements || 0);
        } catch (error) {
            console.error('Lá»—i táº£i danh má»¥c sáº£n pháº©m:', error);
        } finally {
            setLoading(false);
        }
    }, [page, size, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchParentOptions();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchParentOptions]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchCategories]);

    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            setPage(0);
            setSearchTerm(tempSearch);
        }
    };

    const openAddModal = () => {
        setIsEdit(false);
        setFormData(emptyForm);
        setErrorMsg('');
        setShowModal(true);
    };

    const openEditModal = (category) => {
        setIsEdit(true);
        setFormData({
            id: category.id,
            parentId: category.parentId || '',
            code: category.code || '',
            name: category.name || '',
            status: category.status || 'APPROVED',
        });
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleDuplicate = (category) => {
        setIsEdit(false);
        setFormData({
            id: null,
            parentId: category.parentId || '',
            code: `${category.code}-COPY`,
            name: `${category.name} - Copy`,
            status: 'APPROVED',
        });
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const buildPayload = () => ({
        parentId: formData.parentId ? Number(formData.parentId) : null,
        code: formData.code.trim(),
        name: formData.name.trim(),
        status: formData.status,
    });

    const handleSave = async (closeAfterSave = true) => {
        if (!formData.code.trim()) {
            setErrorMsg('MÃ£ danh má»¥c khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
            return;
        }
        if (!formData.name.trim()) {
            setErrorMsg('TÃªn danh má»¥c khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
            return;
        }

        try {
            const payload = buildPayload();
            if (isEdit) {
                await axiosClient.put(`/product-categories/${formData.id}`, payload);
            } else {
                await axiosClient.post('/product-categories', payload);
            }

            await Promise.all([fetchCategories(), fetchParentOptions()]);
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                setFormData(emptyForm);
                setIsEdit(false);
            }
        } catch (error) {
            setErrorMsg(getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi lÆ°u danh má»¥c.'));
        }
    };

    const handleDelete = async (category) => {
        const confirmed = window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a danh má»¥c "${category.name}" khÃ´ng?`);
        if (!confirmed) {
            setOpenDropdownId(null);
            return;
        }

        try {
            await axiosClient.delete(`/product-categories/${category.id}`);
            await Promise.all([fetchCategories(), fetchParentOptions()]);
        } catch (error) {
            alert(getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi xÃ³a danh má»¥c.'));
        }
        setOpenDropdownId(null);
    };

    const handleToggleStatus = async (category) => {
        const nextStatus = category.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED';
        try {
            await axiosClient.put(`/product-categories/${category.id}`, {
                parentId: category.parentId || null,
                code: category.code,
                name: category.name,
                status: nextStatus,
            });
            await Promise.all([fetchCategories(), fetchParentOptions()]);
        } catch (error) {
            alert(getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t tráº¡ng thÃ¡i.'));
        }
        setOpenDropdownId(null);
    };

    const handleExportExcel = async () => {
        try {
            const query = new URLSearchParams({
                page: '0',
                size: '10000',
            });
            if (searchTerm.trim()) {
                query.set('search', searchTerm.trim());
            }

            const res = await axiosClient.get(`/product-categories?${query.toString()}`);
            const exportData = res.data.content || [];
            if (exportData.length === 0) {
                alert('KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»ƒ xuáº¥t.');
                return;
            }

            const headers = ['MÃ£ danh má»¥c', 'TÃªn danh má»¥c', 'Danh má»¥c cha', 'Tráº¡ng thÃ¡i', 'NgÃ y táº¡o', 'NgÃ y cáº­p nháº­t'];
            const data = exportData.map((item) => [
                item.code,
                item.name,
                item.parentName || '',
                item.status === 'APPROVED' ? 'Äang sá»­ dá»¥ng' : 'Ngá»«ng sá»­ dá»¥ng',
                item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
                item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '',
            ]);

            exportToExcel(headers, data, 'Danh_sach_danh_muc_san_pham');
        } catch (error) {
            alert(getErrorMessage(error, 'CÃ³ lá»—i xáº£y ra khi xuáº¥t Excel.'));
        }
    };

    const filteredParentOptions = parentOptions.filter((item) => item.id !== formData.id);

    return (
        <AdminLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>Danh má»¥c sáº£n pháº©m</h2>
                        <button className={styles.backLink} onClick={() => navigate('/dashboard')} type="button">
                            <i className="fas fa-chevron-left"></i> Táº¥t cáº£ danh má»¥c
                        </button>
                    </div>
                    <div className={styles.summary}>
                        <span><strong>{totalElements}</strong> danh má»¥c</span>
                        <span><strong>{activeCount}</strong> Ä‘ang sá»­ dá»¥ng</span>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="TÃ¬m theo mÃ£ hoáº·c tÃªn danh má»¥c"
                            value={tempSearch}
                            onChange={(event) => setTempSearch(event.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <i className="fas fa-search" onClick={() => { setPage(0); setSearchTerm(tempSearch); }}></i>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={fetchCategories} title="Táº£i láº¡i" type="button">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} onClick={handleExportExcel} title="Xuáº¥t Excel" type="button">
                            <i className="fas fa-file-excel"></i>
                        </button>
                        <button className={styles.primaryBtn} onClick={openAddModal} type="button">
                            ThÃªm
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>MÃ£ danh má»¥c</th>
                                <th>TÃªn danh má»¥c</th>
                                <th>Danh má»¥c cha</th>
                                <th>Tráº¡ng thÃ¡i</th>
                                <th>NgÃ y cáº­p nháº­t</th>
                                <th>Chá»©c nÄƒng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className={styles.emptyCell}>Äang táº£i dá»¯ liá»‡u...</td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className={styles.emptyCell}>KhÃ´ng cÃ³ danh má»¥c phÃ¹ há»£p.</td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr key={category.id}>
                                        <td className={styles.codeCell}>{category.code}</td>
                                        <td className={styles.nameCell}>{category.name}</td>
                                        <td>{category.parentName || '-'}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${category.status === 'APPROVED' ? styles.active : styles.inactive}`}>
                                                {category.status === 'APPROVED' ? 'Äang sá»­ dá»¥ng' : 'Ngá»«ng sá»­ dá»¥ng'}
                                            </span>
                                        </td>
                                        <td>{category.updatedAt ? new Date(category.updatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                                        <td className={styles.actionCell}>
                                            <span className={styles.editText} onClick={() => openEditModal(category)}>Sá»­a</span>
                                            <div className={styles.dropdownContainer}>
                                                <button
                                                    className={styles.dropdownToggle}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === category.id ? null : category.id);
                                                    }}
                                                    type="button"
                                                >
                                                    <i className="fas fa-caret-down"></i>
                                                </button>
                                                {openDropdownId === category.id && (
                                                    <div className={styles.dropdownMenu}>
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(category)}>NhÃ¢n báº£n</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(category)}>XÃ³a</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(category)}>
                                                            {category.status === 'APPROVED' ? 'Ngá»«ng sá»­ dá»¥ng' : 'Sá»­ dá»¥ng'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.pagination}>
                    <div className={styles.totalInfo}>Tá»•ng sá»‘: <b>{totalElements}</b> báº£n ghi</div>
                    <div className={styles.pageControls}>
                        <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
                            <option value={10}>10 báº£n ghi trÃªn 1 trang</option>
                            <option value={20}>20 báº£n ghi trÃªn 1 trang</option>
                            <option value={50}>50 báº£n ghi trÃªn 1 trang</option>
                            <option value={100}>100 báº£n ghi trÃªn 1 trang</option>
                        </select>
                        <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(page - 1)} type="button">
                            TrÆ°á»›c
                        </button>
                        <span className={styles.currentPage}>Trang {page + 1} / {totalPages || 1}</span>
                        <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} type="button">
                            Sau
                        </button>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="misa-modal-overlay">
                    <div className="misa-modal">
                        <div className="misa-modal-header">
                            <h3>{isEdit ? 'Sá»­a danh má»¥c sáº£n pháº©m' : 'ThÃªm danh má»¥c sáº£n pháº©m'}</h3>
                            <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                        </div>
                        <div className="misa-modal-body">
                            {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                            <div className="misa-form-row">
                                <div className="misa-form-group">
                                    <label>MÃ£ danh má»¥c <span className="required">*</span></label>
                                    <input
                                        className="misa-input"
                                        value={formData.code}
                                        onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase() })}
                                        placeholder="VÃ­ dá»¥: CPU"
                                        autoFocus
                                    />
                                </div>
                                <div className="misa-form-group">
                                    <label>TÃªn danh má»¥c <span className="required">*</span></label>
                                    <input
                                        className="misa-input"
                                        value={formData.name}
                                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                        placeholder="VÃ­ dá»¥: Bá»™ vi xá»­ lÃ½"
                                    />
                                </div>
                            </div>

                            <div className="misa-form-row">
                                <div className="misa-form-group">
                                    <label>Danh má»¥c cha</label>
                                    <select
                                        className="misa-select"
                                        value={formData.parentId}
                                        onChange={(event) => setFormData({ ...formData, parentId: event.target.value })}
                                    >
                                        <option value="">KhÃ´ng cÃ³</option>
                                        {filteredParentOptions.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.code} - {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="misa-form-group">
                                    <label>Tráº¡ng thÃ¡i</label>
                                    <select
                                        className="misa-select"
                                        value={formData.status}
                                        onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                                    >
                                        {statusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="misa-modal-footer">
                            <button className="btn-misa-cancel" onClick={() => setShowModal(false)} type="button">Há»§y</button>
                            <div className={styles.rightButtons} style={{ display: 'flex', gap: '12px' }}>
                                {!isEdit && (
                                    <button className="btn-misa-draft" onClick={() => handleSave(false)} type="button">
                                        Cáº¥t vÃ  ThÃªm
                                    </button>
                                )}
                                <button className="btn-misa-save" onClick={() => handleSave(true)} type="button">Cáº¥t</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default ProductCategoryPage;
