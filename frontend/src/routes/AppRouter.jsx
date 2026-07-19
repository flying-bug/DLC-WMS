import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants';
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import UnitPage from '../pages/Unit/UnitPage';
import ProductPage from '../pages/Product/ProductPage';
import ProductCategoryPage from '../pages/ProductCategory/ProductCategoryPage';
import ChangePasswordPage from '../pages/ChangePassword/ChangePasswordPage';
import UsersPage from '../pages/UsersPage';
import CreateEmployeePage from '../pages/CreateEmployee/CreateEmployeePage';
import PermissionDetailPage from '../pages/Permissions/PermissionDetailPage';
import ExportSlipPage from '../pages/ExportSlip/ExportSlipPage';
import CreateExportSlipPage from '../pages/ExportSlip/CreateExportSlipPage';
import UpdateExportSlipPage from '../pages/ExportSlip/UpdateExportSlipPage';
import ImportHistoryPage from '../pages/ImportHistory/ImportHistoryPage';
import CreateImportSlipPage from '../pages/CreateImportSlip/CreateImportSlipPage';
import UpdateImportSlipPage from '../pages/UpdateImportSlip/UpdateImportSlipPage';
import TransferHistoryPage from '../pages/TransferHistory/TransferHistoryPage';
import CreateTransferSlipPage from '../pages/CreateTransferSlip/CreateTransferSlipPage';
import UpdateTransferSlipPage from '../pages/CreateTransferSlip/UpdateTransferSlipPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import AuditLogPage from '../pages/AuditLog/AuditLogPage';
import WarehouseListPage from '../pages/Warehouse/WarehouseListPage';
import WarehouseDetailPage from '../pages/Warehouse/WarehouseDetailPage';
import SupplierListPage from '../pages/Supplier/SupplierListPage';
import SupplierDetailPage from '../pages/Supplier/SupplierDetailPage';
import CustomerListPage from '../pages/Customer/CustomerListPage';
import CustomerDetailPage from '../pages/Customer/CustomerDetailPage';
import WarrantyListPage from '../pages/Warranty/WarrantyListPage';
import WarrantyDetailPage from '../pages/Warranty/WarrantyDetailPage';

import BrandListPage from '../pages/Brand/BrandListPage';
import BrandDetailPage from '../pages/Brand/BrandDetailPage';
import AssemblyBomPage from '../pages/AssemblyOrder/AssemblyBomPage';
import AssemblyOrderListPage from '../pages/AssemblyOrder/AssemblyOrderListPage';
import AssemblyOrderFormPage from '../pages/AssemblyOrder/AssemblyOrderFormPage';
import AiChatPage from '../pages/AiChat/AiChatPage';
import StocktakeListPage from '../pages/Stocktake/StocktakeListPage';
import CreateStocktakePage from '../pages/Stocktake/CreateStocktakePage';
import StocktakeDetailPage from '../pages/Stocktake/StocktakeDetailPage';
import ReportListPage from '../pages/Report/ReportListPage';
import RepairListPage from '../pages/Repair/RepairListPage';
import RepairDetailPage from '../pages/Repair/RepairDetailPage';


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
                    <Route path="/export-slips/create" element={<CreateExportSlipPage />} />
                    <Route path="/export-slips/:id/edit" element={<UpdateExportSlipPage />} />
                    <Route path="/import-history" element={<ImportHistoryPage />} />
                    <Route path="/import-history/create" element={<CreateImportSlipPage />} />
                    <Route path="/import-slips/:id/edit" element={<UpdateImportSlipPage />} />
                    <Route path="/transfer-history" element={<TransferHistoryPage />} />
                    <Route path="/transfer-history/create" element={<CreateTransferSlipPage />} />
                    <Route path="/transfer-history/:id/edit" element={<UpdateTransferSlipPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/units" element={<UnitPage />} />
                    <Route path="/products" element={<ProductPage />} />
                    <Route path="/product-categories" element={<ProductCategoryPage />} />
                    <Route path="/suppliers" element={<SupplierListPage />} />
                    <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                    <Route path="/warehouses" element={<WarehouseListPage />} />
                    <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
                    <Route path="/customers" element={<CustomerListPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/warranties" element={<WarrantyListPage />} />
                    <Route path="/warranties/:id" element={<WarrantyDetailPage />} />
                    <Route path="/repair-tickets" element={<RepairListPage />} />
                    <Route path="/repair-tickets/create" element={<RepairDetailPage />} />
                    <Route path="/repair-tickets/:id/edit" element={<RepairDetailPage />} />
                    <Route path="/assembly-boms" element={<AssemblyBomPage />} />
                    <Route path="/assembly-orders" element={<AssemblyOrderListPage />} />
                    <Route path="/assembly-orders/create" element={<AssemblyOrderFormPage />} />
                    <Route path="/assembly-orders/:id" element={<AssemblyOrderFormPage />} />
                    <Route path="/brands" element={<BrandListPage />} />
                    <Route path="/brands/:id" element={<BrandDetailPage />} />
                    <Route path="/stocktakes" element={<StocktakeListPage />} />
                    <Route path="/stocktakes/create" element={<CreateStocktakePage />} />
                    <Route path="/stocktakes/:id" element={<StocktakeDetailPage />} />
                    <Route path="/stocktakes/:id/edit" element={<CreateStocktakePage />} />
                    <Route path="/ai-chat" element={<AiChatPage />} />
                    <Route path="/reports" element={<ReportListPage />} />

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
