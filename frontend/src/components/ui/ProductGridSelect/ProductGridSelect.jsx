import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProductGridSelect.module.css';

const ProductGridSelect = ({
  id,
  products = [],
  inventoryMap = new Map(),
  value = '',
  onChange,
  displayMode = 'name', // 'code' | 'name'
  placeholder = 'Chọn hàng',
  disabled = false,
  onAddNew,
  hideStock = false,
  forceInStockOnly = false,
  fullWidthPopover = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const searchInputRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState(null);

  // Get currently selected product object
  const selectedProduct = useMemo(() => {
    if (!value) return null;
    return products.find((p) => String(p.id) === String(value)) || null;
  }, [products, value]);

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

  // Render the dropdown in a portal so table/scroll containers cannot clip it.
  useEffect(() => {
    if (!isOpen) {
      setPopoverPosition(null);
      return undefined;
    }

    const updatePopoverPosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const viewportPadding = 8;
      const popoverWidth = fullWidthPopover
        ? trigger.width
        : Math.min(540, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(viewportPadding, trigger.left),
        window.innerWidth - popoverWidth - viewportPadding,
      );
      const spaceBelow = window.innerHeight - trigger.bottom;
      const openUpwards = spaceBelow < 360 && trigger.top > spaceBelow;

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
  }, [fullWidthPopover, isOpen]);

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

  const handleSelect = (product) => {
    onChange(product);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // Helper to get stock quantity from map or object
  const getStock = (product) => {
    if (!product) return 0;
    const pId = String(product.id);
    if (inventoryMap instanceof Map) {
      return inventoryMap.get(pId) ?? 0;
    }
    if (typeof inventoryMap === 'object' && inventoryMap !== null) {
      return inventoryMap[pId] ?? 0;
    }
    return 0;
  };

  // Filter products based on search query and stock toggle
  const filteredProducts = useMemo(() => {
    let result = products;

    if (forceInStockOnly || onlyInStock) {
      result = result.filter((p) => getStock(p) > 0 || String(p.id) === String(value));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const name = (p.productName || '').toLowerCase();
        const sku = (p.sku || p.productCode || '').toLowerCase();
        const variantName = (p.variantName || '').toLowerCase();
        return name.includes(q) || sku.includes(q) || variantName.includes(q);
      });
    }

    return result;
  }, [products, searchQuery, onlyInStock, forceInStockOnly, inventoryMap, value]);

  // Render display value in trigger box
  const renderValue = () => {
    if (!selectedProduct) {
      return <span className={styles.placeholderText}>{placeholder}</span>;
    }
    const code = selectedProduct.sku || selectedProduct.productCode || `SP#${selectedProduct.id}`;
    const name = selectedProduct.variantName && selectedProduct.variantName !== selectedProduct.productName
      ? `${selectedProduct.productName} - ${selectedProduct.variantName}`
      : selectedProduct.productName;

    if (displayMode === 'code') {
      return <span className={styles.selectedText}>{code}</span>;
    }
    if (displayMode === 'code-name') {
      return <span className={styles.selectedText}>{code} - {name}</span>;
    }
    return <span className={styles.selectedText}>{name}</span>;
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        ref={triggerRef}
        className={`${styles.triggerBox} ${isOpen ? styles.triggerBoxOpen : ''} ${disabled ? styles.disabled : ''}`}
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
          {selectedProduct && !disabled && (
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
            zIndex: 100000,
          }}
        >
          <div className={styles.searchHeader}>
            <i className={`bi bi-search ${styles.searchIcon}`}></i>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Tìm nhanh mã hoặc tên hàng (F3)..."
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
                  <th style={{ width: '130px' }}>Mã hàng</th>
                  <th>Tên hàng</th>
                  {!hideStock && <th style={{ width: '110px', textAlign: 'right' }}>Tồn khả dụng</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const isSelected = String(p.id) === String(value);
                    const stock = getStock(p);
                    const code = p.sku || p.productCode || '';
                    const name = p.variantName && p.variantName !== p.productName
                      ? `${p.productName} - ${p.variantName}`
                      : p.productName;

                    return (
                      <tr
                        key={p.id}
                        className={`${styles.gridRow} ${isSelected ? styles.selectedRow : ''}`}
                        onClick={() => handleSelect(p)}
                      >
                        <td className={styles.codeCell}>{code}</td>
                        <td className={styles.nameCell}>{name}</td>
                        {!hideStock && (
                          <td
                            className={styles.stockCell}
                            style={{
                              textAlign: 'right',
                              fontWeight: '500',
                              color: stock <= 0 ? '#ef4444' : undefined,
                            }}
                          >
                            {stock.toLocaleString('vi-VN')}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={hideStock ? "2" : "3"} className={styles.emptyCell}>
                      Không tìm thấy hàng hóa phù hợp
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.popoverFooter}>
            <div className={styles.footerLeft}>
              {onAddNew && !forceInStockOnly && (
                <button
                  type="button"
                  className={styles.footerActionBtn}
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                >
                  <i className="bi bi-plus"></i> Thêm mới (F9)
                </button>
              )}
              <span className={styles.footerActionBtn} style={{ cursor: 'default' }}>
                <i className="bi bi-search"></i> Tìm nhanh (F3)
              </span>
            </div>

            {!hideStock && !forceInStockOnly && (
              <div className={styles.footerRight}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                  />
                  <span>Chỉ hiển thị hàng hóa còn tồn</span>
                </label>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default ProductGridSelect;
