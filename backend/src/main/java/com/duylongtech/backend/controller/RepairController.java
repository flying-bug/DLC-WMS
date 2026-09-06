package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.RepairFeeRequest;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.request.RepairRequest;
import com.duylongtech.backend.dto.request.RepairStatusRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.RepairFeeResponse;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.service.RepairService;
import com.duylongtech.backend.service.RepairWorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho Repair Management (007).
 * Base URL: /api/v1/repairs
 *
 * Endpoints theo contracts.md:
 *   POST   /api/v1/repairs                        - Tạo lệnh sửa chữa
 *   PUT    /api/v1/repairs/{id}                   - Cập nhật lệnh
 *   GET    /api/v1/repairs                        - Danh sách (phân trang + lọc)
 *   GET    /api/v1/repairs/{id}                   - Chi tiết lệnh
 *   POST   /api/v1/repairs/{id}/lines             - Thêm linh kiện
 *   DELETE /api/v1/repairs/{id}/lines/{lineId}    - Xóa linh kiện
 *   POST   /api/v1/repairs/{id}/fees              - Thêm phí dịch vụ
 *   DELETE /api/v1/repairs/{id}/fees/{feeId}      - Xóa phí dịch vụ
 *   PUT    /api/v1/repairs/{id}/status            - Chuyển trạng thái
 */
@RestController
@RequestMapping("/api/v1/repairs")
@RequiredArgsConstructor
@Tag(name = "Repair Management", description = "API quản lý vòng đời Lệnh Sửa Chữa (Repair Order)")
public class RepairController {

    private final RepairService repairService;
    private final RepairWorkflowService repairWorkflowService;

    // =========================================================================
    // 1. Manage Repairs
    // =========================================================================

    @GetMapping
    @PreAuthorize("hasAuthority('repair:view')")
    @Operation(
            summary = "Lấy danh sách lệnh sửa chữa",
            description = "Trả về danh sách có phân trang, lọc theo keyword và trạng thái"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Thành công")
    public ApiResponse<Page<RepairResponse>> getRepairs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(repairService.getRepairs(keyword, status, fromDate, toDate, page, size));
    }

