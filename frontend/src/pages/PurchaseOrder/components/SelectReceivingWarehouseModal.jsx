import { useEffect, useState } from 'react';
import styles from './SelectReceivingWarehouseModal.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { getMyWarehouses } from '../../../api/warehouseApi';

const unwrap = (res) => res?.data?.data ?? res?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];

function SelectReceivingWarehouseModal({ warehouses: poWarehouses, onClose, onSelect }) {
  const [warehouses, setWarehouses] = useState(poWarehouses);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMyWarehouses()
      .then((res) => {
        if (cancelled) return;
        const allowedList = pageContent(unwrap(res));
        const allowedIds = new Set(allowedList.map(w => w.id));
        const list = allowedIds.size > 0
          ? poWarehouses.filter(w => allowedIds.has(w.id))
          : poWarehouses;
        setWarehouses(list);
        if (list.length === 1) setWarehouseId(String(list[0].id));
      })
      .catch(() => {
        if (!cancelled) {
          setWarehouses(poWarehouses);
          if (poWarehouses.length === 1) setWarehouseId(String(poWarehouses[0].id));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [poWarehouses]);

  const handleSubmit = () => {
    if (!warehouseId) {
      setError('Vui lòng chọn kho nhận hàng');
      return;
    }
    onSelect(warehouseId);
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
              disabled={loading}
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
              Đơn mua hàng này nhập về nhiều kho. Mỗi kho nhập bằng một phiếu riêng: chọn kho để mở phiếu nhập mới gồm các sản phẩm còn thiếu của kho đó.
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
          <button className={styles.btnSubmit} onClick={handleSubmit} disabled={loading}>
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectReceivingWarehouseModal;
