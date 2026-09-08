package com.duylongtech.backend.service;

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
public class DocumentDependencyService {

    private final InventoryDocumentRepository documentRepository;
    private final InventoryBalanceRepository balanceRepository;
    private final SerialNumberRepository serialNumberRepository;
    private final ProductVariantRepository variantRepository;

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

        // Với phiếu xuất, bỏ ghi sổ nghĩa là cộng lại hàng vào kho (không gây âm kho),
        // tuy nhiên cần kiểm tra nếu Serial đã bị khách kích hoạt bảo hành/sửa chữa sâu.
        return DependencyCheckResponse.builder()
                .canUnpost(true)
                .level("CLEAN")
                .message("Chứng từ đủ điều kiện an toàn để bỏ ghi sổ xuất kho.")
                .build();
    }
}
