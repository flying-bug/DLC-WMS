import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';

// Auth pages (uyen)
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';

// Admin layout + pages (main/duybo)
import AdminLayout from '../components/layout/AdminLayout';
import UsersPage from '../pages/UsersPage';

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ── Auth (không cần layout) ── */}
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />

                {/* ── App (cần AdminLayout) ── */}
                <Route path="/" element={<AdminLayout />}>
                    <Route index element={<Navigate to={ROUTES.USERS} replace />} />
                    <Route path={ROUTES.USERS} element={<UsersPage />} />
                    <Route path={ROUTES.DASHBOARD} element={<div>Trang Tổng quan (Đang xây dựng)</div>} />
                    <Route path={ROUTES.PRODUCTS} element={<div>Trang Sản phẩm (Đang xây dựng)</div>} />
                    <Route path={ROUTES.INVENTORY} element={<div>Trang Quản lý kho (Đang xây dựng)</div>} />
                    <Route path={ROUTES.SALES} element={<div>Trang Bán hàng (Đang xây dựng)</div>} />
                </Route>

                {/* Fallback — redirect mọi route lạ về login */}
                <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
