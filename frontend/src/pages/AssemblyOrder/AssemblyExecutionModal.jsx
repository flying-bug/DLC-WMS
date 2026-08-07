import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Modal from '../../components/ui/Modal/Modal';
import Toast from '../../components/ui/Toast/Toast';
import styles from './AssemblyExecutionModal.module.css';
import { resolveScan, resolveBarcode } from '../../api/inventoryExportApi';
import { executeAssemblyOrder } from '../../api/assemblyOrderApi';
import { getAvailableSerials, checkSerialExists } from '../../api/warehouseApi';

const AssemblyExecutionModal = ({ visible, onCancel, order, onSuccess }) => {
    const [scannedInput, setScannedInput] = useState('');
    const [assembledSets, setAssembledSets] = useState([]);
    const [currentSetIndex, setCurrentSetIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // Serial picker state: { variantId → { serials: [], loading: bool, open: bool, search: '' } }
    const [pickerState, setPickerState] = useState({});

    // Cache of available serials fetched from warehouse (variantId → Set<string>)
    const serialCacheRef = React.useRef({});

    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '', duration: 3000 });
    const showToast = (type, message, duration = 3000) => setToast({ isVisible: true, type, message, duration });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const requirementsPerSet = useMemo(() => {
        if (!order || !order.lines) return [];
        return order.lines.map(line => ({
            variantId: line.componentVariantId,
            sku: line.componentSku,
            name: line.componentName,
            requiredQty: line.quantityRequired / order.quantity,
            trackSerial: line.trackSerial !== undefined ? line.trackSerial : true
        }));
    }, [order]);

    // Số bộ còn lại cần thực thi (partial execution support)
    const alreadyProduced = useMemo(() => {
        return order ? Math.floor(Number(order.quantityProduced) || 0) : 0;
    }, [order]);

    const remainingSets = useMemo(() => {
        return order ? Math.max(0, order.quantity - alreadyProduced) : 0;
    }, [order, alreadyProduced]);

    useEffect(() => {
        if (visible && order) {
            const initialSets = Array.from({ length: remainingSets }).map(() => ({
                parentSerial: '',
                components: []
            }));
            setAssembledSets(initialSets);
            setCurrentSetIndex(0);
            setScannedInput('');
            setPickerState({});
            serialCacheRef.current = {};
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [visible, order, remainingSets]);

    // ─── Serial picker: toggle open & fetch serials ───────────────────────────
    // Helper: fetch available serials for a variant (with cache)
    const fetchAvailableSerials = useCallback(async (variantId) => {
        if (serialCacheRef.current[variantId]) {
            return serialCacheRef.current[variantId];
        }
        try {
            const res = await getAvailableSerials(order.warehouseId, variantId);
            const serials = res?.data?.data ?? res?.data ?? [];
            serialCacheRef.current[variantId] = new Set(serials);
            return serialCacheRef.current[variantId];
        } catch {
            return new Set();
        }
    }, [order]);

    const togglePicker = useCallback(async (variantId) => {
        const current = pickerState[variantId];
        const isOpen = current?.open;

        // Close all pickers, then toggle the clicked one
        setPickerState(prev => {
            const next = {};
            Object.keys(prev).forEach(k => { next[k] = { ...prev[k], open: false }; });
            next[variantId] = {
                ...prev[variantId],
                open: !isOpen,
                search: '',
            };
            return next;
        });

        // Fetch if not cached yet
        if (!current?.serials && !isOpen) {
            setPickerState(prev => ({
                ...prev,
                [variantId]: { ...prev[variantId], loading: true, open: true, search: '' }
            }));
            try {
                const serialSet = await fetchAvailableSerials(variantId);
                const serials = Array.from(serialSet);
                setPickerState(prev => ({
                    ...prev,
                    [variantId]: { ...prev[variantId], serials, loading: false }
                }));
            } catch {
                showToast('error', 'Không tải được danh sách serial từ kho.');
                setPickerState(prev => ({
                    ...prev,
                    [variantId]: { ...prev[variantId], serials: [], loading: false, open: false }
                }));
            }
        }
    }, [pickerState, order, fetchAvailableSerials]);

    const setPickerSearch = (variantId, value) => {
        setPickerState(prev => ({
            ...prev,
            [variantId]: { ...prev[variantId], search: value }
        }));
    };

    // ─── Add a serial (from picker or scan) ──────────────────────────────────
    const addComponentSerial = (variantId, serial, reqName) => {
        const currentSet = assembledSets[currentSetIndex];
        const req = requirementsPerSet.find(r => r.variantId === variantId);

        const currentScanned = currentSet.components.filter(c => c.variantId === variantId).length;
        if (currentScanned >= req.requiredQty) {
            showToast('error', `Linh kiện "${reqName}" đã đủ số lượng cho bộ này.`);
            return;
        }
        const alreadyUsed = req.trackSerial && assembledSets.some(s => s.components.some(c => c.serial === serial));
        if (alreadyUsed) {
            showToast('error', `Serial "${serial}" đã được dùng ở bộ khác!`);
            return;
        }

        const newSets = [...assembledSets];
        // For non-serial components, we append a timestamp to the serial to make it unique within the state,
        // or we just allow duplicate serials in the state (since they are just SKUs). 
        // We already bypassed alreadyUsed, but if they scan it again in the SAME set, it's fine.
        newSets[currentSetIndex].components.push({ variantId, serial, name: reqName });
        setAssembledSets(newSets);
        showToast('success', `✓ ${reqName} — ${serial}`);

        // Close picker after selecting
        setPickerState(prev => ({
            ...prev,
            [variantId]: { ...prev[variantId], open: false }
        }));

        checkAndAdvanceSet(newSets, currentSetIndex);
    };

    // ─── Scan/manual input ────────────────────────────────────────────────────
    const applyParentSerial = async (code) => {
        const isUsed = assembledSets.some(s => s.parentSerial === code);
        if (isUsed) { showToast('error', `Mã "${code}" đã được dùng cho bộ khác!`); return false; }

        try {
            const res = await checkSerialExists(code);
            const exists = res.data?.data === true;
            if (order.orderType === 'ASSEMBLY' && exists) {
                showToast('error', `Serial thành phẩm "${code}" đã tồn tại trong hệ thống.`);
                return false;
            }
            if (order.orderType === 'DISASSEMBLY' && !exists) {
                showToast('error', `Thành phẩm "${code}" không tồn tại trong hệ thống. Không thể tháo dỡ.`);
                return false;
            }
        } catch (e) {
            showToast('error', 'Lỗi kiểm tra Serial. Vui lòng thử lại.');
            return false;
        }

        const newSets = [...assembledSets];
        newSets[currentSetIndex] = { ...newSets[currentSetIndex], parentSerial: code };
        setAssembledSets(newSets);
        showToast('success', `✓ Đã ghi nhận Serial thành phẩm: ${code}`);
        return true;
    };

    const applyComponentSerial = async (code) => {
        try {
            const res = order.orderType === 'DISASSEMBLY'
                ? await resolveBarcode({ code })
                : await resolveScan({ warehouseId: order.warehouseId, code });
            const scanData = res.data;
            const { variantId, serialNumber: serial, productName, trackSerial } = scanData;
            
            if (scanData.type !== 'SERIAL') {
                if (scanData.type === 'BARCODE' && trackSerial === false) {
                    // Allowed: This component does not track serials
                } else {
                    showToast('error', 'Đây là mã SKU, không phải Serial. Hãy nhập đúng mã Serial linh kiện.');
                    return;
                }
            }
            const req = requirementsPerSet.find(r => r.variantId === variantId);
            if (!req) {
                showToast('error', `Linh kiện "${productName || code}" không có trong danh sách cần tháo/lắp.`);
                return;
            }

            // ── Kiểm tra serial tồn kho ──
            if (scanData.type === 'SERIAL') {
                const availableSet = await fetchAvailableSerials(variantId);
                if (order.orderType === 'ASSEMBLY' && !availableSet.has(serial)) {
                    showToast('error', `⚠️ Serial "${serial}" đã được sử dụng hoặc không còn tồn tại trong kho.`, 8000);
                    return;
                }
                if (order.orderType === 'DISASSEMBLY' && availableSet.has(serial)) {
                    showToast('error', `⚠️ Serial "${serial}" đã có sẵn trong kho. Không thể thu hồi mã trùng lặp!`, 8000);
                    return;
                }
            }

            addComponentSerial(variantId, serial || `SKU-${scanData.code}-${Date.now()}`, productName || req.name);
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Không tìm thấy thông tin mã quét.');
        }
    };

    const handleConfirm = async () => {
        const code = scannedInput.trim();
        if (!code) return;
        setScannedInput('');
        const currentSet = assembledSets[currentSetIndex];
        if (!currentSet.parentSerial) { await applyParentSerial(code); }
        else { await applyComponentSerial(code); }
        inputRef.current?.focus();
    };

    // ─── Remove serial ────────────────────────────────────────────────────────
    const removeSerial = (setIndex, serial) => {
        const newSets = [...assembledSets];
        newSets[setIndex].components = newSets[setIndex].components.filter(c => c.serial !== serial);
        setAssembledSets(newSets);
    };

    const clearParentSerial = (setIndex) => {
        const newSets = [...assembledSets];
        newSets[setIndex] = { ...newSets[setIndex], parentSerial: '', components: [] };
        setAssembledSets(newSets);
        setCurrentSetIndex(setIndex);
        setPickerState({});
    };

    const checkAndAdvanceSet = (sets, index) => {
        const set = sets[index];
        if (!set.parentSerial) return;
        const isFull = requirementsPerSet.every(req =>
            sets[index].components.filter(c => c.variantId === req.variantId).length >= req.requiredQty
        );
        if (isFull) {
            showToast('success', `🎉 Hoàn tất thu hồi/lắp bộ số ${alreadyProduced + index + 1}!`);
            if (index + 1 < sets.length) setCurrentSetIndex(index + 1);
        }
    };

    // ─── Execute ──────────────────────────────────────────────────────────────
    // Trong Tháo dỡ, chỉ cần quét Thành phẩm là có thể thực thi (không bắt buộc đủ 100% linh kiện)
    const isSetComplete = (set) => {
        if (!set.parentSerial) return false;
        if (order.orderType === 'DISASSEMBLY') return true;
        return requirementsPerSet.every(req => set.components.filter(c => c.variantId === req.variantId).length >= req.requiredQty);
    };

    const handleExecute = async () => {
        // Chỉ lấy những bộ đã hoàn chỉnh để gửi
        const completeSets = assembledSets.filter(isSetComplete);
        const incompleteSets = assembledSets.filter(s => !isSetComplete(s));

        if (completeSets.length === 0) {
            showToast('error', 'Chưa có bộ nào hoàn chỉnh. Vui lòng quét đủ linh kiện cho ít nhất 1 bộ.');
            return;
        }

        // Cảnh báo nếu có bộ chưa xong nhưng vẫn cho tiếp tục
        if (incompleteSets.length > 0) {
            const ok = window.confirm(
                `⚠️ Có ${incompleteSets.length} bộ chưa hoàn chỉnh sẽ được BỎ QUA.\n` +
                `Hệ thống sẽ thực thi ${completeSets.length} bộ đã quét xong.\n` +
                `Bạn có thể quay lại để làm nốt ${incompleteSets.length} bộ còn lại.\n\n` +
                `Tiếp tục?`
            );
            if (!ok) return;
        }

        const payload = {
            executionDate: order.executionDate || new Date().toISOString().split('T')[0],
            warehouseId: order.warehouseId,
            assembledSets: completeSets.map(s => ({
                parentSerial: s.parentSerial,
                components: s.components.map(c => ({ variantId: c.variantId, serial: c.serial }))
            }))
        };
        setLoading(true);
        try {
            await executeAssemblyOrder(order.id, payload);
            onSuccess();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Lỗi thực thi lắp ráp. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    const currentSet = assembledSets[currentSetIndex] || { parentSerial: '', components: [] };

    const completedInSession = assembledSets.filter(isSetComplete).length;

    // Tiến độ tổng thể (bao gồm cả các lần thực thi trước)
    const globalTotal = order ? Number(order.quantity) : 0;
    const globalProduced = alreadyProduced + completedInSession;
    const progressPercent = globalTotal > 0 ? Math.round((globalProduced / globalTotal) * 100) : 0;
    const isAllComplete = globalProduced >= globalTotal && globalTotal > 0;
    const canExecute = completedInSession > 0; // Cho phép thực thi khi có ít nhất 1 bộ hoàn chỉnh
    const progressColor = isAllComplete ? '#10b981' : progressPercent > 0 ? '#0075c0' : '#e2e8f0';
    const needParentSerial = !currentSet.parentSerial;

    return (
        <Modal
            isOpen={visible}
            onClose={onCancel}
            dialogStyle={{ width: '1000px', maxWidth: '96vw', padding: 0, borderRadius: '12px', overflow: 'hidden' }}
        >
            <div className={styles.modalWrapper}>
                {/* ── HEADER ── */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerIcon} style={{ background: order.orderType === 'DISASSEMBLY' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.2)' }}>
                            <i className={order.orderType === 'DISASSEMBLY' ? 'bi bi-tools' : 'bi bi-cpu'}></i>
                        </div>
                        <div>
                            <p className={styles.modalTitle}>{order.orderType === 'DISASSEMBLY' ? 'Thực thi Tháo dỡ' : 'Thực thi Lắp ráp'}</p>
                            <p className={styles.modalSubtitle}>
                                Lệnh: {order.orderCode} — {order.orderType === 'DISASSEMBLY' ? 'Đã tháo' : 'Đã lắp'}: <strong style={{ color: '#6ee7b7' }}>{alreadyProduced}</strong>/{order.quantity} bộ
                                {remainingSets > 0 && <> — Còn lại: <strong style={{ color: '#fde68a' }}>{remainingSets}</strong> bộ</>}
                            </p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} type="button" onClick={onCancel}><i className="bi bi-x-lg"></i></button>
                </div>

                {/* ── PROGRESS ── */}
                <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Tiến độ tổng thể</span>
                    <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${progressPercent}%`, backgroundColor: progressColor }}></div>
                    </div>
                    <span className={styles.progressText} style={{ color: progressColor }}>{globalProduced}/{globalTotal} bộ</span>
                </div>

                {/* ── BODY ── */}
                <div className={styles.modalBody}>

                    {/* LEFT: Set list */}
                    <div className={styles.setPanel}>
                        <div className={styles.setPanelHeader}>Danh sách bộ lắp ráp</div>
                        <div className={styles.setList}>
                            {assembledSets.map((set, index) => {
                                const done = isSetComplete(set);
                                const isActive = currentSetIndex === index;
                                return (
                                    <div key={index}
                                        className={`${styles.setCard} ${isActive ? styles.setCardActive : ''} ${done && !isActive ? styles.setCardComplete : ''}`}
                                        onClick={() => { setCurrentSetIndex(index); setPickerState({}); inputRef.current?.focus(); }}
                                    >
                                        <div className={styles.setCardInfo}>
                                            <span className={styles.setCardName}>Bộ số {alreadyProduced + index + 1}</span>
                                            <span className={styles.setCardSerial}>{set.parentSerial || 'Chưa có mã'}</span>
                                        </div>
                                        <span className={styles.setCardStatus}>
                                            {done ? <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>
                                                : isActive ? <i className="bi bi-pencil-fill" style={{ color: '#0075c0' }}></i>
                                                    : <i className="bi bi-circle" style={{ color: '#cbd5e1' }}></i>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: Work area */}
                    <div className={styles.workArea}>

                        {/* Scan input */}
                        <div className={styles.scanZone}>
                            <div className={styles.scanZoneTitle}>
                                <i className="bi bi-upc-scan"></i>
                                {needParentSerial ? (order.orderType === 'DISASSEMBLY' ? 'Bước 1 — Nhập Serial Thành phẩm tháo dỡ' : 'Bước 1 — Nhập Serial Thành phẩm') : (order.orderType === 'DISASSEMBLY' ? 'Bước 2 — Nhập Serial Linh kiện thu hồi' : 'Bước 2 — Nhập Serial Linh kiện')}
                            </div>
                            <div className={styles.scanRow}>
                                <div className={styles.scanInputWrap}>
                                    <span className={styles.scanIcon}><i className={needParentSerial ? 'bi bi-box-seam' : 'bi bi-cpu-fill'}></i></span>
                                    <input ref={inputRef} type="text" className={styles.scanInput}
                                        value={scannedInput}
                                        onChange={e => setScannedInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                                        placeholder={needParentSerial ? 'Quét hoặc nhập tay mã Serial thành phẩm...' : 'Quét mã Serial linh kiện (hoặc bấm vào danh sách dưới)...'}
                                        autoFocus
                                    />
                                </div>
                                <button className={styles.scanBtn} type="button" onClick={handleConfirm}>
                                    <i className="bi bi-check-lg"></i> Xác nhận
                                </button>
                            </div>
                            <div className={`${styles.scanHint} ${needParentSerial ? styles.hintPending : styles.hintReady}`}>
                                {needParentSerial
                                    ? <><i className="bi bi-exclamation-circle-fill"></i> Hãy nhập mã Serial cho <strong>Bộ số {currentSetIndex + 1}</strong> trước.</>
                                    : <><i className="bi bi-check-circle-fill"></i> Thành phẩm <strong>{currentSet.parentSerial}</strong> sẵn sàng. <strong>Quét mã</strong> hoặc <strong>{order.orderType === 'DISASSEMBLY' ? 'nhập tay linh kiện thu hồi' : 'bấm chọn từ kho'}</strong> bên dưới.</>
                                }
                            </div>
                        </div>

                        {/* Serial thành phẩm header */}
                        <div className={styles.serialHeader}>
                            <span className={styles.serialHeaderLabel}><i className="bi bi-pc-display-horizontal"></i> Mã thành phẩm</span>
                            {currentSet.parentSerial ? (
                                <>
                                    <span className={styles.serialBadge}><i className="bi bi-upc"></i>{currentSet.parentSerial}</span>
                                    <button type="button" onClick={() => clearParentSerial(currentSetIndex)} className={styles.changSerialBtn}>
                                        <i className="bi bi-arrow-counterclockwise"></i> Đổi mã
                                    </button>
                                </>
                            ) : (
                                <span className={styles.serialEmpty}>Chưa nhập mã thành phẩm</span>
                            )}
                        </div>

                        {/* Component list */}
                        <div className={styles.componentTable}>
                            <div className={styles.compTableHeader}>
                                Linh kiện cần lắp cho bộ số {currentSetIndex + 1}
                                {!needParentSerial && <span className={styles.compTableHint}> — Bấm vào linh kiện để xem Serial có sẵn trong kho</span>}
                            </div>

                            {requirementsPerSet.map(req => {
                                const scannedComps = currentSet.components.filter(c => c.variantId === req.variantId);
                                const isDone = scannedComps.length >= req.requiredQty;
                                const picker = pickerState[req.variantId] || {};
                                const isPickerOpen = picker.open && !needParentSerial;
                                const filteredSerials = (picker.serials || []).filter(s => {
                                    const usedGlobally = assembledSets.some(set => set.components.some(c => c.serial === s));
                                    if (usedGlobally) return false;
                                    if (!picker.search) return true;
                                    return s.toLowerCase().includes(picker.search.toLowerCase());
                                });

                                return (
                                    <div key={req.variantId} className={`${styles.compRow} ${isDone ? styles.compRowDone : ''} ${isPickerOpen ? styles.compRowOpen : ''}`}>
                                        <div
                                            className={`${styles.compRowHeader} ${!needParentSerial && req.trackSerial !== false ? styles.compRowClickable : ''}`}
                                            onClick={() => !needParentSerial && !isDone && req.trackSerial !== false && togglePicker(req.variantId)}
                                            title={!needParentSerial && !isDone && req.trackSerial !== false ? (order.orderType === 'ASSEMBLY' ? 'Bấm để chọn Serial từ kho' : 'Bấm để nhập mã thu hồi') : ''}
                                        >
                                            <div className={styles.compIcon}>
                                                {isDone ? <i className="bi bi-check-circle-fill"></i> : <i className="bi bi-cpu"></i>}
                                            </div>
                                            <div className={styles.compInfo}>
                                                <div className={styles.compName}>{req.name}</div>
                                                <div className={styles.compSku}>{req.sku}</div>
                                                <div className={styles.serialSlots}>
                                                    {scannedComps.map(c => (
                                                        <span key={c.serial} className={styles.serialSlotFilled}>
                                                            <i className={req.trackSerial !== false ? "bi bi-upc" : "bi bi-box"}></i>{req.trackSerial !== false ? c.serial : 'Không Serial'}
                                                            <button className={styles.removeSerialBtn} type="button"
                                                                onClick={e => { e.stopPropagation(); removeSerial(currentSetIndex, c.serial); }}>
                                                                <i className="bi bi-x-circle-fill"></i>
                                                            </button>
                                                        </span>
                                                    ))}
                                                    {Array.from({ length: req.requiredQty - scannedComps.length }).map((_, i) => (
                                                        <span key={`empty-${i}`} className={styles.serialSlotEmpty}>
                                                            <i className="bi bi-dash-circle"></i> Chờ nhập...
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={styles.compRight}>
                                                <div className={styles.compQty} style={{ color: isDone ? '#16a34a' : '#94a3b8' }}>
                                                    {scannedComps.length}/{req.requiredQty}
                                                </div>
                                                {!needParentSerial && !isDone && (
                                                    req.trackSerial !== false ? (
                                                        <div className={styles.pickFromStockBtn}>
                                                            <i className={`bi ${isPickerOpen ? 'bi-chevron-up' : order.orderType === 'ASSEMBLY' ? 'bi-list-check' : 'bi-keyboard'}`}></i>
                                                            {isPickerOpen ? 'Đóng' : order.orderType === 'ASSEMBLY' ? 'Chọn từ kho' : 'Nhập mã'}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            className={styles.btnPrimary} 
                                                            style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'var(--color-primary, #0075c0)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addComponentSerial(req.variantId, `SKU-${req.sku}-${Date.now()}`, req.name);
                                                            }}
                                                        >
                                                            Xác nhận dùng
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Serial picker dropdown */}
                                        {isPickerOpen && (
                                            <div className={styles.serialPicker}>
                                                <div className={styles.serialPickerHeader}>
                                                    <div className={styles.serialPickerSearch}>
                                                        <i className={order.orderType === 'ASSEMBLY' ? "bi bi-search" : "bi bi-upc-scan"}></i>
                                                        <input
                                                            type="text"
                                                            placeholder={order.orderType === 'ASSEMBLY' ? `Tìm Serial của ${req.name}...` : `Nhập Serial linh kiện thu hồi...`}
                                                            value={picker.search || ''}
                                                            onChange={e => setPickerSearch(req.variantId, e.target.value)}
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter' && order.orderType === 'DISASSEMBLY') {
                                                                    e.preventDefault();
                                                                    const code = picker.search?.trim();
                                                                    if (code) {
                                                                        const availableSet = await fetchAvailableSerials(req.variantId);
                                                                        if (availableSet.has(code)) {
                                                                            showToast('error', `⚠️ Serial "${code}" đã có sẵn trong kho. Không thể thu hồi mã trùng lặp!`, 8000);
                                                                            return;
                                                                        }
                                                                        addComponentSerial(req.variantId, code, req.name);
                                                                        setPickerSearch(req.variantId, '');
                                                                    }
                                                                }
                                                            }}
                                                            autoFocus
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    {order.orderType === 'ASSEMBLY' && (
                                                        <span className={styles.serialPickerCount}>
                                                            {picker.loading ? '...' : `${filteredSerials.length} serial khả dụng`}
                                                        </span>
                                                    )}
                                                </div>
                                                {order.orderType === 'ASSEMBLY' && (
                                                    <div className={styles.serialPickerList}>
                                                    {picker.loading ? (
                                                        <div className={styles.serialPickerLoading}>
                                                            <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }}></i>
                                                            Đang tải danh sách serial...
                                                        </div>
                                                    ) : filteredSerials.length === 0 ? (
                                                        <div className={styles.serialPickerEmpty}>
                                                            <i className="bi bi-inbox"></i>
                                                            {picker.search ? `Không tìm thấy serial khớp với "${picker.search}"` : 'Không có serial nào còn trong kho'}
                                                        </div>
                                                    ) : (
                                                        filteredSerials.map(serial => (
                                                            <button
                                                                key={serial}
                                                                className={styles.serialPickerItem}
                                                                type="button"
                                                                onClick={e => { e.stopPropagation(); addComponentSerial(req.variantId, serial, req.name); }}
                                                            >
                                                                <i className="bi bi-upc-scan"></i>
                                                                <span className={styles.serialPickerItemCode}>{serial}</span>
                                                                <span className={styles.serialPickerItemAction}>
                                                                    <i className="bi bi-plus-circle-fill"></i> Chọn
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div className={styles.modalFooter}>
                    <span className={styles.footerInfo}>
                        {isAllComplete
                            ? <><i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i> Tất cả {globalTotal} bộ đã hoàn tất. Nhấn để ghi sổ kho.</>
                            : completedInSession > 0
                                ? <><i className="bi bi-lightning-fill" style={{ color: '#f59e0b' }}></i> Sẵn sàng thực thi <strong>{completedInSession}</strong> bộ trong phiên này. {remainingSets - completedInSession > 0 ? `Còn ${remainingSets - completedInSession} bộ có thể làm tiếp sau.` : ''}</>
                                : <><i className="bi bi-info-circle"></i> Quét đủ linh kiện cho ít nhất 1 bộ để bắt đầu thực thi.</>
                        }
                    </span>
                    <button className={styles.btnCancel} type="button" onClick={onCancel}>Hủy bỏ</button>
                    <button
                        className={styles.btnSubmit}
                        type="button"
                        disabled={loading || !canExecute}
                        onClick={handleExecute}
                        style={{ backgroundColor: canExecute && !isAllComplete ? '#f59e0b' : undefined }}
                    >
                        {loading
                            ? <><i className="bi bi-hourglass-split"></i> Đang xử lý...</>
                            : isAllComplete
                                ? <><i className="bi bi-check-all"></i> Hoàn tất toàn bộ ({completedInSession} bộ)</>
                                : <><i className="bi bi-play-fill"></i> Thực thi {completedInSession} bộ này</>
                        }
                    </button>
                </div>
            </div>
            <Toast {...toast} onClose={hideToast} />
        </Modal>
    );
};

export default AssemblyExecutionModal;
