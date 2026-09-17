import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicRepairQuotation, approvePublicQuotation, declinePublicQuotation } from '../../api/publicRepairApi';
import styles from './PublicRepairQuotation.module.css';

const PublicRepairQuotation = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getPublicRepairQuotation(token);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.response?.data?.userMessage || 'Liên kết không hợp lệ hoặc đã hết hạn.');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleApprove = async () => {
    if (!window.confirm('Bạn chắc chắn muốn ĐỒNG Ý với báo giá sửa chữa này?')) return;
    setActionLoading(true);
    try {
      await approvePublicQuotation(token);
      alert('Xác nhận đồng ý sửa chữa thành công!');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.userMessage || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    const reason = window.prompt('Vui lòng cho biết lý do từ chối (không bắt buộc):');
    if (reason === null) return;
    setActionLoading(true);
    try {
      await declinePublicQuotation(token, reason);
      alert('Đã ghi nhận từ chối sửa chữa.');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.userMessage || 'Có lỗi xảy ra.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className={styles.container} style={{ textAlign: 'center', paddingTop: '100px' }}>Đang tải thông tin...</div>;
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.expiredMessage}>
          <i className={`bi bi-exclamation-circle ${styles.expiredIcon}`}></i>
          <h2 style={{ fontSize: '20px', color: '#374151', marginBottom: '8px' }}>Rất tiếc!</h2>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const money = (val) => Number(val || 0).toLocaleString('vi-VN');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>DUYLONGTECH</div>
        <h1 className={styles.title}>Phiếu Sửa Chữa / Báo Giá</h1>
        <div className={styles.subtitle}>Mã lệnh: {data.repairCode}</div>
        
        {data.repairStatus === 'QUOTATION_PENDING' && data.isTokenValid && (
          <div className={`${styles.statusBadge} ${styles.statusPending}`}>CHỜ KHÁCH HÀNG XÁC NHẬN</div>
        )}
        {data.repairStatus === 'APPROVED' && (
          <div className={`${styles.statusBadge} ${styles.statusApproved}`}>KHÁCH HÀNG ĐÃ ĐỒNG Ý</div>
        )}
        {data.repairStatus === 'CANCELLED' && (
          <div className={`${styles.statusBadge} ${styles.statusDeclined}`}>ĐÃ HỦY / TỪ CHỐI</div>
        )}
      </div>

      {!data.isTokenValid && data.repairStatus === 'QUOTATION_PENDING' && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
          Liên kết báo giá này đã hết hạn. Vui lòng liên hệ cửa hàng để được hỗ trợ lại.
        </div>
      )}

      <div className={styles.card}>
        <h3 className={styles.cardTitle}><i className="bi bi-info-circle"></i> Thông tin thiết bị</h3>
        <div className={styles.infoRow}><div className={styles.infoLabel}>Khách hàng:</div><div className={styles.infoValue}>{data.customerName}</div></div>
        <div className={styles.infoRow}><div className={styles.infoLabel}>Thiết bị:</div><div className={styles.infoValue}>{data.productName}</div></div>
        <div className={styles.infoRow}><div className={styles.infoLabel}>Serial (IMEI):</div><div className={styles.infoValue}>{data.serialNumber || 'N/A'}</div></div>
        <div className={styles.infoRow}><div className={styles.infoLabel}>Mô tả lỗi:</div><div className={styles.infoValue}>{data.issueDescription}</div></div>
        <div className={styles.infoRow}><div className={styles.infoLabel}>Chẩn đoán:</div><div className={styles.infoValue}>{data.diagnosisNote || 'Chưa có thông tin'}</div></div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}><i className="bi bi-images"></i> Tình trạng máy (Hình ảnh)</h3>
        {data.photos && data.photos.length > 0 ? (
          <div className={styles.photoGrid}>
            {data.photos.map((p, i) => (
              <div key={i} className={styles.photoItem}>
                <img src={p.secureUrl} alt={p.caption || 'Hình ảnh'} className={styles.photoImg} title={p.caption} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' }}>Không có hình ảnh đính kèm.</div>
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}><i className="bi bi-receipt"></i> Chi phí dự kiến</h3>
        
        {data.lines && data.lines.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', color: '#4b5563', display: 'block', marginBottom: '8px' }}>Linh kiện thay thế</strong>
            <table className={styles.table}>
              <tbody>
                {data.lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <div>{l.componentName}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>SL: {l.quantity} {l.unitName || 'Cái'} {l.isFreeWarranty ? '(Bảo hành)' : ''}</div>
                    </td>
                    <td className={styles.amount}>{l.isFreeWarranty ? 'Miễn phí' : `${money(l.amount)} đ`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.fees && data.fees.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ fontSize: '14px', color: '#4b5563', display: 'block', marginBottom: '8px' }}>Phí dịch vụ / Công thợ</strong>
            <table className={styles.table}>
              <tbody>
                {data.fees.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <div>{f.feeName}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>SL: {f.quantity} {f.unitName || 'Lần'} {f.isFreeWarranty ? '(Bảo hành)' : ''}</div>
                    </td>
                    <td className={styles.amount}>{f.isFreeWarranty ? 'Miễn phí' : `${money(f.amount)} đ`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.totalRow}>
          <span>TỔNG CỘNG:</span>
          <span className={styles.totalAmount}>{money(data.totalAmount)} đ</span>
        </div>
      </div>

      {data.repairStatus === 'QUOTATION_PENDING' && data.isTokenValid && (
        <div className={styles.actions}>
          <button className={styles.btnApprove} onClick={handleApprove} disabled={actionLoading}>
            {actionLoading ? 'Đang xử lý...' : 'ĐỒNG Ý SỬA CHỮA'}
          </button>
          <button className={styles.btnDecline} onClick={handleDecline} disabled={actionLoading}>
            TỪ CHỐI BÁO GIÁ
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicRepairQuotation;
