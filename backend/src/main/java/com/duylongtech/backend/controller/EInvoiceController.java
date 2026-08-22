package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.EInvoiceCancelRequest;
import com.duylongtech.backend.dto.request.EInvoiceIssueRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.EInvoiceResponse;
import com.duylongtech.backend.entity.EInvoice;
import com.duylongtech.backend.repository.EInvoiceRepository;
import com.duylongtech.backend.security.UserDetailsImpl;
import com.duylongtech.backend.service.EInvoiceService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/einvoices")
@RequiredArgsConstructor
@Tag(name = "E-Invoice", description = "Quản lý Hóa đơn điện tử (Chuẩn NĐ 254 / TT 91)")
public class EInvoiceController {

    private final EInvoiceService einvoiceService;
    private final EInvoiceRepository einvoiceRepository;

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

                double qty = line.getQuantityOut() != null ? line.getQuantityOut().doubleValue() : 1.0;
                double price = line.getUnitPrice() != null ? line.getUnitPrice().doubleValue() : 0.0;
                double lineAmount = line.getLineAmount() != null ? line.getLineAmount().doubleValue() : (qty * price);

                String serialNote = line.getSerialNumbersText() != null && !line.getSerialNumbersText().isBlank()
                        ? String.format("<div style=\"font-size: 11px; color: #0284c7;\">Serial: %s</div>", line.getSerialNumbersText()) : "";

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
                    sku = sol.getVariant().getSku() != null ? sol.getVariant().getSku() : sku;
                    if (sol.getVariant().getProduct() != null) {
                        itemName = sol.getVariant().getProduct().getProductName();
                        if (sol.getVariant().getProduct().getUnit() != null) {
                            unit = sol.getVariant().getProduct().getUnit().getName();
                        }
                    } else if (sol.getVariant().getVariantName() != null) {
                        itemName = sol.getVariant().getVariantName();
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
            itemsHtml.append(String.format("""
                <tr>
                    <td class="text-center">1</td>
                    <td>Hàng hóa / Dịch vụ theo %s</td>
                    <td class="text-center">Gói</td>
                    <td class="text-right">1</td>
                    <td class="text-right">%,.0f đ</td>
                    <td class="text-right">%,.0f đ</td>
                </tr>
            """, inv.getInventoryDocument() != null ? ("phiếu xuất " + inv.getInventoryDocument().getDocCode())
                 : (inv.getSalesOrder() != null ? ("đơn hàng " + inv.getSalesOrder().getSoCode()) : inv.getTransactionUuid()),
                 inv.getSubTotalAmount() != null ? inv.getSubTotalAmount().doubleValue() : 0.0,
                 inv.getSubTotalAmount() != null ? inv.getSubTotalAmount().doubleValue() : 0.0));
        }

