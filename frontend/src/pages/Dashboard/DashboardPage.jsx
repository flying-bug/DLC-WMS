import SuperAdminDashboard from './SuperAdminDashboard';
import WarehouseDashboard from './WarehouseDashboard';

const DashboardPage = () => {
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN', 'Super Admin'].includes(userRole.toUpperCase());

    return isSuperAdmin ? <SuperAdminDashboard /> : <WarehouseDashboard />;
};

export default DashboardPage;
