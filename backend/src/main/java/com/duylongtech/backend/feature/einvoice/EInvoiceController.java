package com.duylongtech.backend.feature.einvoice;

import com.duylongtech.backend.feature.einvoice.EInvoiceCancelRequest;
import com.duylongtech.backend.feature.einvoice.EInvoiceIssueRequest;
import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.einvoice.EInvoiceResponse;
import com.duylongtech.backend.feature.einvoice.EInvoice;
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

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) authentication.getPrincipal()).getId();
        }
        return 1L;
    }

    @GetMapping
    @Operation(summary = "Danh sách hóa đơn điện tử phân trang")
    @PreAuthorize("hasAuthority('einvoice:view')")
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
    @PreAuthorize("hasAuthority('einvoice:view')")
    public ApiResponse<EInvoiceResponse> getInvoiceById(@PathVariable Long id) {
        return ApiResponse.success(einvoiceService.getInvoiceById(id));
    }

    @GetMapping("/by-so/{soId}")
    @Operation(summary = "Lấy danh sách hóa đơn điện tử của đơn bán hàng")
    @PreAuthorize("hasAuthority('einvoice:view')")
    public ApiResponse<java.util.List<EInvoiceResponse>> getInvoicesBySalesOrderId(@PathVariable Long soId) {
        return ApiResponse.success(einvoiceService.getInvoicesBySalesOrderId(soId));
    }

    @GetMapping("/by-export/{exportId}")
    @Operation(summary = "Lấy hóa đơn điện tử của phiếu xuất kho")
    @PreAuthorize("hasAuthority('einvoice:view')")
    public ApiResponse<EInvoiceResponse> getInvoiceByInventoryDocumentId(@PathVariable Long exportId) {
        return ApiResponse.success(einvoiceService.getInvoiceByInventoryDocumentId(exportId));
    }

    @PostMapping("/issue")
    @Operation(summary = "Phát hành hóa đơn điện tử từ đơn bán hàng hoặc phiếu xuất kho")
    @PreAuthorize("hasAuthority('einvoice:add')")
    public ApiResponse<EInvoiceResponse> issueInvoice(@Valid @RequestBody EInvoiceIssueRequest request) {
        EInvoiceResponse response = einvoiceService.issueInvoiceFromSalesOrder(request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Hủy hóa đơn điện tử")
    @PreAuthorize("hasAuthority('einvoice:edit')")
    public ApiResponse<EInvoiceResponse> cancelInvoice(
            @PathVariable Long id,
            @Valid @RequestBody EInvoiceCancelRequest request
    ) {
        EInvoiceResponse response = einvoiceService.cancelInvoice(id, request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @PostMapping("/{id}/replace")
    @Operation(summary = "Thay thế hóa đơn điện tử")
    @PreAuthorize("hasAuthority('einvoice:edit')")
    public ApiResponse<EInvoiceResponse> replaceInvoice(
            @PathVariable Long id,
            @Valid @RequestBody EInvoiceReplaceRequest request
    ) {
        EInvoiceResponse response = einvoiceService.replaceInvoice(id, request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @PostMapping("/{id}/adjust")
    @Operation(summary = "Điều chỉnh hóa đơn điện tử")
    @PreAuthorize("hasAuthority('einvoice:edit')")
    public ApiResponse<EInvoiceResponse> adjustInvoice(
            @PathVariable Long id,
            @Valid @RequestBody EInvoiceAdjustRequest request
    ) {
        EInvoiceResponse response = einvoiceService.adjustInvoice(id, request, getCurrentUserId());
        return ApiResponse.success(response);
    }

    @GetMapping(value = "/preview/{transactionUuid}", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    @Operation(summary = "Xem trực tuyến mẫu hóa đơn điện tử (HTML)")
    public ResponseEntity<String> previewHtml(@PathVariable String transactionUuid) {
        String html = einvoiceService.renderPreviewHtml(transactionUuid);
        if (html == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header("Content-Type", "text/html; charset=UTF-8")
                .header("X-Frame-Options", "ALLOWALL")
                .header("Content-Security-Policy", "frame-ancestors *")
                .body(html);
    }
}
