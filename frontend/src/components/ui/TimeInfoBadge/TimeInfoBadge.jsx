import React from 'react';
import { DATE_PRESET_OPTIONS } from '../../../utils/datePresets';
import styles from './TimeInfoBadge.module.css';

const TimeInfoBadge = ({ filters, className = '' }) => {
  const getLabel = () => {
    if (!filters) return 'Đầu năm tới hiện tại';
    if (filters.preset && filters.preset !== 'CUSTOM') {
      const opt = DATE_PRESET_OPTIONS.find((o) => o.id === filters.preset);
      if (opt) return opt.label;
    }
    const from = filters.fromDate ? filters.fromDate.split('-').reverse().join('/') : '';
    const to = filters.toDate ? filters.toDate.split('-').reverse().join('/') : '';
    if (from && to) return `${from} – ${to}`;
    if (from) return `Từ ${from}`;
    if (to) return `Đến ${to}`;
    return 'Tất cả thời gian';
  };

  return (
    <span
      className={`${styles.timeBadge} ${className}`}
      title="Khoảng thời gian đang lọc (Thay đổi trong nút Lọc)"
    >
      {getLabel()}
    </span>
  );
};

export default TimeInfoBadge;
