export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const pad = (value) => String(value).padStart(2, '0');

const partsFromDate = (value) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});

  return parts;
};

const parseDateOnlyParts = (value) => {
  if (Array.isArray(value) && value.length >= 3) {
    return { year: value[0], month: value[1], day: value[2] };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return partsFromDate(value);
  }

  const text = String(value ?? '').trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const hasExplicitTimeZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text);
  if (isoDate && !hasExplicitTimeZone) {
    return { year: isoDate[1], month: isoDate[2], day: isoDate[3] };
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : partsFromDate(date);
};

export const getTodayIsoDate = () => {
  const parts = partsFromDate(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getCurrentDateTimeInput = () => {
  const parts = partsFromDate(new Date());
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const toDateTimeInputValue = (value) => {
  if (!value) return '';
  const text = String(value).trim();
  const localDateTime = text.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (localDateTime && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) return localDateTime[1];

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = partsFromDate(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const formatDateOnly = (value) => {
  if (!value) return '';
  const parts = parseDateOnlyParts(value);
  if (!parts) return String(value);
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
};

export const formatDateTime = (value, options = {}) => {
  if (!value) return '';

  const text = String(value).trim();
  const localDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (localDateTime && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)) {
    const [, year, month, day, hour, minute, second = '00'] = localDateTime;
    return `${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = partsFromDate(date);
  const seconds = options.withSeconds === false ? '' : `:${pad(parts.second)}`;
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}${seconds}`;
};

export const formatTime = (value = new Date(), options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = partsFromDate(date);
  const seconds = options.withSeconds ? `:${pad(parts.second)}` : '';
  return `${pad(parts.hour)}:${pad(parts.minute)}${seconds}`;
};

export const getVietnamTimestamp = (value = new Date()) => {
  const datePart = formatDateOnly(value).split('/').reverse().join('');
  const timePart = formatTime(value, { withSeconds: true }).replace(/:/g, '');
  return `${datePart}_${timePart}`;
};
