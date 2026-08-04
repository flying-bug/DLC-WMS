import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { getPublicRepairQuote } from '../../api/publicApi';
import RepairQuotationTemplate from '../Repair/components/RepairQuotationTemplate';
import styles from './PublicQuotePage.module.css';

const PublicRepairQuotePage = () => {
    const { token } = useParams();
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Bao-Gia-SC-${repair?.repairCode || 'REP'}`,
    });

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                setLoading(true);
                const res = await getPublicRepairQuote(token);
                setRepair(res.data.data || res.data);
            } catch (err) {
                setError(err.response?.data?.userMessage || 'Không thể tải báo giá. Báo giá không tồn tại hoặc đã bị hủy.');
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchQuote();
        }
    }, [token]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3 text-muted">Đang tải báo giá sửa chữa...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.errorCard}>
                    <i className={`bi bi-exclamation-triangle ${styles.errorIcon}`}></i>
                    <h3 className={styles.errorTitle}>Lỗi truy cập</h3>
                    <p className={styles.errorMessage}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.topBar}>
                <div className={styles.brand}>DLC-WMS</div>
                <button onClick={handlePrint} className={styles.downloadBtn}>
                    <i className="bi bi-download"></i> Tải PDF / In báo giá
                </button>
            </div>
            
            <div className={styles.documentContainer}>
                <div className={styles.printWrapper}>
                    <RepairQuotationTemplate ref={printRef} repair={repair} />
                </div>
            </div>
        </div>
    );
};

export default PublicRepairQuotePage;
