import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as notificationApi from '../../../api/notificationApi';
import styles from './NotificationBell.module.css';

export default function NotificationBell() {
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

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
        const interval = setInterval(fetchUnreadCount, 30000); // 30s poll
        return () => clearInterval(interval);
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
        if (notif.link) {
            navigate(notif.link);
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
            const date = new Date(timeStr);
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' +
                date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                            <i className="bi bi-bell-fill" style={{ color: '#0284c7' }}></i>
                            <span>Thông báo</span>
                            {unreadCount > 0 && (
                                <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
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
                                <i className="bi bi-check2-circle" style={{ fontSize: 24, display: 'block', marginBottom: 6, color: '#10b981' }}></i>
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
