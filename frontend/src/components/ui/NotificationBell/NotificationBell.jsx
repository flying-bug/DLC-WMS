import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceMode, WORKSPACE_MODES } from '../../../contexts/WorkspaceModeContext';
import { hasPermission, getAuthRoles, NOTIFICATION_EVENT } from '../../../auth/session';
import * as notificationApi from '../../../api/notificationApi';
import * as stocktakeApi from '../../../api/stocktakeApi';
import { playNotificationSound } from '../../../utils/notificationSound';
import styles from './NotificationBell.module.css';
import { formatDateTime } from '../../../utils/dateFormat';

export default function NotificationBell() {
    const navigate = useNavigate();
    const { mode } = useWorkspaceMode();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);
    // Yêu cầu kiểm kê chờ duyệt: chỉ Manager / Super Admin thấy nút Đồng ý - Từ chối
    const canDecideStocktake = getAuthRoles().some(r => ['ROLE_MANAGER', 'ROLE_SUPER_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(String(r || '').toUpperCase()));
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [actionBusyId, setActionBusyId] = useState(null);
    const [actionResults, setActionResults] = useState({}); // id -> { ok, text }

    const fetchUnreadCount = async () => {
        try {
            const res = await notificationApi.getUnreadCount();
            const count = res?.data?.data?.unreadCount || res?.data?.unreadCount || 0;
            setUnreadCount(Number(count));
        } catch {
            // ignore
        }
    };

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationApi.getMyNotifications();
            const list = res?.data?.data || res?.data || [];
            setNotifications(list);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
    }, []);

    useEffect(() => {
        const handleRealtimeNotification = (event) => {
            const notif = event.detail;
            if (!notif) return;
            playNotificationSound();
            setUnreadCount(prev => prev + 1);
            setNotifications(prev => {
                if (prev.some(n => n.id === notif.id)) return prev;
                return [notif, ...prev];
            });
        };
        window.addEventListener(NOTIFICATION_EVENT, handleRealtimeNotification);
        return () => window.removeEventListener(NOTIFICATION_EVENT, handleRealtimeNotification);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => {
        if (!isOpen) {
            fetchNotifications();
            fetchUnreadCount();
        }
        setIsOpen(prev => !prev);
    };

    const handleItemClick = async (notif) => {
        if (!notif.isRead) {
            try {
                await notificationApi.markAsRead(notif.id);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch {
                // ignore
            }
        }
        setIsOpen(false);

        // Bàn làm việc Thủ kho giờ chỉ mở được cho ai có import:post/export:post
        // (xem AppRouter.jsx) - vai trò khác (Kế toán, Kỹ thuật viên...) bấm vào
        // thông báo phiếu nhập/xuất phải được đưa tới màn hình họ THỰC SỰ có
        // quyền vào (trang sửa phiếu nếu có import:edit/export:edit, hoặc lịch
        // sử phiếu nếu chỉ có quyền xem), thay vì luôn trỏ cứng vào workspace.
        let targetLink = notif.link;
        if (notif.referenceType === 'IMPORT_DOCUMENT' || targetLink?.includes('/import-slips/') || targetLink?.includes('/imports/')) {
            const docId = notif.referenceId || (targetLink ? targetLink.match(/\d+/)?.[0] : '');
            if (hasPermission(['import:post', 'export:post'])) {
                targetLink = `/warehouse-workspace/imports/${docId}`;
            } else if (hasPermission('import:edit') && docId) {
                targetLink = `/import-slips/${docId}/edit`;
            } else {
                targetLink = '/import-history';
            }
        } else if (notif.referenceType === 'EXPORT_DOCUMENT' || targetLink?.includes('/export-slips/') || targetLink?.includes('/exports/')) {
            const docId = notif.referenceId || (targetLink ? targetLink.match(/\d+/)?.[0] : '');
            if (hasPermission(['import:post', 'export:post'])) {
                targetLink = `/warehouse-workspace/exports/${docId}`;
            } else if (hasPermission('export:edit') && docId) {
                targetLink = `/export-slips/${docId}/edit`;
            } else {
                targetLink = '/export-slips';
            }
        } else if ((notif.referenceType === 'PO_DELIVERY_OVERDUE' || notif.referenceType === 'PO_PAYMENT_OVERDUE' || notif.referenceType === 'PURCHASE_ORDER') && notif.referenceId) {
            targetLink = `/purchase-orders/${notif.referenceId}`;
        }

        if (targetLink) {
            navigate(targetLink);
        }
    };

    const finishStocktakeAction = (notif, ok, text) => {
        setActionResults(prev => ({ ...prev, [notif.id]: { ok, text } }));
        if (ok) {
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, type: 'STOCKTAKE_DECIDED', isRead: true } : n));
        }
    };

    const handleApproveStocktake = async (e, notif) => {
        e.stopPropagation();
        setActionBusyId(notif.id);
        try {
            await stocktakeApi.approveStocktake(notif.referenceId);
            finishStocktakeAction(notif, true, 'Đã đồng ý. Kho đang được khóa để kiểm kê.');
        } catch (err) {
            finishStocktakeAction(notif, false, err.response?.data?.userMessage || 'Không thể duyệt phiếu kiểm kê');
        } finally {
            setActionBusyId(null);
        }
    };

    const handleConfirmReject = async (e, notif) => {
        e.stopPropagation();
        if (!rejectReason.trim()) {
            setActionResults(prev => ({ ...prev, [notif.id]: { ok: false, text: 'Vui lòng nhập lý do từ chối' } }));
            return;
        }
        setActionBusyId(notif.id);
        try {
            await stocktakeApi.rejectStocktake(notif.referenceId, rejectReason.trim());
            setRejectingId(null);
            setRejectReason('');
            finishStocktakeAction(notif, true, 'Đã từ chối phiếu kiểm kê.');
        } catch (err) {
            finishStocktakeAction(notif, false, err.response?.data?.userMessage || 'Không thể từ chối phiếu kiểm kê');
        } finally {
            setActionBusyId(null);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch {
            // ignore
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            return formatDateTime(timeStr, { withSeconds: false });
        } catch {
            return timeStr;
        }
    };

    return (
        <div className={styles.bellContainer} ref={containerRef}>
            <button
                type="button"
                className={styles.bellButton}
                onClick={toggleOpen}
                title="Thông báo hệ thống"
            >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <div className={styles.headerTitle}>
                            <i className="bi bi-bell-fill" style={{ color: 'var(--color-info-hover)' }}></i>
                            <span>Thông báo</span>
                            {unreadCount > 0 && (
                                <span style={{ fontSize: 11, background: '#fee2e2', color: 'var(--wms-danger)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        {notifications.some(n => !n.isRead) && (
                            <button
                                type="button"
                                className={styles.markAllBtn}
                                onClick={handleMarkAllAsRead}
                            >
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    <div className={styles.notifList}>
                        {loading ? (
                            <div className={styles.emptyState}>Đang tải thông báo...</div>
                        ) : notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <i className="bi bi-check2-circle" style={{ fontSize: 24, display: 'block', marginBottom: 6, color: 'var(--color-success-alt)' }}></i>
                                Chưa có thông báo mới
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`${styles.notifItem} ${!n.isRead ? styles.unread : ''}`}
                                    onClick={() => handleItemClick(n)}
                                >
                                    <div className={`${styles.iconCol} ${n.type === 'DISCREPANCY' ? styles.discrepancy : ''}`}>
                                        <i className={n.type === 'DISCREPANCY' ? 'bi bi-exclamation-triangle-fill' : 'bi bi-info-circle-fill'}></i>
                                    </div>
                                    <div className={styles.contentCol}>
                                        <div className={styles.itemTitle}>{n.title}</div>
                                        <div className={styles.itemMessage}>{n.message}</div>
                                        {n.type === 'STOCKTAKE_APPROVAL' && canDecideStocktake && (
                                            <div className={styles.actionBox} onClick={(e) => e.stopPropagation()}>
                                                {rejectingId === n.id ? (
                                                    <>
                                                        <textarea
                                                            className={styles.reasonInput}
                                                            rows={2}
                                                            maxLength={500}
                                                            placeholder="Lý do từ chối..."
                                                            value={rejectReason}
                                                            onChange={(e) => setRejectReason(e.target.value)}
                                                        />
                                                        <div className={styles.actionRow}>
                                                            <button type="button" className={styles.btnReject} disabled={actionBusyId === n.id} onClick={(e) => handleConfirmReject(e, n)}>Xác nhận từ chối</button>
                                                            <button type="button" className={styles.btnGhost} onClick={(e) => { e.stopPropagation(); setRejectingId(null); setRejectReason(''); }}>Hủy</button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className={styles.actionRow}>
                                                        <button type="button" className={styles.btnApprove} disabled={actionBusyId === n.id} onClick={(e) => handleApproveStocktake(e, n)}>Đồng ý</button>
                                                        <button type="button" className={styles.btnReject} disabled={actionBusyId === n.id} onClick={(e) => { e.stopPropagation(); setRejectingId(n.id); setRejectReason(''); }}>Từ chối</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {actionResults[n.id] && (
                                            <div className={actionResults[n.id].ok ? styles.actionOk : styles.actionErr}>{actionResults[n.id].text}</div>
                                        )}
                                        <div className={styles.itemTime}>{formatTime(n.createdAt)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
