import { useEffect, useCallback } from 'react';
import styles from './Modal.module.css';

/**
 * Generic Modal component.
 * Traps focus, hỗ trợ đóng bằng Escape và click overlay.
 */
function Modal({ isOpen, onClose, children, ariaLabel, dialogClassName, dialogStyle }) {
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            <div
                className={`${styles.dialog} ${dialogClassName || ''}`}
                style={dialogStyle}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

export default Modal;
