import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;

export default function RowActionMenu({
  open,
  onToggle,
  buttonClassName,
  menuClassName,
  children,
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visibility: 'hidden' });

  const updatePosition = useCallback(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current.offsetWidth;
    const menuHeight = menuRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openAbove = spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow;
    const unclampedTop = openAbove
      ? triggerRect.top - menuHeight - MENU_GAP
      : triggerRect.bottom + MENU_GAP;
    const top = Math.min(
      window.innerHeight - menuHeight - VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, unclampedTop),
    );
    const left = Math.min(
      window.innerWidth - menuWidth - VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, triggerRect.right - menuWidth),
    );

    setPosition({ top, left, visibility: 'visible' });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    setPosition(current => ({ ...current, visibility: 'hidden' }));
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <div style={{ display: 'inline-block' }} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        Xem <i className="fas fa-chevron-down" style={{ fontSize: '0.65rem' }}></i>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={menuClassName}
          style={position}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
}
