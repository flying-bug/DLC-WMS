import { useState, useEffect, useRef } from 'react';
import { getSystemSettings, saveSystemSettings, uploadServiceAccount, testDriveConnection } from '../../../api/backupApi';
import { useToast } from '../../../contexts/ToastContext';
import { useAiFeature } from '../../../contexts/AiFeatureContext';
import styles from './SystemSettingsTab.module.css';

function SystemSettingsTab() {
    const { setAiEnabled: updateGlobalAiState } = useAiFeature();
    const [settings, setSettings] = useState({
        backupPath: '/tmp/backups',
        driveEnabled: false,
        driveFolderId: '',
        driveConfigured: false,
        encryptEnabled: false,
        encryptKey: '',
        notifyEmailEnabled: false,
        notifyEmailTo: '',
        snapshotTime: '00:05',
        reservationExpiryHours: 72,
        aiEnabled: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
    const { showToast } = useToast();
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getSystemSettings();
                if (res.success) {
                    setSettings(res.data);
                    if (typeof res.data?.aiEnabled === 'boolean') {
                        updateGlobalAiState(res.data.aiEnabled);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [updateGlobalAiState]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await saveSystemSettings(settings);
            const msg = res.data?.message || res.message || 'Cài đặt hệ thống đã được lưu thành công.';
            if (res.success) {
                showToast('success', msg);
                if (typeof settings.aiEnabled === 'boolean') {
                    updateGlobalAiState(settings.aiEnabled);
                }
            } else {
                showToast('error', res.message || 'Lưu cài đặt thất bại.');
            }
        } catch (err) {
            showToast('error', err.response?.data?.message || err.message || 'Lưu cài đặt thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const handleTestDrive = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            // Auto save current form inputs (Folder ID, etc.) to backend before testing
            await saveSystemSettings(settings);
            const res = await testDriveConnection();
            if (res.success && res.data?.connected) {
                const msg = res.data?.message || 'Kết nối Google Drive thành công!';
                setTestResult({ success: true, message: msg });
                showToast('success', msg);
            } else {
                const msg = res.message || 'Không thể kết nối Google Drive. Vui lòng kiểm tra lại cấu hình.';
                setTestResult({ success: false, message: msg });
                showToast('error', msg);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Lỗi kết nối Google Drive.';
            setTestResult({ success: false, message: msg });
            showToast('error', msg);
        } finally {
            setTesting(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await uploadServiceAccount(file);
            const msg = res.data?.message || res.message || 'Tải lên Service Account JSON thành công!';
            if (res.success) {
                showToast('success', msg);
                setSettings(s => ({ ...s, driveConfigured: true }));
                setTestResult(null);
            } else {
                showToast('error', res.message || 'Tải lên thất bại.');
            }
        } catch (err) {
            showToast('error', err.response?.data?.message || err.message || 'Tải lên file JSON thất bại.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) return (
        <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Đang tải cài đặt...</p>
        </div>
    );

    return (
        <div className={styles.tab}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <i className="bi bi-gear-wide-connected" /> System Settings
                    </h1>
                    <p className={styles.pageSubtitle}>Cấu hình Google Drive, bảo mật và thông báo</p>
                </div>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    <i className={saving ? 'bi bi-hourglass-split' : 'bi bi-floppy'} />
                    {saving ? 'Đang lưu...' : 'Lưu tất cả'}
                </button>
            </div>

            <div className={styles.settingsGrid}>
                {/* ── AI & Vision Integration (Trí Tuệ Nhân Tạo AI) ─────────────────────────── */}
                <div className={styles.settingSection} style={{ borderLeft: '4px solid var(--color-primary, #059669)' }}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-robot" style={{ color: 'var(--color-primary, #059669)', fontSize: '18px' }} />
                        <span style={{ fontWeight: 700 }}>Cấu hình Tính năng AI (AI &amp; Vision Integration)</span>
                        <span style={{
                            marginLeft: 'auto',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: settings.aiEnabled ? '#ecfdf5' : '#fef2f2',
                            color: settings.aiEnabled ? '#059669' : '#dc2626',
                            border: `1px solid ${settings.aiEnabled ? '#a7f3d0' : '#fecaca'}`
                        }}>
                            {settings.aiEnabled ? '🟢 Đang Bật' : '🔴 Đã Tắt'}
                        </span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <div className={styles.formRow}>
                                <div style={{ flex: 1, paddingRight: '16px' }}>
                                    <label className={styles.label} style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                                        Cho phép sử dụng AI trên toàn hệ thống
                                    </label>
                                    <p className={styles.hint} style={{ marginTop: '4px', lineHeight: 1.5 }}>
                                        Bật / Tắt tất cả các chức năng AI: <strong>Trợ lý AI Chat</strong>, <strong>Quét hóa đơn OCR bằng AI (Vision AI)</strong> tại Đơn mua hàng &amp; Nhập kho, và <strong>Nhập liệu giọng nói (Voice AI)</strong>. Khi tắt, các chức năng này sẽ tự động ẩn hoàn toàn đối với Quản lý (Manager) và Nhân viên (Staff).
                                    </p>
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(settings.aiEnabled)}
                                        onChange={e => setSettings(s => ({ ...s, aiEnabled: e.target.checked }))}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Daily Inventory Snapshot Config ─────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-clock-history" style={{ color: 'var(--color-primary)' }} />
                        <span>Daily Inventory Snapshot (Chốt Sổ Kho Hàng Ngày)</span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Giờ tự động chốt sổ kho mỗi ngày</label>
                            <div className={styles.inputWithIcon}>
                                <i className="bi bi-alarm" />
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={settings.snapshotTime || '00:05'}
                                    onChange={e => setSettings(s => ({ ...s, snapshotTime: e.target.value }))}
                                />
                            </div>
                            <p className={styles.hint}>
                                Hệ thống sẽ tự động tổng hợp và chốt số lượng tồn kho của ngày hôm trước vào thời điểm được thiết lập này mỗi ngày.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Sales Config ───────────────────────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-cart-check-fill" style={{ color: '#0ea5e9' }} />
                        <span>Sales Configuration</span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Thời gian giữ hàng đơn bán (Giờ)</label>
                            <div className={styles.inputWithIcon}>
                                <i className="bi bi-hourglass-bottom" />
                                <input
                                    type="number"
                                    min="1"
                                    max="720"
                                    className={styles.input}
                                    value={settings.reservationExpiryHours !== undefined ? settings.reservationExpiryHours : ''}
                                    onChange={e => setSettings(s => ({ ...s, reservationExpiryHours: e.target.value }))}
                                />
                            </div>
                            <p className={styles.hint}>
                                Số giờ tối đa hệ thống tạm giữ tồn kho cho Đơn bán hàng trước khi tự động hủy giữ hàng nếu chưa thanh toán (Mặc định: 72 giờ).
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Storage Config ─────────────────────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-folder2-open" />
                        <span>Storage Configuration</span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Backup Directory Path</label>
                            <div className={styles.inputWithIcon}>
                                <i className="bi bi-hdd" />
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={settings.backupPath}
                                    onChange={e => setSettings(s => ({ ...s, backupPath: e.target.value }))}
                                    placeholder="/tmp/backups"
                                />
                            </div>
                            <p className={styles.hint}>Thư mục lưu file backup tạm trên server trước khi upload Drive.</p>
                        </div>
                    </div>
                </div>

                {/* ── Google Drive ───────────────────────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-cloud-fill" style={{ color: '#6366f1' }} />
                        <span>Google Drive Integration</span>
                        {settings.driveConfigured && (
                            <span className={styles.configuredBadge}>
                                <i className="bi bi-check-circle-fill" /> Đã cấu hình
                            </span>
                        )}
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <div className={styles.formRow}>
                                <label className={styles.label}>Bật Google Drive Upload</label>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.driveEnabled}
                                        onChange={e => setSettings(s => ({ ...s, driveEnabled: e.target.checked }))}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Google Drive Folder ID</label>
                            <div className={styles.inputWithIcon}>
                                <i className="bi bi-folder2" />
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={settings.driveFolderId}
                                    onChange={e => setSettings(s => ({ ...s, driveFolderId: e.target.value }))}
                                    placeholder="Folder ID từ URL Google Drive..."
                                />
                            </div>
                            <p className={styles.hint}>Lấy ID từ URL Drive: drive.google.com/drive/folders/<strong>YOUR_FOLDER_ID</strong></p>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Service Account JSON</label>
                            <div className={styles.uploadArea}>
                                <div className={styles.uploadInfo}>
                                    {settings.driveConfigured ? (
                                        <span className={styles.uploadedTag}>
                                            <i className="bi bi-check-circle-fill" /> Service Account đã được tải lên
                                        </span>
                                    ) : (
                                        <span className={styles.notUploadedTag}>
                                            <i className="bi bi-x-circle" /> Chưa cấu hình
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                    id="saFileInput"
                                />
                                <label htmlFor="saFileInput" className={styles.uploadBtn}>
                                    {uploading ? (
                                        <><i className="bi bi-hourglass-split" /> Đang upload...</>
                                    ) : (
                                        <><i className="bi bi-upload" /> Tải lên JSON</>
                                    )}
                                </label>
                            </div>
                            <p className={styles.hint}>Tải file JSON của Service Account từ Google Cloud Console (IAM & Admin → Service Accounts).</p>
                        </div>

                        <button
                            className={styles.testBtn}
                            onClick={handleTestDrive}
                            disabled={testing || !settings.driveConfigured}
                        >
                            <i className={testing ? 'bi bi-hourglass-split' : 'bi bi-wifi'} />
                            {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Drive'}
                        </button>

                        {testResult && (
                            <div className={`${styles.testStatusBox} ${testResult.success ? styles.testStatusSuccess : styles.testStatusError}`}>
                                <i className={testResult.success ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'} />
                                <span>{testResult.message}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Security ──────────────────────────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-shield-lock-fill" style={{ color: '#f59e0b' }} />
                        <span>Security & Encryption</span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <div className={styles.formRow}>
                                <label className={styles.label}>Mã hóa file backup (AES-256)</label>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.encryptEnabled}
                                        onChange={e => setSettings(s => ({ ...s, encryptEnabled: e.target.checked }))}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>
                        </div>

                        {settings.encryptEnabled && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Encryption Key</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="bi bi-key-fill" />
                                    <input
                                        type="password"
                                        className={styles.input}
                                        value={settings.encryptKey}
                                        onChange={e => setSettings(s => ({ ...s, encryptKey: e.target.value }))}
                                        placeholder="Nhập khoá mã hóa (tối thiểu 16 ký tự)..."
                                    />
                                </div>
                                <p className={styles.hint}>⚠️ Lưu khoá này ở nơi an toàn. Mất khoá = mất khả năng restore backup mã hóa.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Notifications ─────────────────────────────────────────── */}
                <div className={styles.settingSection}>
                    <div className={styles.sectionHeader}>
                        <i className="bi bi-envelope-fill" style={{ color: '#10b981' }} />
                        <span>Email Notifications</span>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.formGroup}>
                            <div className={styles.formRow}>
                                <label className={styles.label}>Gửi email thông báo backup</label>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={settings.notifyEmailEnabled}
                                        onChange={e => setSettings(s => ({ ...s, notifyEmailEnabled: e.target.checked }))}
                                    />
                                    <span className={styles.toggleSlider} />
                                </label>
                            </div>
                        </div>

                        {settings.notifyEmailEnabled && (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email nhận thông báo</label>
                                <div className={styles.inputWithIcon}>
                                    <i className="bi bi-at" />
                                    <input
                                        type="email"
                                        className={styles.input}
                                        value={settings.notifyEmailTo}
                                        onChange={e => setSettings(s => ({ ...s, notifyEmailTo: e.target.value }))}
                                        placeholder="admin@duylong.vn"
                                    />
                                </div>
                                <p className={styles.hint}>Email sẽ nhận thông báo khi backup thành công hoặc thất bại. SMTP đã được cấu hình sẵn trong application.yaml.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SystemSettingsTab;
