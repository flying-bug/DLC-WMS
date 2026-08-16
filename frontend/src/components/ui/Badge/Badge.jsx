import React from 'react';
import styles from './Badge.module.css';

/**
 * Standard WMS Badge Component
 * @param {string} variant - Status semantic: 'success' | 'warning' | 'danger' | 'info' | 'draft' | 'posted' | 'pending' | 'active' | 'inactive' | 'cancelled' | 'neutral'
 * @param {'soft' | 'solid' | 'outline'} type - Visual appearance (default 'soft')
 * @param {'sm' | 'md'} size - Size variant (default 'md')
 * @param {boolean} dot - Show status dot indicator
 * @param {boolean} pulse - Add pulsing animation to dot
 * @param {string} className - Optional custom class
 */
const Badge = ({
    children,
    variant = 'neutral',
    type = 'soft',
    size = 'md',
    dot = false,
    pulse = false,
    className = '',
    ...props
}) => {
    // Map aliases to base styles
    const normalizedVariant = (() => {
        switch (variant?.toLowerCase()) {
            case 'approved':
            case 'posted':
            case 'completed':
            case 'active':
            case 'success':
                return 'success';
            case 'draft':
            case 'pending':
            case 'warning':
                return 'warning';
            case 'cancelled':
            case 'inactive':
            case 'rejected':
            case 'danger':
                return 'danger';
            case 'processing':
            case 'info':
                return 'info';
            case 'neutral':
            default:
                return 'neutral';
        }
    })();

    const badgeClasses = [
        styles.badge,
        styles[normalizedVariant],
        styles[type],
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return (
        <span className={badgeClasses} {...props}>
            {dot && (
                <span
                    className={`${styles.dot} ${pulse ? styles.pulse : ''}`}
                    aria-hidden="true"
                />
            )}
            <span className={styles.text}>{children}</span>
        </span>
    );
};

export default Badge;
