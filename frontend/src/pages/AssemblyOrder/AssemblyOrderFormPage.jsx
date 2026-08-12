import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import Modal from '../../components/ui/Modal/Modal';
import Toast from '../../components/ui/Toast/Toast';
import * as assemblyApi from '../../api/assemblyOrderApi';
import * as warehouseApi from '../../api/warehouseApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as importApi from '../../api/inventoryImportApi';
import axiosClient from '../../api/axiosClient';
import { formatDateOnly, formatDateTime, getTodayIsoDate } from '../../utils/dateFormat';
import styles from './AssemblyOrderFormPage.module.css';
import bomStyles from './AssemblyOrderPage.module.css';
import AssemblyExecutionModal from './AssemblyExecutionModal';
import { printAssemblyOrder } from '../../utils/printAssemblyOrder';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const unwrap = (response) => response?.data?.data ?? response?.data;
const listFrom = (payload) => payload?.content ?? payload ?? [];
const today = getTodayIsoDate;

const STATUS_META = {
    DRAFT: { label: 'Lưu tạm', code: 'info' },
    APPROVED: { label: 'Đã duyệt', code: 'primary' },
    SUBMITTED: { label: 'Hoàn thành', code: 'success' },
    CANCELLED: { label: 'Đã hủy', code: 'danger' }
};

