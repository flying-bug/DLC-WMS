import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGmailStatus, sendTestEmail, disconnectGmail, getGmailConnectUrl } from '../../../api/emailSettingsApi';
import { useToast } from '../../../contexts/ToastContext';
import styles from './EmailSettingsTab.module.css';

function EmailSettingsTab() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ connected: false, connectedEmail: null, connectedAt: null });
    const { showToast } = useToast();

    // Test email modal
    const [showTestModal, setShowTestModal] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // Disconnect confirm modal
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await getGmailStatus();
            const data = res?.data?.data || res?.data || {};
            setStatus({
                connected: data.connected || false,
                connectedEmail: data.connectedEmail || null,
                connectedAt: data.connectedAt || null,
            });
        } catch (err) {
            console.error('Failed to fetch Gmail status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Kiểm tra URL params từ Google OAuth callback
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'true') {
            showToast('success', '🎉 Kết nối Gmail OAuth thành công! Hệ thống đã sẵn sàng gửi email tự động.');
            // Dọn dẹp params nhưng vẫn giữ tab=email
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('success');
            setSearchParams(newParams, { replace: true });
        } else if (error) {
            const errorMessages = {
                'access_denied': 'Bạn đã từ chối quyền truy cập Gmail từ tài khoản Google.',
                'no_code': 'Không nhận được mã ủy quyền từ Google.',
                'callback_failed': 'Xử lý ủy quyền OAuth thất bại. Vui lòng thử lại.',
            };
            showToast('error', errorMessages[error] || `Lỗi kết nối Gmail: ${error}`);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('error');
            setSearchParams(newParams, { replace: true });
        }

        fetchStatus();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleConnect = async () => {
        try {
            const res = await getGmailConnectUrl();
            const authUrl = res?.data?.data?.authUrl || res?.data?.authUrl;
            if (authUrl) {
                window.location.href = authUrl;
            } else {
                showToast('error', 'Không thể lấy URL kết nối Gmail. Vui lòng thử lại.');
            }
        } catch (err) {
            showToast('error', err?.response?.data?.userMessage || err?.response?.data?.message || 'Lỗi khi kết nối Gmail.');
        }
    };

    const handleSendTest = async () => {
        if (!testEmail.trim()) {
            showToast('error', 'Vui lòng nhập địa chỉ email nhận thư thử nghiệm.');
            return;
        }
        try {
            setSendingTest(true);
            await sendTestEmail(testEmail.trim());
            showToast('success', `✅ Email test đã được gửi thành công đến ${testEmail}!`);
            setShowTestModal(false);
            setTestEmail('');
        } catch (err) {
            showToast('error', err?.response?.data?.userMessage || err?.response?.data?.message || 'Gửi email test thất bại.');
        } finally {
            setSendingTest(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setDisconnecting(true);
            await disconnectGmail();
            showToast('success', 'Đã ngắt kết nối Gmail thành công.');
            setStatus({ connected: false, connectedEmail: null, connectedAt: null });
            setShowDisconnectModal(false);
        } catch (err) {
            showToast('error', err?.response?.data?.userMessage || err?.response?.data?.message || 'Không thể ngắt kết nối Gmail.');
        } finally {
            setDisconnecting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Đang kiểm tra cấu hình Email hệ thống...</p>
            </div>
        );
    }

    return (
        <div className={styles.tab}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <i className="bi bi-envelope-at-fill" /> Cấu hình Email hệ thống
                    </h1>
                    <p className={styles.pageSubtitle}>
                        Quản lý xác thực Google Gmail OAuth và cơ chế gửi email tự động cho toàn hệ thống Duy Long Computer
                    </p>
                </div>
            </div>

            <div className={styles.settingsGrid}>
                {/* ── Cột trái: Kết nối Gmail OAuth ── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-shield-check" />
                        <span>Google Gmail OAuth 2.0 Integration</span>
                        {status.connected && (
                            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                Đang hoạt động
                            </span>
                        )}
                    </div>

                    <div className={styles.sectionBody}>
                        {status.connected ? (
                            /* ── Trạng thái đã kết nối ── */
                            <div className={styles.connectedCard}>
                                <div className={styles.statusBadgeRow}>
                                    <div className={styles.connectedBadge}>
                                        <span className={styles.connectedDot} />
                                        <span>Đã kết nối Gmail OAuth</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Giao thức: <strong>Google REST API v1</strong>
                                    </span>
                                </div>

                                <div className={styles.accountBox}>
                                    <div className={styles.avatar}>
                                        {status.connectedEmail?.charAt(0)?.toUpperCase() || 'G'}
                                    </div>
                                    <div className={styles.accountDetails}>
                                        <p className={styles.accountEmail}>{status.connectedEmail}</p>
                                        {status.connectedAt && (
                                            <p className={styles.accountMeta}>
                                                <i className="bi bi-clock-history" /> Kết nối từ: {formatDate(status.connectedAt)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.infoAlert}>
                                    <i className="bi bi-info-circle-fill" />
                                    <div>
                                        <strong>Đang áp dụng:</strong> Tất cả email giao dịch phát sinh từ hệ thống (Báo giá bán lẻ &amp; đại lý, thông báo chốt tồn kho hàng ngày, cảnh báo sao lưu dữ liệu, cấp lại mật khẩu) sẽ tự động gửi đi từ địa chỉ Gmail này.
                                    </div>
                                </div>

                                <div className={styles.actionsRow}>
                                    <button
                                        type="button"
                                        className={styles.btnTest}
                                        onClick={() => setShowTestModal(true)}
                                    >
                                        <i className="bi bi-send-check" /> Gửi thử nghiệm
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.btnSwitch}
                                        onClick={handleConnect}
                                    >
                                        <i className="bi bi-arrow-repeat" /> Đổi tài khoản Gmail
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.btnDisconnect}
                                        onClick={() => setShowDisconnectModal(true)}
                                    >
                                        <i className="bi bi-plug" /> Ngắt kết nối
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Trạng thái chưa kết nối ── */
                            <div className={styles.disconnectedCard}>
                                <div className={styles.disconnectedIconWrapper}>
                                    <i className="bi bi-envelope-paper-heart" />
                                </div>
                                <h3 className={styles.disconnectedTitle}>Chưa kết nối tài khoản Gmail</h3>
                                <p className={styles.disconnectedDescription}>
                                    Kết nối trực tiếp tài khoản Gmail của bạn hoặc công ty qua giao thức Google OAuth 2.0.
                                    Gửi email tốc độ cao, bảo mật, và tránh hoàn toàn việc bị phân loại vào hòm thư Spam hay chặn mật khẩu ứng dụng.
                                </p>
                                <button
                                    type="button"
                                    className={styles.btnConnectGoogle}
                                    onClick={handleConnect}
                                >
                                    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                                        <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                                        <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                                        <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                                        <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                                    </svg>
                                    <span>Kết nối tài khoản Gmail với Google</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Cột phải: Thông tin kỹ thuật & Các luồng nghiệp vụ ── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-hdd-network" />
                        <span>Cơ chế vận hành &amp; Tích hợp hệ thống</span>
                    </div>

                    <div className={styles.sectionBody}>
                        <div className={styles.infoList}>
                            <div className={styles.infoItem}>
                                <div className={styles.infoIcon}>
                                    <i className="bi bi-arrow-repeat" />
                                </div>
                                <div className={styles.infoContent}>
                                    <h4>Cơ chế Fallback thông minh</h4>
                                    <p>
                                        Hệ thống ưu tiên gửi thư trực tiếp qua Gmail API (OAuth). Nếu tài khoản bị ngắt kết nối hoặc lỗi xác thực, hệ thống sẽ tự động chuyển sang máy chủ SMTP dự phòng (cấu hình trong backend) để không làm gián đoạn vận hành.
                                    </p>
                                    <span className={styles.tagBadge}>Fallback: smtp.gmail.com:587</span>
                                </div>
                            </div>

                            <div className={styles.infoItem}>
                                <div className={styles.infoIcon}>
                                    <i className="bi bi-file-earmark-spreadsheet" />
                                </div>
                                <div className={styles.infoContent}>
                                    <h4>Báo giá &amp; Đơn đặt hàng (Sales Order)</h4>
                                    <p>
                                        Nhân viên bán hàng có thể bấm gửi trực tiếp báo giá chi tiết, hóa đơn PDF đính kèm cho khách hàng và đối tác qua email.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.infoItem}>
                                <div className={styles.infoIcon}>
                                    <i className="bi bi-clock-history" />
                                </div>
                                <div className={styles.infoContent}>
                                    <h4>Báo cáo chốt sổ kho hàng ngày</h4>
                                    <p>
                                        Mỗi ngày tại thời điểm quy định trong Cài đặt hệ thống, hệ thống tổng hợp bảng tồn kho và gửi email thông báo cho Ban Giám đốc.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.infoItem}>
                                <div className={styles.infoIcon}>
                                    <i className="bi bi-database-check" />
                                </div>
                                <div className={styles.infoContent}>
                                    <h4>Nhật ký sao lưu cơ sở dữ liệu</h4>
                                    <p>
                                        Tự động gửi email cảnh báo khi sao lưu định kỳ thành công hoặc phát hiện lỗi đồng bộ Google Drive.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Modal: Gửi email test ── */}
            {showTestModal && (
                <div className={styles.modalOverlay} onClick={() => setShowTestModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                <i className="bi bi-send-check" style={{ color: 'var(--color-primary)' }} />
                                Gửi email thử nghiệm
                            </h3>
                            <button
                                type="button"
                                className={styles.modalClose}
                                onClick={() => setShowTestModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Địa chỉ email nhận</label>
                                <input
                                    type="email"
                                    className={styles.input}
                                    placeholder="ví dụ: admin@duylongcomputer.vn"
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendTest()}
                                    autoFocus
                                />
                            </div>
                            <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                Thư thử nghiệm sẽ được gửi từ hòm thư <strong>{status.connectedEmail}</strong> qua Gmail REST API để xác nhận kết nối hoạt động ổn định.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                type="button"
                                className={styles.btnCancel}
                                onClick={() => setShowTestModal(false)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.btnSend}
                                onClick={handleSendTest}
                                disabled={sendingTest}
                            >
                                {sendingTest ? (
                                    <>
                                        <i className="bi bi-hourglass-split" /> Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-send" /> Gửi email test
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Xác nhận ngắt kết nối ── */}
            {showDisconnectModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDisconnectModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle} style={{ color: '#dc2626' }}>
                                <i className="bi bi-exclamation-triangle-fill" />
                                Ngắt kết nối Gmail OAuth
                            </h3>
                            <button
                                type="button"
                                className={styles.modalClose}
                                onClick={() => setShowDisconnectModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <p className={styles.confirmText}>
                                Bạn có chắc chắn muốn ngắt kết nối tài khoản Gmail <strong>{status.connectedEmail}</strong>?
                            </p>
                            <p className={styles.confirmText} style={{ color: '#64748b', fontSize: '13px' }}>
                                Sau khi ngắt, hệ thống sẽ xóa khóa truy cập đã mã hóa và tự động chuyển về gửi qua máy chủ SMTP mặc định. Bạn có thể kết nối lại bất cứ lúc nào.
                            </p>
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                type="button"
                                className={styles.btnCancel}
                                onClick={() => setShowDisconnectModal(false)}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting ? 'Đang ngắt...' : 'Xác nhận ngắt kết nối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmailSettingsTab;
