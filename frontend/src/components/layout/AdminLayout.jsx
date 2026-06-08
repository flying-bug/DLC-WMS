import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout = () => {
  return (
    <div className="d-flex w-100 h-100">
      {/* Sidebar cố định bên trái */}
      <Sidebar />
      
      {/* Phần Content bên phải */}
      <div style={{ 
        marginLeft: 'var(--misa-sidebar-width)', 
        width: 'calc(100% - var(--misa-sidebar-width))',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header />
        
        {/* Vùng Render Router (Main Content) */}
        <div className="flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
