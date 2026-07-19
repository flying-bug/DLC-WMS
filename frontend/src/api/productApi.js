import axiosClient from './axiosClient';

const PRODUCT_BASE = '/products';

/**
 * Tìm kiếm sản phẩm
 * @param {string} keyword   - Từ khóa tên / mã SP
 * @param {string} categoryId - Lọc theo danh mục
 * @param {number} page      - Trang hiện tại
 * @param {number} size      - Số bản ghi mỗi trang
 */
export const searchProducts = (keyword = '', categoryId = '', page = 0, size = 10) => {
    return axiosClient.get(PRODUCT_BASE, { 
        params: { 
            keyword: keyword || undefined,
            categoryId: categoryId || undefined,
            page, 
            size 
        } 
    });
};

/**
 * Tìm kiếm biến thể sản phẩm (để chọn khi nhập/xuất hoặc sửa chữa)
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 */
export const searchProductVariants = (keyword = '', page = 0, size = 10) => {
    return axiosClient.get(`${PRODUCT_BASE}/variants`, {
        params: {
            keyword: keyword || undefined,
            page,
            size
        }
    });
};

/**
 * Lấy chi tiết sản phẩm theo ID.
 * @param {number} id
 */
export const getProductById = (id) => {
    return axiosClient.get(`${PRODUCT_BASE}/${id}`);
};
