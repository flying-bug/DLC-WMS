import React from 'react';
import styles from './Card.module.css';

/**
 * Reusable Card & StatisticCard Components
 */
export const Card = ({
    children,
    title,
    extra,
    className = '',
    padding = 'normal',
    noBorder = false,
    ...props
}) => {
    return (
        <div
            className={`
                ${styles.card}
                ${styles[padding]}
                ${noBorder ? styles.noBorder : ''}
                ${className}
            `}
            {...props}
        >
            {(title || extra) && (
                <div className={styles.cardHeader}>
                    {title && <h3 className={styles.cardTitle}>{title}</h3>}
                    {extra && <div className={styles.cardExtra}>{extra}</div>}
                </div>
            )}
            <div className={styles.cardBody}>{children}</div>
        </div>
    );
};

export const StatisticCard = ({
    title,
    value,
    icon,
    trend,
    color = 'primary',
    subtitle,
    className = ''
}) => {
    return (
        <Card className={`${styles.statCard} ${styles[`color_${color}`]} ${className}`}>
            <div className={styles.statContent}>
                <div className={styles.statInfo}>
                    <span className={styles.statTitle}>{title}</span>
                    <span className={styles.statValue}>{value}</span>
                    {subtitle && <span className={styles.statSubtitle}>{subtitle}</span>}
                </div>
                {icon && (
                    <div className={styles.statIconWrapper}>
                        {typeof icon === 'string' ? <i className={icon}></i> : icon}
                    </div>
                )}
            </div>
            {trend && (
                <div className={`${styles.statTrend} ${trend.type === 'up' ? styles.trendUp : styles.trendDown}`}>
                    <i className={`fas fa-arrow-${trend.type === 'up' ? 'up' : 'down'}`}></i>
                    <span>{trend.value}</span>
                </div>
            )}
        </Card>
    );
};

export default Card;