const COMPONENT_SERIAL_STATUS = {
    ACTIVE: { label: 'Đang dùng', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
    REPLACED: { label: 'Đã thay thế', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
    REMOVED: { label: 'Đã loại bỏ', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' }
};

const defaultBomLine = { componentVariantId: '', quantity: '1', note: '' };

const createDefaultBomForm = () => ({
    productId: '',
    bomCode: '',
    bomName: '',
    versionNo: '1',
    status: 'APPROVED',
    lines: [{ ...defaultBomLine }]
});

const groupSerialsByTarget = (serials = []) => Object.entries(serials.reduce((acc, curr) => {
    const targetSerial = curr.targetSerial || 'Chưa có serial thành phẩm';
    if (!acc[targetSerial]) acc[targetSerial] = [];
    acc[targetSerial].push(curr);
    return acc;
}, {}));

function SerialStatusBadge({ status }) {
    const normalized = String(status || 'ACTIVE').toUpperCase();
    const meta = COMPONENT_SERIAL_STATUS[normalized] || COMPONENT_SERIAL_STATUS.ACTIVE;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '4px', border: `1px solid ${meta.border}`, backgroundColor: meta.bg, color: meta.color, padding: '2px 7px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {meta.label}
        </span>
    );
}

function AssemblyOrderFormPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const editing = Boolean(id);
    const [boms, setBoms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [orderDetail, setOrderDetail] = useState(null);
    const [linkedExports, setLinkedExports] = useState([]);
    const [linkedImports, setLinkedImports] = useState([]);
    const [saving, setSaving] = useState(false);
    const [savingBom, setSavingBom] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Modal states
    const [showBomModal, setShowBomModal] = useState(false);
    const [showExecutionModal, setShowExecutionModal] = useState(false);
    const [bomForm, setBomForm] = useState(createDefaultBomForm);
    const [bomError, setBomError] = useState('');

    // Quick cấu hình Picker states
    const [pickingLineIndex, setPickingLineIndex] = useState(null);
    const [searchVariantQuery, setSearchVariantQuery] = useState('');
    const [inventoryBalances, setInventoryBalances] = useState([]);

    const getStockInfo = (variantId) => {
        if (!variantId) return { available: 0, total: 0 };
        return inventoryBalances
            .filter(b => String(b.variantId) === String(variantId))
            .reduce((acc, b) => {
                const total = Number(b.totalQuantity || 0);
                const reserved = Number(b.totalReserved || 0);
                return {
                    total: acc.total + total,
                    available: acc.available + (total - reserved)
                };
            }, { available: 0, total: 0 });
    };

    // Toast state
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const [savingNote, setSavingNote] = useState(false);

    const [customLines, setCustomLines] = useState([]);
    const [customLinesDirty, setCustomLinesDirty] = useState(false);
    const [form, setForm] = useState(() => ({
        orderType: searchParams.get('type') === 'DISASSEMBLY' ? 'DISASSEMBLY' : 'ASSEMBLY',
        orderCode: '',
        bomId: '',
        warehouseId: '',
        quantity: '1',
        status: 'DRAFT',
        executionDate: today(),
        note: ''
    }));

    const selectedBom = useMemo(() => boms.find((bom) => String(bom.id) === String(form.bomId)), [boms, form.bomId]);
    const isViewMode = searchParams.get('mode') === 'view';
    const canEdit = (!editing || form.status === 'DRAFT') && !isViewMode;
    const status = STATUS_META[form.status] || { label: form.status || 'Chưa rõ', code: 'info' };

    const loadBaseData = useCallback(async () => {
        setLoading(true);
        try {
            const [bomResponse, warehouseResponse] = await Promise.all([
                assemblyApi.getAssemblyBoms({ status: 'APPROVED' }),
                warehouseApi.getWarehouses({ page: 0, size: 200 })
            ]);
            setBoms(listFrom(unwrap(bomResponse)));
            setWarehouses(listFrom(unwrap(warehouseResponse)));
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được dữ liệu cấu hình/kho.');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadBomLookups = useCallback(async () => {
        try {
            const [productResponse, variantResponse, inventoryResponse] = await Promise.all([
                axiosClient.get('/products', { params: { page: 0, size: 500 } }),
                axiosClient.get('/products/variants', { params: { page: 0, size: 1000 } }),
                axiosClient.get('/reports/inventory-balance', { params: { page: 0, size: 5000 } })
            ]);
            setProducts(listFrom(unwrap(productResponse)).filter((item) => item.active !== false));
            setVariants(listFrom(unwrap(variantResponse)).filter((item) => item.active !== false));
            setInventoryBalances(listFrom(unwrap(inventoryResponse)));
        } catch (err) {
            setBomError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được danh sách thành phẩm/SKU.');
        }
    }, []);

    const loadOrder = useCallback(async () => {
        if (!editing) {
            return;
        }
        setLoading(true);
        try {
            const order = unwrap(await assemblyApi.getAssemblyOrderById(id));
            setOrderDetail(order);

            try {
                const expRes = await exportApi.getExportHistory({ referenceType: 'ASSEMBLY_ORDER', referenceId: id });
                setLinkedExports(unwrap(expRes));
            } catch (e) {
                console.error('Không tải được phiếu xuất liên kết', e);
            }
            try {
                const impRes = await importApi.getImportHistory({ referenceType: 'ASSEMBLY_ORDER', referenceId: id });
                setLinkedImports(unwrap(impRes));
            } catch (e) {
                console.error('Không tải được phiếu nhập liên kết', e);
            }

            // Removed manual serial mapping load
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

            if (searchParams.get('mode') !== 'view' && order.status === 'SUBMITTED') {
                setSearchParams({ mode: 'view' }, { replace: true });
            }
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không tải được chi tiết lệnh.');
        } finally {
            setLoading(false);
        }
    }, [editing, id, searchParams, setSearchParams]);

    useEffect(() => {
        loadBaseData();
        loadBomLookups();
        loadOrder();
    }, [loadBaseData, loadBomLookups, loadOrder]);

    const setField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    useEffect(() => {
        if (!editing) {
            const fetchNextCode = async () => {
                try {
                    const prefix = form.orderType === 'ASSEMBLY' ? 'LR' : 'TD';
                    const res = await assemblyApi.getAssemblyOrders({ orderType: form.orderType });
                    const orders = listFrom(unwrap(res));
                    let maxNum = 0;
                    orders.forEach(o => {
                        if (o.orderCode && o.orderCode.startsWith(prefix)) {
                            const numStr = o.orderCode.substring(prefix.length);
                            const num = parseInt(numStr, 10);
                            if (!isNaN(num) && num > maxNum) {
                                maxNum = num;
                            }
                        }
                    });
                    const nextNum = maxNum + 1;
                    const nextCode = `${prefix}${String(nextNum).padStart(5, '0')}`;
                    setForm(prev => {
                        if (!prev.orderCode || prev.orderCode.startsWith('LR') || prev.orderCode.startsWith('TD')) {
                            return { ...prev, orderCode: nextCode };
                        }
                        return prev;
                    });
                } catch (err) {
                    console.error('Lỗi sinh mã lệnh:', err);
                }
            };
            fetchNextCode();
        }
    }, [editing, form.orderType]);


    useEffect(() => {
        if (editing && orderDetail?.lines && !customLinesDirty) {
            setCustomLines(orderDetail.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: line.quantityRequired,
                note: line.note || ''
            })));
        } else if (!editing && selectedBom && !customLinesDirty) {
            setCustomLines(selectedBom.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: Number(line.quantity || 0) * Number(form.quantity || 1),
                note: line.note || ''
            })));
        }
    }, [orderDetail, selectedBom, editing]);

    useEffect(() => {
        if (!editing && !customLinesDirty && selectedBom) {
            setCustomLines(selectedBom.lines.map(line => ({
                componentVariantId: line.componentVariantId,
                quantityRequired: Number(line.quantity || 0) * Number(form.quantity || 1),
                note: line.note || ''
            })));
        }
    }, [form.quantity]);

    const requiredComponents = useMemo(() => {
        if (editing && orderDetail?.lines) {
            return orderDetail.lines.reduce((sum, line) => sum + Number(line.quantityRequired || 0), 0);
        }
        if (!editing && selectedBom?.lines) {
            return selectedBom.lines.reduce((sum, line) => sum + (Number(line.quantity || 0) * Number(form.quantity || 1)), 0);
        }
        return 0;
    }, [editing, orderDetail, selectedBom, form.quantity]);

    const requiredTarget = Number(editing ? (orderDetail?.quantity || 1) : (form.quantity || 1));

    const targetVariantId = orderDetail?.targetVariantId || orderDetail?.targetSku;
    const componentIds = useMemo(() => {
        if (!orderDetail || !orderDetail.lines) return new Set();
        return new Set(orderDetail.lines.map(l => String(l.componentVariantId)));
    }, [orderDetail]);

    const actualExports = useMemo(() => {
        return linkedExports
            .filter(slip => slip.status === 'POSTED')
            .reduce((sum, slip) => sum + slip.lines
                .filter(l => form.orderType === 'ASSEMBLY' ? componentIds.has(String(l.variantId)) : String(l.variantId) === String(targetVariantId))
                .reduce((s, line) => s + Number(line.quantityOut || 0), 0), 0);
    }, [linkedExports, componentIds, targetVariantId, form.orderType]);

    const actualImports = useMemo(() => {
        return linkedImports
            .filter(slip => slip.status === 'POSTED')
            .reduce((sum, slip) => sum + slip.lines
                .filter(l => form.orderType === 'ASSEMBLY' ? String(l.variantId) === String(targetVariantId) : componentIds.has(String(l.variantId)))
                .reduce((s, line) => s + Number(line.quantityIn || 0), 0), 0);
    }, [linkedImports, componentIds, targetVariantId, form.orderType]);

    const isAssembly = form.orderType !== 'DISASSEMBLY';
    const baseRequiredExportsQty = isAssembly ? requiredComponents : requiredTarget;
    const baseRequiredImportsQty = isAssembly ? requiredTarget : requiredComponents;

    const targetSumQty = isAssembly ? actualImports : actualExports;
    const requiredTargetQty = isAssembly ? baseRequiredImportsQty : baseRequiredExportsQty;
    const targetRatio = targetSumQty > requiredTargetQty && requiredTargetQty > 0 ? (targetSumQty / requiredTargetQty) : 1;

    const requiredExportsQty = isAssembly ? (baseRequiredExportsQty * targetRatio) : baseRequiredExportsQty;
    const requiredImportsQty = isAssembly ? baseRequiredImportsQty : (baseRequiredImportsQty * targetRatio);

    const exportProgress = requiredExportsQty > 0 ? Math.min(100, (actualExports / requiredExportsQty) * 100) : 0;
    const importProgress = requiredImportsQty > 0 ? Math.min(100, (actualImports / requiredImportsQty) * 100) : 0;

    const isReadyToComplete = useMemo(() => {
        if (targetSumQty < requiredTargetQty) return false;

        const actualComponentMap = {};
        const componentSlips = form.orderType === 'ASSEMBLY' ? linkedExports : linkedImports;
        componentSlips.filter(s => s.status === 'POSTED').forEach(slip => {
            slip.lines.forEach(l => {
                const qty = form.orderType === 'ASSEMBLY' ? Number(l.quantityOut || 0) : Number(l.quantityIn || 0);
                actualComponentMap[l.variantId] = (actualComponentMap[l.variantId] || 0) + qty;
            });
        });

        // Đối với Tháo dỡ, chỉ cần xuất đủ Thành phẩm (PC) đi tháo là được. 
        // Lượng linh kiện thu hồi (Nhập) phụ thuộc thực tế, không ép buộc phải đủ 100% định mức.
        if (form.orderType === 'DISASSEMBLY') return true;

        const sourceLines = (editing && orderDetail?.lines) ? orderDetail.lines : (selectedBom?.lines || []);
        for (const line of sourceLines) {
            const baseRequiredQty = editing ? Number(line.quantityRequired || 0) : (Number(line.quantity || 0) * Number(form.quantity || 1));
            const requiredQty = baseRequiredQty * targetRatio;
            const actualQty = actualComponentMap[line.componentVariantId] || 0;
            if (actualQty < requiredQty) return false;
        }

        return true;
    }, [linkedExports, linkedImports, form.orderType, editing, orderDetail, selectedBom, form.quantity, targetSumQty, requiredTargetQty, targetRatio]);

    const hasDrafts = linkedExports.some(s => s.status === 'DRAFT') || linkedImports.some(s => s.status === 'DRAFT');
    const disableComplete = saving || !isReadyToComplete || hasDrafts;

    // Removed unused manual serial mapping handlers

    const buildPayload = (overrideStatus = null) => ({
        orderCode: form.orderCode || null,
        bomId: Number(form.bomId),
        warehouseId: Number(form.warehouseId),
        quantity: Number(form.quantity),
        status: overrideStatus || form.status,
        executionDate: form.executionDate,
        note: form.note || null,
        createdBy: Number(sessionStorage.getItem('userId') || 1),
        lines: form.orderType === 'ASSEMBLY' && customLinesDirty ? customLines.map(line => ({
            componentVariantId: Number(line.componentVariantId),
            quantityRequired: Number(line.quantityRequired),
            note: line.note
        })) : undefined
    });

    const getPageTitle = () => {
        const typeText = form.orderType === 'DISASSEMBLY' ? 'tháo dỡ' : 'lắp ráp';
        const codeText = form.orderCode ? ` ${form.orderCode}` : '';
        if (!editing) return `Tạo lệnh ${typeText}${codeText}`;
        if (isViewMode) return `Chi tiết lệnh ${typeText}${codeText}`;
        return `Cập nhật lệnh ${typeText}${codeText}`;
    };

    const validate = () => {
        if (!form.bomId) return 'Vui lòng chọn cấu hình.';
        if (!form.warehouseId) return 'Vui lòng chọn kho thực hiện.';
        if (!form.quantity || Number(form.quantity) <= 0) return 'Số lượng phải lớn hơn 0.';
        if (!form.executionDate) return 'Vui lòng chọn ngày thực hiện.';
        return '';
    };

    const handleSubmit = async (event, overrideStatus = null) => {
        if (event) event.preventDefault();

        setSaving(true);
        try {
            if (overrideStatus === 'SUBMITTED' && editing) {
                await assemblyApi.updateOrderStatus(id, overrideStatus);
                showToast('success', 'Lệnh đã hoàn thành.');
                setTimeout(() => loadOrder(), 1000);
            } else {
                const validationMessage = validate();
                if (validationMessage) {
                    showToast('error', validationMessage);
                    setSaving(false);
                    return;
                }
                const payload = buildPayload(overrideStatus);
                const response = editing
                    ? await assemblyApi.updateAssemblyOrder(id, payload)
                    : form.orderType === 'DISASSEMBLY'
                        ? await assemblyApi.createDisassemblyOrder(payload)
                        : await assemblyApi.createAssemblyOrder(payload);
                const saved = unwrap(response);
                showToast('success', editing ? 'Cập nhật lệnh thành công.' : 'Tạo lệnh thành công.');
                if (!editing && saved?.id) {
                    setTimeout(() => navigate(`/assembly-orders/${saved.id}`), 1000);
                } else if (editing) {
                    setTimeout(() => loadOrder(), 1000);
                }
            }
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || err.response?.data?.message || 'Không lưu được lệnh lắp ráp/tháo dỡ.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateNote = async () => {
        if (!orderDetail || form.note === orderDetail.note) return;
        setSavingNote(true);
        try {
            await assemblyApi.updateAssemblyOrderNote(orderDetail.id, form.note);
            setOrderDetail({ ...orderDetail, note: form.note });
            showToast('success', 'Đã cập nhật ghi chú thành công');
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || 'Không cập nhật được ghi chú');
        } finally {
            setSavingNote(false);
        }
    };

    const setBomField = (field, value) => {
        setBomForm((current) => ({ ...current, [field]: value }));
        setBomError('');
    };

    const setBomLineField = (index, field, value) => {
        setBomForm((current) => ({
            ...current,
            lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line)
        }));
        setBomError('');
    };

    const addBomLine = () => {
        setBomForm((current) => ({
            ...current,
            lines: [...current.lines, { ...defaultBomLine }]
        }));
    };

    const removeBomLine = (index) => {
        setBomForm((current) => ({
            ...current,
            lines: current.lines.length === 1 ? current.lines : current.lines.filter((_, lineIndex) => lineIndex !== index)
        }));
    };

    const handleBomProductChange = async (productId) => {
        setBomField('productId', productId);
        if (!productId) {
            setBomForm((current) => ({ ...current, lines: [{ ...defaultBomLine }] }));
            return;
        }

        const selectedProduct = products.find(p => String(p.id) === String(productId));
        if (selectedProduct && selectedProduct.bomTemplate) {
            try {
                const templateLines = JSON.parse(selectedProduct.bomTemplate);
                if (templateLines && templateLines.length > 0) {
                    const newLines = templateLines.map(line => ({
                        componentVariantId: line.componentVariantId ? String(line.componentVariantId) : '',
                        categoryId: line.categoryId ? String(line.categoryId) : '',
                        componentRole: line.componentRole || '',
                        quantity: String(Number(line.quantity || 1)),
                        templateNote: line.note || '',
                        note: ''
                    }));

                    setBomForm((current) => ({ ...current, lines: newLines }));
                    return;
                }
            } catch (err) {
                console.error("Lỗi parse khung cấu hình", err);
            }
        }

        setBomForm((current) => ({ ...current, lines: [{ ...defaultBomLine }] }));
    };

    const openBomModal = () => {
        setBomError('');
        setBomForm(createDefaultBomForm());
        setShowBomModal(true);
    };

    const getCleanedBomLines = () => bomForm.lines.filter(line => line.componentRole || line.componentVariantId);

    const validateBomForm = (cleanedLines) => {
        if (!bomForm.productId) return 'Vui lòng chọn thành phẩm.';
        if (!bomForm.bomName.trim()) return 'Vui lòng nhập tên cấu hình.';
        if (!bomForm.versionNo || Number(bomForm.versionNo) <= 0) return 'Phiên bản cấu hình phải lớn hơn 0.';
        if (!cleanedLines.length) return 'Cấu hình phải có ít nhất một linh kiện.';
        for (let index = 0; index < cleanedLines.length; index += 1) {
            const line = cleanedLines[index];
            if (!line.componentVariantId) return `Vui lòng chọn SKU linh kiện dòng ${index + 1}.`;
            if (!line.quantity || Number(line.quantity) <= 0) return `Định mức dòng ${index + 1} phải lớn hơn 0.`;
            if (!Number.isInteger(Number(line.quantity))) return `Định mức dòng ${index + 1} phải là số nguyên.`;
        }
        return '';
    };

    const handleGenerateInventory = (documentType) => {
        if (!orderDetail || !orderDetail.id) return;

        const isAssembly = orderDetail.orderType !== 'DISASSEMBLY';

        const targetPath = documentType === 'GOODS_ISSUE' ? '/export-slips/assembly'
            : documentType === 'SCRAP' ? '/import-history/create?type=SCRAP'
                : !isAssembly ? '/import-history/create?type=OTHER'
                    : '/import-history/create?type=PRODUCTION';

        const draftSlip = documentType === 'GOODS_ISSUE'
            ? linkedExports.find(s => s.status === 'DRAFT')
            : linkedImports.find(s => s.status === 'DRAFT');

        if (draftSlip) {
            navigate(documentType === 'GOODS_ISSUE' ? `/export-slips/${draftSlip.id}/edit` : `/import-slips/${draftSlip.id}/edit`, {
                state: { returnUrl: `/assembly-orders/${orderDetail.id}` }
            });
            return;
        }

        // Lắp ráp -> Nhập thành phẩm (GOODS_RECEIPT)
        // Tháo dỡ -> Xuất thành phẩm (GOODS_ISSUE)
        const isTargetItem = (isAssembly && documentType === 'GOODS_RECEIPT') || (!isAssembly && documentType === 'GOODS_ISSUE');
        const isScrapItem = documentType === 'SCRAP';

        let lines;

        if (isTargetItem) {
            let totalComponentsCost = 0;
            if (orderDetail.lines && orderDetail.lines.length > 0) {
                totalComponentsCost = orderDetail.lines.reduce((total, line) => {
                    const price = line.unitCost || line.salePrice || 0;
                    return total + (price * (line.quantityRequired || 0));
                }, 0);
            }

            const assemblyQty = Number(orderDetail.quantity) || 1;
            const calculatedUnitPrice = totalComponentsCost / assemblyQty;
            const targetVariantId = orderDetail.targetVariantId || orderDetail.targetSku;

            // Tính số lượng đã nhập/xuất để gợi ý số lượng còn lại
            const completedQty = (documentType === 'GOODS_RECEIPT' ? linkedImports : linkedExports)
                .filter(s => s.status === 'POSTED')
                .reduce((sum, slip) => sum + slip.lines.filter(l => String(l.variantId) === String(targetVariantId)).reduce((s, l) => s + (documentType === 'GOODS_RECEIPT' ? (l.quantityIn || 0) : (l.quantityOut || 0)), 0), 0);

            const remainingQty = Math.max(0, assemblyQty - completedQty);

            lines = [{
                variantId: targetVariantId,
                quantity: remainingQty,
                price: totalComponentsCost > 0 ? calculatedUnitPrice : (orderDetail.targetSalePrice || 0)
            }];
        } else if (isScrapItem) {
            lines = orderDetail.lines.map(l => ({
                variantId: l.componentVariantId,
                quantity: 1, // Default quantity
                price: l.salePrice || l.unitCost || 0
            }));
        } else {
            // Document Type: GOODS_ISSUE cho Lắp ráp hoặc GOODS_RECEIPT cho tháo dỡ (Thành phần)
            const completedMap = {};
            (documentType === 'GOODS_ISSUE' ? linkedExports : linkedImports)
                .filter(s => s.status === 'POSTED')
                .forEach(slip => {
                    slip.lines.forEach(l => {
                        completedMap[l.variantId] = (completedMap[l.variantId] || 0) + (documentType === 'GOODS_ISSUE' ? (l.quantityOut || 0) : (l.quantityIn || 0));
                    });
                });

            lines = orderDetail.lines.map(l => {
                const required = Number(l.quantityRequired || 0) * targetRatio;
                const completed = completedMap[l.componentVariantId] || 0;
                const remaining = Math.max(0, required - completed);

                return {
                    variantId: l.componentVariantId,
                    quantity: remaining,
                    price: l.salePrice || l.unitCost || 0
                };
            }).filter(l => l.quantity > 0); // Chỉ giữ lại những linh kiện còn thiếu
        }



        navigate(targetPath, {
            state: {
                assemblyData: {
                    id: orderDetail.id,
                    code: orderDetail.orderCode,
                    warehouseId: orderDetail.warehouseId,
                    lines: lines
                },
                returnUrl: `/assembly-orders/${orderDetail.id}`
            }
        });
    };

    const saveQuickBom = async () => {
        const cleanedLines = getCleanedBomLines();
        const validationMessage = validateBomForm(cleanedLines);
        if (validationMessage) {
            setBomError(validationMessage);
            return;
        }
        setSavingBom(true);
        setBomError('');
        try {
            const payload = {
                productId: Number(bomForm.productId),
                bomCode: bomForm.bomCode.trim() || null,
                bomName: bomForm.bomName.trim(),
                versionNo: Number(bomForm.versionNo),
                status: 'APPROVED',
                lines: cleanedLines.map((line) => ({
                    componentVariantId: Number(line.componentVariantId),
                    quantity: Number.parseInt(line.quantity, 10),
                    note: line.note?.trim() || null,
                    componentRole: line.componentRole || null
                }))
            };
            const savedBom = unwrap(await assemblyApi.createAssemblyBom(payload));
            const refreshed = listFrom(unwrap(await assemblyApi.getAssemblyBoms({ status: 'APPROVED' })));
            setBoms(refreshed);
            setField('bomId', savedBom.id || '');
            setShowBomModal(false);
            showToast('success', 'Đã tạo cấu hình nhanh và tự động chọn vào lệnh.');
        } catch (err) {
            setBomError(err.response?.data?.userMessage || err.response?.data?.message || 'Không tạo được cấu hình nhanh.');
        } finally {
            setSavingBom(false);
        }
    };

    const previewLines = editing && orderDetail?.lines?.length > 0
        ? orderDetail.lines.map(line => ({
            componentName: line.componentName,
            componentSku: line.componentSku,
            unitName: line.unitName,
            required: line.quantityRequired,
        }))
        : selectedBom?.lines?.map((line) => ({
            ...line,
            required: Number(line.quantity || 0) * Number(form.quantity || 0)
        })) || [];

    const targetItem = editing && orderDetail ? {
        name: orderDetail.targetName,
        sku: orderDetail.targetSku,
        quantity: Number(orderDetail.quantity || 0),
        unitName: selectedBom?.unitName || ''
    } : selectedBom ? {
        name: selectedBom.productName,
        sku: selectedBom.productCode,
        quantity: Number(form.quantity || 0),
        unitName: selectedBom.unitName
    } : null;

    const lossItems = form.orderType === 'DISASSEMBLY'
        ? (targetItem ? [targetItem] : [])
        : previewLines.map((line) => ({
            name: line.componentName,
            sku: line.componentSku,
            quantity: line.required,
            unitName: line.unitName
        }));

    const gainItems = form.orderType === 'DISASSEMBLY'
        ? previewLines.map((line) => ({
            name: line.componentName,
            sku: line.componentSku,
            quantity: line.required,
            unitName: line.unitName
        }))
        : (targetItem ? [targetItem] : []);

    const handlePrint = () => {
        if (!orderDetail) return;
        const warehouse = warehouses.find(w => String(w.id) === String(orderDetail.warehouseId || form.warehouseId));
        printAssemblyOrder(orderDetail, {
            warehouseName: warehouse?.name || warehouse?.warehouseName,
            onError: (msg) => showToast('error', msg)
        });
    };
    const orderSerials = useMemo(() => {
        return (orderDetail?.mappedSerials || []).filter(item => !item.sourceRepairId);
    }, [orderDetail?.mappedSerials]);

    const orderSerialGroups = useMemo(() => groupSerialsByTarget(orderSerials), [orderSerials]);

    return (
        <AdminLayout>
            <div className={styles.pageHeader}>
                <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); navigate('/assembly-orders'); }}>
                    <i className="bi bi-arrow-left"></i> {getPageTitle()}
                </a>
                {editing && orderDetail && (
                    <button
                        type="button"
                        className="btn-misa-post"
                        style={{ marginLeft: 'auto', backgroundColor: '#3b82f6', borderColor: '#3b82f6', padding: '6px 16px', fontSize: '13px' }}
                        onClick={handlePrint}
                    >
                        <i className="bi bi-printer" style={{ marginRight: '6px' }}></i> In phiếu lệnh
                    </button>
                )}
            </div>
            <div className={styles.pageBody}>

                <div className={styles.mainContent}>
                    {/* LEFT COLUMN: FORM */}
                    <div className={styles.leftColumn}>
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Thông tin chung</h2>

                            {editing && (
                                <div className={styles.detailGrid} style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div className={styles.detailItem}><span>Trạng thái</span><strong><span className={`${styles.badge} ${styles['badge' + status.code.charAt(0).toUpperCase() + status.code.slice(1)]}`}>{status.label}</span></strong></div>
                                    <div className={styles.detailItem}><span>Người tạo</span><strong>{orderDetail?.createdByName ? orderDetail.createdByName : (orderDetail?.createdBy ? `ID: ${orderDetail.createdBy}` : 'Hệ thống')}</strong></div>
                                    <div className={styles.detailItem}><span>Ngày tạo</span><strong>{orderDetail?.createdAt ? formatDateTime(orderDetail.createdAt) : '---'}</strong></div>
                                </div>
                            )}

                            <div className={styles.cardBody}>
                                <div className="misa-form-row">
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Mã lệnh</label>
                                        <input className="misa-input" value={form.orderCode} onChange={(event) => setField('orderCode', event.target.value)} placeholder="Mã lệnh" disabled={!canEdit} />
                                    </div>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Ngày thực hiện <span className="required">*</span></label>
                                        <input type="date" className="misa-input" value={form.executionDate} onChange={(event) => setField('executionDate', event.target.value)} disabled={!canEdit} />
                                    </div>
                                </div>

                                <div className="misa-form-row" style={{ marginTop: '12px' }}>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Chọn Kho <span className="required">*</span></label>
                                        <SearchableSelect className="misa-input" value={form.warehouseId} onChange={(event) => setField('warehouseId', event.target.value)} disabled={!canEdit || loading}>
                                            <option value="">Chọn kho thực hiện</option>
                                            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.warehouseName}</option>)}
                                        </SearchableSelect>
                                    </div>
                                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                        <label className="misa-label">Số lượng <span className="required">*</span></label>
                                        <input className="misa-input" style={{ textAlign: 'right' }} inputMode="numeric" type="number" min="1" step="1" value={form.quantity} onFocus={(e) => e.target.select()} onChange={(event) => setField('quantity', event.target.value)} disabled={!canEdit} />
                                    </div>
                                </div>

                                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                    <label className="misa-label">Cấu hình máy <span className="required">*</span></label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <SearchableSelect className="misa-input" style={{ flex: 1 }} value={form.bomId} onChange={(event) => setField('bomId', event.target.value)} disabled={!canEdit || loading}>
                                            <option value="">{loading ? 'Đang tải cấu hình...' : 'Chọn cấu hình đã duyệt'}</option>
                                            {boms.map((bom) => <option key={bom.id} value={bom.id}>{bom.bomCode ? `${bom.bomCode} - ` : ''}{bom.bomName} (Phiên bản: {bom.versionNo || '1.0'}) - SP: {bom.productName}</option>)}
                                        </SearchableSelect>
                                        <button className={styles.btnOutline} type="button" onClick={openBomModal} disabled={!canEdit} style={{ whiteSpace: 'nowrap', padding: '0 12px', height: '32px' }}>
                                            <i className="bi bi-plus-lg"></i> Tạo cấu hình
                                        </button>
                                    </div>
                                </div>


                                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label className="misa-label">Ghi chú</label>
                                        {!canEdit && orderDetail && orderDetail.status !== 'SUBMITTED' && orderDetail.status !== 'CANCELLED' && form.note !== orderDetail.note && (
                                            <button
                                                className={styles.btnOutline}
                                                type="button"
                                                onClick={handleUpdateNote}
                                                disabled={savingNote}
                                                style={{ fontSize: '12px', padding: '2px 8px', height: '24px' }}
                                            >
                                                {savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
                                            </button>
                                        )}
                                    </div>
                                    <textarea className="misa-input" style={{ resize: 'vertical' }} disabled={!canEdit && (orderDetail?.status === 'SUBMITTED' || orderDetail?.status === 'CANCELLED')} value={form.note} onChange={(event) => setField('note', event.target.value)} placeholder="Ghi chú nội bộ cho lệnh" rows={2} />
                                </div>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Chi tiết dòng nguyên liệu</h2>

                            <div className={styles.flowGridContainer}>
                                <FlowPanel
                                    tone="loss"
                                    title="Nguyên liệu xuất (Bị trừ)"
                                    icon="bi-dash-circle-fill"
                                    emptyText={loading ? 'Đang tính toán...' : 'Chọn cấu hình để xem hàng bị trừ.'}
                                    items={lossItems}
                                />
                                <FlowPanel
                                    tone="gain"
                                    title="Sản phẩm nhập (Được cộng)"
                                    icon="bi-plus-circle-fill"
                                    emptyText={loading ? 'Đang tính toán...' : 'Chọn cấu hình để xem hàng được cộng.'}
                                    items={gainItems}
                                />
                            </div>

                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className={styles.rightColumn}>
                        <div className={styles.card} style={{ position: 'sticky', top: '24px' }}>
                            <h2 className={styles.cardTitle}>Tóm tắt cấu hình máy</h2>

                            <div className={styles.summaryList}>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel} style={{ whiteSpace: 'nowrap' }}>Mã cấu hình</span>
                                    <span className={styles.summaryValue} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{selectedBom?.bomCode || '---'}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel} style={{ whiteSpace: 'nowrap' }}>Phiên bản</span>
                                    <span className={styles.summaryValue}>{selectedBom?.versionNo || '---'}</span>
                                </div>
                                <div className={styles.summaryItem} style={{ alignItems: 'flex-start' }}>
                                    <span className={styles.summaryLabel} style={{ whiteSpace: 'nowrap', minWidth: '85px', marginTop: '2px' }}>Thành phẩm</span>
                                    <span className={styles.summaryValue} style={{ textAlign: 'right' }}>{selectedBom?.productName || 'Chưa chọn'}</span>
                                </div>
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel} style={{ whiteSpace: 'nowrap' }}>Số linh kiện (SKU)</span>
                                    <span className={styles.summaryValue}>{previewLines.length}</span>
                                </div>

                                <hr className={styles.divider} />

                                <div className={styles.summaryItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                    <span className={styles.summaryLabel}>Tiến độ xuất kho (Bị trừ):</span>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            backgroundColor: 'var(--color-warning)',
                                            width: `${exportProgress}%`
                                        }}></div>
                                    </div>
                                    <span className={styles.summaryValue} style={{ alignSelf: 'flex-end', fontSize: '12px' }}>
                                        {actualExports.toLocaleString('vi-VN')} / {requiredExportsQty.toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <div className={styles.summaryItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginTop: '12px' }}>
                                    <span className={styles.summaryLabel}>Tiến độ nhập kho (Được cộng):</span>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            backgroundColor: 'var(--color-success)',
                                            width: `${importProgress}%`
                                        }}></div>
                                    </div>
                                    <span className={styles.summaryValue} style={{ alignSelf: 'flex-end', fontSize: '12px' }}>
                                        {actualImports.toLocaleString('vi-VN')} / {requiredImportsQty.toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hiển thị serial thuộc đúng phiếu, tách lịch sử sửa chữa riêng */}
                {orderSerialGroups.length > 0 && (
                    <div className={styles.card} style={{ marginTop: '24px' }}>
                        <h2 className={styles.cardTitle}>
                            <i className="bi bi-list-nested" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                            {orderDetail?.orderType === 'DISASSEMBLY' ? 'Serial tháo dỡ theo phiếu' : 'Serial lắp ráp theo phiếu'}
                        </h2>
                        {orderSerialGroups.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {orderSerialGroups.map(([targetSerial, components], index) => (
                                    <div key={targetSerial} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                                            <div style={{ backgroundColor: 'var(--color-primary)', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', marginRight: '12px', flexShrink: 0 }}>
                                                {index + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{orderDetail?.orderType === 'DISASSEMBLY' ? 'Thành phẩm đã tháo:' : 'Thành phẩm đã lắp:'} {orderDetail.targetName}</div>
                                                <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '14px' }}>{targetSerial}</div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '8px 0' }}>
                                            {components.map((comp, i) => (
                                                <div key={comp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '8px 16px', borderBottom: i < components.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                                        <i className={orderDetail?.orderType === 'DISASSEMBLY' ? "bi bi-box-arrow-up-right" : "bi bi-arrow-return-right"} style={{ color: 'var(--color-primary)', opacity: 0.5, marginRight: '8px' }}></i>
                                                        <span style={{ color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={comp.componentName}>{comp.componentName}</span>
                                                    </div>
                                                    <SerialStatusBadge status={comp.status} />
                                                    <span style={{ fontWeight: 500, color: '#0f172a', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{comp.componentSerial}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>
                                Chưa có serial thuộc phiếu này.
                            </div>
                        )}

                    </div>
                )}
            </div>


            <div className={styles.bottomBar}>
                <button className="btn-misa-cancel" type="button" onClick={() => navigate('/assembly-orders')}>
                    {canEdit ? 'Hủy bỏ' : 'Đóng'}
                </button>
                {orderDetail?.status === 'APPROVED' && (
                    <div className={styles.actionButtons}>
                        {['ASSEMBLY', 'DISASSEMBLY'].includes(form.orderType) && (
                            <button className="btn-misa-post" style={{ backgroundColor: '#10b981', marginRight: '8px' }} type="button" onClick={() => setShowExecutionModal(true)}>
                                <i className="bi bi-upc-scan"></i> {form.orderType === 'ASSEMBLY' ? 'Thực thi Lắp ráp' : 'Thực thi Tháo dỡ'}
                            </button>
                        )}
                        {linkedExports?.length > 0 && (
                            <button className={styles.btnOutline} type="button" onClick={() => navigate('/export-slips', { state: { referenceId: id, referenceType: 'ASSEMBLY_ORDER' } })}>
                                <i className="bi bi-box-arrow-up"></i> Xem phiếu xuất kho
                            </button>
                        )}
                        {linkedImports?.length > 0 && (
                            <button className={styles.btnOutline} type="button" onClick={() => navigate('/import-history', { state: { referenceId: id, referenceType: 'ASSEMBLY_ORDER' } })}>
                                <i className="bi bi-box-arrow-in-down"></i> Xem phiếu nhập kho
                            </button>
                        )}
                        <button className="btn-misa-post" style={{ backgroundColor: '#0ea5e9' }} type="button" onClick={(e) => handleSubmit(e, 'SUBMITTED')} disabled={disableComplete}>
                            <i className="bi bi-check-circle-fill"></i> Hoàn thành
                        </button>
                    </div>
                )}
                {orderDetail?.status === 'SUBMITTED' && (
                    <div className={styles.actionButtons}>
                        <button className={styles.btnOutline} type="button" onClick={() => navigate('/export-slips', { state: { referenceId: id, referenceType: 'ASSEMBLY_ORDER' } })}>
                            <i className="bi bi-box-arrow-up"></i> Xem phiếu xuất kho
                        </button>
                        <button className={styles.btnOutline} type="button" onClick={() => navigate('/import-history', { state: { referenceId: id, referenceType: 'ASSEMBLY_ORDER' } })}>
                            <i className="bi bi-box-arrow-in-down"></i> Xem phiếu nhập kho
                        </button>
                    </div>
                )}
                
                {orderDetail && (
                    <div className={styles.actionButtons} style={{ marginBottom: '16px', justifyContent: 'flex-end' }}>
                        <button className="btn-misa-draft" style={{ backgroundColor: '#fff', color: '#111827', border: '1px solid #d1d5db' }} type="button" onClick={() => {
                            printAssemblyOrder(orderDetail, {
                                warehouseName: warehouses.find(w => String(w.id) === String(orderDetail.warehouseId))?.name || '',
                                productById: new Map(products.map(p => [String(p.id), p])),
                                variantById: new Map(variants.map(v => [String(v.id), v])),
                            });
                        }}>
                            <i className="bi bi-printer"></i> In lệnh lắp ráp
                        </button>
                    </div>
                )}

                {canEdit && (
                    <div className={styles.actionButtons}>
                        <button className="btn-misa-draft" type="button" onClick={(e) => handleSubmit(e, 'DRAFT')} disabled={saving}>
                            <i className="bi bi-save"></i> Lưu tạm
                        </button>
                        <button className="btn-misa-post" type="button" onClick={(e) => handleSubmit(e, 'APPROVED')} disabled={saving}>
                            <i className="bi bi-check-circle"></i>
                            {saving ? 'Đang lưu...' : 'Duyệt lệnh (Lưu)'}
                        </button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={showBomModal}
                onClose={() => {
                    if (pickingLineIndex !== null) {
                        setPickingLineIndex(null);
                        setSearchVariantQuery('');
                    } else {
                        setShowBomModal(false);
                    }
                }}
                dialogStyle={{ width: '900px', maxWidth: '95vw', padding: 0 }}
            >
                {pickingLineIndex !== null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
                        <div className={bomStyles.modalHeader} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                            <button type="button" onClick={() => { setPickingLineIndex(null); setSearchVariantQuery(''); }} style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4b5563', transition: 'all 0.2s' }} title="Quay lại danh sách cấu hình">
                                <i className="bi bi-arrow-left" style={{ fontSize: '18px' }}></i>
                            </button>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>Tìm kiếm & Chọn linh kiện</h2>
                        </div>
                        <div className={bomStyles.modalBody} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: '#f8fafc', flexShrink: 0 }}>
                                <input
                                    type="text"
                                    className="misa-input"
                                    style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                                    placeholder="Tìm kiếm linh kiện theo tên, mã sản phẩm..."
                                    value={searchVariantQuery}
                                    onChange={(e) => setSearchVariantQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
                                {variants.filter(v => {
                                    const parentProd = products.find(p => String(p.id) === String(v.productId));
                                    const type = v.productType || (parentProd ? parentProd.productType : null);
                                    if (type !== 'Hàng hóa') return false;

                                    const line = bomForm.lines[pickingLineIndex];
                                    if (line && line.categoryId && String(v.categoryId) !== String(line.categoryId)) {
                                        return false;
                                    }
                                    if (!searchVariantQuery) return true;
                                    const q = searchVariantQuery.toLowerCase();
                                    return (v.sku || '').toLowerCase().includes(q)
                                        || (v.productName || '').toLowerCase().includes(q)
                                        || (v.variantName || '').toLowerCase().includes(q);
                                }).map(variant => (
                                    <div key={variant.id} className={bomStyles.variantPickerItem}>
                                        <div className={bomStyles.variantPickerImg}>
                                            {variant.imageUrl ? (
                                                <img src={variant.imageUrl} alt={variant.variantName} />
                                            ) : (
                                                <i className="bi bi-box"></i>
                                            )}
                                        </div>
                                        <div className={bomStyles.variantPickerInfo}>
                                            <div className={bomStyles.variantPickerTitle}>
                                                {variant.productName} {(variant.variantName && variant.variantName !== variant.productName) && `/ ${variant.variantName}`}
                                            </div>
                                            <div className={bomStyles.bomItemMeta}>
                                                <span>Mã SP: <strong>{variant.sku}</strong></span>
                                                <span>Bảo hành: <strong>{variant.warrantyQty != null ? `${variant.warrantyQty} Tháng` : 'Không bảo hành'}</strong></span>
                                                <span className={bomStyles.stockStatus}>Tồn kho: <strong style={{ color: Math.max(0, getStockInfo(variant.id).available) > 0 ? '#16a34a' : '#dc2626' }}>{Math.max(0, getStockInfo(variant.id).available).toLocaleString('vi-VN')}</strong></span>
                                            </div>
                                            <div className={bomStyles.variantPickerPrice}>
                                                {Number(variant.salePrice || 0).toLocaleString('vi-VN')} đ
                                            </div>
                                        </div>
                                        <div className={bomStyles.variantPickerAction}>
                                            <button
                                                className={bomStyles.primaryButton}
                                                type="button"
                                                onClick={() => {
                                                    setBomLineField(pickingLineIndex, 'componentVariantId', String(variant.id));
                                                    setPickingLineIndex(null);
                                                    setSearchVariantQuery('');
                                                }}
                                            >
                                                THÊM VÀO CẤU HÌNH <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {variants.length > 0 && variants.filter(v => {
                                    const parentProd = products.find(p => String(p.id) === String(v.productId));
                                    const type = v.productType || (parentProd ? parentProd.productType : null);
                                    if (type !== 'Hàng hóa') return false;

                                    const line = bomForm.lines[pickingLineIndex];
                                    if (line && line.categoryId && String(v.categoryId) !== String(line.categoryId)) {
                                        return false;
                                    }
                                    if (!searchVariantQuery) return true;
                                    const q = searchVariantQuery.toLowerCase();
                                    return (v.sku || '').toLowerCase().includes(q)
                                        || (v.productName || '').toLowerCase().includes(q)
                                        || (v.variantName || '').toLowerCase().includes(q);
                                }).length === 0 && (
                                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            Không tìm thấy linh kiện phù hợp với "{searchVariantQuery}"
                                        </div>
                                    )}
                                {variants.length === 0 && (
                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        Không có linh kiện nào
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Custom Modal Header to match Image 1 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#1f2937' }}>Tạo nhanh cấu hình</h2>
                            <button type="button" onClick={() => setShowBomModal(false)} style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {bomError && (
                                <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                                    {bomError}
                                </div>
                            )}

                            <div className="misa-form-row">
                                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                    <label className="misa-label">Thành phẩm</label>
                                    <SearchableSelect className="misa-input" value={bomForm.productId} onChange={(event) => handleBomProductChange(event.target.value)}>
                                        <option value="">Chọn thành phẩm</option>
                                        {products.filter(p => p.productType === 'Thành phẩm').map((product) => (
                                            <option key={product.id} value={product.id}>{product.productCode} - {product.productName}</option>
                                        ))}
                                    </SearchableSelect>
                                </div>
                                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                    <label className="misa-label">Mã cấu hình</label>
                                    <input className="misa-input" value={bomForm.bomCode} onChange={(event) => setBomField('bomCode', event.target.value)} placeholder="Để trống để tự sinh mã" />
                                </div>
                            </div>
                            <div className="misa-form-row" style={{ marginTop: '16px' }}>
                                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                    <label className="misa-label">Tên cấu hình</label>
                                    <input className="misa-input" value={bomForm.bomName} onChange={(event) => setBomField('bomName', event.target.value)} placeholder="Ví dụ: Cấu hình PC văn phòng" />
                                </div>
                                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                                    <label className="misa-label">Phiên bản</label>
                                    <input className="misa-input" inputMode="decimal" type="number" min="0.01" step="0.01" value={bomForm.versionNo} onChange={(event) => setBomField('versionNo', event.target.value)} />
                                </div>
                            </div>

                            <div className={bomStyles.bomBuilderContainer} style={{ marginTop: '24px' }}>
                                <div className={bomStyles.bomBuilderHeader}>
                                    <h3 className={bomStyles.bomBuilderTitle}>Chọn linh kiện xây cấu hình máy tính theo nhu cầu</h3>
                                    <div className={bomStyles.bomTotalCost}>
                                        Chi phí dự tính: {bomForm.lines.reduce((sum, line) => {
                                            const v = variants.find(v => String(v.id) === String(line.componentVariantId));
                                            return sum + (v ? Number(v.salePrice || 0) : 0) * Number(line.quantity || 0);
                                        }, 0).toLocaleString('vi-VN')} đ
                                    </div>
                                </div>
                                <div className={bomStyles.bomList}>
                                    {bomForm.lines.map((line, index) => {
                                        const selectedVariant = variants.find(v => String(v.id) === String(line.componentVariantId));

                                        return (
                                            <div key={index} className={bomStyles.bomLineCard}>
                                                <div className={bomStyles.bomLineHeader} style={{ flexDirection: 'column', justifyContent: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937', textTransform: 'uppercase' }}>
                                                            {index + 1}. {line.componentRole || (selectedVariant ? selectedVariant.categoryName : 'Linh kiện tùy chọn')}
                                                        </span>
                                                        {line.templateNote && (
                                                            <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 500, marginLeft: '6px', border: '1px dashed #f59e0b' }}>
                                                                <i className="bi bi-pin-angle-fill" style={{ marginRight: '4px' }}></i>
                                                                Yêu cầu: {line.templateNote}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', alignItems: 'flex-start' }}>
                                                        {selectedVariant && selectedVariant.categoryDescription && (
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                                                                ({selectedVariant.categoryDescription})
                                                            </div>
                                                        )}
                                                        {line.componentRole && (
                                                            <span style={{ fontSize: '0.65rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                                Bắt buộc
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedVariant ? (
                                                    <div className={bomStyles.bomLineContent}>
                                                        <div className={bomStyles.bomItemImgBox}>
                                                            {selectedVariant.imageUrl ? (
                                                                <img src={selectedVariant.imageUrl} alt={selectedVariant.variantName} />
                                                            ) : (
                                                                <i className="bi bi-box"></i>
                                                            )}
                                                        </div>
                                                        <div className={bomStyles.bomItemDetails}>
                                                            <div className={bomStyles.bomItemTitle} title={`${selectedVariant.productName} ${(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) ? `/ ${selectedVariant.variantName}` : ''}`}>
                                                                {selectedVariant.productName} {(selectedVariant.variantName && selectedVariant.variantName !== selectedVariant.productName) && `/ ${selectedVariant.variantName}`}
                                                            </div>
                                                            <div className={bomStyles.bomItemMeta}>
                                                                <span>Bảo hành: <strong>{selectedVariant.warrantyQty != null ? `${selectedVariant.warrantyQty} Tháng` : 'Không bảo hành'}</strong></span>
                                                                <span className={bomStyles.stockStatus}>Tồn kho: <strong style={{ color: Math.max(0, getStockInfo(selectedVariant.id).available) > 0 ? '#16a34a' : '#dc2626' }}>{Math.max(0, getStockInfo(selectedVariant.id).available).toLocaleString('vi-VN')}</strong></span>
                                                                <span>Mã SP: <strong>{selectedVariant.sku}</strong></span>
                                                            </div>
                                                            <div className={bomStyles.bomExtraFields}>
                                                                <label>
                                                                    Ghi chú:
                                                                    <input type="text" className={bomStyles.fullWidth} value={line.note} onChange={(event) => setBomLineField(index, 'note', event.target.value)} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                        <div className={bomStyles.bomItemPriceGroup}>
                                                            <span className={bomStyles.bomItemPrice}>{Number(selectedVariant.salePrice || 0).toLocaleString('vi-VN')}</span>
                                                            <span>x</span>
                                                            <input className={bomStyles.bomItemQtyInput} type="number" min="1" step="1" value={line.quantity} onChange={(event) => setBomLineField(index, 'quantity', event.target.value)} />
                                                            <span>=</span>
                                                            <span className={bomStyles.bomItemTotal}>
                                                                {(Number(selectedVariant.salePrice || 0) * Number(line.quantity || 0)).toLocaleString('vi-VN')}
                                                            </span>
                                                        </div>
                                                        <div className={bomStyles.bomItemActions}>
                                                            <button className={`${bomStyles.bomActionBtn} ${bomStyles.edit}`} type="button" title="Đổi linh kiện" onClick={() => setPickingLineIndex(index)}>
                                                                <i className="bi bi-pencil-square"></i>
                                                            </button>
                                                            {!line.componentRole && (
                                                                <button className={`${bomStyles.bomActionBtn} ${bomStyles.delete}`} type="button" title="Xóa" onClick={() => removeBomLine(index)}>
                                                                    <i className="bi bi-trash"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={bomStyles.bomEmptySlot} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                                                        {line.componentRole && (
                                                            <div style={{ fontWeight: 600, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <i className="bi bi-info-circle" style={{ color: '#3b82f6' }}></i>
                                                                Cần chọn danh mục: <span style={{ color: '#1d4ed8' }}>{line.componentRole}</span>
                                                                {line.templateNote && (
                                                                    <span style={{ marginLeft: '8px', color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                                        <i className="bi bi-pin-angle-fill" style={{ marginRight: '4px' }}></i>
                                                                        Yêu cầu: {line.templateNote}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button
                                                            className={bomStyles.chooseComponentBtn}
                                                            type="button"
                                                            onClick={() => setPickingLineIndex(index)}
                                                        >
                                                            + Chọn linh kiện...
                                                        </button>
                                                        {!line.componentRole && (
                                                            <button className={bomStyles.deleteButton} type="button" title="Xóa dòng" onClick={() => removeBomLine(index)} style={{ position: 'absolute', right: '12px', top: '12px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div style={{ marginTop: 8 }}>
                                        <button className={bomStyles.addBomLineBtn} type="button" onClick={addBomLine}>
                                            <i className="bi bi-plus-circle"></i> Thêm linh kiện
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button className="btn-misa-cancel" type="button" onClick={() => setShowBomModal(false)} style={{ padding: '8px 24px', fontWeight: '600' }}>Hủy</button>
                                <button className="btn-misa-post" type="button" onClick={saveQuickBom} disabled={savingBom} style={{ padding: '8px 24px', fontWeight: '600', backgroundColor: '#0070cc' }}>
                                    <i className="bi bi-download"></i>
                                    {savingBom ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Modal>

            <AssemblyExecutionModal
                visible={showExecutionModal}
                onCancel={() => setShowExecutionModal(false)}
                order={orderDetail}
                onSuccess={() => {
                    setShowExecutionModal(false);
                    loadOrder();
                }}
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
}

function FlowPanel({ tone, title, icon, items, emptyText }) {
    const isLoss = tone === 'loss';
    return (
        <div style={{
            border: `1px solid ${isLoss ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
        }}>
            <div style={{
                padding: '12px 16px',
                backgroundColor: isLoss ? '#fef2f2' : '#f0fdf4',
                color: isLoss ? '#991b1b' : '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                borderBottom: `1px solid ${isLoss ? '#fecaca' : '#bbf7d0'}`
            }}>
                <i className={`bi ${icon}`}></i>
                <span>{title}</span>
            </div>
            <div style={{ padding: '0' }}>
                {items.length > 0 ? items.map((item, index) => (
                    <div key={`${item.sku || item.name}-${index}`} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom: index < items.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--color-text)', fontSize: '14px', wordBreak: 'break-word' }}>{item.name || 'Chưa có tên hàng'}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px', wordBreak: 'break-all' }}>{item.sku || 'Chưa có mã SKU'}</div>
                        </div>
                        <div style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            color: isLoss ? '#dc2626' : '#16a34a',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>
                            {isLoss ? '-' : '+'}{Number(item.quantity || 0).toLocaleString('vi-VN')} {item.unitName || ''}
                        </div>
                    </div>
                )) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted-2)', fontStyle: 'italic', fontSize: '13px' }}>
                        {emptyText}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AssemblyOrderFormPage;
