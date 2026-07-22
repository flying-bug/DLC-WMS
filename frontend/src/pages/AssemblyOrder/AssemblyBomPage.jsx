import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminLayout from '../../components/layout/AdminLayout';
import * as assemblyApi from '../../api/assemblyOrderApi';
import axiosClient from '../../api/axiosClient';
import styles from './AssemblyOrderPage.module.css';

const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];

const STATUS_META = {
    DRAFT: { label: 'NhÃ¡p', tone: 'info' },
    APPROVED: { label: 'ÄÃ£ duyá»‡t', tone: 'success' },
    INACTIVE: { label: 'Ngá»«ng dÃ¹ng', tone: 'danger' }
};

const defaultBomLine = { componentVariantId: '', quantity: '1', costAllocationPct: '0', note: '' };

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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch BOM.');
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
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch thÃ nh pháº©m/SKU.');
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
                costAllocationPct: String(Number(line.costAllocationPct ?? 0)),
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
        if (!form.productId) return 'Vui lÃ²ng chá»n thÃ nh pháº©m.';
        if (!form.bomName.trim()) return 'Vui lÃ²ng nháº­p tÃªn BOM.';
        if (!form.versionNo || Number(form.versionNo) <= 0) return 'PhiÃªn báº£n BOM pháº£i lá»›n hÆ¡n 0.';
        if (!form.lines.length) return 'BOM pháº£i cÃ³ Ã­t nháº¥t má»™t linh kiá»‡n.';
        for (let index = 0; index < form.lines.length; index += 1) {
            const line = form.lines[index];
            if (!line.componentVariantId) return `Vui lÃ²ng chá»n SKU linh kiá»‡n dÃ²ng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Äá»‹nh má»©c dÃ²ng ${index + 1} pháº£i lá»›n hÆ¡n 0.`;
            if (!Number.isInteger(Number(line.quantity))) return `Äá»‹nh má»©c dÃ²ng ${index + 1} pháº£i lÃ  sá»‘ nguyÃªn.`;
            if (line.costAllocationPct === '' || Number(line.costAllocationPct) < 0) return `Tá»· lá»‡ phÃ¢n bá»• dÃ²ng ${index + 1} khÃ´ng Ä‘Æ°á»£c Ã¢m.`;
        }
        const totalPct = form.lines.reduce((sum, l) => sum + Number(l.costAllocationPct || 0), 0);
        if (Math.abs(totalPct - 100) > 0.01) return `Tá»•ng tá»· lá»‡ phÃ¢n bá»• giÃ¡ vá»‘n pháº£i báº±ng 100% (hiá»‡n táº¡i: ${totalPct.toFixed(2)}%).`;
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
            costAllocationPct: Number(line.costAllocationPct || 0),
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
                setSuccess('Cáº­p nháº­t BOM thÃ nh cÃ´ng.');
            } else {
                await assemblyApi.createAssemblyBom(buildPayload());
                setSuccess('Táº¡o BOM thÃ nh cÃ´ng.');
            }
            setShowModal(false);
            await loadBoms();
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'KhÃ´ng lÆ°u Ä‘Æ°á»£c BOM.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout>
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quáº£n lÃ½ BOM</h1>
                        <p className={styles.pageSubtitle}>Thiáº¿t láº­p Ä‘á»‹nh má»©c linh kiá»‡n cho thÃ nh pháº©m trÆ°á»›c khi láº­p lá»‡nh láº¯p rÃ¡p hoáº·c thÃ¡o dá»¡.</p>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.primaryButton} type="button" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i>
                            Táº¡o BOM
                        </button>
                    </div>
                </div>

                <div className={styles.detailGrid}>
                    <div className={styles.detailItem}><span>Tá»•ng BOM</span><strong>{stats.total}</strong></div>
                    <div className={styles.detailItem}><span>ÄÃ£ duyá»‡t</span><strong>{stats.approved}</strong></div>
                    <div className={styles.detailItem}><span>NhÃ¡p</span><strong>{stats.draft}</strong></div>
                    <div className={styles.detailItem}><span>Ngá»«ng dÃ¹ng</span><strong>{stats.inactive}</strong></div>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.filterGrid}>
                        <label className={styles.field}>
                            <span>Tráº¡ng thÃ¡i</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                <option value="">Táº¥t cáº£</option>
                                <option value="APPROVED">ÄÃ£ duyá»‡t</option>
                                <option value="DRAFT">NhÃ¡p</option>
                                <option value="INACTIVE">Ngá»«ng dÃ¹ng</option>
                            </select>
                        </label>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} type="button" onClick={() => setStatusFilter('')}>LÃ m má»›i</button>
                        <button className={styles.primaryButton} type="button" onClick={loadBoms}>
                            <i className="bi bi-funnel"></i>
                            Lá»c dá»¯ liá»‡u
                        </button>
                    </div>
                </div>

                {error && !showModal && <div className={styles.errorBox}>{error}</div>}
                {success && <div className={styles.successBox}>{success}</div>}

                <div className={styles.tablePanel}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>MÃ£ BOM</th>
                                <th>TÃªn BOM</th>
                                <th>ThÃ nh pháº©m</th>
                                <th>PhiÃªn báº£n</th>
                                <th>Sá»‘ linh kiá»‡n</th>
                                <th>Tráº¡ng thÃ¡i</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {boms.length > 0 ? boms.map((bom) => {
                                const status = STATUS_META[bom.status] || { label: bom.status || 'ChÆ°a rÃµ', tone: 'info' };
                                return (
                                    <tr key={bom.id} onClick={() => openEdit(bom)}>
                                        <td><span className={styles.linkText}>{bom.bomCode}</span></td>
                                        <td>{bom.bomName}</td>
                                        <td>{bom.productCode} - {bom.productName}</td>
                                        <td>{Number(bom.versionNo || 0).toLocaleString('vi-VN')}</td>
                                        <td>{bom.lines?.length || 0}</td>
                                        <td><span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span></td>
                                        <td>
                                            <button className={styles.iconButton} type="button" title="Sá»­a BOM" onClick={(event) => { event.stopPropagation(); openEdit(bom); }}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td className={styles.emptyCell} colSpan="7">{loading ? 'Äang táº£i danh sÃ¡ch BOM...' : 'ChÆ°a cÃ³ BOM phÃ¹ há»£p.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2>{form.id ? 'Cáº­p nháº­t BOM' : 'Táº¡o BOM'}</h2>
                                <button className={styles.iconButton} type="button" title="ÄÃ³ng" onClick={() => setShowModal(false)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className={styles.modalBody}>
                                {error && <div className={styles.errorBox}>{error}</div>}
                                <div className={styles.formGrid}>
                                    <label className={styles.field}>
                                        <span>ThÃ nh pháº©m</span>
                                        <select value={form.productId} onChange={(event) => setField('productId', event.target.value)}>
                                            <option value="">Chá»n thÃ nh pháº©m</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={styles.field}>
                                        <span>MÃ£ BOM</span>
                                        <input value={form.bomCode} onChange={(event) => setField('bomCode', event.target.value)} placeholder="Äá»ƒ trá»‘ng Ä‘á»ƒ tá»± sinh mÃ£" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>TÃªn BOM</span>
                                        <input value={form.bomName} onChange={(event) => setField('bomName', event.target.value)} placeholder="VÃ­ dá»¥: Cáº¥u hÃ¬nh PC vÄƒn phÃ²ng" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>PhiÃªn báº£n</span>
                                        <input className={styles.numberInput} inputMode="decimal" type="number" min="0.01" step="0.01" value={form.versionNo} onChange={(event) => setField('versionNo', event.target.value)} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Tráº¡ng thÃ¡i</span>
                                        <select value={form.status} onChange={(event) => setField('status', event.target.value)}>
                                            <option value="DRAFT">NhÃ¡p</option>
                                            <option value="APPROVED">ÄÃ£ duyá»‡t</option>
                                            <option value="INACTIVE">Ngá»«ng dÃ¹ng</option>
                                        </select>
                                    </label>
                                </div>

                                <div className={styles.lineActions}>
                                    <button className={styles.secondaryButton} type="button" onClick={addLine}>
                                        <i className="bi bi-plus-lg"></i>
                                        ThÃªm linh kiá»‡n
                                    </button>
                                </div>

                                {/* Cáº£nh bÃ¡o tá»•ng phÃ¢n bá»• */}
                                {(() => {
                                    const total = form.lines.reduce((sum, l) => sum + Number(l.costAllocationPct || 0), 0);
                                    return Math.abs(total - 100) > 0.01 ? (
                                        <div className={styles.errorBox} style={{ marginBottom: 8 }}>
                                            âš ï¸ Tá»•ng tá»· lá»‡ phÃ¢n bá»• giÃ¡ vá»‘n: <strong>{total.toFixed(2)}%</strong> â€” pháº£i báº±ng Ä‘Ãºng <strong>100%</strong>.
                                        </div>
                                    ) : null;
                                })()}

                                <div className={styles.tablePanel}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU linh kiá»‡n</th>
                                                <th>Äá»‹nh má»©c</th>
                                                <th>% PhÃ¢n bá»• giÃ¡ vá»‘n</th>
                                                <th>Ghi chÃº</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {form.lines.map((line, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <select value={line.componentVariantId} onChange={(event) => setLineField(index, 'componentVariantId', event.target.value)}>
                                                            <option value="">Chá»n SKU</option>
                                                            {variants.map((variant) => (
                                                                <option key={variant.id} value={variant.id}>{variant.sku} - {variant.productName} / {variant.variantName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input className={styles.numberInput} inputMode="numeric" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLineField(index, 'quantity', event.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input className={styles.numberInput} inputMode="decimal" type="number" min="0" max="100" step="0.01" value={line.costAllocationPct} onChange={(event) => setLineField(index, 'costAllocationPct', event.target.value)} placeholder="0.00" />
                                                    </td>
                                                    <td>
                                                        <input value={line.note} onChange={(event) => setLineField(index, 'note', event.target.value)} placeholder="Ghi chÃº dÃ²ng" />
                                                    </td>
                                                    <td>
                                                        <button className={styles.deleteButton} type="button" title="XÃ³a dÃ²ng" onClick={() => removeLine(index)}>
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
                                <button className={styles.secondaryButton} type="button" onClick={() => setShowModal(false)}>Há»§y</button>
                                <button className={styles.primaryButton} type="button" onClick={saveBom} disabled={saving}>
                                    <i className="bi bi-save"></i>
                                    {saving ? 'Äang cáº¥t...' : 'Cáº¥t'}
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
