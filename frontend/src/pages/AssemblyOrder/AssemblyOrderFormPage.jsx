import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const today = () => new Date().toISOString().slice(0, 10);

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    SUBMITTED: { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    POSTED: { label: 'Đã ghi sổ', tone: 'success' },
    CANCELLED: { label: 'Đã hủy', tone: 'danger' }
};

function AssemblyOrderFormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [boms, setBoms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        orderType: searchParams.get('type') === 'DISASSEMBLY' ? 'DISASSEMBLY' : 'ASSEMBLY',
        orderCode: '',
        bomId: '',
        warehouseId: '',
        quantity: '1',
        status: 'DRAFT',
        executionDate: today(),
        note: ''
    });

    const selectedBom = useMemo(() => boms.find((bom) => String(bom.id) === String(form.bomId)), [boms, form.bomId]);
    const canEdit = !editing || ['DRAFT', 'SUBMITTED'].includes(form.status);
    const status = STATUS_META[form.status] || { label: form.status || 'Chưa rõ', tone: 'info' };

    const loadBaseData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [bomResponse, warehouseResponse] = await Promise.all([
                assemblyApi.getAssemblyBoms(),
                warehouseApi.getWarehouses({ page: 0, size: 200 })
            ]);
            setBoms(listFrom(unwrap(bomResponse)));
            setWarehouses(listFrom(unwrap(warehouseResponse)));
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được dữ liệu BOM/kho.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOrder = useCallback(async () => {
        if (!editing) {
            return;
        }
        setLoading(true);
        setError('');
        try {
            const order = unwrap(await assemblyApi.getAssemblyOrderById(id));
            setForm({
                orderType: order.orderType || 'ASSEMBLY',
                orderCode: order.orderCode || '',
                bomId: order.bomId || '',
                warehouseId: order.warehouseId || '',
                quantity: order.quantity || '1',
                status: order.status || 'DRAFT',
                executionDate: order.executionDate || today(),
                note: order.note || ''
            });
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết lệnh.');
        } finally {
            setLoading(false);
        }
    }, [editing, id]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBaseData();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadBaseData]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadOrder();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadOrder]);

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setSuccess('');
    };

    const buildPayload = () => ({
        orderCode: form.orderCode || null,
        bomId: Number(form.bomId),
        warehouseId: Number(form.warehouseId),
        quantity: Number(form.quantity),
        status: form.status,
        executionDate: form.executionDate,
        note: form.note || null,
        createdBy: Number(localStorage.getItem('userId') || 1)
    });

    const validate = () => {
        if (!form.bomId) return 'Vui lòng chọn BOM.';
        if (!form.warehouseId) return 'Vui lòng chọn kho thực hiện.';
        if (!form.quantity || Number(form.quantity) <= 0) return 'Số lượng phải lớn hơn 0.';
        if (!form.executionDate) return 'Vui lòng chọn ngày thực hiện.';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const validationMessage = validate();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const payload = buildPayload();
            const response = editing
                ? await assemblyApi.updateAssemblyOrder(id, payload)
                : form.orderType === 'DISASSEMBLY'
                    ? await assemblyApi.createDisassemblyOrder(payload)
                    : await assemblyApi.createAssemblyOrder(payload);
            const saved = unwrap(response);
            setSuccess(editing ? 'Cập nhật lệnh thành công.' : 'Tạo lệnh thành công.');
            if (!editing && saved?.id) {
                navigate(`/assembly-orders/${saved.id}`);
            }
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được lệnh lắp ráp/tháo dỡ.');
        } finally {
            setSaving(false);
        }
    };

    const previewLines = selectedBom?.lines?.map((line) => ({
        ...line,
        required: Number(line.quantity || 0) * Number(form.quantity || 0)
    })) || [];

    return (
        <AdminLayout>
            <form className={styles.page} onSubmit={handleSubmit}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>{editing ? 'Chi tiết lệnh lắp ráp / tháo dỡ' : 'Tạo lệnh lắp ráp / tháo dỡ'}</h1>
                        <p className={styles.pageSubtitle}>{editing ? 'Cập nhật thông tin lệnh khi còn ở trạng thái nháp hoặc chờ duyệt.' : 'Chọn BOM, kho và số lượng để hệ thống tính danh sách linh kiện.'}</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => navigate('/assembly-orders')}>Quay lại</button>
                        <button className={styles.primaryButton} type="submit" disabled={saving || !canEdit}>
                            <i className="bi bi-save"></i>
                            {saving ? 'Đang lưu...' : 'Lưu lệnh'}
                        </button>
                    </div>
                </div>

                {editing && (
                    <div className={styles.detailGrid}>
                        <div className={styles.detailItem}><span>Mã lệnh</span><strong>{form.orderCode}</strong></div>
                        <div className={styles.detailItem}><span>Loại lệnh</span><strong>{form.orderType === 'DISASSEMBLY' ? 'Tháo dỡ' : 'Lắp ráp'}</strong></div>
                        <div className={styles.detailItem}><span>Trạng thái</span><strong><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></strong></div>
                        <div className={styles.detailItem}><span>Quyền cập nhật</span><strong>{canEdit ? 'Cho phép' : 'Đã khóa'}</strong></div>
                    </div>
                )}

                {error && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.formPanel}>
                    <div className={styles.formGrid}>
                        {!editing && (
                            <label className={styles.field}>
                                <span>Loại lệnh</span>
                                <select value={form.orderType} onChange={(event) => setField('orderType', event.target.value)} disabled={loading}>
                                    <option value="ASSEMBLY">Lắp ráp</option>
                                    <option value="DISASSEMBLY">Tháo dỡ</option>
                                </select>
                            </label>
                        )}
                        <label className={styles.field}>
                            <span>Mã lệnh</span>
                            <input value={form.orderCode} onChange={(event) => setField('orderCode', event.target.value)} placeholder="Để trống để tự sinh mã" disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>BOM</span>
                            <select value={form.bomId} onChange={(event) => setField('bomId', event.target.value)} disabled={!canEdit || loading}>
                                <option value="">{loading ? 'Đang tải BOM...' : 'Chọn BOM đã duyệt'}</option>
                                {boms.map((bom) => <option key={bom.id} value={bom.id}>{bom.bomCode} - {bom.bomName}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Kho</span>
                            <select value={form.warehouseId} onChange={(event) => setField('warehouseId', event.target.value)} disabled={!canEdit || loading}>
                                <option value="">Chọn kho</option>
                                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouseName}</option>)}
                            </select>
                        </label>
                        <label className={styles.field}>
                            <span>Số lượng</span>
                            <input type="number" min="0.0001" step="0.0001" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Ngày thực hiện</span>
                            <input type="date" value={form.executionDate} onChange={(event) => setField('executionDate', event.target.value)} disabled={!canEdit} />
                        </label>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={form.status} onChange={(event) => setField('status', event.target.value)} disabled={!canEdit}>
                                <option value="DRAFT">Nháp</option>
                                <option value="SUBMITTED">Chờ duyệt</option>
                            </select>
                        </label>
                        <label className={`${styles.field} ${styles.full}`}>
                            <span>Ghi chú</span>
                            <textarea value={form.note} onChange={(event) => setField('note', event.target.value)} disabled={!canEdit} placeholder="Ghi chú nội bộ cho lệnh" />
                        </label>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Thành phẩm</span><strong>{selectedBom?.productName || 'Chưa chọn BOM'}</strong></div>
                    <div className={styles.detailItem}><span>Mã BOM</span><strong>{selectedBom?.bomCode || 'Chưa chọn'}</strong></div>
                    <div className={styles.detailItem}><span>Phiên bản</span><strong>{selectedBom?.versionNo || 'Chưa có'}</strong></div>
                    <div className={styles.detailItem}><span>Số linh kiện</span><strong>{previewLines.length}</strong></div>
                </div>

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>SKU linh kiện</th>
                                <th>Tên linh kiện</th>
                                <th>Định mức</th>
                                <th>Số lượng cần</th>
                                <th>Đơn vị</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewLines.length > 0 ? previewLines.map((line) => (
                                <tr key={line.id}>
                                    <td>{line.componentSku}</td>
                                    <td>{line.componentName}</td>
                                    <td>{Number(line.quantity || 0).toLocaleString('vi-VN')}</td>
                                    <td><strong>{line.required.toLocaleString('vi-VN')}</strong></td>
                                    <td>{line.unitName || '-'}</td>
                                    <td>{line.note || '-'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="6">{loading ? 'Đang tải BOM...' : 'Chọn BOM để xem danh sách linh kiện.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </form>
        </AdminLayout>
    );
}

export default AssemblyOrderFormPage;
