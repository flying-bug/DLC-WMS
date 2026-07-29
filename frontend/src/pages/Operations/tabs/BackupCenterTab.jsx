import { useState, useEffect, useCallback } from 'react';
import {
    listBackups, createBackup, deleteBackup,
    uploadBackupToDrive, restoreBackup, getDownloadUrl,
    getBackupSchedule, saveBackupSchedule
} from '../../../api/backupApi';
import { useToast } from '../../../contexts/ToastContext';
import ConfirmModal from '../../../components/ui/ConfirmModal/ConfirmModal';
import styles from './BackupCenterTab.module.css';

const STATUS_CONFIG = {
    LOCAL:     { label: 'Chỉ Local',   color: '#f59e0b', icon: 'bi bi-hdd-fill' },
    DRIVE:     { label: 'Drive',        color: '#6366f1', icon: 'bi bi-cloud-fill' },
    BOTH:      { label: 'Local + Drive',color: '#10b981', icon: 'bi bi-check2-circle' },
    FAILED:    { label: 'Thất bại',     color: '#ef4444', icon: 'bi bi-x-circle-fill' },
    RESTORING: { label: 'Đang restore', color: '#06b6d4', icon: 'bi bi-arrow-repeat' },
};

function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Restore Confirm Modal ────────────────────────────────────────────────────
function RestoreConfirmModal({ record, onConfirm, onCancel, loading }) {
    const [input, setInput] = useState('');

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }} />
                    <h2>Xác nhận Restore Database</h2>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.dangerBox}>
                        <strong>⚠️ CẢNH BÁO:</strong> Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại
                        bằng bản sao lưu <strong>{record?.filename}</strong>. Không thể hoàn tác!
                    </div>
                    <p className={styles.confirmLabel}>
                        Nhập <code>RESTORE</code> để xác nhận:
                    </p>
                    <input
                        className={styles.confirmInput}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Nhập RESTORE..."
                        autoFocus
                    />
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.cancelBtn} onClick={onCancel}>Hủy bỏ</button>
                    <button
                        className={styles.dangerBtn}
                        onClick={() => onConfirm(record.id)}
                        disabled={input !== 'RESTORE' || loading}
                    >
                        {loading ? <><i className="bi bi-hourglass-split" /> Đang restore...</> : 'Xác nhận Restore'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
function BackupCenterTab() {
    const [activeSubTab, setActiveSubTab] = useState('history');
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const { showToast } = useToast();
    const [restoreTarget, setRestoreTarget] = useState(null);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Schedule state
    const [schedule, setSchedule] = useState({
        enabled: false, scheduleType: 'DAILY',
        scheduleTime: '02:00', scheduleDay: 1, retentionDays: 30
    });
    const [schedLoading, setSchedLoading] = useState(false);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listBackups();
            if (res.success) setBackups(res.data || []);
        } catch (e) {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSchedule = useCallback(async () => {
        try {
            const res = await getBackupSchedule();
            if (res.success) setSchedule(res.data);
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
        }
    }, []);

    useEffect(() => {
        fetchBackups();
        fetchSchedule();
    }, [fetchBackups, fetchSchedule]);

    const handleCreateBackup = async () => {
        setActionLoading(p => ({ ...p, create: true }));
        try {
            const res = await createBackup();
            if (res.success) {
                showToast('success', 'Thêm mới thành công.');
                fetchBackups();
            } else {
                showToast('error', 'Thao tác thất bại.');
            }
        } catch {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setActionLoading(p => ({ ...p, create: false }));
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget;
        setActionLoading(p => ({ ...p, [id + '_del']: true }));
        try {
            const res = await deleteBackup(id);
            if (res.success) { showToast('success', 'Xóa thành công.'); fetchBackups(); }
            else showToast('error', 'Thao tác thất bại.');
        } catch {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setActionLoading(p => ({ ...p, [id + '_del']: false }));
            setDeleteTarget(null);
        }
    };

    const handleUploadDrive = async (id) => {
        setActionLoading(p => ({ ...p, [id + '_drv']: true }));
        try {
            const res = await uploadBackupToDrive(id);
            if (res.success) {
                showToast('success', 'Cập nhật thành công.');
                fetchBackups();
            } else showToast('error', 'Thao tác thất bại.');
        } catch {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setActionLoading(p => ({ ...p, [id + '_drv']: false }));
        }
    };

    const handleDownload = (id) => {
        const { url, token } = getDownloadUrl(id);
        // Create temp anchor with auth header simulation — use fetch+blob for proper download
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `backup_${id}.sql.gz`;
                link.click();
            })
            .catch(() => showToast('error', 'Thao tác thất bại.'));
    };

    const handleRestoreConfirm = async (id) => {
        setRestoreLoading(true);
        try {
            const res = await restoreBackup(id);
            if (res.success) {
                showToast('success', 'Khôi phục thành công.');
                setRestoreTarget(null);
                fetchBackups();
            } else showToast('error', 'Thao tác thất bại.');
        } catch {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setRestoreLoading(false);
            setRestoreTarget(null);
        }
    };

    const handleSaveSchedule = async () => {
        setSchedLoading(true);
        try {
            const res = await saveBackupSchedule(schedule);
            if (res.success) showToast('success', 'Lưu thành công.');
            else showToast('error', 'Thao tác thất bại.');
        } catch {
            showToast('error', 'Thao tác thất bại.');
        } finally {
            setSchedLoading(false);
        }
    };

    return (
        <div className={styles.tab}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <i className="bi bi-database-fill-gear" /> Backup & Restore Center
                    </h1>
                    <p className={styles.pageSubtitle}>Quản lý sao lưu và khôi phục cơ sở dữ liệu</p>
                </div>
                <button
                    className={styles.createBtn}
                    onClick={handleCreateBackup}
                    disabled={actionLoading.create}
                >
                    <i className={actionLoading.create ? 'bi bi-hourglass-split' : 'bi bi-database-add'} />
                    {actionLoading.create ? 'Đang tạo...' : 'Tạo Backup mới'}
                </button>
            </div>

            {/* Sub-tabs */}
            <div className={styles.subTabs}>
                <button
                    className={`${styles.subTab} ${activeSubTab === 'history' ? styles.subTabActive : ''}`}
                    onClick={() => setActiveSubTab('history')}
                >
                    <i className="bi bi-clock-history" /> Lịch sử & Thao tác
                </button>
                <button
                    className={`${styles.subTab} ${activeSubTab === 'schedule' ? styles.subTabActive : ''}`}
                    onClick={() => setActiveSubTab('schedule')}
                >
                    <i className="bi bi-calendar-range" /> Lịch tự động
                </button>
            </div>

            {/* ── History Sub-Tab ──────────────────────────────────────────── */}
            {activeSubTab === 'history' && (
                <div className={styles.tableWrap}>
                    {loading ? (
                        <div className={styles.loadingRow}><div className={styles.spinner} /> Đang tải...</div>
                    ) : backups.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="bi bi-database-x" />
                            <p>Chưa có backup nào. Nhấn "Tạo Backup mới" để bắt đầu.</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tên file</th>
                                    <th>Kích thước</th>
                                    <th>Thời gian</th>
                                    <th>Trạng thái</th>
                                    <th>Tác vụ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map(b => {
                                    const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.LOCAL;
                                    return (
                                        <tr key={b.id} className={styles.tableRow}>
                                            <td className={styles.filenameCell}>
                                                <i className="bi bi-file-earmark-zip" />
                                                {b.filename}
                                            </td>
                                            <td>{b.fileSizeFormatted || '—'}</td>
                                            <td className={styles.dateCell}>{formatDateTime(b.createdAt)}</td>
                                            <td>
                                                <span className={styles.badge} style={{ color: sc.color, background: sc.color + '22' }}>
                                                    <i className={sc.icon} /> {sc.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.downloadBtn}`}
                                                        onClick={() => handleDownload(b.id)}
                                                        title="Tải xuống"
                                                    >
                                                        <i className="bi bi-download" />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.driveBtn}`}
                                                        onClick={() => handleUploadDrive(b.id)}
                                                        disabled={actionLoading[b.id + '_drv']}
                                                        title="Upload Google Drive"
                                                    >
                                                        <i className={actionLoading[b.id + '_drv'] ? 'bi bi-hourglass-split' : 'bi bi-cloud-upload'} />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.restoreBtn}`}
                                                        onClick={() => setRestoreTarget(b)}
                                                        title="Restore"
                                                    >
                                                        <i className="bi bi-arrow-counterclockwise" />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        onClick={() => setDeleteTarget(b.id)}
                                                        disabled={actionLoading[b.id + '_del']}
                                                        title="Xóa"
                                                    >
                                                        <i className={actionLoading[b.id + '_del'] ? 'bi bi-hourglass-split' : 'bi bi-trash3'} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Schedule Sub-Tab ─────────────────────────────────────────── */}
            {activeSubTab === 'schedule' && (
                <div className={styles.scheduleWrap}>
                    <div className={styles.scheduleCard}>
                        <div className={styles.scheduleTitle}>
                            <i className="bi bi-calendar-check" /> Cấu hình lịch backup tự động
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel}>Bật lịch tự động</label>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={schedule.enabled}
                                    onChange={e => setSchedule(s => ({ ...s, enabled: e.target.checked }))}
                                />
                                <span className={styles.toggleSlider} />
                            </label>
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel}>Loại lịch</label>
                            <select
                                className={styles.formSelect}
                                value={schedule.scheduleType}
                                onChange={e => setSchedule(s => ({ ...s, scheduleType: e.target.value }))}
                            >
                                <option value="DAILY">Hàng ngày</option>
                                <option value="WEEKLY">Hàng tuần</option>
                                <option value="MONTHLY">Hàng tháng</option>
                            </select>
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.formLabel}>Giờ chạy</label>
                            <input
                                type="time"
                                className={styles.formInput}
                                value={schedule.scheduleTime}
                                onChange={e => setSchedule(s => ({ ...s, scheduleTime: e.target.value }))}
                            />
                        </div>

                        {schedule.scheduleType === 'WEEKLY' && (
                            <div className={styles.formRow}>
                                <label className={styles.formLabel}>Ngày trong tuần</label>
                                <select
                                    className={styles.formSelect}
                                    value={schedule.scheduleDay}
                                    onChange={e => setSchedule(s => ({ ...s, scheduleDay: Number(e.target.value) }))}
                                >
                                    {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'].map((d,i) => (
                                        <option key={i+1} value={i+1}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {schedule.scheduleType === 'MONTHLY' && (
                            <div className={styles.formRow}>
                                <label className={styles.formLabel}>Ngày trong tháng</label>
                                <input
                                    type="number"
                                    className={styles.formInput}
                                    min={1} max={28}
                                    value={schedule.scheduleDay}
                                    onChange={e => setSchedule(s => ({ ...s, scheduleDay: Number(e.target.value) }))}
                                />
                            </div>
                        )}

                        <div className={styles.formRow}>
                            <label className={styles.formLabel}>Xóa backup cũ hơn (ngày)</label>
                            <input
                                type="number"
                                className={styles.formInput}
                                min={1} max={365}
                                value={schedule.retentionDays}
                                onChange={e => setSchedule(s => ({ ...s, retentionDays: Number(e.target.value) }))}
                            />
                        </div>

                        <div className={styles.scheduleHint}>
                            <i className="bi bi-info-circle" />
                            <span>
                                {schedule.enabled
                                    ? `Backup sẽ chạy tự động lúc ${schedule.scheduleTime} — ${
                                        schedule.scheduleType === 'DAILY' ? 'mỗi ngày' :
                                        schedule.scheduleType === 'WEEKLY' ? `mỗi tuần (ngày ${schedule.scheduleDay})` :
                                        `ngày ${schedule.scheduleDay} mỗi tháng`
                                    }. Backup cũ hơn ${schedule.retentionDays} ngày sẽ tự xóa.`
                                    : 'Lịch tự động đang tắt.'}
                            </span>
                        </div>

                        <button className={styles.saveBtn} onClick={handleSaveSchedule} disabled={schedLoading}>
                            <i className={schedLoading ? 'bi bi-hourglass-split' : 'bi bi-floppy'} />
                            {schedLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                        </button>
                    </div>
                </div>
            )}

            {/* Restore Modal */}
            {restoreTarget && (
                <RestoreConfirmModal
                    record={restoreTarget}
                    onConfirm={handleRestoreConfirm}
                    onCancel={() => setRestoreTarget(null)}
                    loading={restoreLoading}
                />
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Xác nhận xóa bản sao lưu"
                message="Bạn có chắc chắn muốn xóa bản sao lưu này không? Hành động này không thể hoàn tác."
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                confirmText="Xóa"
                cancelText="Hủy"
                isDanger={true}
            />
        </div>
    );
}

export default BackupCenterTab;
