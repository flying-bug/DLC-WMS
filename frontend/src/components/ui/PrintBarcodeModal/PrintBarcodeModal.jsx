import React, { useState, useRef, useEffect } from 'react';
import BarcodeLabel from './BarcodeLabel';
import Toast from '../Toast/Toast';
import styles from './PrintBarcodeModal.module.css';

const PrintBarcodeModal = ({ isOpen, onClose, product }) => {
    const [barcodeType, setBarcodeType] = useState('BARCODE'); // 'BARCODE' or 'QRCODE'
    const [labelSize, setLabelSize] = useState('35x22');
    const [paperSize, setPaperSize] = useState('A4'); // 'ROLL' or 'A4'
    const [showProductName, setShowProductName] = useState(true);
    const [showSKU, setShowSKU] = useState(true);
    const [showSerial, setShowSerial] = useState(true);

    // For non-serial tracking
    const [quantity, setQuantity] = useState(1);

    // For serial tracking
    const [serialsText, setSerialsText] = useState('');
    const [autoGenQty, setAutoGenQty] = useState('');

    const componentRef = useRef(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    // Reset state when modal opens or product changes
    useEffect(() => {
        if (isOpen && product) {
            setSerialsText('');
            setAutoGenQty('');
            setQuantity(1);
            setBarcodeType('BARCODE');
            setLabelSize('35x22');
            setPaperSize('A4');
            setShowProductName(true);
            setShowSKU(true);
            setShowSerial(true);
            setToast({ isVisible: false, type: 'success', message: '' });
        }
    }, [isOpen, product]);

    const handlePrint = () => {
        if (totalLabels === 0) {
            setToast({ isVisible: true, type: 'error', message: 'Vui lòng thêm tem trước khi in!' });
            return;
        }
        if (totalLabels > 1000) {
            setToast({ isVisible: true, type: 'error', message: 'Giới hạn an toàn: Chỉ hỗ trợ in tối đa 1000 tem mỗi lần để tránh quá tải bộ nhớ!' });
            return;
        }

        setToast({ isVisible: true, type: 'success', message: 'Đã gửi lệnh in thành công!' });

        setTimeout(() => {
            window.print();
        }, 150);
    };

    if (!isOpen || !product) return null;

    const isTrackSerial = product.trackSerial;
    const serialList = isTrackSerial ? serialsText.split('\n').map(s => s.trim()).filter(s => s.length > 0) : [];

    // Total labels to print
    const totalLabels = isTrackSerial ? serialList.length : quantity;

    const handleAutoGenerateSerials = () => {
        if (!autoGenQty || autoGenQty <= 0) return;
        if (autoGenQty > 1000) {
            setToast({ isVisible: true, type: 'error', message: 'Chỉ hỗ trợ sinh tối đa 1000 mã/lần để đảm bảo hiệu suất!' });
            return;
        }

        const skuPrefix = product.productCode || 'SP';
        
        // Sử dụng timestamp (hệ cơ số 36) để đảm bảo mã lô sinh ra là độc nhất tuyệt đối theo từng mili-giây
        const batchId = Date.now().toString(36).toUpperCase().slice(-5);

        // Lấy danh sách các mã đang có trong khung để đối chiếu, tránh trùng lặp 100%
        const existingSerials = new Set(
            (serialsText || '').split('\n').map(s => s.trim()).filter(s => s.length > 0)
        );

        const generated = [];
        let count = 1;
        while (generated.length < autoGenQty) {
            const sequence = String(count).padStart(3, '0');
            const newSerial = `${skuPrefix}-${batchId}-${sequence}`;
            
            // Nếu mã này chưa từng tồn tại trong danh sách thì mới thêm vào
            if (!existingSerials.has(newSerial)) {
                generated.push(newSerial);
            }
            count++;
        }

        // Thêm vào danh sách hiện tại
        const existing = serialsText ? serialsText + '\n' : '';
        setSerialsText(existing + generated.join('\n'));
    };

    return (
        <div className="misa-modal-overlay">
            <div className={`misa-modal ${styles.modalContainer}`}>
                <div className="misa-modal-header">
                    <h3>In mã vạch - {product.productName}</h3>
                    <i className="fas fa-times" onClick={onClose} style={{ cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}></i>
                </div>

                <div className={`misa-modal-body ${styles.modalBody}`}>
                    <div className={styles.configSection}>
                        <div className={styles.formGroup}>
                            <label>Loại mã</label>
                            <select value={barcodeType} onChange={e => setBarcodeType(e.target.value)} className="misa-input">
                                <option value="BARCODE">Mã vạch (Barcode 1D)</option>
                                <option value="QRCODE">Mã QR (2D)</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Kích thước tem</label>
                            <select value={labelSize} onChange={e => setLabelSize(e.target.value)} className="misa-input">
                                <option value="35x22">35x22 mm</option>
                                <option value="50x30">50x30 mm</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Khổ giấy in</label>
                            <select value={paperSize} onChange={e => setPaperSize(e.target.value)} className="misa-input">
                                <option value="A4">Máy in thường</option>
                                <option value="ROLL">Máy in mã vạch</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Thông tin hiển thị trên tem</label>
                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" checked={showProductName} onChange={e => setShowProductName(e.target.checked)} />
                                    <span>Tên sản phẩm</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" checked={showSKU} onChange={e => setShowSKU(e.target.checked)} />
                                    <span>Mã SKU</span>
                                </label>
                                {isTrackSerial && (
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" checked={showSerial} onChange={e => setShowSerial(e.target.checked)} />
                                        <span>Serial Number</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {isTrackSerial ? (
                            <div className={styles.formGroup} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Nhập Serial Number cần in</span>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>(Mỗi Serial một dòng)</span>
                                    </label>
                                </div>
                                <textarea
                                    className="misa-input"
                                    rows={8}
                                    style={{ resize: 'none', height: 'auto', minHeight: '120px' }}
                                    placeholder="SN001&#10;SN002&#10;SN003"
                                    value={serialsText}
                                    onChange={e => setSerialsText(e.target.value)}
                                ></textarea>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        className="misa-input"
                                        style={{ width: '70px', textAlign: 'center', flexShrink: 0 }}
                                        value={autoGenQty}
                                        onChange={e => setAutoGenQty(e.target.value === '' ? '' : Number(e.target.value))}
                                        title="Số lượng tem cần sinh tự động"
                                        placeholder="SL"
                                    />
                                    <button
                                        type="button"
                                        className="btn-misa-save"
                                        style={{ flex: '1 1 auto', backgroundColor: '#10b981', padding: '6px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '150px' }}
                                        onClick={handleAutoGenerateSerials}
                                    >
                                        <i className="fas fa-magic" style={{ marginRight: '6px' }}></i>
                                        Tự động sinh mã
                                    </button>
                                    {serialsText.length > 0 && (
                                        <button
                                            type="button"
                                            className="btn-misa-cancel"
                                            style={{ flex: '1 1 auto', padding: '6px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap', minWidth: '100px', backgroundColor: '#fef2f2', color: '#ef4444', borderColor: '#fca5a5' }}
                                            onClick={() => setSerialsText('')}
                                            title="Xóa toàn bộ mã đã nhập"
                                        >
                                            <i className="fas fa-trash-alt" style={{ marginRight: '6px' }}></i>
                                            Xóa hết
                                        </button>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                                    Đã nhập: <strong>{serialList.length}</strong> Serial (Sẽ in {serialList.length} tem)
                                </div>
                            </div>
                        ) : (
                            <div className={styles.formGroup}>
                                <label>Số lượng tem cần in</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="misa-input"
                                    value={quantity}
                                    onChange={e => setQuantity(Number(e.target.value) || 1)}
                                />
                            </div>
                        )}
                    </div>

                    <div className={styles.previewSection}>
                        <div className={styles.previewHeader}>Bản xem trước ({totalLabels} tem)</div>
                        <div className={styles.previewBox}>
                            {totalLabels > 0 ? (
                                <>
                                    {Array.from({ length: Math.min(totalLabels, 50) }).map((_, idx) => (
                                        <BarcodeLabel
                                            key={idx}
                                            product={product}
                                            barcodeType={barcodeType}
                                            labelSize={labelSize}
                                            showProductName={showProductName}
                                            showSKU={showSKU}
                                            showSerial={showSerial && isTrackSerial}
                                            serial={isTrackSerial ? (serialList[idx] || `DEMO_${idx + 1}`) : null}
                                        />
                                    ))}
                                    {totalLabels > 50 && (
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                                            ...và {totalLabels - 50} tem khác (Sẽ hiển thị đầy đủ khi in)
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px', wordBreak: 'break-word', padding: '0 10px', width: '100%' }}>
                                    Vui lòng nhập Serial để xem trước
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="misa-modal-footer">
                    <button className="btn-misa-cancel" onClick={onClose}>Hủy</button>
                    <button className="btn-misa-save" onClick={handlePrint} disabled={totalLabels === 0}>
                        <i className="fas fa-print" style={{ marginRight: '6px' }}></i> In tem
                    </button>
                </div>
            </div>

            {/* Hidden printable area */}
            <div className={styles.printWrapper}>
                <div ref={componentRef} className={`${styles.printContainer} ${paperSize === 'A4' ? styles.a4Print : ''}`}>
                    {totalLabels > 0 && Array.from({ length: totalLabels }).map((_, idx) => (
                        <div key={idx} className={paperSize === 'ROLL' ? styles.pageBreak : styles.a4Item}>
                            <BarcodeLabel
                                product={product}
                                barcodeType={barcodeType}
                                labelSize={labelSize}
                                showProductName={showProductName}
                                showSKU={showSKU}
                                showSerial={showSerial && isTrackSerial}
                                serial={isTrackSerial ? serialList[idx] : null}
                                isPrinting={true}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {toast.isVisible && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
            )}
        </div>
    );
};

export default PrintBarcodeModal;
