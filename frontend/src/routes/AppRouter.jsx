import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import ErrorBoundary from '../components/ErrorBoundary';
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
import RolePermissionsPage from '../pages/Permissions/RolePermissionsPage';
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
import EInvoiceListPage from '../pages/EInvoice/EInvoiceListPage';
import BusinessSettingsPage from '../pages/BusinessSettings/BusinessSettingsPage';
import MobileScannerPage from '../pages/MobileScanner/MobileScannerPage';
import WarehouseWorkspacePage from '../pages/WarehouseWorkspace/WarehouseWorkspacePage';
import WarehouseDocumentFormPage from '../pages/WarehouseWorkspace/WarehouseDocumentFormPage';
import WarehouseTransferFormPage from '../pages/WarehouseWorkspace/WarehouseTransferFormPage';
import CashierWorkspacePage from '../pages/CashierWorkspace/CashierWorkspacePage';
import { getAuthRoles, hasPermission } from '../auth/session';

// Chuyển hướng /email-settings sang /operations?tab=email, giữ nguyên query params (nếu có từ OAuth callback)
const EmailSettingsRedirect = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    params.set('tab', 'email');
    return <Navigate to={`/operations?${params.toString()}`} replace />;
};

// Helper to check valid token
const isValidToken = () => {
    const token = sessionStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined' && token.trim() !== '';
};

