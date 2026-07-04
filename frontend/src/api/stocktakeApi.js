import axiosClient from './axiosClient';

const STOCKTAKE_BASE = '/stocktakes';

export const getStocktakes = (params = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          data: {
            content: [
              {
                id: 1,
                stocktakeCode: "KK-2024-0001",
                stocktakeDate: "2024-07-01T08:00:00Z",
                warehouseId: 1,
                note: "Kiểm kê định kỳ tháng 7",
                status: "POSTED"
              },
              {
                id: 2,
                stocktakeCode: "KK-2024-0002",
                stocktakeDate: "2024-07-02T09:30:00Z",
                warehouseId: 2,
                note: "Kiểm kê đột xuất",
                status: "SUBMITTED"
              },
              {
                id: 3,
                stocktakeCode: "KK-2024-0003",
                stocktakeDate: "2024-07-03T14:15:00Z",
                warehouseId: 1,
                note: "Kiểm kê hàng cận date",
                status: "DRAFT"
              },
              {
                id: 4,
                stocktakeCode: "KK-2024-0004",
                stocktakeDate: "2024-07-04T10:00:00Z",
                warehouseId: 2,
                note: "Đối soát sổ sách",
                status: "POSTED"
              },
              {
                id: 5,
                stocktakeCode: "KK-2024-0005",
                stocktakeDate: "2024-07-05T16:45:00Z",
                warehouseId: 1,
                note: "Hủy kiểm kê nhầm",
                status: "CANCELLED"
              }
            ],
            totalElements: 5,
            totalPages: 1
          }
        }
      });
    }, 500);
  });
};

export const getStocktakeDetail = (id) => {
  return axiosClient.get(`${STOCKTAKE_BASE}/${id}`);
};

export const createStocktake = (data) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/create`, data);
};

export const updateStocktake = (id, data) => {
  return axiosClient.put(`${STOCKTAKE_BASE}/${id}`, data);
};

export const postStocktake = (id) => {
  return axiosClient.post(`${STOCKTAKE_BASE}/${id}/post`);
};

export const getWarehouses = (params = {}) => {
  return axiosClient.get('/warehouses', { params });
};
