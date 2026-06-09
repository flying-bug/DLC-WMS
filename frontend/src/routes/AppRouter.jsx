import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import UnitPage from '../pages/Unit/UnitPage';
import ProductPage from '../pages/Product/ProductPage';
import ChangePasswordPage from '../pages/ChangePassword/ChangePasswordPage';
import UsersPage from '../pages/UsersPage';

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Redirect root về trang dashboard nếu đã có Dashboard, tạm thời để / */}
                <Route path="/" element={<Navigate to={ROUTES.DASHBOARD || '/dashboard'} replace />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/users" element={<UsersPage />} />

                <Route path={ROUTES.DASHBOARD || '/dashboard'} element={<DashboardPage />} />
                <Route path="/units" element={<UnitPage />} />
                <Route path={ROUTES.PRODUCTS} element={<ProductPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
