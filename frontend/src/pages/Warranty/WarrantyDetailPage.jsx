import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import styles from './WarrantyDetailPage.module.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  APPROVED: { label: 'Còn hiệu lực', code: 'success' },
  POSTED: { label: 'Đã ghi nhận', code: 'success' },
  ACTIVE: { label: 'Còn hiệu lực', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' },
  EXPIRED: { label: 'Hết hạn', code: 'warning' },
  VOIDED: { label: 'Không hợp lệ', code: 'danger' }
};

const REPAIR_STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  CONFIRMED: { label: 'Xác nhận', code: 'primary' },
  UNDER_REPAIR: { label: 'Đang sửa', code: 'warning' },
  DONE: { label: 'Hoàn tất', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có');
const money = (value) => Number(value || 0).toLocaleString('vi-VN');

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

  const lines = warranty?.lines || [];

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

                {lines.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text)' }}>Danh sách mặt hàng bảo hành</h4>
                    <div className="table-responsive">
                      <table className="misa-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                            <th>Mã SKU</th>
                            <th>Sản phẩm</th>
                            <th>Serial</th>
                            <th style={{ textAlign: 'right' }}>Số lượng</th>
                            <th>Hạn bảo hành</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, index) => (
                            <tr key={line.id || index}>
                              <td style={{ textAlign: 'center' }}>{index + 1}</td>
                              <td>{line.sku || 'Chưa có'}</td>
                              <td>{line.variantName || 'Chưa rõ'}</td>
                              <td style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{line.serialNumber || ''}</td>
                              <td style={{ textAlign: 'right' }}>{line.quantity || 1}</td>
                              <td>{formatDate(line.endDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <i className="bi bi-clock-history"></i>
                <h3>Lịch sử sửa chữa</h3>
              </div>
              <div className={styles.cardBody} style={{ padding: '0' }}>
                <div className="table-responsive">
                  <table className="misa-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '100px' }}>Mã phiếu</th>
                        <th style={{ minWidth: '120px' }}>Ngày tiếp nhận</th>
                        <th style={{ minWidth: '120px' }}>Trạng thái</th>
                        <th style={{ minWidth: '200px' }}>Mô tả lỗi</th>
                        <th style={{ minWidth: '150px' }}>KTV Phụ trách</th>
                        <th style={{ minWidth: '120px', textAlign: 'right' }}>Chi phí (VNĐ)</th>
                      </tr>
                    </thead>
                  <tbody>
                    {repairs.length > 0 ? (
                      repairs.map(repair => {
                        const rStatus = REPAIR_STATUS_LABELS[repair.repairStatus] || { label: repair.repairStatus || 'Không rõ' };
                        return (
                          <tr key={repair.id} className="cursor-pointer hover-highlight" onClick={() => navigate(`/repairs/${repair.id}`)}>
                            <td>
                              <span style={{ color: 'var(--color-primary)', fontWeight: '500' }}>
                                {repair.repairCode}
                              </span>
                            </td>
                            <td>{formatDate(repair.receivedDate)}</td>
                            <td>
                              <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', display: 'inline-block',
                                backgroundColor: rStatus.code === 'success' ? '#dcfce7' : rStatus.code === 'danger' ? '#fee2e2' : rStatus.code === 'warning' ? '#fef3c7' : '#dbeafe',
                                color: rStatus.code === 'success' ? '#166534' : rStatus.code === 'danger' ? '#991b1b' : rStatus.code === 'warning' ? '#92400e' : '#1e40af'
                              }}>
                                {rStatus.label}
                              </span>
                            </td>
                            <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={repair.issueDescription || ''}>{repair.issueDescription || 'Chưa ghi nhận'}</td>
                            <td>{repair.responsiblePerson || 'Chưa phân công'}</td>
                            <td style={{ textAlign: 'right', fontWeight: '500' }}>{money(repair.totalAmount)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          Sản phẩm chưa từng được sửa chữa
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
