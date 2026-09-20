import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_EVENT, USER_EVENT, getAuthPermissions, getAuthRoles, getAuthUserId } from '../auth/session';

// eslint-disable-next-line react-refresh/only-export-components
export const WORKSPACE_MODES = {
  ACCOUNTANT: 'ACCOUNTANT',
  WAREHOUSE: 'WAREHOUSE',
  CASHIER: 'CASHIER'
};

const MODE_ROLE_GATES = {
  ACCOUNTANT: ['ROLE_ACCOUNTANT', 'ACCOUNTANT'],
  WAREHOUSE: ['ROLE_WAREHOUSE_CONTROLLER', 'WAREHOUSE_CONTROLLER'],
  CASHIER: ['ROLE_CASHIER_CONTROLLER', 'CASHIER_CONTROLLER']
};

const MANAGER_MODE_PERMISSION_GATES = {
  WAREHOUSE: ['import:view', 'export:view', 'transfer:view', 'stocktake:view'],
  CASHIER: ['payment:view']
};

function isManager(roles) {
  return roles.some(role => role === 'ROLE_MANAGER' || role === 'MANAGER');
}

function isModeAllowed(mode, roles, permissions) {
  if (isManager(roles)) {
    if (mode === WORKSPACE_MODES.ACCOUNTANT) return true;
    const requiredPermissions = MANAGER_MODE_PERMISSION_GATES[mode];
    return requiredPermissions
      ? requiredPermissions.every(permission => permissions.includes(permission))
      : false;
  }
  return (MODE_ROLE_GATES[mode] || []).some(role => roles.includes(role));
}

const BASE_MODE_CONFIGS = {
  ACCOUNTANT: {
    id: 'ACCOUNTANT',
    label: 'Chế độ Kế toán',
    shortLabel: 'Kế toán',
    icon: 'bi bi-calculator',
    desc: ''
  },
  WAREHOUSE: {
    id: 'WAREHOUSE',
    label: 'Chế độ Thủ kho',
    shortLabel: 'Thủ kho',
    icon: 'bi bi-boxes',
    desc: ''
  },
  CASHIER: {
    id: 'CASHIER',
    label: 'Chế độ Thủ quỹ',
    shortLabel: 'Thủ quỹ',
    icon: 'bi bi-cash-stack',
    desc: ''
  }
};

const WorkspaceModeContext = createContext(null);

function readAuthSnapshot() {
  return {
    roles: getAuthRoles().map(role => String(role || '').toUpperCase()),
    permissions: getAuthPermissions(),
    userId: getAuthUserId()
  };
}

function resolveInitialMode(roles, allowedModes, storageKey) {
  const saved = storageKey ? localStorage.getItem(storageKey) : null;
  if (saved && WORKSPACE_MODES[saved] && allowedModes.includes(saved)) return saved;
  if (isManager(roles)) return WORKSPACE_MODES.ACCOUNTANT;
  if (roles.some(role => role.includes('WAREHOUSE')) && allowedModes.includes(WORKSPACE_MODES.WAREHOUSE)) return WORKSPACE_MODES.WAREHOUSE;
  if (roles.some(role => role.includes('CASHIER')) && allowedModes.includes(WORKSPACE_MODES.CASHIER)) return WORKSPACE_MODES.CASHIER;
  return allowedModes[0] || null;
}

export const WorkspaceModeProvider = ({ children }) => {
  const [authSnapshot, setAuthSnapshot] = useState(readAuthSnapshot);
  const { roles, permissions, userId } = authSnapshot;

  useEffect(() => {
    const syncAuth = () => setAuthSnapshot(readAuthSnapshot());
    window.addEventListener(AUTH_EVENT, syncAuth);
    window.addEventListener(USER_EVENT, syncAuth);
    return () => {
      window.removeEventListener(AUTH_EVENT, syncAuth);
      window.removeEventListener(USER_EVENT, syncAuth);
    };
  }, []);

  // Chế độ làm việc là persona được giao bằng role, không được suy diễn từ các
  // permission giao thoa giữa phòng ban. Riêng Manager được mở workspace theo
  // các gói quyền thực tế để có thể điều hành và kiêm nhiệm khi cần.
  const allowedModes = useMemo(
    () => Object.keys(WORKSPACE_MODES).filter(mode => isModeAllowed(mode, roles, permissions)),
    [roles, permissions]
  );

  const storageKey = userId ? `dlc_workspace_mode_${userId}` : null;
  const [workspaceMode, setWorkspaceModeState] = useState(() => {
    return resolveInitialMode(roles, allowedModes, storageKey);
  });

  useEffect(() => {
    setWorkspaceModeState(currentMode => allowedModes.includes(currentMode)
      ? currentMode
      : resolveInitialMode(roles, allowedModes, storageKey));
  }, [allowedModes, roles, storageKey]);

  const setWorkspaceMode = (mode) => {
    if (WORKSPACE_MODES[mode] && allowedModes.includes(mode)) {
      setWorkspaceModeState(mode);
      if (storageKey) localStorage.setItem(storageKey, mode);
    }
  };

  const isAccountantMode = workspaceMode === WORKSPACE_MODES.ACCOUNTANT;
  const isWarehouseMode = workspaceMode === WORKSPACE_MODES.WAREHOUSE;
  const isCashierMode = workspaceMode === WORKSPACE_MODES.CASHIER;

  const modeConfigs = BASE_MODE_CONFIGS;

  const currentModeConfig = workspaceMode ? modeConfigs[workspaceMode] : null;

  return (
    <WorkspaceModeContext.Provider
      value={{
        workspaceMode,
        setWorkspaceMode,
        allowedModes,
        isAccountantMode,
        isWarehouseMode,
        isCashierMode,
        currentModeConfig,
        MODE_CONFIGS: modeConfigs,
        WORKSPACE_MODES
      }}
    >
      {children}
    </WorkspaceModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceMode = () => {
  const ctx = useContext(WorkspaceModeContext);
  if (!ctx) {
    throw new Error('useWorkspaceMode must be used within a WorkspaceModeProvider');
  }
  return ctx;
};

export default WorkspaceModeContext;
