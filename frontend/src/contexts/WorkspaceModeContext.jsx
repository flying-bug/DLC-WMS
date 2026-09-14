import React, { createContext, useContext, useState, useMemo } from 'react';
import { getAuthRoles, hasAnyModulePermission } from '../auth/session';

// eslint-disable-next-line react-refresh/only-export-components
export const WORKSPACE_MODES = {
  ACCOUNTANT: 'ACCOUNTANT',
  WAREHOUSE: 'WAREHOUSE',
  CASHIER: 'CASHIER'
};

// Module nào (theo đúng quy ước "module:action" đã dùng khắp app) chứng tỏ user
// thật sự có nghiệp vụ thuộc persona đó. Chỉ cần có quyền view trên 1 module trong
// danh sách là đủ, khớp với cách AdminLayout đang lọc menu sidebar - tránh 1 quy tắc
// nghiêm ngặt riêng gây lệch với phần còn lại của app. Manager/Super Admin luôn pass
// vì hasAnyModulePermission() đã tự return true cho 2 role đó.
const MODE_MODULE_GATES = {
  ACCOUNTANT: ['sales_order', 'purchase_order', 'einvoice', 'customer', 'supplier'],
  WAREHOUSE: ['import', 'export', 'transfer', 'stocktake'],
  CASHIER: ['payment']
};

function isModeAllowed(mode) {
  return (MODE_MODULE_GATES[mode] || []).some(module => hasAnyModulePermission(module));
}

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
  // Chỉ những mode user thật sự có quyền nghiệp vụ mới được phép chọn/hiển thị -
  // trước đây dropdown hiện cả 3 mode cho mọi role, nên 1 tài khoản Thủ kho có thể
  // tự chuyển sang "Chế độ Thủ quỹ" và bị AdminLayout thu hẹp sidebar chỉ còn
  // finance/partner, ẩn mất toàn bộ menu Kho mà họ vẫn có quyền thật.
  const allowedModes = useMemo(
    () => Object.keys(WORKSPACE_MODES).filter(isModeAllowed),
    []
  );

  const [workspaceMode, setWorkspaceModeState] = useState(() => {
    const saved = localStorage.getItem('dlc_workspace_mode');
    if (saved && WORKSPACE_MODES[saved] && allowedModes.includes(saved)) {
      return saved;
    }

    // Gợi ý mode mặc định theo tên role, nhưng vẫn phải nằm trong allowedModes
    const roles = getAuthRoles().map(r => String(r || '').toUpperCase());
    if (roles.some(r => r.includes('WAREHOUSE')) && allowedModes.includes(WORKSPACE_MODES.WAREHOUSE)) {
      return WORKSPACE_MODES.WAREHOUSE;
    }
    if (roles.some(r => r.includes('CASHIER')) && allowedModes.includes(WORKSPACE_MODES.CASHIER)) {
      return WORKSPACE_MODES.CASHIER;
    }
    if (allowedModes.includes(WORKSPACE_MODES.ACCOUNTANT)) {
      return WORKSPACE_MODES.ACCOUNTANT;
    }
    return allowedModes[0] || WORKSPACE_MODES.ACCOUNTANT;
  });

  const setWorkspaceMode = (mode) => {
    if (WORKSPACE_MODES[mode] && allowedModes.includes(mode)) {
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
        allowedModes,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaceMode = () => {
  const ctx = useContext(WorkspaceModeContext);
  if (!ctx) {
    throw new Error('useWorkspaceMode must be used within a WorkspaceModeProvider');
  }
  return ctx;
};

export default WorkspaceModeContext;
