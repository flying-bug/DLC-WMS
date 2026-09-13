package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "STOCKTAKE_LINE_SERIALS")
@Getter
@NoArgsConstructor
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

    public void initSerial(Long serialNumberId, String serialNumber, String scanStatus, String note) {
        this.serialNumberId = serialNumberId;
        this.serialNumber = serialNumber;
        this.scanStatus = scanStatus != null ? scanStatus : "MATCHED";
        this.note = note;
    }

    void setStocktakeLine(StocktakeLine stocktakeLine) {
        this.stocktakeLine = stocktakeLine;
    }
}
