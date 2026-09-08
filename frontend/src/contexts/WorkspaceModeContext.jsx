import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthRoles } from '../auth/session';

export const WORKSPACE_MODES = {
  ACCOUNTANT: 'ACCOUNTANT',
  WAREHOUSE: 'WAREHOUSE',
  CASHIER: 'CASHIER'
};

const MODE_CONFIGS = {
  ACCOUNTANT: {
    id: 'ACCOUNTANT',
    label: 'Chế độ Kế toán',
    shortLabel: 'Kế toán',
    icon: 'fas fa-calculator',
    desc: ''
  },
  WAREHOUSE: {
    id: 'WAREHOUSE',
    label: 'Chế độ Thủ kho',
    shortLabel: 'Thủ kho',
    icon: 'fas fa-boxes',
    desc: ''
  },
  CASHIER: {
    id: 'CASHIER',
    label: 'Chế độ Thủ quỹ',
    shortLabel: 'Thủ quỹ',
    icon: 'fas fa-cash-register',
    desc: ''
  }
};

const WorkspaceModeContext = createContext(null);

export const WorkspaceModeProvider = ({ children }) => {
  const [workspaceMode, setWorkspaceModeState] = useState(() => {
    const saved = localStorage.getItem('dlc_workspace_mode');
    if (saved && WORKSPACE_MODES[saved]) {
      return saved;
    }
    return WORKSPACE_MODES.ACCOUNTANT;
  });

  // Tự động gán mode phù hợp theo role khi đăng nhập
  useEffect(() => {
    const roles = getAuthRoles().map(r => String(r || '').toUpperCase());
    const isSuperAdminOrManager = roles.some(r =>
      r.includes('ADMIN') || r.includes('SUPER_ADMIN') || r.includes('MANAGER')
    );

    if (!isSuperAdminOrManager) {
      if (roles.some(r => r.includes('WAREHOUSE'))) {
        setWorkspaceModeState(WORKSPACE_MODES.WAREHOUSE);
      } else if (roles.some(r => r.includes('CASHIER'))) {
        setWorkspaceModeState(WORKSPACE_MODES.CASHIER);
      } else if (roles.some(r => r.includes('ACCOUNTANT'))) {
        setWorkspaceModeState(WORKSPACE_MODES.ACCOUNTANT);
      }
    }
  }, []);

  const setWorkspaceMode = (mode) => {
    if (WORKSPACE_MODES[mode]) {
      setWorkspaceModeState(mode);
      localStorage.setItem('dlc_workspace_mode', mode);
    }
  };

  const isAccountantMode = workspaceMode === WORKSPACE_MODES.ACCOUNTANT;
  const isWarehouseMode = workspaceMode === WORKSPACE_MODES.WAREHOUSE;
  const isCashierMode = workspaceMode === WORKSPACE_MODES.CASHIER;

  const currentModeConfig = MODE_CONFIGS[workspaceMode] || MODE_CONFIGS.ACCOUNTANT;

  return (
    <WorkspaceModeContext.Provider
      value={{
        workspaceMode,
        setWorkspaceMode,
        isAccountantMode,
        isWarehouseMode,
        isCashierMode,
        currentModeConfig,
        MODE_CONFIGS,
        WORKSPACE_MODES
      }}
    >
      {children}
    </WorkspaceModeContext.Provider>
  );
};

export const useWorkspaceMode = () => {
  const ctx = useContext(WorkspaceModeContext);
  if (!ctx) {
    throw new Error('useWorkspaceMode must be used within a WorkspaceModeProvider');
  }
  return ctx;
};

export default WorkspaceModeContext;
