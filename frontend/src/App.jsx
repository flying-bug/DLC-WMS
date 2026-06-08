import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Các Route không cần bọc Layout (Authentication) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Layout Chính của Hệ thống */}
        <Route path="/" element={<AdminLayout />}>
          {/* Mặc định chuyển hướng vào trang quản lý user */}
          <Route index element={<Navigate to="/users" replace />} />
          
          <Route path="users" element={<UsersPage />} />
          
          <Route path="dashboard" element={<div>Trang Tổng quan (Đang xây dựng)</div>} />
          <Route path="products" element={<div>Trang Sản phẩm (Đang xây dựng)</div>} />
          <Route path="inventory" element={<div>Trang Quản lý kho (Đang xây dựng)</div>} />
          <Route path="sales" element={<div>Trang Bán hàng (Đang xây dựng)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
