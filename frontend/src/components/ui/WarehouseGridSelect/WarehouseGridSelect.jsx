import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './WarehouseGridSelect.module.css';

const WarehouseGridSelect = ({
  id,
  warehouses = [],
  value = '',
  onChange,
  displayMode = 'code', // 'code' | 'name' | 'code-name'
  placeholder = 'Chọn kho',
  disabled = false,
  hasWarning = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState(null);

  // Get currently selected warehouse object
  const selectedWarehouse = useMemo(() => {
    if (!value) return null;
    return warehouses.find((w) => String(w.id) === String(value)) || null;
  }, [warehouses, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedTrigger = containerRef.current?.contains(event.target);
      const clickedPopover = popoverRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPopover) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calculate popover position
  useEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
      return undefined;
    }

    const updatePopoverPosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const viewportPadding = 8;
      const popoverWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, trigger.left),
        window.innerWidth - popoverWidth - viewportPadding,
      );
      const spaceBelow = window.innerHeight - trigger.bottom;
      const openUpwards = spaceBelow < 280 && trigger.top > spaceBelow;

      setPopoverPosition({
        top: openUpwards ? trigger.top - 4 : trigger.bottom + 4,
        left,
        width: popoverWidth,
        transform: openUpwards ? 'translateY(-100%)' : undefined,
      });
    };

    updatePopoverPosition();
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [isOpen]);

  // Auto focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');
  };

  const handleSelect = (wh) => {
    onChange(wh?.id || null);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // Filter warehouses based on search query
  const filteredWarehouses = useMemo(() => {
    if (!searchQuery.trim()) return warehouses;
    const q = searchQuery.toLowerCase().trim();
    return warehouses.filter((w) => {
      const code = (w.code || '').toLowerCase();
      const name = (w.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [warehouses, searchQuery]);

  // Render display value in trigger box
  const renderValue = () => {
    if (!selectedWarehouse) {
      return <span className={styles.placeholderText}>{placeholder}</span>;
    }
    const code = selectedWarehouse.code || `KHO#${selectedWarehouse.id}`;
    const name = selectedWarehouse.name || '';

    if (displayMode === 'code') {
      return <span className={styles.selectedText}>{code}</span>;
    }
    if (displayMode === 'code-name') {
      return <span className={styles.selectedText}>{code} — {name}</span>;
    }
    return <span className={styles.selectedText}>{name}</span>;
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        ref={triggerRef}
        className={`${styles.triggerBox} ${isOpen ? styles.triggerBoxOpen : ''} ${hasWarning && !value ? styles.warningBorder : ''} ${disabled ? styles.disabled : ''}`}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isOpen) {
            e.preventDefault();
            handleOpen();
          }
        }}
      >
        <div className={styles.valueContainer}>
          {renderValue()}
        </div>
        <div className={styles.iconContainer}>
          {selectedWarehouse && !disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              title="Xóa lựa chọn"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
          <i className={`bi bi-chevron-down ${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}></i>
        </div>
      </div>

      {isOpen && popoverPosition && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{
            position: 'fixed',
            top: popoverPosition.top,
            left: popoverPosition.left,
            width: popoverPosition.width,
            maxWidth: 'calc(100vw - 16px)',
            transform: popoverPosition.transform,
          }}
        >
          <div className={styles.searchHeader}>
            <i className={`bi bi-search ${styles.searchIcon}`}></i>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Tìm nhanh mã hoặc tên kho (F3)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
              }}
            />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.gridTable}>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Mã kho</th>
                  <th>Tên kho</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.length > 0 ? (
                  filteredWarehouses.map((w) => {
                    const isSelected = String(w.id) === String(value);
                    const code = w.code || '';
                    const name = w.name || '';

                    return (
                      <tr
                        key={w.id}
                        className={`${styles.gridRow} ${isSelected ? styles.selectedRow : ''}`}
                        onClick={() => handleSelect(w)}
                      >
                        <td className={styles.codeCell}>{code}</td>
                        <td className={styles.nameCell}>{name}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="2" className={styles.emptyCell}>
                      Không tìm thấy kho phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.popoverFooter}>
            <span>Tổng số: <strong>{filteredWarehouses.length}</strong> kho</span>
            <span style={{ fontStyle: 'italic' }}>Nhấn để chọn</span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default WarehouseGridSelect;
