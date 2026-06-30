import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import axiosClient from '../../api/axiosClient';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const STATUS_META = {
    DRAFT: { label: 'Nháp', tone: 'info' },
    APPROVED: { label: 'Đã duyệt', tone: 'success' },
    INACTIVE: { label: 'Ngừng dùng', tone: 'danger' }
};

const defaultBomLine = { componentVariantId: '', quantity: '1', note: '' };

const createDefaultForm = () => ({
    id: null,
    productId: '',
    bomCode: '',
    bomName: '',
    versionNo: '1',
    status: 'APPROVED',
    lines: [{ ...defaultBomLine }]
});

function AssemblyBomPage() {
    const [boms, setBoms] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(createDefaultForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadBoms = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await assemblyApi.getAssemblyBoms({ status: statusFilter || undefined });
            setBoms(listFrom(unwrap(response)));
        } catch (err) {
            setBoms([]);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách BOM.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const loadLookups = useCallback(async () => {
        try {
            const [productResponse, variantResponse] = await Promise.all([
                axiosClient.get('/products', { params: { page: 0, size: 500 } }),
                axiosClient.get('/products/variants', { params: { page: 0, size: 1000 } })
            ]);
            setProducts(listFrom(unwrap(productResponse)).filter((item) => item.active !== false));
            setVariants(listFrom(unwrap(variantResponse)).filter((item) => item.active !== false));
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách thành phẩm/SKU.');
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadBoms();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadBoms]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadLookups();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadLookups]);

    const stats = useMemo(() => ({
        total: boms.length,
        approved: boms.filter((item) => item.status === 'APPROVED').length,
        draft: boms.filter((item) => item.status === 'DRAFT').length,
        inactive: boms.filter((item) => item.status === 'INACTIVE').length
    }), [boms]);

    const openCreate = () => {
        setForm(createDefaultForm());
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const openEdit = (bom) => {
        setForm({
            id: bom.id,
            productId: bom.productId || '',
            bomCode: bom.bomCode || '',
            bomName: bom.bomName || '',
            versionNo: bom.versionNo || '1',
            status: bom.status || 'APPROVED',
            lines: bom.lines?.length ? bom.lines.map((line) => ({
                componentVariantId: line.componentVariantId || '',
                quantity: String(Number(line.quantity || 1)),
                note: line.note || ''
            })) : [{ ...defaultBomLine }]
        });
        setError('');
        setSuccess('');
        setShowModal(true);
    };

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const setLineField = (index, field, value) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
        }));
    };

    const addLine = () => {
        setForm((current) => ({
            ...current,
            lines: [...current.lines, { ...defaultBomLine }]
        }));
    };

    const removeLine = (index) => {
        setForm((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index)
        }));
    };

    const validateForm = () => {
        if (!form.productId) return 'Vui lòng chọn thành phẩm.';
        if (!form.bomName.trim()) return 'Vui lòng nhập tên BOM.';
        if (!form.versionNo || Number(form.versionNo) <= 0) return 'Phiên bản BOM phải lớn hơn 0.';
        if (!form.lines.length) return 'BOM phải có ít nhất một linh kiện.';
        for (let index = 0; index < form.lines.length; index += 1) {
            const line = form.lines[index];
            if (!line.componentVariantId) return `Vui lòng chọn SKU linh kiện dòng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Định mức dòng ${index + 1} phải lớn hơn 0.`;
            if (!Number.isInteger(Number(line.quantity))) return `Định mức dòng ${index + 1} phải là số nguyên.`;
        }
        return '';
    };

    const buildPayload = () => ({
        productId: Number(form.productId),
        bomCode: form.bomCode.trim() || null,
        bomName: form.bomName.trim(),
        versionNo: Number(form.versionNo),
        status: form.status,
        lines: form.lines.map((line) => ({
            componentVariantId: Number(line.componentVariantId),
            quantity: Number.parseInt(line.quantity, 10),
            note: line.note?.trim() || null
        }))
    });

    const saveBom = async () => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            if (form.id) {
                await assemblyApi.updateAssemblyBom(form.id, buildPayload());
                setSuccess('Cập nhật BOM thành công.');
            } else {
                await assemblyApi.createAssemblyBom(buildPayload());
                setSuccess('Tạo BOM thành công.');
            }
            setShowModal(false);
            await loadBoms();
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được BOM.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý BOM</h1>
                        <p className={styles.pageSubtitle}>Thiết lập định mức linh kiện cho thành phẩm trước khi lập lệnh lắp ráp hoặc tháo dỡ.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.primaryButton} type="button" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i>
                            Tạo BOM
                        </button>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Tổng BOM</span><strong>{stats.total}</strong></div>
                    <div className={styles.detailItem}><span>Đã duyệt</span><strong>{stats.approved}</strong></div>
                    <div className={styles.detailItem}><span>Nháp</span><strong>{stats.draft}</strong></div>
                    <div className={styles.detailItem}><span>Ngừng dùng</span><strong>{stats.inactive}</strong></div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Trạng thái</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="DRAFT">Nháp</option>
                                <option value="INACTIVE">Ngừng dùng</option>
                            </select>
                        </label>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => setStatusFilter('')}>Làm mới</button>
                        <button className={styles.primaryButton} type="button" onClick={loadBoms}>
                            <i className="bi bi-funnel"></i>
                            Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {error && !showModal && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Mã BOM</th>
                                <th>Tên BOM</th>
                                <th>Thành phẩm</th>
                                <th>Phiên bản</th>
                                <th>Số linh kiện</th>
                                <th>Trạng thái</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {boms.length > 0 ? boms.map((bom) => {
                                const status = STATUS_META[bom.status] || { label: bom.status || 'Chưa rõ', tone: 'info' };
                                return (
                                    <tr key={bom.id} onClick={() => openEdit(bom)}>
                                        <td><span className={styles.linkText}>{bom.bomCode}</span></td>
                                        <td>{bom.bomName}</td>
                                        <td>{bom.productCode} - {bom.productName}</td>
                                        <td>{Number(bom.versionNo || 0).toLocaleString('vi-VN')}</td>
                                        <td>{bom.lines?.length || 0}</td>
                                        <td><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></td>
                                        <td>
                                            <button className={styles.iconButton} type="button" title="Sửa BOM" onClick={(event) => { event.stopPropagation(); openEdit(bom); }}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="7">{loading ? 'Đang tải danh sách BOM...' : 'Chưa có BOM phù hợp.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{form.id ? 'Cập nhật BOM' : 'Tạo BOM'}</h2>
                                <button className={styles.iconButton} type="button" title="Đóng" onClick={() => setShowModal(false)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className={styles.modalBody}>
                                {error && <div className={styles.errorBox}>{error}</div>}
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>Thành phẩm</span>
                                        <select value={form.productId} onChange={(event) => setField('productId', event.target.value)}>
                                            <option value="">Chọn thành phẩm</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>Mã BOM</span>
                                        <input value={form.bomCode} onChange={(event) => setField('bomCode', event.target.value)} placeholder="Để trống để tự sinh mã" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Tên BOM</span>
                                        <input value={form.bomName} onChange={(event) => setField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Phiên bản</span>
                                        <input className={styles.numberInput} inputMode="decimal" type="number" min="0.01" step="0.01" value={form.versionNo} onChange={(event) => setField('versionNo', event.target.value)} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Trạng thái</span>
                                        <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                                            <option value="DRAFT">Nháp</option>
                                            <option value="APPROVED">Đã duyệt</option>
                                            <option value="INACTIVE">Ngừng dùng</option>
                                        </select>
                                    </label>
                                </div>

                                <div className={styles.lineActions}>
                                    <button className={styles.secondaryButton} type="button" onClick={addLine}>
                                        <i className="bi bi-plus-lg"></i>
                                        Thêm linh kiện
                                    </button>
                                </div>

                                <div className={styles.tablePanel}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU linh kiện</th>
                                                <th>Định mức</th>
                                                <th>Ghi chú</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {form.lines.map((line, index) => (
                                                <tr key={`${index}-${line.componentVariantId}`}>
                                                    <td>
                                                        <select value={line.componentVariantId} onChange={(event) => setLineField(index, 'componentVariantId', event.target.value)}>
                                                            <option value="">Chọn SKU</option>
                                                            {variants.map((variant) => (
                                                                <option key={variant.id} value={variant.id}>{variant.sku} - {variant.productName} / {variant.variantName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className={styles.numberInput} inputMode="numeric" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLineField(index, 'quantity', event.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input value={line.note} onChange={(event) => setLineField(index, 'note', event.target.value)} placeholder="Ghi chú dòng" />
                                                    </td>
                                                    <td>
                                                        <button className={styles.deleteButton} type="button" title="Xóa dòng" onClick={() => removeLine(index)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button className={styles.secondaryButton} type="button" onClick={() => setShowModal(false)}>Hủy</button>
                                <button className={styles.primaryButton} type="button" onClick={saveBom} disabled={saving}>
                                    <i className="bi bi-save"></i>
                                    {saving ? 'Đang cất...' : 'Cất'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export default AssemblyBomPage;
