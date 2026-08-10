# Database Design
- Role Super Admin : quyền quản lý tài khoản, phân quyền 
- Role Manager : full quyền trừ quản lý tài khoản
- Role Staff: 1 số quyền từ manager 
## Nhóm bảng chính
- **Cơ cấu tổ chức & Quyền:** `USERS`, `ROLES`, `PERMISSIONS`, `USER_ROLES`, `ROLE_PERMISSIONS`.
- **Đối tác & Tài chính:** `PARTNERS`, `PARTNER_LEDGER`, `PAYMENT_VOUCHERS`, `PAYMENT_RECEIPTS`.
- **Sản phẩm (PIM):** `BRANDS`, `PRODUCT_CATEGORIES`, `UNITS`, `PRODUCTS`, `PRODUCT_VARIANTS`, `PRODUCT_IMAGES`.
- **Lưu trữ & Tồn kho:** `WAREHOUSES`, `USER_WAREHOUSE_ROLES`, `INVENTORY_DOCUMENTS`, `INVENTORY_DOCUMENT_LINES`, `INVENTORY_BALANCES`, `INVENTORY_LEDGER`, `INVENTORY_COST_LAYERS`.
- **Định danh Serial/Lot:** `LOT_BATCHES`, `SERIAL_NUMBERS`.
- **Mua hàng & Bán hàng:** `PURCHASE_ORDERS`, `PURCHASE_ORDER_LINES`, `SALES_ORDERS`, `SALES_ORDER_LINES`, `STOCK_RESERVATIONS`.
- **Logistics nội bộ:** `STOCK_TRANSFERS`, `STOCK_TRANSFER_LINES`, `STOCKTAKES`, `STOCKTAKE_LINES`.
- **Bảo hành & Sửa chữa:** `WARRANTIES`, `REPAIRS`.
- **Lắp ráp & Rã xác (BOM):** `ASSEMBLY_BOMS`, `ASSEMBLY_BOM_LINES`, `ASSEMBLY_ORDERS`, `ASSEMBLY_ORDER_LINES`.
- **Hệ thống & Log:** `AUDIT_LOGS`.
