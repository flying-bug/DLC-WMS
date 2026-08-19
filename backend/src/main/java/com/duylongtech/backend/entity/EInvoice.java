package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "E_INVOICES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sales_order_id")
    private Long salesOrderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", insertable = false, updatable = false)
    private SalesOrder salesOrder;

    @Column(name = "inventory_document_id")
    private Long inventoryDocumentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_document_id", insertable = false, updatable = false)
    private InventoryDocument inventoryDocument;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "invoice_type", nullable = false, length = 20)
    @Builder.Default
    private String invoiceType = "1";

    @Column(name = "template_code", nullable = false, length = 50)
    private String templateCode;

    @Column(name = "invoice_series", nullable = false, length = 50)
    private String invoiceSeries;

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "ISSUED"; // DRAFT, ISSUED, CANCELED, REPLACED, ADJUSTED

    // Buyer Information
    @Column(name = "buyer_name", length = 150)
    private String buyerName;

    @Column(name = "buyer_legal_name", length = 255)
    private String buyerLegalName;

    @Column(name = "buyer_tax_code", length = 50)
    private String buyerTaxCode;

    @Column(name = "buyer_address", columnDefinition = "TEXT")
    private String buyerAddress;

    @Column(name = "buyer_phone", length = 30)
    private String buyerPhone;

    @Column(name = "buyer_email", length = 150)
    private String buyerEmail;

    // Currency & Amounts
    @Column(name = "currency_code", nullable = false, length = 10)
    @Builder.Default
    private String currencyCode = "VND";

    @Column(name = "exchange_rate", nullable = false, precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal exchangeRate = BigDecimal.ONE;

    @Column(name = "payment_method", nullable = false, length = 50)
    @Builder.Default
    private String paymentMethod = "TM/CK";

    @Column(name = "sub_total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal subTotalAmount = BigDecimal.ZERO;

    @Column(name = "vat_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "total_amount_in_words", length = 500)
    private String totalAmountInWords;

    // Tax Authority (CQT) & Transaction
    @Column(name = "cqt_code", length = 100)
    private String cqtCode;

    @Column(name = "cqt_status", nullable = false, length = 50)
    @Builder.Default
    private String cqtStatus = "VALID"; // VALID, PENDING, REJECTED, NONE

    @Column(name = "transaction_uuid", nullable = false, unique = true, length = 100)
    private String transactionUuid;

    @Column(name = "provider", nullable = false, length = 50)
    @Builder.Default
    private String provider = "MOCK"; // VIETTEL, MISA, XINVOICE, MOCK

    // URLs & Data
    @Column(name = "view_url", columnDefinition = "TEXT")
    private String viewUrl;

    @Column(name = "pdf_url", columnDefinition = "TEXT")
    private String pdfUrl;

    @Column(name = "pdf_data", columnDefinition = "LONGTEXT")
    private String pdfData;

    @Column(name = "xml_data", columnDefinition = "LONGTEXT")
    private String xmlData;

    @Column(name = "raw_request", columnDefinition = "LONGTEXT")
    private String rawRequest;

    @Column(name = "raw_response", columnDefinition = "LONGTEXT")
    private String rawResponse;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "canceled_at")
    private LocalDateTime canceledAt;

    @Column(name = "canceled_by")
    private Long canceledBy;

    // Audit Info
    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime updatedAt;
}
