import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants';
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import UnitPage from '../pages/Unit/UnitPage';
import ProductPage from '../pages/Product/ProductPage';
import ChangePasswordPage from '../pages/ChangePassword/ChangePasswordPage';
import UsersPage from '../pages/UsersPage';
import CreateEmployeePage from '../pages/CreateEmployee/CreateEmployeePage';
import PermissionDetailPage from '../pages/Permissions/PermissionDetailPage';
import ExportSlipPage from '../pages/ExportSlip/ExportSlipPage';
import ImportHistoryPage from '../pages/ImportHistory/ImportHistoryPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import AuditLogPage from '../pages/AuditLog/AuditLogPage';

// Wrapper for protected routes (requires token)
const ProtectedRoute = ({ allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

// Wrapper for guest/public routes (redirects to dashboard if already logged in)
const PublicRoute = () => {
    const token = localStorage.getItem('token');
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
};

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Guest / Public Routes */}
                <Route element={<PublicRoute />}>
                    <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                    <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
                </Route>

                {/* Protected Routes for Authenticated Users */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/export-slips" element={<ExportSlipPage />} />
                    <Route path="/import-history" element={<ImportHistoryPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/units" element={<UnitPage />} />
                    <Route path="/products" element={<ProductPage />} />
                </Route>

                {/* Protected Routes for SUPER_ADMIN only */}
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ROLE_SUPER_ADMIN']} />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/create" element={<CreateEmployeePage />} />
                    <Route path="/users/:id/permissions" element={<PermissionDetailPage />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />
                </Route>

                {/* Catch-all Redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
