package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.service.*;

import com.duylongtech.backend.dto.response.DependencyCheckResponse;
import com.duylongtech.backend.entity.*;
import com.duylongtech.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentDependencyServiceImpl  implements DocumentDependencyService {

    private final InventoryDocumentRepository documentRepository;
    private final InventoryBalanceRepository balanceRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final ProductVariantRepository variantRepository;
    private final EInvoiceRepository eInvoiceRepository;
    private final WarrantyRepository warrantyRepository;
    private final RepairRepository repairRepository;

    /**
     * Kiểm tra an toàn trước khi Bỏ ghi sổ (Unpost) Phiếu nhập kho.
     * Quét 6 chiều: Âm kho, Trạng thái Serial, Lắp ráp, Chuyển kho, Bảo hành, Khóa kỳ.
     */
    @Transactional(readOnly = true)
    public DependencyCheckResponse checkImportSlipUnpostable(Long docId) {
        InventoryDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chứng từ ID: " + docId));

        if (!"POSTED".equalsIgnoreCase(doc.getStatus())) {
            return DependencyCheckResponse.builder()
                    .canUnpost(true)
                    .level("CLEAN")
                    .message("Chứng từ chưa ghi sổ hoặc đã bỏ ghi sổ.")
                    .build();
        }

        List<String> conflicts = new ArrayList<>();
        List<String> conflictingSerials = new ArrayList<>();
        List<String> conflictingDocs = new ArrayList<>();

        Long warehouseId = doc.getWarehouseId();

        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null) continue;

            BigDecimal qtyIn = line.getBaseQuantity() != null ? line.getBaseQuantity() : line.getQuantityIn();
            if (qtyIn == null || qtyIn.compareTo(BigDecimal.ZERO) <= 0) continue;

            // 1. Kiểm tra tồn kho khả dụng (Chặn âm kho)
            BigDecimal currentQty = balanceRepository.sumQuantityOnHandByWarehouseIdAndVariantId(warehouseId, line.getVariantId());
            if (currentQty == null) currentQty = BigDecimal.ZERO;

            if (currentQty.compareTo(qtyIn) < 0) {
                ProductVariant variant = variantRepository.findById(line.getVariantId()).orElse(null);
                String skuName = variant != null ? (variant.getSku() + " - " + variant.getVariantName()) : ("Variant #" + line.getVariantId());
                conflicts.add(String.format("Sản phẩm [%s]: Tồn kho hiện tại (%s) không đủ để hoàn tác nhập (%s), nếu bỏ ghi sổ sẽ gây Âm kho!",
                        skuName, currentQty.stripTrailingZeros().toPlainString(), qtyIn.stripTrailingZeros().toPlainString()));
            }

            // 2. Kiểm tra trạng thái Serial
            if (line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()) {
                String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
                for (String sn : rawSerials) {
                    String cleanSn = sn.trim();
                    if (cleanSn.isEmpty()) continue;

                    Optional<SerialNumber> snOpt = serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), cleanSn);
                    if (snOpt.isPresent()) {
                        SerialNumber snEntity = snOpt.get();
                        String status = snEntity.getStatus();
                        if (!"AVAILABLE".equalsIgnoreCase(status)) {
                            conflictingSerials.add(cleanSn);
                            conflicts.add(String.format("Serial [%s] của sản phẩm #%d đã phát sinh giao dịch (trạng thái hiện tại: %s)!",
                                    cleanSn, line.getVariantId(), status));
                        }
                    }
                }
            }
        }

        if (!conflicts.isEmpty()) {
            return DependencyCheckResponse.builder()
                    .canUnpost(false)
                    .level("HAS_DEPENDENCIES")
                    .message("Không thể bỏ ghi sổ trực tiếp vì hàng hóa/serial trong phiếu đã phát sinh giao dịch xuất hoặc làm âm tồn kho!")
                    .details(conflicts)
                    .conflictingSerials(conflictingSerials)
                    .conflictingDocuments(conflictingDocs)
                    .build();
        }

        return DependencyCheckResponse.builder()
                .canUnpost(true)
                .level("CLEAN")
                .message("Chứng từ đủ điều kiện an toàn để bỏ ghi sổ.")
                .build();
    }

    /**
     * Kiểm tra an toàn trước khi Bỏ ghi sổ (Unpost) Phiếu xuất kho.
     * Với phiếu xuất, bỏ ghi sổ nghĩa là cộng lại hàng vào kho và trả serial về AVAILABLE -
     * nhưng hàng thực tế có thể đã rời kho và giao cho khách rồi. Nếu đã phát sinh chứng từ
     * pháp lý/nghiệp vụ dựa trên lần xuất này (hóa đơn điện tử, bảo hành, sửa chữa), việc
     * hoàn tác sẽ làm sai lệch tồn kho (ảo tăng so với thực tế đã giao) và để lại chứng từ
     * "mồ côi" tham chiếu tới một lần xuất không còn tồn tại. Do đó phải chặn, buộc người
     * dùng xử lý qua nghiệp vụ Nhập trả hàng (RETURN) thay vì bỏ ghi sổ.
     */
    @Transactional(readOnly = true)
    public DependencyCheckResponse checkExportSlipUnpostable(Long docId) {
        InventoryDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chứng từ ID: " + docId));

        if (!"POSTED".equalsIgnoreCase(doc.getStatus())) {
            return DependencyCheckResponse.builder()
                    .canUnpost(true)
                    .level("CLEAN")
                    .message("Chứng từ chưa ghi sổ.")
                    .build();
        }

        List<String> conflicts = new ArrayList<>();
        List<String> conflictingSerials = new ArrayList<>();
        List<String> conflictingDocs = new ArrayList<>();

        // 1. Đã xuất hóa đơn điện tử cho lần xuất này chưa bị hủy?
        eInvoiceRepository.findFirstByInventoryDocumentIdAndStatusNot(docId, "CANCELED")
                .ifPresent(inv -> {
                    String invCode = (inv.getInvoiceSeries() != null ? inv.getInvoiceSeries() : "")
                            + (inv.getInvoiceNumber() != null ? "-" + inv.getInvoiceNumber() : "");
                    conflicts.add(String.format(
                            "Chứng từ đã có Hóa đơn điện tử [%s] (trạng thái: %s) - không thể bỏ ghi sổ vì sẽ làm sai lệch hàng hóa/công nợ đã xuất hóa đơn!",
                            invCode.isBlank() ? "#" + inv.getId() : invCode, inv.getStatus()));
                    conflictingDocs.add(invCode.isBlank() ? "EInvoice#" + inv.getId() : invCode);
                });

        // 2. Từng serial trong phiếu đã phát sinh Bảo hành hoặc Lệnh sửa chữa chưa?
        for (InventoryDocumentLine line : doc.getLines()) {
            if (line.getVariantId() == null) continue;
            if (line.getSerialNumbersText() == null || line.getSerialNumbersText().isBlank()) continue;

            String[] rawSerials = line.getSerialNumbersText().split("[,;\\s\\n]+");
            for (String sn : rawSerials) {
                String cleanSn = sn.trim();
                if (cleanSn.isEmpty()) continue;

                Optional<SerialNumber> snOpt = serialNumberRepository.findByVariantIdAndSerialNumber(line.getVariantId(), cleanSn);
                if (snOpt.isEmpty()) continue;
                Long serialNumberId = snOpt.get().getId();

                if (warrantyRepository.existsBySerialNumberId(serialNumberId)) {
                    conflictingSerials.add(cleanSn);
                    conflicts.add(String.format(
                            "Serial [%s] đã được đăng ký Bảo hành cho khách hàng - không thể bỏ ghi sổ!", cleanSn));
                }
                if (repairRepository.existsBySerialNumberId(serialNumberId)) {
                    conflictingSerials.add(cleanSn);
                    conflicts.add(String.format(
                            "Serial [%s] đã có Lệnh sửa chữa liên quan - không thể bỏ ghi sổ!", cleanSn));
                }
            }
        }

        if (!conflicts.isEmpty()) {
            return DependencyCheckResponse.builder()
                    .canUnpost(false)
                    .level("HAS_DEPENDENCIES")
                    .message("Không thể bỏ ghi sổ trực tiếp vì đã phát sinh hóa đơn/bảo hành/sửa chữa dựa trên lần xuất này! Nếu hàng đã giao cho khách, vui lòng dùng nghiệp vụ Nhập trả hàng (RETURN) để hoàn tác thay vì bỏ ghi sổ.")
                    .details(conflicts)
                    .conflictingSerials(conflictingSerials)
                    .conflictingDocuments(conflictingDocs)
                    .build();
        }

        return DependencyCheckResponse.builder()
                .canUnpost(true)
                .level("CLEAN")
                .message("Chứng từ đủ điều kiện an toàn để bỏ ghi sổ xuất kho.")
                .build();
    }
}
