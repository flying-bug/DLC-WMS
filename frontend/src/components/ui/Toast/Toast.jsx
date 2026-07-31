import { useEffect } from 'react';
import styles from './Toast.module.css';

const ICONS = {
    success: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
    ),
    error: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
    ),
    info: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
    ),
    warning: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
};

/**
 * Toast — thông báo nổi góc trên phải.
 * @param {object}   props
 * @param {boolean}  props.isVisible
 * @param {'success'|'error'|'warning'|'info'} props.type
 * @param {string}   props.title
 * @param {string}   props.message
 * @param {number}   props.duration   ms tự động ẩn (default 4000)
 * @param {Function} props.onClose
 */
function Toast({ isVisible = true, type = 'success', title, message, duration = 3000, onClose }) {
    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div
            className={`${styles.toast} ${styles[type]}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <span className={styles.icon}>{ICONS[type]}</span>
            <div className={styles.body}>
                {title && <p className={styles.title}>{title}</p>}
                {message && <p className={styles.message}>{message}</p>}
            </div>
            <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Đóng thông báo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default Toast;
