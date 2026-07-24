import React, { useEffect } from 'react';
import styles from './Drawer.module.css';

/**
 * Reusable Responsive Drawer Component
 * Desktop: Right side panel
 * Tablet: Compact right side panel
 * Mobile: Full Screen / Full width overlay
 */
const Drawer = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    width = '420px',
    className = ''
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.drawer} ${className}`}
                style={{ '--drawer-width': width }}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className={styles.header}>
                        <h3 className={styles.title}>{title}</h3>
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Đóng"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}
                <div className={styles.body}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
};

export default Drawer;
