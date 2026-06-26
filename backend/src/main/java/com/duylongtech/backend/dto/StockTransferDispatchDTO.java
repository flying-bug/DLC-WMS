package com.duylongtech.backend.dto;

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
