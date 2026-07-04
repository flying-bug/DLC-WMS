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
            showToast('error', 'Lỗi', 'Không tải được file mẫu. Vui lòng thử lại sau.');
        }
    };

    const handlePreview = async () => {
        if (!file) {
            showToast('error', 'Lỗi', 'Vui lòng chọn file Excel.');
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
            showToast('error', 'Lỗi', 'Không thể đọc file. Vui lòng kiểm tra lại định dạng.');
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
            showToast('success', 'Thành công', 'Đã import dữ liệu khách hàng.');
            onSuccess();
            resetAndClose();
        } catch (err) {
            console.error(err);
            showToast('error', 'Lỗi', 'Có lỗi xảy ra khi lưu dữ liệu.');
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
            title={step === 1 ? "Nhập khẩu Khách hàng" : "Kết quả kiểm tra dữ liệu"}
            size={step === 1 ? "md" : "xl"}
        >
            <div className={styles.container}>
                {step === 1 && (
                    <div className={styles.uploadSection}>
                        <div className={styles.uploadBox} onClick={() => fileInputRef.current.click()}>
                            <i className="fas fa-cloud-upload-alt fa-3x"></i>
                            <p>Kéo thả file vào đây hoặc <b>Bấm để chọn file</b></p>
                            <span>Hỗ trợ định dạng .xlsx, tối đa 5MB</span>
                            <input 
                                type="file" 
                                accept=".xlsx" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>
                        {file && <p className={styles.fileName}>Đã chọn: {file.name}</p>}

                        <div className={styles.downloadTemplateBox}>
                            <button className={styles.btnTemplate} onClick={handleDownloadTemplate}>
                                <i className="fas fa-file-download"></i> Tải file mẫu
                            </button>
                            <span className={styles.templateNote}>Vui lòng nhập dữ liệu theo đúng định dạng file mẫu.</span>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.btnCancel} onClick={resetAndClose} disabled={loading}>Hủy</button>
                            <button className={styles.btnPrimary} onClick={handlePreview} disabled={!file || loading}>
                                {loading ? 'Đang đọc file...' : 'Tiếp tục'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && previewData && (
                    <div className={styles.previewSection}>
                        <div className={styles.summary}>
                            <div className={styles.statBox}>
                                <span>Tổng số dòng</span>
                                <b>{previewData.totalRows}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statSuccess}`}>
                                <span>Hợp lệ</span>
                                <b>{previewData.validCount}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statWarning}`}>
                                <span>Trùng lặp (Sẽ ghi đè)</span>
                                <b>{previewData.duplicateCount}</b>
                            </div>
                            <div className={`${styles.statBox} ${styles.statError}`}>
                                <span>Lỗi (Bỏ qua)</span>
                                <b>{previewData.errorCount}</b>
                            </div>
                        </div>

                        {previewData.errorCount > 0 && (
                            <div className={styles.errorAlert}>
                                Có {previewData.errorCount} dòng bị lỗi dữ liệu (Tên trống hoặc SĐT không đúng định dạng). Các dòng này sẽ bị bỏ qua.
                            </div>
                        )}

                        <div className={styles.tableWrapper}>
                            <table className={styles.previewTable}>
                                <thead>
                                    <tr>
                                        <th>Trạng thái</th>
                                        <th>Tên khách hàng</th>
                                        <th>Số điện thoại</th>
                                        <th>Nhóm KH</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.validRows.map((row, idx) => (
                                        <tr key={`valid-${idx}`}>
                                            <td><span className={styles.badgeSuccess}>Hợp lệ</span></td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.groupType}</td>
                                            <td>Thêm mới</td>
                                        </tr>
                                    ))}
                                    {previewData.duplicateRows.map((row, idx) => (
                                        <tr key={`dup-${idx}`} className={styles.rowWarning}>
                                            <td><span className={styles.badgeWarning}>Trùng lặp</span></td>
                                            <td>{row.name}</td>
                                            <td>{row.phone}</td>
                                            <td>{row.groupType}</td>
                                            <td>{row.validationMessage}</td>
                                        </tr>
                                    ))}
                                    {previewData.errorRows.map((row, idx) => (
                                        <tr key={`err-${idx}`} className={styles.rowError}>
                                            <td><span className={styles.badgeError}>Lỗi</span></td>
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
                            <button className={styles.btnCancel} onClick={() => setStep(1)} disabled={loading}>Quay lại</button>
                            <button 
                                className={styles.btnPrimary} 
                                onClick={handleConfirm} 
                                disabled={loading || (previewData.validCount === 0 && previewData.duplicateCount === 0)}
                            >
                                {loading ? 'Đang xử lý...' : 'Thực hiện Import'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CustomerImportModal;
