import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useNavigate, useParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';

import AdminLayout from '../../components/layout/AdminLayout';
import * as warrantyApi from '../../api/warrantyApi';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import styles from './WarrantyDetailPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';
import { hasPermission } from '../../auth/session';
import { printWarrantyCard } from '../../utils/printWarrantyCard';

const STATUS_LABELS = {
  ACTIVE: { label: 'Còn hiệu lực', code: 'success' },
  EXPIRED: { label: 'Hết hạn', code: 'warning' },
  VOIDED: { label: 'Bị hủy', code: 'danger' }
};

const REPAIR_STATUS_LABELS = {
  DRAFT: { label: 'Nháp', code: 'info' },
  QUOTATION: { label: 'Báo giá', code: 'info' },
  WAITING_FOR_APPROVAL: { label: 'Chờ duyệt', code: 'warning' },
  CONFIRMED: { label: 'Xác nhận', code: 'primary' },
  WAITING_FOR_EXPORT: { label: 'Chờ xuất kho', code: 'warning' },
  UNDER_REPAIR: { label: 'Đang sửa', code: 'purple' },
  DONE: { label: 'Hoàn tất', code: 'success' },
  CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const unwrap = (response) => response?.data?.data ?? response?.data;
const formatDate = (value) => (value ? formatDateOnly(value) : 'Chưa có');
const money = (value) => Number(value || 0).toLocaleString('vi-VN');

function WarrantyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack('/warranties');
  const [warranty, setWarranty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const canEditWarranty = hasPermission('warranty:edit');
  const canCreateRepair = hasPermission('repair:add');

  const showToast = (type, message) => {
    setToast({ isVisible: true, type, message });
    setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
  };

  const loadWarranty = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await warrantyApi.getWarrantyById(id);
      setWarranty(unwrap(response));
    } catch (err) {
      if (!silent) setWarranty(null);
      setError(err.response?.data?.userMessage || 'Không tải được chi tiết bảo hành.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);
  useRealtimeRefresh({ WARRANTY: id }, loadWarranty);

  const handleVoidWarranty = async () => {
    if (!voidReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do vô hiệu hóa.');
      return;
    }
    setVoiding(true);
    try {
      await warrantyApi.updateWarrantyStatus(id, { warrantyStatus: 'VOIDED', note: voidReason.trim() });
      showToast('success', 'Đã vô hiệu hóa phiếu bảo hành thành công.');
      setShowVoidModal(false);
      setVoidReason('');
      loadWarranty();
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || 'Không thể vô hiệu hóa phiếu bảo hành.');
    } finally {
      setVoiding(false);
    }
  };

  useEffect(() => {
    loadWarranty();
  }, [loadWarranty]);

  const handlePrintWarranty = () => {
    printWarrantyCard(warranty, {
      onError: (msg) => showToast('error', msg)
    });
  };

  const pName = warranty?.partnerName || warranty?.customerName || warranty?.partner?.name || 'Khách lẻ';
  const pPhone = warranty?.partnerPhone || warranty?.customerPhone || warranty?.partner?.phone || 'Chưa có';
  const pEmail = warranty?.partnerEmail || warranty?.partner?.email || 'Chưa có';
  const pAddress = warranty?.partnerAddress || warranty?.partner?.address || 'Chưa có';

  const lines = warranty?.lines || [];

  const repairs = warranty?.repairs || warranty?.repairHistory || [];
  let currentStatus = warranty?.warrantyStatus;
  if (currentStatus === 'APPROVED' || currentStatus === 'POSTED') currentStatus = 'ACTIVE';
  const statusInfo = STATUS_LABELS[currentStatus] || { label: currentStatus || 'Chưa rõ', code: 'info' };

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

  const linesColumns = [
    { title: 'STT', width: '50px', align: 'center', render: (_, __, idx) => idx + 1 },
    { title: 'Mã SKU', render: (_, line) => line.sku || 'Chưa có' },
    { title: 'Sản phẩm', render: (_, line) => line.variantName || 'Chưa rõ' },
    { title: 'Serial', render: (_, line) => <span style={{ fontWeight: '500', color: 'var(--color-primary)' }}>{line.serialNumber || ''}</span> },
    { title: 'Số lượng', align: 'right', render: (_, line) => line.quantity || 1 },
    { title: 'Hạn bảo hành', render: (_, line) => formatDate(line.endDate) }
  ];

  const repairsColumns = [
    { title: 'Mã phiếu', minWidth: '100px', render: (_, repair) => <span style={{ color: 'var(--color-primary)', fontWeight: '500' }}>{repair.repairCode}</span> },
    { title: 'Ngày tiếp nhận', minWidth: '120px', render: (_, repair) => formatDate(repair.receivedDate) },
    { title: 'Trạng thái', minWidth: '120px', render: (_, repair) => {
        const rStatus = REPAIR_STATUS_LABELS[repair.repairStatus] || { label: repair.repairStatus || 'Không rõ' };
        return (
          <span style={{
            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', display: 'inline-block',
            backgroundColor: rStatus.code === 'success' ? 'var(--color-success-bg)' : rStatus.code === 'danger' ? '#fee2e2' : rStatus.code === 'warning' ? '#fef3c7' : rStatus.code === 'purple' ? '#f3e8ff' : 'var(--color-primary-pale)',
            color: rStatus.code === 'success' ? '#166534' : rStatus.code === 'danger' ? '#991b1b' : rStatus.code === 'warning' ? '#92400e' : rStatus.code === 'purple' ? '#7e22ce' : 'var(--color-primary-link)'
          }}>
            {rStatus.label}
          </span>
        );
      }
    },
    { title: 'Mô tả lỗi', minWidth: '200px', render: (_, repair) => <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={repair.issueDescription || ''}>{repair.issueDescription || 'Chưa ghi nhận'}</div> },
    { title: 'KTV Phụ trách', minWidth: '150px', render: (_, repair) => repair.responsiblePerson || 'Chưa phân công' },
    { title: 'Chi phí (VNĐ)', minWidth: '120px', align: 'right', render: (_, repair) => <span style={{ fontWeight: '500' }}>{money(repair.totalAmount)}</span> }
  ];

  return (
    <AdminLayout>
      <div className={styles.container} style={{ padding: '24px' }}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.btnBack} onClick={goBack}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <h1 className={styles.pageTitle}>{warranty.warrantyCode || `Bảo hành #${id}`}</h1>
            <span className={styles.statusBadgeInline} style={{
              backgroundColor: statusInfo.code === 'success' ? 'rgba(34, 197, 94, 0.1)' : statusInfo.code === 'danger' ? 'rgba(239, 68, 68, 0.1)' : statusInfo.code === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: statusInfo.code === 'success' ? 'var(--color-success-deep)' : statusInfo.code === 'danger' ? 'var(--wms-danger)' : statusInfo.code === 'warning' ? 'var(--wms-warning-hover)' : 'var(--wms-primary-hover)'
            }}>
              <span className={styles.statusDot} style={{ backgroundColor: statusInfo.code === 'success' ? '#22c55e' : statusInfo.code === 'danger' ? 'var(--wms-danger)' : statusInfo.code === 'warning' ? 'var(--color-warning)' : 'var(--color-primary-bright)' }}></span>
              {statusInfo.label}
            </span>
          </div>
          <div className={styles.headerRight} style={{ display: 'flex', gap: '8px' }}>
            <button className={styles.btnEdit} onClick={handlePrintWarranty}>
              <i className="bi bi-printer"></i> In thẻ bảo hành
            </button>
            {currentStatus === 'ACTIVE' && canEditWarranty && (
              <button className={styles.btnDelete} onClick={() => setShowVoidModal(true)}>
                <i className="bi bi-shield-x"></i> Vô hiệu hóa
              </button>
            )}
            {currentStatus !== 'VOIDED' && canCreateRepair && (
              <button className={styles.btnEdit} onClick={() => navigate(`/repairs/create?warrantyId=${id}`)} style={{ marginLeft: 8 }}>
                <i className="bi bi-tools"></i> Tạo phiếu sửa
              </button>
            )}
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
                    <label>Kèm theo chứng từ</label>
                    <p>
                      {warranty.exportSlipId ? (
                        <span style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/export-slips/${warranty.exportSlipId}/edit`)}>
                          {warranty.exportSlipCode || 'Phiếu xuất kho'}
                        </span>
                      ) : warranty.salesOrderId ? (
                        <span style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/sales-orders/${warranty.salesOrderId}`)}>
                          {`Đơn hàng #${warranty.salesOrderId}`}
                        </span>
                      ) : (
                        'Không có chứng từ kèm theo'
                      )}
                    </p>
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
                      <ResponsiveTable
                        columns={linesColumns}
                        data={lines}
                      />
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
                  <ResponsiveTable
                    columns={repairsColumns}
                    data={repairs}
                    emptyMessage="Sản phẩm chưa từng được sửa chữa"
                    onRowClick={(repair) => navigate(`/repairs/${repair.id}`)}
                  />
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

      {showVoidModal && canEditWarranty && (
        <ConfirmModal
          isOpen={showVoidModal}
          onClose={() => setShowVoidModal(false)}
          onCancel={() => setShowVoidModal(false)}
          onConfirm={handleVoidWarranty}
          title="Vô hiệu hóa bảo hành"
          message={
            <div>
              <p style={{ marginBottom: 12 }}>Bạn có chắc chắn muốn vô hiệu hóa phiếu bảo hành này không? Hành động này không thể hoàn tác.</p>
              <textarea
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid var(--color-border-muted)', fontSize: 14 }}
                rows={3}
                placeholder="Nhập lý do vô hiệu hóa (Bắt buộc)..."
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
              />
            </div>
          }
          confirmText={voiding ? 'Đang xử lý...' : 'Xác nhận'}
          cancelText="Hủy"
        />
      )}

      {toast.isVisible && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      )}
    </AdminLayout>
  );
}

export default WarrantyDetailPage;
