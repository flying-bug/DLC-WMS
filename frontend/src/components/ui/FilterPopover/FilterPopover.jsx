import React, { useState, useEffect, useRef } from 'react';
import { DATE_PRESET_OPTIONS, getDateRangePreset } from '../../../utils/datePresets';
import styles from './FilterPopover.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const FilterPopover = ({
  filters,
  onApply,
  onReset,
  warehouses = [],
  partners = [],
  staffList = [],
  purposeOptions = [],
  statusOptions = [],
  partnerLabel = 'Khách hàng / Đối tác',
  staffLabel = 'Nhân viên',
  purposeLabel = 'Loại phiếu',
  purposeField = 'issuePurpose',
  showDateRange = true,
  customSelects = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const containerRef = useRef(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetChange = (presetKey) => {
    if (presetKey === 'CUSTOM') {
      setLocalFilters(prev => ({ ...prev, preset: 'CUSTOM' }));
      return;
    }
    const range = getDateRangePreset(presetKey);
    if (range) {
      setLocalFilters(prev => ({
        ...prev,
        preset: presetKey,
        fromDate: range.fromDate,
        toDate: range.toDate,
      }));
    }
  };

  const handleDateChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      preset: 'CUSTOM',
      [field]: value,
    }));
  };

  const handleFieldChange = (field, value) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  // Count active filter criteria
  const activeCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'preset') return false;
    return val !== '' && val !== undefined && val !== null;
  }).length;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={`${styles.triggerBtn} ${activeCount > 0 ? styles.activeTrigger : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <i className="bi bi-funnel"></i>
        <span>Lọc</span>
        <i className={`bi bi-chevron-down ${isOpen ? styles.rotatedChevron : ''}`}></i>
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.popover}>
          <div className={styles.header}>
            <span className={styles.title}>Bộ lọc dữ liệu</span>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} type="button">
              <i className="bi bi-x"></i>
            </button>
          </div>

          <div className={styles.body}>
            {showDateRange && (
              <>
                {/* Field: Quick Date Presets */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>KHOẢNG THỜI GIAN</label>
                  <SearchableSelect
                    className={styles.select}
                    value={localFilters.preset || 'ALL'}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    {DATE_PRESET_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </SearchableSelect>
                </div>

                {/* Date Pickers */}
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>TỪ NGÀY</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={localFilters.fromDate || ''}
                      onChange={(e) => handleDateChange('fromDate', e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>ĐẾN NGÀY</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={localFilters.toDate || ''}
                      onChange={(e) => handleDateChange('toDate', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Purpose & Status */}
            <div className={styles.row}>
              {purposeOptions.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>{purposeLabel.toUpperCase()}</label>
                  <SearchableSelect
                    className={styles.select}
                    value={localFilters[purposeField] || ''}
                    onChange={(e) => handleFieldChange(purposeField, e.target.value)}
                  >
                    <option value="">Tất cả loại phiếu</option>
                    {purposeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </SearchableSelect>
                </div>
              )}

              {statusOptions.length > 0 && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>TRẠNG THÁI</label>
                  <SearchableSelect
                    className={styles.select}
                    value={localFilters.status || ''}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="">Tất cả trạng thái</option>
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </SearchableSelect>
                </div>
              )}
            </div>

            {/* Warehouse */}
            {warehouses.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>KHO HÀNG</label>
                <SearchableSelect
                  className={styles.select}
                  value={localFilters.warehouseId || ''}
                  onChange={(e) => handleFieldChange('warehouseId', e.target.value)}
                >
                  <option value="">Tất cả các kho</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name || wh.code}</option>
                  ))}
                </SearchableSelect>
              </div>
            )}

            {/* Partner */}
            {partners.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>{partnerLabel.toUpperCase()}</label>
                <SearchableSelect
                  className={styles.select}
                  value={localFilters.partnerId || ''}
                  onChange={(e) => handleFieldChange('partnerId', e.target.value)}
                >
                  <option value="">Tất cả đối tác</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name || p.code}</option>
                  ))}
                </SearchableSelect>
              </div>
            )}

            {/* Staff */}
            {staffList.length > 0 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>{staffLabel.toUpperCase()}</label>
                <SearchableSelect
                  className={styles.select}
                  value={localFilters.staffId || ''}
                  onChange={(e) => handleFieldChange('staffId', e.target.value)}
                >
                  <option value="">Tất cả nhân viên</option>
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>{st.fullName || st.username || st.name}</option>
                  ))}
                </SearchableSelect>
              </div>
            )}

            {/* Custom Selects */}
            {customSelects && customSelects.length > 0 && (
              <div className={styles.row}>
                {customSelects.map(sel => (
                  <div className={styles.formGroup} key={sel.name}>
                    <label className={styles.label}>{sel.label.toUpperCase()}</label>
                    <SearchableSelect
                      className={styles.select}
                      value={localFilters[sel.name] || ''}
                      onChange={(e) => handleFieldChange(sel.name, e.target.value)}
                    >
                      <option value="">{sel.defaultOption || `Tất cả ${sel.label.toLowerCase()}`}</option>
                      {sel.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </SearchableSelect>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button className={styles.resetBtn} onClick={handleReset} type="button">
              Đặt lại
            </button>
            <button className={styles.applyBtn} onClick={handleApply} type="button">
              <i className="bi bi-funnel"></i> Lọc
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPopover;
