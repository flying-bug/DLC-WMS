import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  // Tạm thời dùng state để demo việc thay đổi quyền
  const [role, setRole] = useState('Super Admin'); 

  const allMenuItems = [
    { path: '/dashboard', icon: 'bi-pie-chart', label: 'Tổng quan', roles: ['Manager', 'Staff'] },
    { path: '/users', icon: 'bi-people', label: 'Quản lý tài khoản', roles: ['Super Admin'] },
    { path: '/products', icon: 'bi-box-seam', label: 'Danh mục hàng hóa', roles: ['Manager', 'Staff'] },
    { path: '/inventory', icon: 'bi-houses', label: 'Quản lý kho', roles: ['Manager', 'Staff'] },
    { path: '/sales', icon: 'bi-cart3', label: 'Bán hàng', roles: ['Manager', 'Staff'] },
  ];

  // Lọc menu dựa theo Role hiện tại
  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  return (
    <div style={{
      width: 'var(--misa-sidebar-width)',
      backgroundColor: 'var(--misa-sidebar-bg)',
      color: 'var(--misa-sidebar-text)',
      height: '100vh',
      position: 'fixed',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Logo Area */}
      <div style={{
        height: 'var(--misa-header-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #4a4b4e',
        fontSize: '20px',
        fontWeight: '700',
        letterSpacing: '1px'
      }}>
        <i className="bi bi-layers-half me-2 text-primary"></i>
        ERP AMIS
      </div>

      {/* Menu Area */}
      <div className="flex-grow-1 overflow-auto mt-3">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `d-flex align-items-center text-decoration-none px-3 py-2 mb-1 ${isActive ? 'active-menu' : 'text-white'}`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--misa-sidebar-active)' : 'transparent',
              borderLeft: isActive ? '4px solid white' : '4px solid transparent',
              transition: 'all 0.2s'
            })}
          >
            <i className={`bi ${item.icon} me-3`} style={{ fontSize: '18px' }}></i>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Demo chuyển Role */}
      <div className="p-3 border-top border-secondary">
        <div className="text-white-50 mb-1" style={{fontSize: '12px'}}>Demo Test Role:</div>
        <select 
          className="form-select form-select-sm bg-dark text-white border-secondary"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="Super Admin">Super Admin</option>
          <option value="Manager">Manager</option>
        </select>
      </div>
    </div>
  );
};

export default Sidebar;
