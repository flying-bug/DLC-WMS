import React from 'react';
import styles from './Button.module.css';

/**
 * Reusable Responsive Button Component
 * Supports variants: primary, secondary, outline, danger, ghost, icon
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
    ...props
}) => {
    const btnClasses = [
        styles.btn,
        styles[variant],
        styles[size],
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
            {...props}
        >
            {loading ? (
                <span className={styles.spinner}></span>
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
