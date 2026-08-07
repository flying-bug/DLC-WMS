-- ====================================================================
-- SEED MASTER DATA FOR DLC-WMS (Units, Brands, Categories)
-- ====================================================================

-- 1. SEED UNITS
INSERT INTO `units` (`name`, `status`) VALUES
('Cái', 'APPROVED'),
('Bộ', 'APPROVED'),
('Chiếc', 'APPROVED'),
('Hộp', 'APPROVED'),
('Sợi', 'APPROVED'),
('Gói', 'APPROVED'),
('Lần', 'APPROVED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 2. SEED BRANDS
INSERT INTO `brands` (`code`, `name`, `status`) VALUES
('INTEL', 'Intel', 'APPROVED'),
('AMD', 'AMD', 'APPROVED'),
('DELL', 'Dell', 'APPROVED'),
('HP', 'HP', 'APPROVED'),
('LENOVO', 'Lenovo', 'APPROVED'),
('ASUS', 'ASUS', 'APPROVED'),
('MSI', 'MSI', 'APPROVED'),
('GIGABYTE', 'Gigabyte', 'APPROVED'),
('ASROCK', 'ASRock', 'APPROVED'),
('BIOSTAR', 'Biostar', 'APPROVED'),
('KINGSTON', 'Kingston', 'APPROVED'),
('CORSAIR', 'Corsair', 'APPROVED'),
('ADATA', 'ADATA', 'APPROVED'),
('CRUCIAL', 'Crucial', 'APPROVED'),
('SAMSUNG', 'Samsung', 'APPROVED'),
('WD', 'Western Digital', 'APPROVED'),
('SEAGATE', 'Seagate', 'APPROVED'),
('KIOXIA', 'Kioxia', 'APPROVED'),
('PNY', 'PNY', 'APPROVED'),
('ZOTAC', 'Zotac', 'APPROVED'),
('COLORFUL', 'Colorful', 'APPROVED'),
('PALIT', 'Palit', 'APPROVED'),
('COOLERMASTER', 'Cooler Master', 'APPROVED'),
('DEEPCOOL', 'DeepCool', 'APPROVED'),
('THERMALRIGHT', 'Thermalright', 'APPROVED'),
('NOCTUA', 'Noctua', 'APPROVED'),
('IDCOOLING', 'ID Cooling', 'APPROVED'),
('MONTECH', 'Montech', 'APPROVED'),
('NZXT', 'NZXT', 'APPROVED'),
('ANTEC', 'Antec', 'APPROVED'),
('SEASONIC', 'Seasonic', 'APPROVED'),
('LG', 'LG', 'APPROVED'),
('AOC', 'AOC', 'APPROVED'),
('VIEWSONIC', 'ViewSonic', 'APPROVED'),
('LOGITECH', 'Logitech', 'APPROVED'),
('RAPOO', 'Rapoo', 'APPROVED'),
('RAZER', 'Razer', 'APPROVED'),
('AKKO', 'AKKO', 'APPROVED'),
('DAREU', 'DareU', 'APPROVED'),
('TPLINK', 'TP-Link', 'APPROVED'),
('MERCUSYS', 'Mercusys', 'APPROVED'),
('TENDA', 'Tenda', 'APPROVED'),
('UGREEN', 'Ugreen', 'APPROVED'),
('BASEUS', 'Baseus', 'APPROVED'),
('ORICO', 'Orico', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. SEED PRODUCT CATEGORIES (Level 1 Parents)
INSERT INTO `product_categories` (`id`, `parent_id`, `code`, `name`, `status`) VALUES
(1, NULL, 'CAT_MAYTINH', 'Máy tính', 'APPROVED'),
(2, NULL, 'CAT_LINHKIEN', 'Linh kiện', 'APPROVED'),
(3, NULL, 'CAT_NGOAIVI', 'Thiết bị ngoại vi', 'APPROVED'),
(4, NULL, 'CAT_MANG', 'Thiết bị mạng', 'APPROVED'),
(5, NULL, 'CAT_PHUKIEN', 'Phụ kiện', 'APPROVED'),
(6, NULL, 'CAT_VANPHONG', 'Thiết bị văn phòng', 'APPROVED'),
(7, NULL, 'CAT_DICHVU', 'Dịch vụ', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. SEED PRODUCT CATEGORIES (Level 2 Children)
-- Máy tính
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(1, 'CAT_MT_DONGBO', 'Máy tính đồng bộ', 'APPROVED'),
(1, 'CAT_MT_WORKSTATION', 'Máy trạm (Workstation)', 'APPROVED'),
(1, 'CAT_MT_MINIPC', 'Mini PC', 'APPROVED'),
(1, 'CAT_MT_ALLINONE', 'All In One', 'APPROVED'),
(1, 'CAT_MT_LAPTOP', 'Laptop', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Linh kiện
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(2, 'CAT_LK_CPU', 'CPU', 'APPROVED'),
(2, 'CAT_LK_MAINBOARD', 'Mainboard', 'APPROVED'),
(2, 'CAT_LK_RAM', 'RAM', 'APPROVED'),
(2, 'CAT_LK_SSD', 'SSD', 'APPROVED'),
(2, 'CAT_LK_HDD', 'HDD', 'APPROVED'),
(2, 'CAT_LK_GPU', 'Card màn hình (GPU)', 'APPROVED'),
(2, 'CAT_LK_PSU', 'Nguồn (PSU)', 'APPROVED'),
(2, 'CAT_LK_CASE', 'Vỏ Case', 'APPROVED'),
(2, 'CAT_LK_COOLING', 'Tản nhiệt', 'APPROVED'),
(2, 'CAT_LK_FAN', 'Quạt Case', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Thiết bị ngoại vi
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(3, 'CAT_NV_MONITOR', 'Màn hình', 'APPROVED'),
(3, 'CAT_NV_KEYBOARD', 'Bàn phím', 'APPROVED'),
(3, 'CAT_NV_MOUSE', 'Chuột', 'APPROVED'),
(3, 'CAT_NV_WEBCAM', 'Webcam', 'APPROVED'),
(3, 'CAT_NV_HEADPHONE', 'Tai nghe', 'APPROVED'),
(3, 'CAT_NV_SPEAKER', 'Loa', 'APPROVED'),
(3, 'CAT_NV_MIC', 'Micro', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Thiết bị mạng
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(4, 'CAT_NET_ROUTER', 'Router', 'APPROVED'),
(4, 'CAT_NET_SWITCH', 'Switch', 'APPROVED'),
(4, 'CAT_NET_CARDWIFI', 'Card Wifi', 'APPROVED'),
(4, 'CAT_NET_USBWIFI', 'USB Wifi', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Phụ kiện
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(5, 'CAT_PK_HDMI', 'Dây HDMI', 'APPROVED'),
(5, 'CAT_PK_DP', 'Dây DisplayPort', 'APPROVED'),
(5, 'CAT_PK_ADAPTER', 'Adapter', 'APPROVED'),
(5, 'CAT_PK_HUB', 'Hub USB', 'APPROVED'),
(5, 'CAT_PK_DOCK', 'Docking Station', 'APPROVED'),
(5, 'CAT_PK_USB', 'USB Flash', 'APPROVED'),
(5, 'CAT_PK_HDD_DI_DONG', 'Ổ cứng di động', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Thiết bị văn phòng
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(6, 'CAT_VP_PRINTER', 'Máy in', 'APPROVED'),
(6, 'CAT_VP_SCANNER', 'Máy Scan', 'APPROVED'),
(6, 'CAT_VP_INK', 'Mực in', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Dịch vụ
INSERT INTO `product_categories` (`parent_id`, `code`, `name`, `status`) VALUES
(7, 'CAT_DV_WIN', 'Cài Windows', 'APPROVED'),
(7, 'CAT_DV_LAPRAP', 'Lắp ráp PC', 'APPROVED'),
(7, 'CAT_DV_VESINH', 'Vệ sinh máy', 'APPROVED'),
(7, 'CAT_DV_NANGCAP', 'Nâng cấp linh kiện', 'APPROVED')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
