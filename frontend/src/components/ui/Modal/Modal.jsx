import { useEffect, useRef } from 'react';
import styles from './Modal.module.css';

/**
 * Generic Modal component.
 * Traps focus, hỗ trợ đóng bằng Escape và click overlay.
 */
function Modal({ isOpen, onClose, children, ariaLabel, ariaLabelledBy, dialogClassName, dialogStyle }) {
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const focusTimer = window.setTimeout(() => {
            const firstFocusable = dialogRef.current?.querySelector(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            );
            (firstFocusable || dialogRef.current)?.focus();
        }, 0);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onCloseRef.current?.();
                return;
            }

            if (event.key !== 'Tab' || !dialogRef.current) return;
            const focusableElements = Array.from(dialogRef.current.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
            ));

            if (focusableElements.length === 0) {
                event.preventDefault();
                dialogRef.current.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="presentation"
        >
            <div
                ref={dialogRef}
                className={`${styles.dialog} ${dialogClassName || ''}`}
                style={dialogStyle}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                tabIndex={-1}
            >
                {children}
            </div>
        </div>
    );
}

export default Modal;
