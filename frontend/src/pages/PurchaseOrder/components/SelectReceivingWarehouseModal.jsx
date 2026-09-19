import { useEffect, useState } from 'react';
import styles from './SelectReceivingWarehouseModal.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { getMyWarehouses } from '../../../api/warehouseApi';
import { createBackorderForPurchaseOrder } from '../../../api/inventoryImportApi';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];

function SelectReceivingWarehouseModal({ po, warehouses: poWarehouses, onClose, onCreated }) {
  const [warehouses, setWarehouses] = useState(poWarehouses);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMyWarehouses()
      .then((res) => {
        if (cancelled) return;
        const allowedIds = new Set(pageContent(unwrap(res)).map(w => w.id));
        const list = poWarehouses.filter(w => allowedIds.has(w.id));
        setWarehouses(list);
        if (list.length === 1) setWarehouseId(String(list[0].id));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [poWarehouses]);

  const handleSubmit = async () => {
    if (!warehouseId) {
      setError('Vui lòng chọn kho nhận hàng');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await createBackorderForPurchaseOrder(po.id, warehouseId);
      onCreated(unwrap(res));
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không thể tạo phiếu nhập kho');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Chọn kho nhận hàng</h3>
          <i className={`bi bi-x-lg ${styles.closeIcon}`} onClick={onClose}></i>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Kho nhận hàng <span className={styles.required}>*</span>
            </label>
            <SearchableSelect
              className={styles.selectControl}
              name="warehouseId"
              value={warehouseId}
              onChange={(e) => { setWarehouseId(e.target.value); setError(''); }}
              disabled={loading || submitting}
            >
              <option value="">{loading ? 'Đang tải...' : 'Chọn kho...'}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code ? `${w.code} - ${w.name}` : w.name}</option>
              ))}
            </SearchableSelect>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <i className="bi bi-exclamation-circle-fill" /> {error}
            </div>
          )}

          <div className={styles.infoBox}>
            <i className="bi bi-info-circle-fill" />
            <div>
              Đơn mua hàng này nhập về nhiều kho. Hệ thống sẽ tạo một phiếu nhập kho nháp gồm các sản phẩm còn thiếu của kho bạn chọn; kho của phiếu không thể đổi sau khi tạo. Các kho còn lại nhập bằng phiếu riêng.
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={submitting}>Hủy</button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading || submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo phiếu nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectReceivingWarehouseModal;
