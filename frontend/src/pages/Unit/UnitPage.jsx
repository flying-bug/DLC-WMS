import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import axiosClient from '../../api/axiosClient';
import { exportToExcel } from '../../utils/excelExport';
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

    const handleExport = () => {
        const headers = ['ÄÆ¡n vá»‹ tÃ­nh', 'MÃ´ táº£', 'Tráº¡ng thÃ¡i'];
        const data = units.map(unit => [
            unit.name,
            unit.description || '',
            unit.status === 'ACTIVE' ? 'Äang sá»­ dá»¥ng' : 'Ngá»«ng sá»­ dá»¥ng'
        ]);
        exportToExcel(headers, data, 'Danh_sach_don_vi_tinh');
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchUnits = useCallback(async () => {
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
    }, [page, size, searchTerm]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUnits();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchUnits]);

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
            console.error("Lá»—i thay Ä‘á»•i tráº¡ng thÃ¡i:", error);
            alert(error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t tráº¡ng thÃ¡i!');
        }
        setOpenDropdownId(null);
    };

    const handleSave = async (closeAfterSave = true) => {
        if (!formData.name.trim()) {
            setErrorMsg('ÄÆ¡n vá»‹ tÃ­nh khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.');
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
                // Giá»¯ modal má»Ÿ Ä‘á»ƒ thÃªm tiáº¿p
                setFormData({ id: null, name: '', description: '', status: 'ACTIVE' });
                setIsEdit(false);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi lÆ°u.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a Ä‘Æ¡n vá»‹ tÃ­nh nÃ y khÃ´ng?')) {
            try {
                await axiosClient.delete(`/units/${id}`);
                fetchUnits();
            } catch (error) {
                console.error("Lá»—i xÃ³a Ä‘Æ¡n vá»‹:", error);
                alert(error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi xÃ³a!');
            }
        }
        setOpenDropdownId(null);
    };

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>ÄÆ¡n vá»‹ tÃ­nh</h2>
                    <div className={styles.breadcrumb}>
                        <i className="fas fa-chevron-left"></i> Táº¥t cáº£ danh má»¥c
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="TÃ¬m kiáº¿m theo Ä‘Æ¡n vá»‹ tÃ­nh"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <i className="fas fa-search" onClick={() => { setPage(0); fetchUnits(); }}></i>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={fetchUnits} title="Táº£i láº¡i"><i className="fas fa-sync-alt"></i></button>
                        <button className={styles.iconBtn} onClick={handleExport} title="Xuáº¥t Excel"><i className="fas fa-file-excel" style={{color: 'var(--color-excel)'}}></i></button>
                        <button className={styles.primaryBtn} onClick={openAddModal}>ThÃªm</button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ÄÆ¡n vá»‹ tÃ­nh</th>
                                <th>MÃ´ táº£</th>
                                <th>Tráº¡ng thÃ¡i</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Chá»©c nÄƒng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Äang táº£i dá»¯ liá»‡u...</td></tr>
                            ) : units.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>KhÃ´ng cÃ³ dá»¯ liá»‡u.</td></tr>
                            ) : (
                                units.map((unit) => (
                                    <tr key={unit.id}>
                                        <td>{unit.name}</td>
                                        <td>{unit.description}</td>
                                        <td>{unit.status === 'ACTIVE' ? 'Äang sá»­ dá»¥ng' : 'Ngá»«ng sá»­ dá»¥ng'}</td>
                                        <td className={styles.actionCell}>
                                            <span className={styles.editText} onClick={() => openEditModal(unit)}>Sá»­a</span>

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
                                                        <div className={styles.dropdownItem} onClick={() => handleDuplicate(unit)}>NhÃ¢n báº£n</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleDelete(unit.id)}>XÃ³a</div>
                                                        <div className={styles.dropdownItem} onClick={() => handleToggleStatus(unit)}>
                                                            {unit.status === 'ACTIVE' ? 'Ngá»«ng sá»­ dá»¥ng' : 'Sá»­ dá»¥ng'}
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
                    <div className={styles.totalInfo}>Tá»•ng sá»‘: <b>{totalElements}</b> báº£n ghi</div>
                    <div className={styles.pageControls}>
                        <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                            <option value={10}>10 báº£n ghi trÃªn 1 trang</option>
                            <option value={20}>20 báº£n ghi trÃªn 1 trang</option>
                            <option value={30}>30 báº£n ghi trÃªn 1 trang</option>
                            <option value={50}>50 báº£n ghi trÃªn 1 trang</option>
                        </select>
                        <span
                            className={`${styles.pageBtn} ${page === 0 ? styles.disabled : ''}`}
                            onClick={() => page > 0 && setPage(page - 1)}
                        >
                            TrÆ°á»›c
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

                {/* Modal ThÃªm / Sá»­a */}
                {showModal && (
                    <div className="misa-modal-overlay">
                        <div className="misa-modal">
                            <div className="misa-modal-header">
                                <h3>{isEdit ? 'Sá»­a ÄÆ¡n vá»‹ tÃ­nh' : 'ThÃªm ÄÆ¡n vá»‹ tÃ­nh'}</h3>
                                <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                            </div>
                            <div className="misa-modal-body">
                                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                                <div className="misa-form-group">
                                    <label>ÄÆ¡n vá»‹ tÃ­nh <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="misa-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        autoFocus
                                    />
                                </div>

                                <div className="misa-form-group">
                                    <label>MÃ´ táº£</label>
                                    <textarea
                                        className="misa-textarea"
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowModal(false)}>Há»§y</button>
                                <div className={styles.rightButtons} style={{ display: 'flex', gap: '12px' }}>
                                    {!isEdit && (
                                        <button className="btn-misa-draft" onClick={() => handleSave(false)}>Cáº¥t vÃ  ThÃªm</button>
                                    )}
                                    <button className="btn-misa-save" onClick={() => handleSave(true)}>Cáº¥t</button>
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
