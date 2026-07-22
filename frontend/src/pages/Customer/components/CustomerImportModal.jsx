import { useState, useRef } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import { previewImportExcel, confirmImportExcel, downloadCustomerTemplate } from '../../../api/customerApi';
import styles from './CustomerImportModal.module.css';

const CustomerImportModal = ({ isOpen, onClose, onSuccess, showToast }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadCustomerTemplate();
        } catch (err) {
            console.error(err);
            showToast('error', 'Lá»—i', 'KhÃ´ng táº£i Ä‘Æ°á»£c file máº«u. Vui lÃ²ng thá»­ láº¡i sau.');
        }
    };

    const handlePreview = async () => {
        if (!file) {
            showToast('error', 'Lá»—i', 'Vui lÃ²ng chá»n file Excel.');
            return;
        }
        try {
            setLoading(true);
            const data = await previewImportExcel(file);
            const payload = data?.data ?? data;
            setPreviewData(payload);
            setStep(2);
        } catch (err) {
            console.error(err);
            showToast('error', 'Lá»—i', 'KhÃ´ng thá»ƒ Ä‘á»c file. Vui lÃ²ng kiá»ƒm tra láº¡i Ä‘á»‹nh dáº¡ng.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setLoading(true);
            const payload = {
                validRows: previewData.validRows,
                duplicateRowsToMerge: previewData.duplicateRows // We overwrite these
            };
            await confirmImportExcel(payload);
            showToast('success', 'ThÃ nh cÃ´ng', 'ÄÃ£ import dá»¯ liá»‡u khÃ¡ch hÃ ng.');
            onSuccess();
            resetAndClose();
        } catch (err) {
            console.error(err);
            showToast('error', 'Lá»—i', 'CÃ³ lá»—i xáº£y ra khi lÆ°u dá»¯ liá»‡u.');
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setFile(null);
        setPreviewData(null);
        setStep(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={resetAndClose}
            title={step === 1 ? "Nháº­p kháº©u KhÃ¡ch hÃ ng" : "Káº¿t quáº£ kiá»ƒm tra dá»¯ liá»‡u"}
            size={step === 1 ? "md" : "xl"}
        >
            <div className={styles.container}>
                {step === 1 && (
                    <div className={styles.uploadSection}>
                        <div className={styles.uploadBox} onClick={() => fileInputRef.current.click()}>
                            <i className="fas fa-cloud-upload-alt fa-3x"></i>
                            <p>KÃ©o tháº£ file vÃ o Ä‘Ã¢y hoáº·c <b>Báº¥m Ä‘á»ƒ chá»n file</b></p>
                            <span>Há»— trá»£ Ä‘á»‹nh dáº¡ng .xlsx, tá»‘i Ä‘a 5MB</span>
                            <input 
                                type="file" 
                                accept=".xlsx" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>
                        {file && <p className={styles.fileName}>ÄÃ£ chá»n: {file.name}</p>}

                        <div className={styles.downloadTemplateBox}>
                            <button className={styles.btnTemplate} onClick={handleDownloadTemplate}>
                                <i className="fas fa-file-download"></i> Táº£i file máº«u
                            </button>
                            <span className={styles.templateNote}>Vui lÃ²ng nháº­p dá»¯ liá»‡u theo Ä‘Ãºng Ä‘á»‹nh dáº¡ng file máº«u.</span>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.btnCancel} onClick={resetAndClose} disabled={loading}>Há»§y</button>
                            <button className={styles.btnPrimary} onClick={handlePreview} disabled={!file || loading}>
                                {loading ? 'Äang Ä‘á»c file...' : 'Tiáº¿p tá»¥c'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && previewData && (
                    <div className={styles.previewSection}>
                        <div className={styles.summary}>
                            <div className={styles.statBox}>
                                <span>Tá»•ng sá»‘ dÃ²ng</span>
                                <b>{previewData.totalRows}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statSuccess}`}>
                                <span>Há»£p lá»‡</span>
                                <b>{previewData.validCount}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statWarning}`}>
                                <span>TrÃ¹ng láº·p (Sáº½ ghi Ä‘Ã¨)</span>
                                <b>{previewData.duplicateCount}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statError}`}>
                                <span>Lá»—i (Bá» qua)</span>
                                <b>{previewData.errorCount}</b>
                            </div>
                        </div>

                        {previewData.errorCount > 0 && (
                            <div className={styles.errorAlert}>
                                CÃ³ {previewData.errorCount} dÃ²ng bá»‹ lá»—i dá»¯ liá»‡u (TÃªn trá»‘ng hoáº·c SÄT khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng). CÃ¡c dÃ²ng nÃ y sáº½ bá»‹ bá» qua.
                            </div>
                        )}

                        <div className={styles.tableWrapper}>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        <th>Tráº¡ng thÃ¡i</th>
                                        <th>TÃªn khÃ¡ch hÃ ng</th>
                                        <th>Sá»‘ Ä‘iá»‡n thoáº¡i</th>
                                        <th>NhÃ³m KH</th>
                                        <th>Ghi chÃº</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.validRows.map((row, idx) => (
                                        <tr key={`valid-${idx}`}>
                                            <td><span className={styles.badgeSuccess}>Há»£p lá»‡</span></td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.groupType}</td>
                                            <td>ThÃªm má»›i</td>
                                        </tr>
                                    ))}
                                    {previewData.duplicateRows.map((row, idx) => (
                                        <tr key={`dup-${idx}`} className={styles.rowWarning}>
                                            <td><span className={styles.badgeWarning}>TrÃ¹ng láº·p</span></td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.groupType}</td>
                                            <td>{row.validationMessage}</td>
                                        </tr>
                                    ))}
                                    {previewData.errorRows.map((row, idx) => (
                                        <tr key={`err-${idx}`} className={styles.rowError}>
                                            <td><span className={styles.badgeError}>Lá»—i</span></td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.groupType}</td>
                                            <td className={styles.errorText}>{row.validationMessage}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.btnCancel} onClick={() => setStep(1)} disabled={loading}>Quay láº¡i</button>
                            <button 
                                className={styles.btnPrimary} 
                                onClick={handleConfirm} 
                                disabled={loading || (previewData.validCount === 0 && previewData.duplicateCount === 0)}
                            >
                                {loading ? 'Äang xá»­ lÃ½...' : 'Thá»±c hiá»‡n Import'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CustomerImportModal;
