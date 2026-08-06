-- =========================================================
-- V33: Tạo bảng PURCHASE_ORDERS và PURCHASE_ORDER_LINES
-- PO tập trung vào nhà cung cấp + sản phẩm + giá (không có kho)
-- Kho sẽ được xác định khi tạo phiếu nhập kho liên kết
-- =========================================================

CREATE TABLE IF NOT EXISTS PURCHASE_ORDERS (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    partner_id           BIGINT        NOT NULL COMMENT 'FK → PARTNERS (is_supplier=true)',
    po_code              VARCHAR(50)   NOT NULL UNIQUE,
    po_date              DATE          NOT NULL,
    status               VARCHAR(30)   NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT|APPROVED|POSTED|CANCELLED',
    sub_total_amount     DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Tổng tiền hàng trước thuế',
    tax_amount           DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Tổng thuế VAT',
    total_amount         DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Tổng tiền sau thuế',
    paid_amount          DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Đã thanh toán',
    payment_status       VARCHAR(20)   NOT NULL DEFAULT 'UNPAID' COMMENT 'UNPAID|PARTIAL|PAID',
    payment_due_date     DATE          NULL COMMENT 'Hạn thanh toán',
    expected_delivery_date DATE        NULL COMMENT 'Ngày giao hàng dự kiến',
    note                 TEXT          NULL,
    created_by           BIGINT        NOT NULL,
    created_at           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at           DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT fk_po_partner   FOREIGN KEY (partner_id)   REFERENCES PARTNERS(id),
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by)  REFERENCES USERS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Đơn mua hàng từ nhà cung cấp';

CREATE TABLE IF NOT EXISTS PURCHASE_ORDER_LINES (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id BIGINT        NOT NULL,
    variant_id        BIGINT        NOT NULL COMMENT 'FK → PRODUCT_VARIANTS',
    quantity          DECIMAL(15,4) NOT NULL,
    unit_price        DECIMAL(15,4) NOT NULL COMMENT 'Đơn giá mua',
    line_amount       DECIMAL(15,2) NOT NULL COMMENT 'quantity * unit_price',
    vat_rate          DECIMAL(5,2)  NOT NULL DEFAULT 0 COMMENT 'Thuế suất VAT (%)',
    vat_amount        DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'Tiền thuế dòng',
    note              TEXT          NULL,

    CONSTRAINT fk_pol_po      FOREIGN KEY (purchase_order_id) REFERENCES PURCHASE_ORDERS(id) ON DELETE CASCADE,
    CONSTRAINT fk_pol_variant FOREIGN KEY (variant_id)        REFERENCES PRODUCT_VARIANTS(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Dòng sản phẩm trong đơn mua hàng';

-- Index tìm kiếm phổ biến
CREATE INDEX idx_po_partner_id   ON PURCHASE_ORDERS(partner_id);
CREATE INDEX idx_po_status       ON PURCHASE_ORDERS(status);
CREATE INDEX idx_po_date         ON PURCHASE_ORDERS(po_date);
CREATE INDEX idx_pol_po_id       ON PURCHASE_ORDER_LINES(purchase_order_id);
CREATE INDEX idx_pol_variant_id  ON PURCHASE_ORDER_LINES(variant_id);
