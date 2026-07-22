import SuperAdminDashboard from './SuperAdminDashboard';
import WarehouseDashboard from './WarehouseDashboard';

const DashboardPage = () => {
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = userRole.toUpperCase() === 'SUPER_ADMIN' || userRole.toUpperCase() === 'ROLE_SUPER_ADMIN' || userRole === 'Super Admin';

    return isSuperAdmin ? <SuperAdminDashboard /> : <WarehouseDashboard />;
};

export default DashboardPage;
