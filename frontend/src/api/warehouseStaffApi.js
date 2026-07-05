import axiosClient from './axiosClient';

const warehouseStaffApi = {
  getStaffList: (warehouseId, params) => {
    return axiosClient.get(`/warehouses/${warehouseId}/staff`, { params });
  },

  assignRoles: (warehouseId, data) => {
    return axiosClient.post(`/warehouses/${warehouseId}/staff`, data);
  },

  revokeAccess: (warehouseId, userId) => {
    return axiosClient.delete(`/warehouses/${warehouseId}/staff/${userId}`);
  },

  getWarehouseRoles: () => {
    return axiosClient.get('/roles', { params: { module: 'WAREHOUSE' } });
  }
};

export default warehouseStaffApi;
