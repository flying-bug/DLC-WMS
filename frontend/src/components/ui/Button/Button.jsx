import React from 'react';
import styles from './Button.module.css';

/**
 * Reusable Responsive Button Component for WMS
 * Supports variants: primary, draft, post, success, secondary, outline, danger, ghost, icon, excel
 * Supports sizes: sm, md, lg
 * Guarantees minimum 44px touch target on Mobile / Touch screens.
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    icon,
    loading = false,
    disabled = false,
    type = 'button',
    className = '',
    onClick,
    title,
    ...props
}) => {
    const btnClasses = [
        styles.btn,
        styles[variant] || styles.primary,
        styles[size] || styles.md,
        fullWidth ? styles.fullWidth : '',
        loading ? styles.loading : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={btnClasses}
            disabled={disabled || loading}
            onClick={onClick}
            title={title}
            {...props}
        >
            {loading ? (
                <span className={styles.spinner} aria-hidden="true"></span>
            ) : (
                <>
                    {icon && <span className={styles.icon}>{icon}</span>}
                    {children && <span className={styles.label}>{children}</span>}
                </>
            )}
        </button>
    );
};

export default Button;
