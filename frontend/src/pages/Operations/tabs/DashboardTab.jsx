import { useState, useEffect, useCallback } from 'react';
import { getSystemHealth, createBackup } from '../../../api/backupApi';
import styles from './DashboardTab.module.css';

function StatCard({ icon, iconColor, label, value, sub, percent, trend }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: iconColor + '22', color: iconColor }}>
                <i className={icon} />
            </div>
            <div className={styles.statBody}>
                <div className={styles.statLabel}>{label}</div>
                <div className={styles.statValue}>{value}</div>
                {sub && <div className={styles.statSub}>{sub}</div>}
            </div>
            {percent !== undefined && (
                <div className={styles.statBar}>
                    <div
                        className={styles.statBarFill}
                        style={{
                            width: `${Math.min(percent, 100)}%`,
                            background: percent > 80 ? '#ef4444' : percent > 60 ? '#f59e0b' : iconColor
                        }}
                    />
                    <span className={styles.statBarPct}>{percent}%</span>
                </div>
            )}
        </div>
    );
}

function DashboardTab() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backingUp, setBackingUp] = useState(false);
    const [backupMsg, setBackupMsg] = useState('');
    const [error, setError] = useState('');

    const fetchHealth = useCallback(async () => {
        try {
            const res = await getSystemHealth();
            if (res.success) setHealth(res.data);
            else setError('Không thể tải thông tin hệ thống.');
        } catch (e) {
            setError('Kết nối API thất bại.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30_000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    const handleQuickBackup = async () => {
        setBackingUp(true);
        setBackupMsg('');
        try {
            const res = await createBackup();
            if (res.success) {
                setBackupMsg(`✅ Sao lưu thành công: ${res.data.filename} (${res.data.fileSizeFormatted})`);
                fetchHealth();
            } else {
                setBackupMsg('❌ ' + (res.userMessage || 'Sao lưu thất bại.'));
            }
        } catch (e) {
            setBackupMsg('❌ Không thể kết nối backend.');
        } finally {
            setBackingUp(false);
        }
    };

    if (loading) return (
        <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Đang tải thông tin hệ thống...</p>
        </div>
    );

    if (error) return (
        <div className={styles.errorState}>
            <i className="bi bi-exclamation-triangle-fill" />
            <p>{error}</p>
            <button onClick={fetchHealth} className={styles.retryBtn}>Thử lại</button>
        </div>
    );

    const h = health;

    return (
        <div className={styles.tab}>
            {/* Page Title */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <i className="bi bi-grid-1x2-fill" /> Tổng quan hệ thống
                    </h1>
                    <p className={styles.pageSubtitle}>Tổng quan sức khỏe hệ thống theo thời gian thực</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.refreshBtn} onClick={fetchHealth} title="Làm mới">
                        <i className="bi bi-arrow-clockwise" />
                    </button>
                    <button
                        className={`${styles.backupNowBtn} ${backingUp ? styles.backingUp : ''}`}
                        onClick={handleQuickBackup}
                        disabled={backingUp}
                    >
                        <i className={backingUp ? 'bi bi-hourglass-split' : 'bi bi-database-add'} />
                        {backingUp ? 'Đang sao lưu...' : 'Sao lưu ngay'}
                    </button>
                </div>
            </div>

            {backupMsg && (
                <div className={`${styles.backupAlert} ${backupMsg.startsWith('✅') ? styles.alertSuccess : styles.alertError}`}>
                    {backupMsg}
                </div>
            )}

            {/* Status Banner */}
            <div className={`${styles.statusBanner} ${h.dbOnline ? styles.statusOnline : styles.statusOffline}`}>
                <i className={h.dbOnline ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'} />
                <span>
                    Database {h.dbOnline ? 'ONLINE' : 'OFFLINE'}
                    {h.dbOnline && ` — MySQL ${h.dbVersion}`}
                </span>
                <span className={styles.statusMeta}>{h.tableCount} tables · {h.dbSizeFormatted}</span>
            </div>

            {/* Stat Cards Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon="bi bi-server"
                    iconColor="#6366f1"
                    label="Kích thước Database"
                    value={h.dbSizeFormatted}
                    sub={`${h.tableCount} bảng dữ liệu`}
                />
                <StatCard
                    icon="bi bi-memory"
                    iconColor="#8b5cf6"
                    label="Bộ nhớ JVM"
                    value={`${h.jvmUsedMb} MB`}
                    sub={`Tổng: ${h.jvmTotalMb} MB`}
                    percent={h.jvmUsedPercent}
                />
                <StatCard
                    icon="bi bi-hdd-fill"
                    iconColor="#06b6d4"
                    label="Dung lượng ổ đĩa"
                    value={`${h.diskUsedGb} GB`}
                    sub={`Tổng: ${h.diskTotalGb} GB · Trống: ${h.diskFreeGb} GB`}
                    percent={h.diskUsedPercent}
                />
                <StatCard
                    icon="bi bi-archive-fill"
                    iconColor="#10b981"
                    label="Tổng số bản sao lưu"
                    value={`${h.totalBackupFiles} files`}
                    sub={`Dung lượng: ${h.totalBackupSizeFormatted}`}
                />
            </div>

            {/* Backup Status Panel */}
            <div className={styles.backupPanel}>
                <div className={styles.backupPanelHeader}>
                    <i className="bi bi-clock-history" />
                    <span>Lịch sử sao lưu gần nhất</span>
                </div>
                <div className={styles.backupPanelBody}>
                    {h.lastBackupFilename ? (
                        <>
                            <div className={styles.backupInfo}>
                                <div className={styles.backupInfoRow}>
                                    <span className={styles.backupInfoLabel}>File</span>
                                    <span className={styles.backupInfoVal}>
                                        <i className="bi bi-file-earmark-zip" /> {h.lastBackupFilename}
                                    </span>
                                </div>
                                <div className={styles.backupInfoRow}>
                                    <span className={styles.backupInfoLabel}>Thời gian</span>
                                    <span className={styles.backupInfoVal}>
                                        <i className="bi bi-calendar-event" /> {h.lastBackupTime}
                                    </span>
                                </div>
                                <div className={styles.backupInfoRow}>
                                    <span className={styles.backupInfoLabel}>Tổng dung lượng</span>
                                    <span className={styles.backupInfoVal}>
                                        <i className="bi bi-hdd" /> {h.totalBackupSizeFormatted}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.noBackup}>
                            <i className="bi bi-database-x" />
                            <p>Chưa có bản sao lưu nào. Hãy tạo bản sao lưu đầu tiên!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DashboardTab;
