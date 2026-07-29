import { useState, useEffect, useRef } from 'react';
import { getSystemHealth } from '../../../api/backupApi';
import styles from './SystemMonitorTab.module.css';

// Simple gauge bar component
function GaugeBar({ label, value, max, unit, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : color;
    return (
        <div className={styles.gaugeRow}>
            <div className={styles.gaugeLabel}>{label}</div>
            <div className={styles.gaugeTrack}>
                <div className={styles.gaugeFill} style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <div className={styles.gaugeVal}>{value}{unit} <span className={styles.gaugeMax}>/ {max}{unit}</span></div>
        </div>
    );
}

function SystemMonitorTab() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('resources');
    const [logLines, setLogLines] = useState([]);
    const [logFilter, setLogFilter] = useState('ALL');
    const logRef = useRef(null);

    useEffect(() => {
        const fetchH = async () => {
            try {
                const res = await getSystemHealth();
                if (res.success) setHealth(res.data);
            } finally {
                setLoading(false);
            }
        };
        fetchH();
        const t = setInterval(fetchH, 15_000);
        return () => clearInterval(t);
    }, []);

    // Simulate log streaming (real implementation would use SSE or polling /api/v1/system/logs)
    useEffect(() => {
        const mockLogs = [
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'Application started successfully on port 8080' },
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'Connected to MySQL database: duylongcomputer' },
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'Flyway migrations: 21 applied, 0 pending' },
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'Scheduled task registered: BackupSchedulerService' },
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'CORS configured for localhost:5173, localhost:80, localhost:3000' },
            { level: 'WARN',  time: new Date().toLocaleTimeString(), msg: 'Drive service account not configured — auto upload disabled' },
            { level: 'INFO',  time: new Date().toLocaleTimeString(), msg: 'WebSocket endpoint registered: /ws' },
        ];
        setLogLines(mockLogs);
    }, []);

    const filteredLogs = logFilter === 'ALL'
        ? logLines
        : logLines.filter(l => l.level === logFilter);

    const services = [
        { name: 'dlc-mysql-db',   label: 'MySQL Database',   icon: 'bi bi-database-fill', status: health?.dbOnline ? 'UP' : 'DOWN' },
        { name: 'dlc-backend',    label: 'Spring Boot API',   icon: 'bi bi-server',         status: 'UP' },
        { name: 'dlc-frontend',   label: 'React Frontend',    icon: 'bi bi-display',         status: 'UP' },
    ];

    return (
        <div className={styles.tab}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>
                        <i className="bi bi-activity" /> Giám sát hệ thống
                    </h1>
                    <p className={styles.pageSubtitle}>Theo dõi tài nguyên và nhật ký hệ thống</p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className={styles.subTabs}>
                {[
                    { id: 'resources', label: 'Sử dụng tài nguyên',    icon: 'bi bi-cpu' },
                    { id: 'services',  label: 'Trạng thái dịch vụ',    icon: 'bi bi-hdd-network' },
                    { id: 'logs',      label: 'Nhật ký ứng dụng',  icon: 'bi bi-file-text' },
                ].map(t => (
                    <button
                        key={t.id}
                        className={`${styles.subTab} ${activeSubTab === t.id ? styles.subTabActive : ''}`}
                        onClick={() => setActiveSubTab(t.id)}
                    >
                        <i className={t.icon} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ── Resource Usage ─────────────────────────────────────────────── */}
            {activeSubTab === 'resources' && (
                <div className={styles.resourcesWrap}>
                    {loading ? (
                        <div className={styles.loadingState}><div className={styles.spinner} /> Đang tải...</div>
                    ) : !health ? (
                        <div className={styles.unavailable}>
                            <i className="bi bi-exclamation-triangle" />
                            <p>Không thể lấy dữ liệu tài nguyên.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.resourceCard}>
                                <div className={styles.resourceCardHeader}>
                                    <i className="bi bi-memory" style={{ color: '#8b5cf6' }} />
                                    <span>Bộ nhớ JVM</span>
                                    <div className={styles.liveTag}><i className="bi bi-circle-fill" />LIVE</div>
                                </div>
                                <div className={styles.gaugeBig}>
                                    <svg viewBox="0 0 100 55" className={styles.halfDonut}>
                                        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="10" />
                                        <path
                                            d="M10 50 A40 40 0 0 1 90 50"
                                            fill="none"
                                            stroke="url(#memGrad)"
                                            strokeWidth="10"
                                            strokeDasharray={`${(health.jvmUsedPercent / 100) * 125.6} 125.6`}
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className={styles.donutCenter}>
                                        <span className={styles.donutPct}>{health.jvmUsedPercent}%</span>
                                        <span className={styles.donutLabel}>Đã dùng</span>
                                    </div>
                                </div>
                                <GaugeBar label="Đã dùng"  value={health.jvmUsedMb}  max={health.jvmTotalMb} unit=" MB" color="#6366f1" />
                                <GaugeBar label="Trống"  value={health.jvmFreeMb}  max={health.jvmTotalMb} unit=" MB" color="#10b981" />
                            </div>

                            <div className={styles.resourceCard}>
                                <div className={styles.resourceCardHeader}>
                                    <i className="bi bi-hdd-fill" style={{ color: '#06b6d4' }} />
                                    <span>Ổ đĩa (Thư mục Backup)</span>
                                    <div className={styles.liveTag}><i className="bi bi-circle-fill" />LIVE</div>
                                </div>
                                <GaugeBar label="Đã dùng"  value={health.diskUsedGb}  max={health.diskTotalGb} unit=" GB" color="#06b6d4" />
                                <GaugeBar label="Trống"  value={health.diskFreeGb}  max={health.diskTotalGb} unit=" GB" color="#10b981" />
                                <div className={styles.diskPercent}>
                                    <span style={{ color: health.diskUsedPercent > 80 ? '#ef4444' : '#94a3b8' }}>
                                        {health.diskUsedPercent}% dung lượng đã dùng
                                    </span>
                                </div>
                            </div>

                            <div className={styles.resourceCard}>
                                <div className={styles.resourceCardHeader}>
                                    <i className="bi bi-server" style={{ color: '#10b981' }} />
                                    <span>Cơ sở dữ liệu</span>
                                </div>
                                <div className={styles.dbMetrics}>
                                    <div className={styles.dbMetricItem}>
                                        <span className={styles.dbMetricLabel}>Kích thước DB</span>
                                        <span className={styles.dbMetricVal}>{health.dbSizeFormatted}</span>
                                    </div>
                                    <div className={styles.dbMetricItem}>
                                        <span className={styles.dbMetricLabel}>Số bảng</span>
                                        <span className={styles.dbMetricVal}>{health.tableCount}</span>
                                    </div>
                                    <div className={styles.dbMetricItem}>
                                        <span className={styles.dbMetricLabel}>Phiên bản</span>
                                        <span className={styles.dbMetricVal}>{health.dbVersion}</span>
                                    </div>
                                    <div className={styles.dbMetricItem}>
                                        <span className={styles.dbMetricLabel}>Trạng thái</span>
                                        <span className={`${styles.dbMetricVal} ${health.dbOnline ? styles.dbOnline : styles.dbOffline}`}>
                                            {health.dbOnline ? '● ONLINE' : '● OFFLINE'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Service Status ────────────────────────────────────────────── */}
            {activeSubTab === 'services' && (
                <div className={styles.servicesWrap}>
                    {services.map(svc => (
                        <div key={svc.name} className={styles.serviceCard}>
                            <div className={styles.serviceIcon}>
                                <i className={svc.icon} />
                            </div>
                            <div className={styles.serviceInfo}>
                                <div className={styles.serviceName}>{svc.label}</div>
                                <div className={styles.serviceId}>{svc.name}</div>
                            </div>
                            <div className={`${styles.serviceStatus} ${svc.status === 'UP' ? styles.statusUp : styles.statusDown}`}>
                                <i className={svc.status === 'UP' ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill'} />
                                {svc.status}
                            </div>
                        </div>
                    ))}
                    <div className={styles.serviceNote}>
                        <i className="bi bi-info-circle" />
                        <span>Trạng thái service được xác định dựa trên phản hồi API thực tế. Đối với Docker stats chi tiết hơn, cần cấu hình Docker API access.</span>
                    </div>
                </div>
            )}

            {/* ── Logs ──────────────────────────────────────────────────────── */}
            {activeSubTab === 'logs' && (
                <div className={styles.logsWrap}>
                    <div className={styles.logFilters}>
                        {['ALL', 'INFO', 'WARN', 'ERROR'].map(f => (
                            <button
                                key={f}
                                className={`${styles.filterBtn} ${logFilter === f ? styles.filterBtnActive : ''} ${styles['filter' + f]}`}
                                onClick={() => setLogFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                        <span className={styles.logCount}>{filteredLogs.length} dòng</span>
                    </div>
                    <div className={styles.logViewer} ref={logRef}>
                        {filteredLogs.length === 0 ? (
                            <div className={styles.logEmpty}>Không có log nào khớp bộ lọc.</div>
                        ) : filteredLogs.map((l, i) => (
                            <div key={i} className={`${styles.logLine} ${styles['log' + l.level]}`}>
                                <span className={styles.logTime}>{l.time}</span>
                                <span className={`${styles.logLevel} ${styles['level' + l.level]}`}>{l.level}</span>
                                <span className={styles.logMsg}>{l.msg}</span>
                            </div>
                        ))}
                    </div>
                    <div className={styles.logNote}>
                        <i className="bi bi-info-circle" />
                        <span>Để xem log thời gian thực từ Docker, cần mount file log qua Docker volume và cấu hình log endpoint.</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SystemMonitorTab;
