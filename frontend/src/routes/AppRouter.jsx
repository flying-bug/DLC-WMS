import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants';
import LoginPage from '../pages/Login/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPassword/ForgotPasswordPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import AnalyticsDashboard from '../pages/Dashboard/AnalyticsDashboard';
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
import RepairListPage from '../pages/Repair/RepairListPage';
import RepairFormPage from '../pages/Repair/RepairFormPage';
import BrandListPage from '../pages/Brand/BrandListPage';
import BrandDetailPage from '../pages/Brand/BrandDetailPage';
import AssemblyBomPage from '../pages/AssemblyOrder/AssemblyBomPage';
import AssemblyBomFormPage from '../pages/AssemblyOrder/AssemblyBomFormPage';
import AssemblyOrderListPage from '../pages/AssemblyOrder/AssemblyOrderListPage';
import AssemblyOrderFormPage from '../pages/AssemblyOrder/AssemblyOrderFormPage';
import AiChatPage from '../pages/AiChat/AiChatPage';
import StocktakeListPage from '../pages/Stocktake/StocktakeListPage';
import CreateStocktakePage from '../pages/Stocktake/CreateStocktakePage';
import StocktakeDetailPage from '../pages/Stocktake/StocktakeDetailPage';
import ReportListPage from '../pages/Report/ReportListPage';
import OperationsCenterPage from '../pages/Operations/OperationsCenterPage';
import SalesOrderListPage from '../pages/SalesOrder/SalesOrderListPage';
import CreateSalesOrderPage from '../pages/SalesOrder/CreateSalesOrderPage';
import SalesOrderDetailPage from '../pages/SalesOrder/SalesOrderDetailPage';
import PurchaseOrderListPage from '../pages/PurchaseOrder/PurchaseOrderListPage';
import CreatePurchaseOrderPage from '../pages/PurchaseOrder/CreatePurchaseOrderPage';
import PurchaseOrderDetailPage from '../pages/PurchaseOrder/PurchaseOrderDetailPage';
import PaymentManagementPage from '../pages/Payment/PaymentManagementPage';
import PaymentOverviewPage from '../pages/Payment/PaymentOverviewPage';
import PaymentHistoryPage from '../pages/Payment/PaymentHistoryPage';

// Helper to check valid token
const isValidToken = () => {
    const token = sessionStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
};

// Wrapper for protected routes (requires token)
const ProtectedRoute = ({ allowedRoles, disallowedRoles }) => {
    const tokenValid = isValidToken();
    const userRole = sessionStorage.getItem('role') || '';

    if (!tokenValid) {
        return <Navigate to="/login" replace />;
    }

    const currentRole = userRole.toUpperCase();

    if (allowedRoles && !allowedRoles.includes(currentRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    if (disallowedRoles && disallowedRoles.includes(currentRole)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

// Wrapper for guest/public routes (redirects to dashboard if already logged in)
const PublicRoute = () => {
    if (isValidToken()) {
        return <Navigate to="/dashboard" replace />;
    }
    return <Outlet />;
};

// Catch-all route component to redirect properly based on auth status
const NotFoundRedirect = () => {
    return <Navigate to={isValidToken() ? "/dashboard" : "/login"} replace />;
};

// Root route redirect based on role
const RootRedirect = () => {
    if (!isValidToken()) return <Navigate to="/login" replace />;
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN'].includes(userRole.toUpperCase());
    return isSuperAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/main-dashboard" replace />;
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

                {/* Protected Routes for All Authenticated Users */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/ai-chat" element={<AiChatPage />} />
                </Route>

                {/* Business Routes for Staff & Manager only */}
                <Route element={<ProtectedRoute disallowedRoles={['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN']} />}>
                    <Route path="/main-dashboard" element={<AnalyticsDashboard />} />
                    <Route path="/export-slips" element={<ExportSlipPage />} />
                    <Route path="/export-slips/create" element={<CreateExportSlipPage />} />
                    <Route path="/export-slips/usage" element={<CreateExportSlipPage mode="USAGE" />} />
                    <Route path="/export-slips/assembly" element={<CreateExportSlipPage mode="ASSEMBLY" />} />
                    <Route path="/export-slips/:id/edit" element={<UpdateExportSlipPage />} />
                    <Route path="/import-history" element={<ImportHistoryPage />} />
                    <Route path="/import-history/create" element={<CreateImportSlipPage />} />
                    <Route path="/import-slips/:id/edit" element={<UpdateImportSlipPage />} />
                    <Route path="/transfer-history" element={<TransferHistoryPage />} />
                    <Route path="/transfer-history/create" element={<CreateTransferSlipPage />} />
                    <Route path="/transfer-history/:id/edit" element={<UpdateTransferSlipPage />} />
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
                    <Route path="/repairs" element={<RepairListPage />} />
                    <Route path="/repairs/create" element={<RepairFormPage />} />
                    <Route path="/repairs/:id" element={<RepairFormPage />} />
                    <Route path="/repairs/:id/edit" element={<RepairFormPage />} />
                    <Route path="/assembly-boms" element={<AssemblyBomPage />} />
                    <Route path="/assembly-boms/create" element={<AssemblyBomFormPage />} />
                    <Route path="/assembly-boms/:id" element={<AssemblyBomFormPage />} />
                    <Route path="/assembly-orders" element={<AssemblyOrderListPage />} />
                    <Route path="/assembly-orders/create" element={<AssemblyOrderFormPage />} />
                    <Route path="/assembly-orders/:id" element={<AssemblyOrderFormPage />} />
                    <Route path="/brands" element={<BrandListPage />} />
                    <Route path="/brands/:id" element={<BrandDetailPage />} />
                    <Route path="/stocktakes" element={<StocktakeListPage />} />
                    <Route path="/stocktakes/create" element={<CreateStocktakePage />} />
                    <Route path="/stocktakes/:id" element={<StocktakeDetailPage />} />
                    <Route path="/stocktakes/:id/edit" element={<CreateStocktakePage />} />
                    <Route path="/reports" element={<ReportListPage />} />
                    <Route path="/payments" element={<Navigate to="/payments/overview" replace />} />
                    <Route path="/payments/overview" element={<PaymentOverviewPage />} />
                    <Route path="/payments/expense" element={<PaymentManagementPage initialMode="VOUCHER" />} />
                    <Route path="/payments/receipt" element={<PaymentManagementPage initialMode="RECEIPT" />} />
                    <Route path="/payments/history/:partnerId" element={<PaymentHistoryPage />} />
                    <Route path="/sales-orders" element={<SalesOrderListPage />} />
                    <Route path="/sales-orders/create" element={<CreateSalesOrderPage />} />
                    <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
                    <Route path="/sales-orders/:id/edit" element={<CreateSalesOrderPage />} />
                    <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
                    <Route path="/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
                    <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                    <Route path="/purchase-orders/:id/edit" element={<CreatePurchaseOrderPage />} />
                </Route>

                {/* Protected Routes for SUPER_ADMIN only */}
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ROLE_SUPER_ADMIN']} />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/create" element={<CreateEmployeePage />} />
                    <Route path="/users/:id/permissions" element={<PermissionDetailPage />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />
                    <Route path="/operations" element={<OperationsCenterPage />} />
                </Route>

                {/* Catch-all Redirect */}
                <Route path="*" element={<NotFoundRedirect />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