const getDefaultAuthenticatedPath = () => {
    const roles = getAuthRoles().map(role => String(role || '').toUpperCase());
    if (roles.some(role => ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN'].includes(role))) return '/dashboard';
    // Thủ kho / Thủ quỹ bị khóa cứng vào bàn làm việc riêng - phải xét TRƯỚC nhánh
    // report_summary:view chung, vì 2 role này vẫn được cấp report_balance/report_ledger/
    // report_transfer (thuộc module report_summary), nên trước đây luôn rơi vào nhánh đó
    // và bị đưa thẳng tới /main-dashboard thay vì bàn làm việc của họ.
    if (roles.some(role => ['WAREHOUSE_CONTROLLER', 'ROLE_WAREHOUSE_CONTROLLER'].includes(role))) return '/warehouse-workspace';
    if (roles.some(role => ['CASHIER_CONTROLLER', 'ROLE_CASHIER_CONTROLLER'].includes(role))) return '/cashier-workspace';
    if (roles.some(role => ['TECHNICIAN', 'ROLE_TECHNICIAN'].includes(role))) return '/dashboard';
    return '/dashboard';
};

// Wrapper for protected routes (requires token)
const ProtectedRoute = ({ allowedRoles, disallowedRoles, requiredPermission }) => {
    const tokenValid = isValidToken();
    const userRole = sessionStorage.getItem('role') || '';

    if (!tokenValid) {
        return <Navigate to="/login" replace />;
    }

    const currentRole = userRole.toUpperCase();

    if (allowedRoles && !allowedRoles.includes(currentRole)) {
        return <Navigate to={getDefaultAuthenticatedPath()} replace />;
    }

    if (disallowedRoles && disallowedRoles.includes(currentRole)) {
        return <Navigate to={getDefaultAuthenticatedPath()} replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to={getDefaultAuthenticatedPath()} replace />;
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
    return <Navigate to={getDefaultAuthenticatedPath()} replace />;
};

// Mỗi trang tự bọc chính nó bằng <AdminLayout> (xem AdminLayout.jsx) thay vì được
// AdminLayout bọc qua route lồng nhau, nên nếu logic của trang throw ngay trong thân hàm
// (trước khi kịp trả về JSX chứa AdminLayout), lỗi đó xảy ra ở cấp cha của AdminLayout -
// một ErrorBoundary đặt bên trong AdminLayout sẽ không bắt được. Đặt ở đây, bọc quanh toàn
// bộ <Routes>, mới chắc chắn bắt được mọi lỗi render của bất kỳ trang nào. Key theo
// pathname để tự reset khi điều hướng sang trang khác - nếu không, một khi đã crash thì
// ErrorBoundary (nằm trên Router) sẽ giữ nguyên màn hình lỗi mãi vì đổi URL không tự
// remount nó.
function AppRoutes() {
    const location = useLocation();
    return (
        <ErrorBoundary key={location.pathname}>
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
                    <Route path="/profile/edit" element={<ProfilePage />} />
                    <Route path="/ai-chat" element={<AiChatPage />} />
                </Route>

                {/* Business Routes for Staff & Manager only */}
                <Route element={<ProtectedRoute disallowedRoles={['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN']} />}>
                    {/* Thủ kho / Thủ quỹ bị khóa vào bàn làm việc riêng, không được vào Tổng quan chung */}
                    <Route element={<ProtectedRoute disallowedRoles={['WAREHOUSE_CONTROLLER', 'ROLE_WAREHOUSE_CONTROLLER', 'CASHIER_CONTROLLER', 'ROLE_CASHIER_CONTROLLER']} />}>
                    </Route>
                    {/* Chi Thu kho (import:post/export:post) va Quan ly moi duoc vao ban lam viec Thu kho */}
                    <Route element={<ProtectedRoute requiredPermission={['import:post', 'export:post']} />}>
                        <Route path="/warehouse-workspace" element={<WarehouseWorkspacePage />} />
                        <Route path="/warehouse-workspace/imports/:id" element={<WarehouseDocumentFormPage />} />
                        <Route path="/warehouse-workspace/exports/:id" element={<WarehouseDocumentFormPage />} />
                        <Route path="/warehouse-workspace/transfers/:id" element={<WarehouseTransferFormPage />} />
                    </Route>
                    {/* Ban lam viec Thu quy: chi Thu quy va Quan ly - giong Thu kho, day la workspace
                        rieng theo ROLE chu khong phai theo permission (Ke toan cung co du quyen
                        "payment" nhung khong duoc vao workspace nay). */}
                    <Route element={<ProtectedRoute allowedRoles={['CASHIER_CONTROLLER', 'ROLE_CASHIER_CONTROLLER', 'MANAGER', 'ROLE_MANAGER']} />}>
                        <Route path="/cashier-workspace" element={<CashierWorkspacePage />} />
                    </Route>

                    <Route element={<ProtectedRoute requiredPermission="export:view" />}>
                        <Route path="/export-slips" element={<ExportSlipPage />} />
                        <Route path="/export-slips/create" element={<CreateExportSlipPage />} />
                        <Route path="/export-slips/usage" element={<CreateExportSlipPage mode="USAGE" />} />
                        <Route path="/export-slips/assembly" element={<CreateExportSlipPage mode="ASSEMBLY" />} />
                        <Route path="/export-slips/:id/edit" element={<UpdateExportSlipPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="import:view" />}>
                        <Route path="/import-history" element={<ImportHistoryPage />} />
                        <Route path="/import-history/create" element={<CreateImportSlipPage />} />
                        <Route path="/import-slips/:id/edit" element={<UpdateImportSlipPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="transfer:view" />}>
                        <Route path="/transfer-history" element={<TransferHistoryPage />} />
                        <Route path="/transfer-history/create" element={<CreateTransferSlipPage />} />
                        <Route path="/transfer-history/:id/edit" element={<UpdateTransferSlipPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="unit:view" />}>
                        <Route path="/units" element={<UnitPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="product:view" />}>
                        <Route path="/products" element={<ProductPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="product_category:view" />}>
                        <Route path="/product-categories" element={<ProductCategoryPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="supplier:view" />}>
                        <Route path="/suppliers" element={<SupplierListPage />} />
                        <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="warehouse_master:view" />}>
                        <Route path="/warehouses" element={<WarehouseListPage />} />
                        <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="customer:view" />}>
                        <Route path="/customers" element={<CustomerListPage />} />
                        <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="warranty:view" />}>
                        <Route path="/warranties" element={<WarrantyListPage />} />
                        <Route path="/warranties/:id" element={<WarrantyDetailPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="repair:view" />}>
                        <Route path="/repairs" element={<RepairListPage />} />
                        <Route path="/repairs/create" element={<RepairFormPage />} />
                        <Route path="/repairs/:id" element={<RepairFormPage />} />
                        <Route path="/repairs/:id/edit" element={<RepairFormPage />} />
                        <Route path="/repair/:id" element={<RepairFormPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="assembly_config:view" />}>
                        <Route path="/assembly-boms" element={<AssemblyBomPage />} />
                        <Route path="/assembly-boms/create" element={<AssemblyBomFormPage />} />
                        <Route path="/assembly-boms/:id" element={<AssemblyBomFormPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="assembly:view" />}>
                        <Route path="/assembly-orders" element={<AssemblyOrderListPage />} />
                        <Route path="/assembly-orders/create" element={<AssemblyOrderFormPage />} />
                        <Route path="/assembly-orders/:id" element={<AssemblyOrderFormPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="brand:view" />}>
                        <Route path="/brands" element={<BrandListPage />} />
                        <Route path="/brands/:id" element={<BrandDetailPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="stocktake:view" />}>
                        <Route path="/stocktakes" element={<StocktakeListPage />} />
                        <Route path="/stocktakes/create" element={<CreateStocktakePage />} />
                        <Route path="/stocktakes/:id" element={<StocktakeDetailPage />} />
                        <Route path="/stocktakes/:id/edit" element={<CreateStocktakePage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission={['report_balance:view', 'report_ledger:view', 'report_transfer:view', 'report_debt:view', 'report_summary:view', 'report_sales:view']} />}>
                        <Route path="/reports" element={<ReportListPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="payment:view" />}>
                        <Route path="/payments" element={<Navigate to="/payments/receipt" replace />} />
                        <Route path="/payments/overview" element={<Navigate to="/payments/receipt" replace />} />
                        <Route path="/payments/expense" element={<PaymentManagementPage initialMode="VOUCHER" />} />
                        <Route path="/payments/receipt" element={<PaymentManagementPage initialMode="RECEIPT" />} />
                        <Route path="/payments/history/:partnerId" element={<PaymentHistoryPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="sales_order:view" />}>
                        <Route path="/sales-orders" element={<SalesOrderListPage />} />
                        <Route path="/sales-orders/create" element={<CreateSalesOrderPage />} />
                        <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
                        <Route path="/sales-orders/:id/edit" element={<CreateSalesOrderPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="purchase_order:view" />}>
                        <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
                        <Route path="/purchase-orders/create" element={<CreatePurchaseOrderPage />} />
                        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                        <Route path="/purchase-orders/:id/edit" element={<CreatePurchaseOrderPage />} />
                    </Route>
                    <Route element={<ProtectedRoute requiredPermission="einvoice:view" />}>
                        <Route path="/einvoices" element={<EInvoiceListPage />} />
                    </Route>
                    {/* Backend BusinessSettingsController da khoa ghi cho MANAGER/SUPER_ADMIN,
                        khoa luon o FE de cac role khac khong thay man hinh chi de bi 403 khi luu. */}
                    <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ROLE_MANAGER']} />}>
                        <Route path="/business-settings" element={<BusinessSettingsPage />} />
                    </Route>
                </Route>

                {/* Protected Routes for SUPER_ADMIN only */}
                <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ROLE_SUPER_ADMIN']} />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/users/create" element={<CreateEmployeePage />} />
                    <Route path="/users/:id/permissions" element={<PermissionDetailPage />} />
                    <Route path="/roles/permissions" element={<RolePermissionsPage />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />
                    <Route path="/operations" element={<OperationsCenterPage />} />
                    <Route path="/email-settings" element={<EmailSettingsRedirect />} />
                </Route>

                {/* Mobile Scanner (lightweight page for phone camera) */}
                <Route path="/m/scan" element={<MobileScannerPage />} />

                {/* Catch-all Redirect */}
                <Route path="*" element={<NotFoundRedirect />} />
            </Routes>
        </ErrorBoundary>
    );
}

function AppRouter() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default AppRouter;
