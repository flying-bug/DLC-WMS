import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import axiosClient from '../../api/axiosClient';
import styles from './UnitPage.module.css';

const UnitPage = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination state
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({ id: null, name: '', description: '', status: 'ACTIVE' });
    const [errorMsg, setErrorMsg] = useState('');
    
    // Dropdown state
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchUnits();
    }, [page, size, searchTerm]);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/units?page=${page}&size=${size}${searchTerm ? `&search=${searchTerm}` : ''}`);
            setUnits(res.data.content);
            setTotalPages(res.data.totalPages);
            setTotalElements(res.data.totalElements);
        } catch (error) {
            console.error("Error fetching units:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setPage(0);
            fetchUnits();
        }
    };

    const openAddModal = () => {
        setIsEdit(false);
        setFormData({ id: null, name: '', description: '', status: 'ACTIVE' });
        setErrorMsg('');
        setShowModal(true);
    };

    const openEditModal = (unit) => {
        setIsEdit(true);
        setFormData({ id: unit.id, name: unit.name, description: unit.description, status: unit.status });
        setErrorMsg('');
        setShowModal(true);
    };

    const handleDuplicate = (unit) => {
        setIsEdit(false);
        setFormData({ id: null, name: `${unit.name} - Copy`, description: unit.description, status: 'ACTIVE' });
        setErrorMsg('');
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleToggleStatus = async (unit) => {
        const newStatus = unit.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await axiosClient.put(`/units/${unit.id}`, { ...unit, status: newStatus });
            fetchUnits();
        } catch (error) {
            alert('Có lỗi xảy ra khi cập nhật trạng thái!');
        }
        setOpenDropdownId(null);
    };

    const handleSave = async (closeAfterSave = true) => {
        if (!formData.name.trim()) {
            setErrorMsg('Đơn vị tính không được để trống.');
            return;
        }

        try {
            if (isEdit) {
                await axiosClient.put(`/units/${formData.id}`, formData);
            } else {
                await axiosClient.post('/units', formData);
            }
            fetchUnits();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                // Giữ modal mở để thêm tiếp
                setFormData({ id: null, name: '', description: '', status: 'ACTIVE' });
                setIsEdit(false);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa đơn vị tính này không?')) {
            try {
                await axiosClient.delete(`/units/${id}`);
                fetchUnits();
            } catch (error) {
                alert('Có lỗi xảy ra khi xóa!');
            }
        }
        setOpenDropdownId(null);
    };

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Đơn vị tính</h2>
                    <div className={styles.breadcrumb}>
                        <i className="fas fa-chevron-left"></i> Tất cả danh mục
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo đơn vị tính" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <i className="fas fa-search" onClick={() => { setPage(0); fetchUnits(); }}></i>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={fetchUnits} title="Tải lại"><i className="fas fa-sync-alt"></i></button>
                        <button className={styles.iconBtn} title="Xuất Excel"><i className="fas fa-file-excel" style={{color: '#107c41'}}></i></button>
                        <button className={styles.primaryBtn} onClick={openAddModal}>Thêm</button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Đơn vị tính</th>
                                <th>Mô tả</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Chức năng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td></tr>
                            ) : units.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Không có dữ liệu.</td></tr>
                            ) : (
                                units.map((unit) => (
                                    <tr key={unit.id}>
                                        <td>{unit.name}</td>
                                        <td>{unit.description}</td>
                                        <td>{unit.status === 'ACTIVE' ? 'Đang sử dụng' : 'Ngừng sử dụng'}</td>
                                        <td className={styles.actionCell}>
                                            <span className={styles.editText} onClick={() => openEditModal(unit)}>Sửa</span>
                                            
                                            <div className={styles.dropdownContainer}>
                                                <div 
                                                    className={styles.dropdownToggle}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === unit.id ? null : unit.id);
                                                    }}
                                                >
                                                    <i className="fas fa-caret-down"></i>
                                                </div>
                                                
                                                {openDropdownId === unit.id && (
                                                    <div className={styles.dropdownMenu}>
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(unit)}>Nhân bản</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(unit.id)}>Xóa</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(unit)}>
                                                            {unit.status === 'ACTIVE' ? 'Ngừng sử dụng' : 'Sử dụng'}
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

                {/* Pagination */}
                <div className={styles.pagination}>
                    <div className={styles.totalInfo}>Tổng số: <b>{totalElements}</b> bản ghi</div>
                    <div className={styles.pageControls}>
                        <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                            <option value={10}>10 bản ghi trên 1 trang</option>
                            <option value={20}>20 bản ghi trên 1 trang</option>
                            <option value={30}>30 bản ghi trên 1 trang</option>
                            <option value={50}>50 bản ghi trên 1 trang</option>
                        </select>
                        <span 
                            className={`${styles.pageBtn} ${page === 0 ? styles.disabled : ''}`} 
                            onClick={() => page > 0 && setPage(page - 1)}
                        >
                            Trước
                        </span>
                        <span className={styles.currentPage}>{page + 1}</span>
                        <span 
                            className={`${styles.pageBtn} ${page >= totalPages - 1 ? styles.disabled : ''}`} 
                            onClick={() => page < totalPages - 1 && setPage(page + 1)}
                        >
                            Sau
                        </span>
                    </div>
                </div>

                {/* Modal Thêm / Sửa */}
                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h3>{isEdit ? 'Sửa Đơn vị tính' : 'Thêm Đơn vị tính'}</h3>
                                <div className={styles.modalIcons}>
                                    <i className="far fa-question-circle"></i>
                                    <i className="fas fa-times" onClick={() => setShowModal(false)}></i>
                                </div>
                            </div>
                            <div className={styles.modalBody}>
                                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                                
                                <div className={styles.formGroup}>
                                    <label>Đơn vị tính <span className={styles.required}>*</span></label>
                                    <input 
                                        type="text" 
                                        className={styles.inputField} 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        autoFocus
                                    />
                                </div>
                                
                                <div className={styles.formGroup}>
                                    <label>Mô tả</label>
                                    <textarea 
                                        className={styles.textareaField} 
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button className={styles.btnCancel} onClick={() => setShowModal(false)}>Hủy</button>
                                <div className={styles.rightButtons}>
                                    <button className={styles.btnSave} onClick={() => handleSave(true)}>Cất</button>
                                    {!isEdit && (
                                        <button className={styles.btnSaveAndAdd} onClick={() => handleSave(false)}>Cất và Thêm</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default UnitPage;
