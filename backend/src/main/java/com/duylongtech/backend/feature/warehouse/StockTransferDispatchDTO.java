package com.duylongtech.backend.feature.warehouse;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransferDispatchDTO {
    private List<String> serialNumbers; // Serials to dispatch
}
