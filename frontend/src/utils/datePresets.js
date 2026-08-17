import { getTodayIsoDate } from './dateFormat';

/** Date range preset utilities using Vietnam calendar dates. */

export const DATE_PRESET_OPTIONS = [
  { id: 'THIS_YEAR', label: 'Năm nay' },
  { id: 'THIS_QUARTER', label: 'Quý này' },
  { id: 'THIS_MONTH', label: 'Tháng này' },
  { id: 'LAST_MONTH', label: 'Tháng trước' },
  { id: 'LAST_QUARTER', label: 'Quý trước' },
  { id: 'LAST_YEAR', label: 'Năm trước' },
  { id: 'TODAY', label: 'Hôm nay' },
  { id: 'THIS_WEEK', label: 'Tuần này' },
  { id: 'CUSTOM', label: 'Tùy chọn' },
  { id: 'ALL', label: 'Tất cả thời gian' },
];

const formatIsoDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getDateRangePreset = (presetKey) => {
  // Use the Vietnam calendar date before doing calendar arithmetic. This keeps
  // filters correct even when the browser is configured for another timezone.
  const now = new Date(`${getTodayIsoDate()}T12:00:00`);
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (presetKey) {
    case 'TODAY': {
      const todayStr = formatIsoDate(now);
      return { fromDate: todayStr, toDate: todayStr };
    }
    case 'THIS_WEEK': {
      const dayOfWeek = now.getDay() || 7; // 1 = Mon, 7 = Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { fromDate: formatIsoDate(monday), toDate: formatIsoDate(sunday) };
    }
    case 'THIS_MONTH': {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'LAST_MONTH': {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'THIS_QUARTER': {
      const quarterIndex = Math.floor(month / 3);
      const firstDay = new Date(year, quarterIndex * 3, 1);
      const lastDay = new Date(year, (quarterIndex + 1) * 3, 0);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'LAST_QUARTER': {
      const quarterIndex = Math.floor(month / 3);
      const firstDay = new Date(year, (quarterIndex - 1) * 3, 1);
      const lastDay = new Date(year, quarterIndex * 3, 0);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'THIS_YEAR': {
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'LAST_YEAR': {
      const firstDay = new Date(year - 1, 0, 1);
      const lastDay = new Date(year - 1, 11, 31);
      return { fromDate: formatIsoDate(firstDay), toDate: formatIsoDate(lastDay) };
    }
    case 'ALL':
      return { fromDate: '', toDate: '' };
    case 'CUSTOM':
    default:
      return null;
  }
};
