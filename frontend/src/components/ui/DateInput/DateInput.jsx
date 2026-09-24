import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDateOnly, maskDateText, parseDisplayDate } from '../../../utils/dateFormat';

// Icon lịch vẽ ngay trong ô nhập (không thêm phần tử bọc để giữ nguyên bố cục của className gốc).
const CALENDAR_ICON = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='%236b7280' stroke-width='1.4' stroke-linecap='round'><rect x='2' y='3' width='12' height='11' rx='1.5'/><path d='M2 6.5h12M5 1.5v3M11 1.5v3'/></svg>\")";
const ICON_HIT_WIDTH = 34;

const toIsoValue = (value) => {
  const text = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
};

/**
 * Ô ngày luôn hiển thị và nhập theo dd/mm/yyyy, không phụ thuộc ngôn ngữ của trình duyệt/hệ điều hành
 * (ô <input type="date"> gốc hiện mm/dd/yyyy trên máy tiếng Anh).
 *
 * Dùng thay thẳng cho <input type="date">: value là chuỗi ISO "yyyy-mm-dd" và onChange nhận
 * { target: { name, id, value } } với value cũng là "yyyy-mm-dd" (chuỗi rỗng khi chưa nhập đủ/không hợp lệ).
 * Bấm biểu tượng lịch bên phải để chọn ngày bằng lịch của trình duyệt.
 */
export default function DateInput({
  value,
  onChange,
  name,
  id,
  className,
  style,
  min,
  max,
  disabled,
  readOnly,
  placeholder = 'dd/mm/yyyy',
  onBlur,
  ...rest
}) {
  const textRef = useRef(null);
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const shown = draft ?? formatDateOnly(toIsoValue(value));

  const syncPickerPosition = useCallback(() => {
    const picker = pickerRef.current;
    const text = textRef.current;
    if (!picker || !text) return;

    const rect = text.getBoundingClientRect();
    Object.assign(picker.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }, []);

  useLayoutEffect(() => {
    syncPickerPosition();
    window.addEventListener('resize', syncPickerPosition);
    window.addEventListener('scroll', syncPickerPosition, true);

    return () => {
      window.removeEventListener('resize', syncPickerPosition);
      window.removeEventListener('scroll', syncPickerPosition, true);
    };
  }, [syncPickerPosition]);

  const emit = (isoValue) => {
    if (!onChange) return;
    const target = { name, id, value: isoValue, type: 'date' };
    onChange({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
  };

  const handleText = (event) => {
    const masked = maskDateText(event.target.value);
    setDraft(masked);
    const iso = parseDisplayDate(masked);
    if (iso) {
      emit(iso);
    } else if (toIsoValue(value)) {
      emit('');
    }
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker || !textRef.current) return;
    syncPickerPosition();
    // Buộc trình duyệt áp dụng vị trí mới trước khi mở lịch native lần đầu.
    picker.getBoundingClientRect();
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else {
      picker.focus();
      picker.click();
    }
  };

  const handleMouseDown = (event) => {
    if (disabled || readOnly) return;
    const nativeEvent = event.nativeEvent;
    if (nativeEvent.offsetX > event.currentTarget.offsetWidth - ICON_HIT_WIDTH) {
      event.preventDefault();
      openPicker();
    }
  };

  return (
    <>
      <input
        {...rest}
        ref={textRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        className={className}
        placeholder={placeholder}
        value={shown}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleText}
        onBlur={(event) => {
          setDraft(null);
          onBlur?.(event);
        }}
        onMouseDown={handleMouseDown}
        style={{
          ...style,
          backgroundImage: CALENDAR_ICON,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '16px 16px',
          paddingRight: '34px',
        }}
      />
      {typeof document !== 'undefined' && createPortal(
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={toIsoValue(value)}
          min={min}
          max={max}
          disabled={disabled || readOnly}
          onChange={(event) => emit(event.target.value)}
          style={{ position: 'fixed', left: 0, top: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />,
        document.body
      )}
    </>
  );
}