    @GetMapping("/check-code")
    @PreAuthorize("hasAuthority('repair:view')")
    @Operation(summary = "Kiểm tra mã lệnh sửa chữa có bị trùng không",
            description = "Trả về {exists: true/false}. Dùng để validate real-time trên Frontend.")
    public ApiResponse<java.util.Map<String, Boolean>> checkRepairCode(@RequestParam String code) {
        boolean exists = repairService.checkCodeExists(code);
        return ApiResponse.success(java.util.Map.of("exists", exists));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('repair:view')")
    @Operation(
            summary = "Lấy chi tiết lệnh sửa chữa",
            description = "Trả về chi tiết lệnh kèm danh sách linh kiện (lines) và phí dịch vụ (fees)"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Không tìm thấy lệnh")
    public ApiResponse<RepairResponse> getRepairById(@PathVariable Long id) {
        return ApiResponse.success(repairService.getRepairById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('repair:add')")
    @Operation(
            summary = "Tạo lệnh sửa chữa mới",
            description = "Tạo lệnh sửa chữa với trạng thái DRAFT. Bắt buộc: partnerId, productId."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Tạo thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ")
    public ApiResponse<RepairResponse> createRepair(@Valid @RequestBody RepairRequest request) {
        return ApiResponse.success(repairService.createRepair(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(
            summary = "Cập nhật lệnh sửa chữa",
            description = "Chỉ cho phép cập nhật khi lệnh đang ở trạng thái DRAFT hoặc QUOTATION"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cập nhật thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Không thể sửa ở trạng thái này")
    public ApiResponse<RepairResponse> updateRepair(
            @PathVariable Long id,
            @Valid @RequestBody RepairRequest request
    ) {
        return ApiResponse.success(repairService.updateRepair(id, request));
    }

    @PatchMapping("/{id}/internal-notes")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(summary = "Cập nhật ghi chú nội bộ")
    public ApiResponse<RepairResponse> updateInternalNotes(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload
    ) {
        return ApiResponse.success(repairService.updateInternalNotes(id, payload.get("notes")));
    }

    // =========================================================================
    // 2. Manage Repair Lines (Linh kiện)
    // =========================================================================

    @PostMapping("/{id}/lines")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('repair:add')")
    @Operation(
            summary = "Thêm linh kiện vào lệnh sửa chữa",
            description = "actionType: ADD (lấy từ kho) hoặc REMOVE (tháo ra vào Scrap). " +
                    "Nếu lệnh có underWarranty=true hoặc isFreeWarranty=true thì unitPrice tự động = 0."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Thêm thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Dữ liệu không hợp lệ hoặc lệnh không thể sửa")
    public ApiResponse<RepairLineResponse> addRepairLine(
            @PathVariable Long id,
            @Valid @RequestBody RepairLineRequest request
    ) {
        return ApiResponse.success(repairService.addRepairLine(id, request));
    }

    @DeleteMapping("/{id}/lines/{lineId}")
    @PreAuthorize("hasAuthority('repair:delete')")
    @Operation(
            summary = "Xóa dòng linh kiện khỏi lệnh sửa chữa",
            description = "Chỉ xóa được khi lệnh ở trạng thái DRAFT hoặc QUOTATION"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Xóa thành công")
    public ApiResponse<Void> deleteRepairLine(@PathVariable Long id, @PathVariable Long lineId) {
        repairService.deleteRepairLine(id, lineId);
        return ApiResponse.success();
    }

    @PutMapping("/{id}/lines/{lineId}")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(
            summary = "Cập nhật dòng linh kiện trong lệnh sửa chữa"
    )
    public ApiResponse<RepairLineResponse> updateRepairLine(
            @PathVariable Long id,
            @PathVariable Long lineId,
            @RequestBody RepairLineRequest request
    ) {
        return ApiResponse.success(repairService.updateRepairLine(id, lineId, request));
    }

    // =========================================================================
    // 3. Manage Repair Fees (Phí dịch vụ)
    // =========================================================================

    @PostMapping("/{id}/fees")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('repair:add')")
    @Operation(
            summary = "Thêm phí dịch vụ vào lệnh sửa chữa",
            description = "VD: Phí vệ sinh máy, Phí công thợ. Nếu bảo hành thì feeAmount tự động = 0."
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Thêm thành công")
    public ApiResponse<RepairFeeResponse> addRepairFee(
            @PathVariable Long id,
            @Valid @RequestBody RepairFeeRequest request
    ) {
        return ApiResponse.success(repairService.addRepairFee(id, request));
    }

    @DeleteMapping("/{id}/fees/{feeId}")
    @PreAuthorize("hasAuthority('repair:delete')")
    @Operation(
            summary = "Xóa dòng phí dịch vụ khỏi lệnh sửa chữa",
            description = "Chỉ xóa được khi lệnh ở trạng thái DRAFT hoặc QUOTATION"
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Xóa thành công")
    public ApiResponse<Void> deleteRepairFee(@PathVariable Long id, @PathVariable Long feeId) {
        repairService.deleteRepairFee(id, feeId);
        return ApiResponse.success();
    }

    @PutMapping("/{id}/fees/{feeId}")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(
            summary = "Cập nhật dòng phí dịch vụ trong lệnh sửa chữa"
    )
    public ApiResponse<RepairFeeResponse> updateRepairFee(
            @PathVariable Long id,
            @PathVariable Long feeId,
            @RequestBody RepairFeeRequest request
    ) {
        return ApiResponse.success(repairService.updateRepairFee(id, feeId, request));
    }

    // =========================================================================
    // 4. Workflow: Chuyển trạng thái
    // =========================================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('repair:edit')")
    @Operation(
            summary = "Chuyển trạng thái lệnh sửa chữa",
            description = """
                    State Machine:
                    DRAFT -> QUOTATION -> CONFIRMED -> UNDER_REPAIR -> DONE
                    Bất kỳ trạng thái nào (trừ DONE) -> CANCELLED
                    
                    Lưu ý quan trọng:
                    - Chuyển sang CONFIRMED: Kiểm tra tồn kho linh kiện ADD, tạo phiếu xuất kho DRAFT (Reserve).
                      Nếu không đủ tồn kho -> Trả về 400 REP05.
                    - Chuyển sang DONE: Ghi sổ phiếu kho, sinh phiếu Scrap (nếu có REMOVE), sinh Invoice.
                    """
    )
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Chuyển trạng thái thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "400",
            description = "Chuyển trạng thái không hợp lệ hoặc không đủ tồn kho (REP05)"
    )
    public ApiResponse<RepairResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody RepairStatusRequest request
    ) {
        return ApiResponse.success(repairWorkflowService.transitionStatus(id, request.getStatus(), request.getNote()));
    }
}
