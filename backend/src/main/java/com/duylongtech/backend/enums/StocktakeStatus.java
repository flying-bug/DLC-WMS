package com.duylongtech.backend.enums;

public enum StocktakeStatus {
    DRAFT,
    /** Chờ manager duyệt. Kho chưa bị khóa. */
    PENDING_APPROVAL,
    /** Manager từ chối - kết thúc, không khóa kho. */
    REJECTED,
    /** Đã được duyệt và đang kiểm kê: kho của phiếu bị khóa nhập/xuất/chuyển cho tới khi phiếu POSTED/CANCELLED. */
    COUNTING,
    COMPLETED,
    POSTED,
    CANCELLED
}
