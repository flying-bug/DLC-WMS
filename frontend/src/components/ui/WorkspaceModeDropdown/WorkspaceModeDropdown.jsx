import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceMode, WORKSPACE_MODES } from '../../../contexts/WorkspaceModeContext';
import styles from './WorkspaceModeDropdown.module.css';

export default function WorkspaceModeDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { workspaceMode, setWorkspaceMode, currentModeConfig, MODE_CONFIGS, allowedModes } = useWorkspaceMode();
  const selectableModes = Object.values(MODE_CONFIGS).filter(item => allowedModes.includes(item.id));
  const canSwitchMode = selectableModes.length > 1;

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMode = (modeId) => {
    setWorkspaceMode(modeId);
    setIsOpen(false);

    if (modeId === WORKSPACE_MODES.WAREHOUSE) {
      navigate('/warehouse-workspace');
    } else if (modeId === WORKSPACE_MODES.CASHIER) {
      navigate('/cashier-workspace');
    } else {
      navigate('/main-dashboard');
    }
  };

  if (!currentModeConfig || selectableModes.length === 0) {
    return null;
  }

  const triggerContent = (
    <>
      <i className={`fas fa-store ${styles.shopIcon}`}></i>
      <span className={styles.brandName}>Duy Long Computer</span>
      <span className={styles.divider}>|</span>
      <span className={styles.modeBadge}>
        <i className={currentModeConfig.icon}></i>
        {currentModeConfig.shortLabel}
      </span>
    </>
  );

  if (!canSwitchMode) {
    return <div className={`${styles.triggerButton} ${styles.staticTrigger}`}>{triggerContent}</div>;
  }

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        type="button"
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        title="Chuyển đổi chế độ làm việc"
      >
        {triggerContent}
        <i className={`fas fa-chevron-down ${styles.chevron} ${isOpen ? styles.open : ''}`}></i>
      </button>

      {isOpen && canSwitchMode && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Chế độ làm việc</div>
          {selectableModes.map((item) => {
            const isActive = workspaceMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                onClick={() => handleSelectMode(item.id)}
              >
                <div className={styles.itemIconWrapper}>
                  <i className={item.icon}></i>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemLabel}>{item.label}</span>
                    {isActive && <i className={`fas fa-check ${styles.activeCheck}`}></i>}
                  </div>
                  {item.desc ? <span className={styles.itemDesc}>{item.desc}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}
