import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import LoginPage from '../pages/Login/LoginPage';

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Redirect root về trang login */}
                <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />

                {/* Placeholder cho các route sau */}
                {/* <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} /> */}
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
