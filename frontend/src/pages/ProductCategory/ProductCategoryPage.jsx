import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import axiosClient from '../../api/axiosClient';
import styles from './ProductCategoryPage.module.css';

const emptyForm = {
    id: null,
    parentId: '',
    code: '',
    name: '',
    status: 'APPROVED',
};

const statusOptions = [
    { value: 'APPROVED', label: 'Đang sử dụng' },
    { value: 'INACTIVE', label: 'Ngừng sử dụng' },
];

const getErrorMessage = (error, fallback) => (
    error.response?.data?.userMessage
    || error.response?.data?.message
    || error.response?.data?.error
    || fallback
);

const escapeCsvCell = (value) => {
    if (value === undefined || value === null) {
        return '';
    }
    return `"${String(value).replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
    const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

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
            console.error('Lỗi tải danh sách danh mục cha:', error);
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
            console.error('Lỗi tải danh mục sản phẩm:', error);
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
            setErrorMsg('Mã danh mục không được để trống.');
            return;
        }
        if (!formData.name.trim()) {
            setErrorMsg('Tên danh mục không được để trống.');
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
            setErrorMsg(getErrorMessage(error, 'Có lỗi xảy ra khi lưu danh mục.'));
        }
    };

    const handleDelete = async (category) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}" không?`);
        if (!confirmed) {
            setOpenDropdownId(null);
            return;
        }

        try {
            await axiosClient.delete(`/product-categories/${category.id}`);
            await Promise.all([fetchCategories(), fetchParentOptions()]);
        } catch (error) {
            alert(getErrorMessage(error, 'Có lỗi xảy ra khi xóa danh mục.'));
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
            alert(getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật trạng thái.'));
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
                alert('Không có dữ liệu để xuất.');
                return;
            }

            const rows = [
                ['STT', 'Mã danh mục', 'Tên danh mục', 'Danh mục cha', 'Trạng thái', 'Ngày tạo', 'Ngày cập nhật'],
                ...exportData.map((item, index) => [
                    index + 1,
                    item.code,
                    item.name,
                    item.parentName || '',
                    item.status === 'APPROVED' ? 'Đang sử dụng' : 'Ngừng sử dụng',
                    item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
                    item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '',
                ]),
            ];

            const datePart = new Date().toISOString().slice(0, 10);
            downloadCsv(`danh-muc-san-pham-${datePart}.csv`, rows);
        } catch (error) {
            alert(getErrorMessage(error, 'Có lỗi xảy ra khi xuất Excel.'));
        }
    };

    const filteredParentOptions = parentOptions.filter((item) => item.id !== formData.id);

    return (
        <AdminLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>Danh mục sản phẩm</h2>
                        <button className={styles.backLink} onClick={() => navigate('/dashboard')} type="button">
                            <i className="fas fa-chevron-left"></i> Tất cả danh mục
                        </button>
                    </div>
                    <div className={styles.summary}>
                        <span><strong>{totalElements}</strong> danh mục</span>
                        <span><strong>{activeCount}</strong> đang sử dụng</span>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="Tìm theo mã hoặc tên danh mục"
                            value={tempSearch}
                            onChange={(event) => setTempSearch(event.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <i className="fas fa-search" onClick={() => { setPage(0); setSearchTerm(tempSearch); }}></i>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={fetchCategories} title="Tải lại" type="button">
                            <i className="fas fa-sync-alt"></i>
                        </button>
                        <button className={styles.iconBtn} onClick={handleExportExcel} title="Xuất Excel" type="button">
                            <i className="fas fa-file-excel"></i>
                        </button>
                        <button className={styles.primaryBtn} onClick={openAddModal} type="button">
                            Thêm
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã danh mục</th>
                                <th>Tên danh mục</th>
                                <th>Danh mục cha</th>
                                <th>Trạng thái</th>
                                <th>Ngày cập nhật</th>
                                <th>Chức năng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className={styles.emptyCell}>Đang tải dữ liệu...</td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className={styles.emptyCell}>Không có danh mục phù hợp.</td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr key={category.id}>
                                        <td className={styles.codeCell}>{category.code}</td>
                                        <td className={styles.nameCell}>{category.name}</td>
                                        <td>{category.parentName || '-'}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${category.status === 'APPROVED' ? styles.active : styles.inactive}`}>
                                                {category.status === 'APPROVED' ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                                            </span>
                                        </td>
                                        <td>{category.updatedAt ? new Date(category.updatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                                        <td className={styles.actionCell}>
                                            <span className={styles.editText} onClick={() => openEditModal(category)}>Sửa</span>
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
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(category)}>Nhân bản</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(category)}>Xóa</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(category)}>
                                                            {category.status === 'APPROVED' ? 'Ngừng sử dụng' : 'Sử dụng'}
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
                    <div className={styles.totalInfo}>Tổng số: <b>{totalElements}</b> bản ghi</div>
                    <div className={styles.pageControls}>
                        <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
                            <option value={10}>10 bản ghi trên 1 trang</option>
                            <option value={20}>20 bản ghi trên 1 trang</option>
                            <option value={50}>50 bản ghi trên 1 trang</option>
                            <option value={100}>100 bản ghi trên 1 trang</option>
                        </select>
                        <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(page - 1)} type="button">
                            Trước
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
                            <h3>{isEdit ? 'Sửa danh mục sản phẩm' : 'Thêm danh mục sản phẩm'}</h3>
                            <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                        </div>
                        <div className="misa-modal-body">
                            {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                            <div className="misa-form-row">
                                <div className="misa-form-group">
                                    <label>Mã danh mục <span className="required">*</span></label>
                                    <input
                                        className="misa-input"
                                        value={formData.code}
                                        onChange={(event) => setFormData({ ...formData, code: event.target.value.toUpperCase() })}
                                        placeholder="Ví dụ: CPU"
                                        autoFocus
                                    />
                                </div>
                                <div className="misa-form-group">
                                    <label>Tên danh mục <span className="required">*</span></label>
                                    <input
                                        className="misa-input"
                                        value={formData.name}
                                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                                        placeholder="Ví dụ: Bộ vi xử lý"
                                    />
                                </div>
                            </div>

                            <div className="misa-form-row">
                                <div className="misa-form-group">
                                    <label>Danh mục cha</label>
                                    <select
                                        className="misa-select"
                                        value={formData.parentId}
                                        onChange={(event) => setFormData({ ...formData, parentId: event.target.value })}
                                    >
                                        <option value="">Không có</option>
                                        {filteredParentOptions.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.code} - {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="misa-form-group">
                                    <label>Trạng thái</label>
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
                            <button className="btn-misa-cancel" onClick={() => setShowModal(false)} type="button">Hủy</button>
                            <div className={styles.rightButtons} style={{ display: 'flex', gap: '12px' }}>
                                {!isEdit && (
                                    <button className="btn-misa-draft" onClick={() => handleSave(false)} type="button">
                                        Cất và Thêm
                                    </button>
                                )}
                                <button className="btn-misa-save" onClick={() => handleSave(true)} type="button">Cất</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default ProductCategoryPage;
