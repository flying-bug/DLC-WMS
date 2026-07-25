import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyDetailPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  APPROVED: { label: 'Còn hiệu lực', code: 'success' },
  POSTED: { label: 'Đã ghi nhận', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
  EXPIRED: { label: 'Hết hạn', code: 'warning' },
  VOIDED: { label: 'Không hợp lệ', code: 'danger' }
};

const REPAIR_STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  SUBMITTED: { label: 'Chờ duyệt', code: 'warning' },
  APPROVED: { label: 'Đã duyệt', code: 'success' },
  POSTED: { label: 'Hoàn tất', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
  RECEIVED: { label: 'Đã tiếp nhận', code: 'info' },
  REPAIRING: { label: 'Đang sửa', code: 'warning' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');

function WarrantyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warranty, setWarranty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadWarranty = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await warrantyApi.getWarrantyById(id);
      setWarranty(unwrap(response));
    } catch (err) {
      setWarranty(null);
      setError(err.response?.data?.userMessage || 'Không tải được chi tiết bảo hành.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWarranty();
  }, [loadWarranty]);

  const pName = warranty?.partnerName || warranty?.customerName || warranty?.partner?.name || 'Khách lẻ';
  const pPhone = warranty?.partnerPhone || warranty?.customerPhone || warranty?.partner?.phone || 'Chưa có';
  const pEmail = warranty?.partnerEmail || warranty?.partner?.email || 'Chưa có';
  const pAddress = warranty?.partnerAddress || warranty?.partner?.address || 'Chưa có';

  const sCode = warranty?.serialNumber || warranty?.serialCode || warranty?.serialNumberValue || warranty?.serialNumber?.serialNo || warranty?.serialNumber?.serialNumber || 'Chưa có';
  const prdName = warranty?.productName || warranty?.variantName || warranty?.serialNumber?.productName || warranty?.serialNumber?.variant?.variantName || 'Chưa rõ';
  const skuCode = warranty?.sku || warranty?.serialNumber?.sku || warranty?.serialNumber?.variant?.sku || 'Chưa có';
  
  const repairs = warranty?.repairs || warranty?.repairHistory || [];
  const statusInfo = STATUS_LABELS[warranty?.warrantyStatus] || { label: warranty?.warrantyStatus || 'Chưa rõ', code: 'info' };

  if (loading && !warranty) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu...</div>
      </AdminLayout>
    );
  }

  if (error && !warranty) {
    return (
      <AdminLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>{error}</div>
      </AdminLayout>
    );
  }

  if (!warranty) return null;

  return (
    <AdminLayout>
      <div className={styles.container} style={{ padding: '24px' }}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.btnBack} onClick={() => navigate('/warranties')}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <h1 className={styles.pageTitle}>{warranty.warrantyCode || `Bảo hành #${id}`}</h1>
            <span className={styles.statusBadgeInline} style={{
              backgroundColor: statusInfo.code === 'success' ? 'rgba(34, 197, 94, 0.1)' : statusInfo.code === 'danger' ? 'rgba(239, 68, 68, 0.1)' : statusInfo.code === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: statusInfo.code === 'success' ? '#15803d' : statusInfo.code === 'danger' ? '#dc2626' : statusInfo.code === 'warning' ? '#b45309' : '#1d4ed8'
            }}>
              <span className={styles.statusDot} style={{ backgroundColor: statusInfo.code === 'success' ? '#22c55e' : statusInfo.code === 'danger' ? '#ef4444' : statusInfo.code === 'warning' ? '#f59e0b' : '#3b82f6' }}></span>
              {statusInfo.label}
            </span>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.btnEdit} onClick={() => navigate(`/repairs/create?warrantyId=${id}`)}>
              <i className="bi bi-tools"></i> Tạo phiếu sửa
            </button>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-info-circle"></i>
                <h3>Thông tin bảo hành</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Mã bảo hành</label>
                    <p>{warranty.warrantyCode || 'Chưa có'}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Serial</label>
                    <p style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{sCode}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Sản phẩm</label>
                    <p>{prdName}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Mã SKU</label>
                    <p>{skuCode}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Ngày bắt đầu</label>
                    <p>{formatDate(warranty.startDate)}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Ngày hết hạn</label>
                    <p>{formatDate(warranty.endDate)}</p>
                  </div>
                  <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                    <label>Ghi chú</label>
                    <p>{warranty.note || 'Không có ghi chú'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-clock-history"></i>
                <h3>Lịch sử sửa chữa</h3>
              </div>
              <div className={styles.cardBody} style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Mã phiếu</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Ngày tiếp nhận</th>
                      <th style={{ padding: '12px 24px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.length > 0 ? (
                      repairs.map(repair => {
                        const rStatus = REPAIR_STATUS_LABELS[repair.repairStatus] || { label: repair.repairStatus || 'Không rõ' };
                        return (
                          <tr key={repair.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '12px 24px' }}>
                              <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }} onClick={() => navigate(`/repairs/${repair.id}`)}>
                                {repair.repairCode}
                              </span>
                            </td>
                            <td style={{ padding: '12px 24px' }}>{formatDate(repair.receivedDate)}</td>
                            <td style={{ padding: '12px 24px' }}>{rStatus.label}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          Sản phẩm chưa từng được sửa chữa
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-person"></i>
                <h3>Thông tin khách hàng</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoGrid} style={{ gridTemplateColumns: '1fr' }}>
                  <div className={styles.infoItem}>
                    <label>Họ tên khách hàng</label>
                    <p>{pName}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Số điện thoại</label>
                    <p>{pPhone}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email</label>
                    <p>{pEmail}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Địa chỉ</label>
                    <p>{pAddress}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default WarrantyDetailPage;
