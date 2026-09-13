package com.duylongtech.backend.feature.warranty;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.partner.Partner;

@Entity
@Table(name = "WARRANTIES")
@Getter
@Setter
@NoArgsConstructor
public class Warranty {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warranty_code", nullable = false, unique = true, length = 50)
    private String warrantyCode;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "sales_order_id")
    private Long salesOrderId;

    @Column(name = "export_slip_id")
    private Long exportSlipId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "export_slip_id", insertable = false, updatable = false)
    private InventoryDocument exportSlip;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "warranty_status", nullable = false, length = 30)
    private String warrantyStatus;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @OneToMany(mappedBy = "warranty", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<WarrantyLine> lines = new java.util.ArrayList<>();

    public void initWarranty(String warrantyCode, Long partnerId, Long salesOrderId, LocalDate startDate, LocalDate endDate, String warrantyStatus, String note) {
        this.warrantyCode = warrantyCode;
        this.partnerId = partnerId;
        this.salesOrderId = salesOrderId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.warrantyStatus = warrantyStatus;
        this.note = note;
    }
}
