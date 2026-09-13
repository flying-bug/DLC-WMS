package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;
import com.duylongtech.backend.feature.product.SerialNumber;

@Entity
@Table(name = "STOCKTAKE_LINE_SERIALS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLineSerial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stocktake_line_id", nullable = false)
    private StocktakeLine stocktakeLine;

    @Column(name = "serial_number_id")
    private Long serialNumberId;

    @Column(name = "serial_number", nullable = false, length = 100)
    private String serialNumber;

    @Column(name = "scan_status", nullable = false, length = 30)
    private String scanStatus; // MATCHED, MISSING, UNEXPECTED

    @Column(name = "note", length = 255)
    private String note;
}