        return String.format("""
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <title>HÓA ĐƠN GIÁ TRỊ GIA TĂNG - %s</title>
                <style>
                    body { font-family: 'Times New Roman', Times, serif; padding: 30px; color: #111; max-width: 880px; margin: 0 auto; background: #f8fafc; }
                    .invoice-card { background: #fff; padding: 40px; border: 2px solid #0075c0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; }
                    .watermark { position: absolute; top: 45%%; left: 20%%; font-size: 60px; color: rgba(220, 38, 38, 0.12); transform: rotate(-30deg); font-weight: bold; pointer-events: none; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0075c0; padding-bottom: 15px; margin-bottom: 20px; }
                    .company-title { font-size: 18px; font-weight: bold; color: #0075c0; text-transform: uppercase; }
                    .invoice-title { text-align: center; margin: 20px 0; }
                    .invoice-title h1 { margin: 0; font-size: 24px; color: #dc2626; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
                    table { width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
                    th, td { border: 1px solid #999; padding: 8px 10px; }
                    th { background-color: #f0f4f8; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px; }
                    .sig-box { width: 250px; }
                    .digital-stamp { border: 2px dashed #16a34a; border-radius: 6px; padding: 10px; margin-top: 15px; color: #16a34a; font-size: 12px; background: #f0fdf4; }
                </style>
            </head>
            <body>
                <div class="invoice-card">
                    %s
                    <div class="header">
                        <div>
                            <div class="company-title">CÔNG TY TNHH CÔNG NGHỆ DUY LONG</div>
                            <div>Mã số thuế: <strong>0100109106</strong></div>
                            <div>Địa chỉ: Hà Nội, Việt Nam</div>
                            <div>Điện thoại: 0987.654.321 - Email: contact@duylongtech.com</div>
                        </div>
                        <div style="text-align: right;">
                            <div>Mẫu số: <strong>%s</strong></div>
                            <div>Ký hiệu: <strong>%s</strong></div>
                            <div>Số HĐ: <strong style="color: #dc2626; font-size: 18px;">%s</strong></div>
                        </div>
                    </div>

                    <div class="invoice-title">
                        <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
                        <div style="font-style: italic; margin-top: 5px;">(Khởi tạo từ hệ thống Hóa đơn điện tử DLC-WMS theo Nghị định 254/2026/NĐ-CP)</div>
                        <div style="margin-top: 5px;">Ngày lập: <strong>%s</strong></div>
                        <div style="color: #16a34a; margin-top: 4px; font-size: 13px;">Mã CQT: <strong>%s</strong></div>
                    </div>

                    <div class="info-grid">
                        <div>Họ tên người mua: <strong>%s</strong></div>
                        <div>Đơn bán hàng tham chiếu: <strong>%s</strong></div>
                        <div style="grid-column: span 2;">Tên đơn vị: <strong>%s</strong></div>
                        <div>Mã số thuế: <strong>%s</strong></div>
                        <div>Điện thoại: <strong>%s</strong></div>
                        <div style="grid-column: span 2;">Địa chỉ: <strong>%s</strong></div>
                        <div>Hình thức thanh toán: <strong>%s</strong></div>
                        <div>Đồng tiền thanh toán: <strong>%s</strong></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">STT</th>
                                <th>Tên hàng hóa, dịch vụ</th>
                                <th style="width: 60px;">ĐVT</th>
                                <th style="width: 80px;">Số lượng</th>
                                <th style="width: 120px;">Đơn giá</th>
                                <th style="width: 130px;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            %s
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="5" class="text-right"><strong>Cộng tiền hàng:</strong></td>
                                <td class="text-right"><strong>%,.0f đ</strong></td>
                            </tr>
                            <tr>
                                <td colspan="5" class="text-right"><strong>Tiền thuế GTGT (VAT):</strong></td>
                                <td class="text-right" style="color: #dc2626;"><strong>%,.0f đ</strong></td>
                            </tr>
                            <tr>
                                <td colspan="5" class="text-right" style="font-size: 15px;"><strong>Tổng cộng thanh toán:</strong></td>
                                <td class="text-right" style="color: #16a34a; font-size: 16px;"><strong>%,.0f đ</strong></td>
                            </tr>
                            <tr>
                                <td colspan="6">Số tiền bằng chữ: <em>%s</em></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="footer-signatures">
                        <div class="sig-box">
                            <strong>NGƯỜI MUA HÀNG</strong><br>
                            <em>(Ký, ghi rõ họ tên)</em>
                        </div>
                        <div class="sig-box">
                            <strong>NGƯỜI BÁN HÀNG</strong><br>
                            <em>(Chữ ký điện tử)</em>
                            <div class="digital-stamp">
                                ✔ Ký bởi: CÔNG TY TNHH CÔNG NGHỆ DUY LONG<br>
                                Ngày ký: %s<br>
                                Trạng thái: Hợp lệ theo Thông tư 91/2026/TT-BTC
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """,
            inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : inv.getTransactionUuid(),
            "CANCELED".equals(inv.getStatus()) ? "<div class=\"watermark\">HÓA ĐƠN ĐÃ HỦY</div>" : "",
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
