package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "SALES_ORDERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "so_code", nullable = false, unique = true, length = 50)
    private String soCode;

    @Column(name = "so_date", nullable = false)
    private LocalDate soDate;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;
}
