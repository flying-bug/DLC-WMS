package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "REPAIRS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repair {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repair_code", nullable = false, unique = true, length = 50)
    private String repairCode;

    @Column(name = "warranty_id", nullable = false)
    private Long warrantyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "serial_number_id", nullable = false)
    private Long serialNumberId;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "repair_status", nullable = false, length = 30)
    private String repairStatus;
}
