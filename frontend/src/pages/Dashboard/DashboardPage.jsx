import SuperAdminDashboard from './SuperAdminDashboard';
import WarehouseDashboard from './WarehouseDashboard';

const DashboardPage = () => {
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = ['SUPER_ADMIN', 'ROLE_SUPER_ADMIN'].includes(userRole.toUpperCase());

    return isSuperAdmin ? <SuperAdminDashboard /> : <WarehouseDashboard />;
};

export default DashboardPage;
