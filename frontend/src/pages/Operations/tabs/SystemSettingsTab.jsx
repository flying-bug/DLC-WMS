import { useState, useEffect, useRef } from 'react';
import { getSystemSettings, saveSystemSettings, uploadServiceAccount, testDriveConnection } from '../../../api/backupApi';
import styles from './SystemSettingsTab.module.css';

function SystemSettingsTab() {
    const [settings, setSettings] = useState({
        backupPath: '/tmp/backups',
        driveEnabled: false,
        driveFolderId: '',
        driveConfigured: false,
        encryptEnabled: false,
        encryptKey: '',
        notifyEmailEnabled: false,
        notifyEmailTo: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });
    const fileInputRef = useRef(null);

    const showMsg = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await getSystemSettings();
                if (res.success) setSettings(res.data);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await saveSystemSettings(settings);
            if (res.success) showMsg('✅ Cài đặt đã được lưu thành công!');
            else showMsg('❌ ' + res.userMessage, 'error');
        } catch {
            showMsg('❌ Lưu thất bại.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestDrive = async () => {
        setTesting(true);
        try {
            // Auto save current form inputs (Folder ID, etc.) to backend before testing
            await saveSystemSettings(settings);
            const res = await testDriveConnection();
            if (res.success && res.data?.connected) {
                showMsg('✅ Kết nối Google Drive thành công!');
            } else {
                showMsg('❌ ' + (res.userMessage || 'Kết nối thất bại.'), 'error');
            }
        } catch {
            showMsg('❌ Không thể kiểm tra kết nối.', 'error');
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
            if (res.success) {
                showMsg(`✅ Service Account "${res.data.filename}" đã được tải lên!`);
                setSettings(s => ({ ...s, driveConfigured: true }));
            } else {
                showMsg('❌ ' + res.userMessage, 'error');
            }
        } catch {
            showMsg('❌ Upload thất bại.', 'error');
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

            {msg.text && (
                <div className={`${styles.msgBar} ${msg.type === 'error' ? styles.msgError : styles.msgSuccess}`}>
                    {msg.text}
                </div>
            )}

            <div className={styles.settingsGrid}>
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
