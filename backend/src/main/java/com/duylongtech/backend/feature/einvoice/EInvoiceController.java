package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.enums.DocumentStatus;

import com.duylongtech.backend.feature.einvoice.EInvoiceCancelRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceIssueRequest;
import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.einvoice.EInvoiceResponse;
import com.duylongtech.backend.feature.einvoice.EInvoice;
import com.duylongtech.backend.feature.einvoice.EInvoiceRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.feature.einvoice.EInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.Unit;

@RestController
@RequestMapping("/api/v1/einvoices")
@RequiredArgsConstructor
@Tag(name = "E-Invoice", description = "Quản lý Hóa đơn điện tử (Chuẩn NĐ 254 / TT 91)")
public class EInvoiceController {

    private final EInvoiceService einvoiceService;
    private final EInvoiceRepository einvoiceRepository;
    private final ProductVariantRepository productVariantRepository;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) authentication.getPrincipal()).getId();
        }
        return 1L;
    }

    @GetMapping
    @Operation(summary = "Danh sách hóa đơn điện tử phân trang")
    public ApiResponse<Page<EInvoiceResponse>> getInvoices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long partnerId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.success(einvoiceService.getInvoices(keyword, status, fromDate, toDate, partnerId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết hóa đơn điện tử theo ID")
    public ApiResponse<EInvoiceResponse> getInvoiceById(@PathVariable Long id) {
        return ApiResponse.success(einvoiceService.getInvoiceById(id));
    }

    @GetMapping("/by-so/{soId}")
    @Operation(summary = "Lấy danh sách hóa đơn điện tử của đơn bán hàng")
    public ApiResponse<java.util.List<EInvoiceResponse>> getInvoicesBySalesOrderId(@PathVariable Long soId) {
        return ApiResponse.success(einvoiceService.getInvoicesBySalesOrderId(soId));
    }

    @GetMapping("/by-export/{exportId}")
    @Operation(summary = "Lấy hóa đơn điện tử của phiếu xuất kho")
    public ApiResponse<EInvoiceResponse> getInvoiceByInventoryDocumentId(@PathVariable Long exportId) {
        return ApiResponse.success(einvoiceService.getInvoiceByInventoryDocumentId(exportId));
    }

    @PostMapping("/issue")
    @Operation(summary = "Phát hành hóa đơn điện tử từ đơn bán hàng hoặc phiếu xuất kho")
    public ApiResponse<EInvoiceResponse> issueInvoice(@Valid @RequestBody EInvoiceIssueRequest request) {
        EInvoiceResponse response = einvoiceService.issueInvoiceFromSalesOrder(request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Hủy hóa đơn điện tử")
    public ApiResponse<EInvoiceResponse> cancelInvoice(
            @PathVariable Long id,
            @Valid @RequestBody EInvoiceCancelRequest request
    ) {
        EInvoiceResponse response = einvoiceService.cancelInvoice(id, request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @GetMapping(value = "/preview/{transactionUuid}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    @Operation(summary = "Xem trực tuyến mẫu hóa đơn điện tử (HTML)")
    public ResponseEntity<String> previewHtml(@PathVariable String transactionUuid) {
        EInvoice invoice = einvoiceRepository.findByTransactionUuid(transactionUuid)
                .orElse(null);

        if (invoice == null) {
            return ResponseEntity.notFound().build();
        }

        String html = renderInvoiceHtml(invoice);
        return ResponseEntity.ok()
                .header("Content-Type", "text/html; charset=UTF-8")
                .header("X-Frame-Options", "ALLOWALL")
                .header("Content-Security-Policy", "frame-ancestors *")
                .body(html);
    }

    private String renderInvoiceHtml(EInvoice inv) {
        StringBuilder itemsHtml = new StringBuilder();
        int idx = 1;

        if (inv.getInventoryDocument() != null && inv.getInventoryDocument().getLines() != null && !inv.getInventoryDocument().getLines().isEmpty()) {
            for (var line : inv.getInventoryDocument().getLines()) {
                String itemName = "Sản phẩm";
                String sku = "SP" + line.getId();
                String unit = "Cái";

                if (line.getVariantId() != null) {
                    ProductVariant variant = productVariantRepository.findById(line.getVariantId()).orElse(null);
                    if (variant != null) {
                        sku = variant.getSku() != null ? variant.getSku() : sku;
                        String baseName = (variant.getProduct() != null && variant.getProduct().getProductName() != null)
                                ? variant.getProduct().getProductName() : (variant.getVariantName() != null ? variant.getVariantName() : "Sản phẩm");
                        String varDetail = (variant.getVariantName() != null && !variant.getVariantName().equalsIgnoreCase(baseName))
                                ? " (" + variant.getVariantName() + ")" : "";
                        itemName = baseName + varDetail;
                        if (variant.getProduct() != null && variant.getProduct().getUnit() != null) {
                            unit = variant.getProduct().getUnit().getName();
                        }
                    }
                }

                double qty = line.getQuantityOut() != null ? line.getQuantityOut().doubleValue() : 1.0;
                double price = line.getUnitPrice() != null ? line.getUnitPrice().doubleValue() : 0.0;
                double lineAmount = line.getLineAmount() != null ? line.getLineAmount().doubleValue() : (qty * price);

                String serialNote = line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()
                        ? String.format("<div style=\"font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 3px;\">S/N: %s</div>", line.getSerialNumbersText()) : "";

                itemsHtml.append(String.format("""
                    <tr>
                        <td class="text-center">%d</td>
                        <td>
                            <strong>%s</strong>
                            <div style="font-size: 11px; color: #64748b;">Mã SP: %s</div>
                            %s
                        </td>
                        <td class="text-center">%s</td>
                        <td class="text-right">%,.0f</td>
                        <td class="text-right">%,.0f đ</td>
                        <td class="text-right"><strong>%,.0f đ</strong></td>
                    </tr>
                """, idx++, itemName, sku, serialNote, unit, qty, price, lineAmount));
            }
        } else if (inv.getSalesOrder() != null && inv.getSalesOrder().getLines() != null && !inv.getSalesOrder().getLines().isEmpty()) {
            for (var sol : inv.getSalesOrder().getLines()) {
                String itemName = "Sản phẩm";
                String sku = "SP" + sol.getId();
                String unit = "Cái";

                if (sol.getVariant() != null) {
                    ProductVariant variant = sol.getVariant();
                    sku = variant.getSku() != null ? variant.getSku() : sku;
                    String baseName = (variant.getProduct() != null && variant.getProduct().getProductName() != null)
                            ? variant.getProduct().getProductName() : (variant.getVariantName() != null ? variant.getVariantName() : "Sản phẩm");
                    String varDetail = (variant.getVariantName() != null && !variant.getVariantName().equalsIgnoreCase(baseName))
                            ? " (" + variant.getVariantName() + ")" : "";
                    itemName = baseName + varDetail;
                    if (variant.getProduct() != null && variant.getProduct().getUnit() != null) {
                        unit = variant.getProduct().getUnit().getName();
                    }
                }

                double qty = sol.getQuantity() != null ? sol.getQuantity().doubleValue() : 1.0;
                double price = sol.getUnitPrice() != null ? sol.getUnitPrice().doubleValue() : 0.0;
                double lineAmount = sol.getLineAmount() != null ? sol.getLineAmount().doubleValue() : (qty * price);

                itemsHtml.append(String.format("""
                    <tr>
                        <td class="text-center">%d</td>
                        <td>
                            <strong>%s</strong>
                            <div style="font-size: 11px; color: #64748b;">Mã SP: %s</div>
                        </td>
                        <td class="text-center">%s</td>
                        <td class="text-right">%,.0f</td>
                        <td class="text-right">%,.0f đ</td>
                        <td class="text-right"><strong>%,.0f đ</strong></td>
                    </tr>
                """, idx++, itemName, sku, unit, qty, price, lineAmount));
            }
        } else {
            itemsHtml.append(String.format(com.duylongtech.backend.constant.EInvoiceTemplate.SUMMARY_ROW_TEMPLATE, inv.getInventoryDocument() != null ? ("phiếu xuất " + inv.getInventoryDocument().getDocCode())
                 : (inv.getSalesOrder() != null ? ("đơn hàng " + inv.getSalesOrder().getSoCode()) : inv.getTransactionUuid()),
                 inv.getSubTotalAmount() != null ? inv.getSubTotalAmount().doubleValue() : 0.0,
                 inv.getSubTotalAmount() != null ? inv.getSubTotalAmount().doubleValue() : 0.0));
        }

        return String.format(com.duylongtech.backend.constant.EInvoiceTemplate.MAIN_TEMPLATE,
            inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : inv.getTransactionUuid(),
            DocumentStatus.CANCELED.name().equals(inv.getStatus()) ? "<div class=\"watermark\">HÓA ĐƠN ĐÃ HỦY</div>" : "",
            inv.getTemplateCode(),
            inv.getInvoiceSeries(),
            inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "Chưa cấp số",
            inv.getInvoiceDate(),
            inv.getCqtCode() != null ? inv.getCqtCode() : "Hệ thống CQT đang xử lý",
            inv.getBuyerName() != null ? inv.getBuyerName() : "Khách lẻ",
            inv.getInventoryDocument() != null ? ("PXK: " + inv.getInventoryDocument().getDocCode() + (inv.getSalesOrder() != null ? " (Đơn: " + inv.getSalesOrder().getSoCode() + ")" : ""))
                 : (inv.getSalesOrder() != null ? inv.getSalesOrder().getSoCode() : (inv.getTransactionUuid() != null ? inv.getTransactionUuid() : "—")),
            inv.getBuyerLegalName() != null ? inv.getBuyerLegalName() : (inv.getBuyerName() != null ? inv.getBuyerName() : "Khách lẻ"),
            inv.getBuyerTaxCode() != null && !inv.getBuyerTaxCode().isBlank() ? inv.getBuyerTaxCode() : "—",
            inv.getBuyerPhone() != null ? inv.getBuyerPhone() : "—",
            inv.getBuyerAddress() != null ? inv.getBuyerAddress() : "—",
            inv.getPaymentMethod(),
            inv.getCurrencyCode(),
            itemsHtml.toString(),
            inv.getSubTotalAmount(),
            inv.getVatAmount(),
            inv.getTotalAmount(),
            inv.getTotalAmountInWords() != null ? inv.getTotalAmountInWords() : "",
            inv.getIssuedAt() != null ? inv.getIssuedAt().toString() : "2026-08-18"
        );
    }
}
