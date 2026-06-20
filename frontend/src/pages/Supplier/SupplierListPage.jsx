import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import styles from './SupplierListPage.module.css';

import axiosClient from '../../api/axiosClient';

const SupplierListPage = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/suppliers');
            if (res.data && res.data.data) {
                setSuppliers(res.data.data);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách NCC:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSuppliers();
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const formatCurrency = (val) => {
        if (!val) return '0';
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Tất cả danh mục
                        </span>
                        <h2>Danh sách nhà cung cấp</h2>
                    </div>
                    <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
                        <i className="fas fa-plus"></i> Thêm mới
                    </button>
                </div>

                {/* KPIs Cards */}
                <div className={styles.kpiContainer}>
                    <div className={`${styles.kpiCard} ${styles.kpiDanger}`}>
                        <div className={styles.kpiHeader}>
                            <div className={styles.kpiLabel}>NỢ QUÁ HẠN</div>
                            <div className={styles.kpiIcon}>
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                        </div>
                        <div className={styles.kpiNumber}>0</div>
                        <div className={styles.kpiSubtext}>Số liệu tính đến: 16h18</div>
                        <div style={{ position: 'absolute', bottom: 0, left: '16px', right: '16px', height: '3px', backgroundColor: 'var(--color-danger-bg-soft)', borderRadius: '2px' }}></div>
                    </div>

                    <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
                        <div className={styles.kpiHeader}>
                            <div className={styles.kpiLabel}>TỔNG NỢ PHẢI TRẢ</div>
                            <div className={styles.kpiIcon}>
                                <i className="fas fa-wallet"></i>
                            </div>
                        </div>
                        <div className={styles.kpiNumber}>0</div>
                        <div className={styles.kpiSubtext}>Số liệu tính đến: 16h18</div>
                        <div style={{ position: 'absolute', bottom: 0, left: '16px', right: '16px', height: '3px', backgroundColor: 'var(--color-bg-soft)', borderRadius: '2px' }}></div>
                    </div>

                    <div className={`${styles.kpiCard} ${styles.kpiSuccess}`}>
                        <div className={styles.kpiHeader}>
                            <div className={styles.kpiLabel}>ĐÃ THANH TOÁN (30 NGÀY)</div>
                            <div className={styles.kpiIcon}>
                                <i className="fas fa-check-circle"></i>
                            </div>
                        </div>
                        <div className={styles.kpiNumber}>0</div>
                        <div className={styles.kpiSubtext}>Số liệu tính đến: 16h18</div>
                        <div style={{ position: 'absolute', bottom: 0, left: '16px', right: '16px', height: '3px', backgroundColor: 'var(--color-bg-soft)', borderRadius: '2px' }}></div>
                    </div>
                </div>

                {/* Table Section */}
                <div className={styles.tableCard}>
                    {/* Toolbar */}
                    <div className={styles.tableToolbar}>
                        <div className={styles.toolbarLeft}>
                            <button className={styles.filterBtn}>
                                <i className="fas fa-filter"></i> Lọc
                            </button>
                            <div className={styles.searchBox}>
                                <i className="fas fa-search"></i>
                                <input 
                                    type="text" 
                                    placeholder="Tìm tên hoặc mã NCC..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.toolbarRight}>
                            <button className={styles.iconBtn} title="Tải lại">
                                <i className="fas fa-sync-alt"></i>
                            </button>
                            <button className={styles.iconBtn} title="Xuất Excel">
                                <i className="fas fa-file-excel"></i>
                            </button>
                            <button className={styles.iconBtn} title="Thiết lập">
                                <i className="fas fa-cog"></i>
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input type="checkbox" />
                                    </th>
                                    <th>MÃ NHÀ CUNG CẤP</th>
                                    <th>TÊN NHÀ CUNG CẤP</th>
                                    <th>ĐỊA CHỈ</th>
                                    <th style={{ textAlign: 'right' }}>SỐ TIỀN NỢ</th>
                                    <th>MÃ SỐ THUẾ</th>
                                    <th style={{ textAlign: 'center' }}>CHỨC NĂNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" style={{textAlign:'center', padding:'20px'}}>Đang tải dữ liệu...</td></tr>
                                ) : suppliers.length === 0 ? (
                                    <tr><td colSpan="7" style={{textAlign:'center', padding:'20px'}}>Chưa có dữ liệu.</td></tr>
                                ) : suppliers.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input type="checkbox" />
                                        </td>
                                        <td className={styles.codeCell}>{item.code}</td>
                                        <td 
                                            className={styles.nameCell} 
                                            style={{ cursor: 'pointer', color: 'var(--color-primary, #002b6b)' }}
                                            onClick={() => navigate(`/suppliers/${item.id}`)}
                                        >
                                            {item.name}
                                        </td>
                                        <td>{item.address || <span className={styles.lightText}>Chưa cập nhật</span>}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.debt || 0)}</td>
                                        <td>
                                            {item.taxCode ? item.taxCode : <span className={styles.lightText}>Chưa cập nhật</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className={styles.actionBtn} style={{ margin: '0 auto' }}>
                                                Lập CT mua hàng
                                                <i className="fas fa-caret-down"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            Tổng số: {suppliers.length} bản ghi
                        </div>
                        <div className={styles.pageControls}>
                            <div className={styles.sizeInfo}>
                                {suppliers.length} bản ghi trên 1 trang
                                <i className="fas fa-caret-down" style={{ marginLeft: '4px' }}></i>
                            </div>
                            <div className={styles.pageNav}>
                                <button className={styles.pageNavBtn}>
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button className={`${styles.pageBtn} ${styles.active}`}>
                                    1
                                </button>
                                <button className={styles.pageNavBtn}>
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <SupplierModal 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={async (data) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;
                            
                            const newSupplier = {
                                code: cleanString(data.code) || `NCC${Math.floor(Math.random() * 1000)}`,
                                name: cleanString(data.name),
                                phone: cleanString(data.phone),
                                email: cleanString(data.email),
                                address: cleanString(data.address),
                                taxCode: cleanString(data.tax_code),
                                groupType: cleanString(data.group_type) || 'RETAIL',
                                type: cleanString(data.type) || 'COMPANY',
                                status: 'APPROVED',
                                creditLimit: data.credit_limit ? Number(data.credit_limit) : null,
                                paymentTermDays: data.payment_term_days ? Number(data.payment_term_days) : null,
                                bankName: cleanString(data.bank_name),
                                bankAccountNumber: cleanString(data.bank_account_number),
                                bankBeneficiaryName: cleanString(data.bank_beneficiary_name)
                            };
                            await axiosClient.post('/suppliers', newSupplier);
                            setIsModalOpen(false);
                            fetchSuppliers();
                        } catch (error) {
                            alert(error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra khi tạo NCC');
                        }
                    }} 
                />
            )}
        </AdminLayout>
    );
};

export default SupplierListPage;
