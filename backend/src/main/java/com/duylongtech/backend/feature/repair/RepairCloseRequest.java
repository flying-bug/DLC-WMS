package com.duylongtech.backend.feature.repair;

import lombok.Data;

@Data
public class RepairCloseRequest {
    private String paymentStatus; // PAID, DEBT_RECORDED, NO_CHARGE
    private String note;
}
