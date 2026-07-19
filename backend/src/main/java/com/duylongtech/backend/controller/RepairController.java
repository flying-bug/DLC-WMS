package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.RepairFeeRequest;
import com.duylongtech.backend.dto.request.RepairLineRequest;
import com.duylongtech.backend.dto.request.RepairRequest;
import com.duylongtech.backend.dto.request.RepairStatusUpdateRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.RepairFeeResponse;
import com.duylongtech.backend.dto.response.RepairLineResponse;
import com.duylongtech.backend.dto.response.RepairResponse;
import com.duylongtech.backend.service.RepairService;
import com.duylongtech.backend.service.RepairWorkflowService;
import com.duylongtech.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/repairs")
@RequiredArgsConstructor
@Tag(name = "Repair Management", description = "API quản lý lệnh sửa chữa thiết bị")
public class RepairController {

    private final RepairService repairService;
    private final RepairWorkflowService repairWorkflowService;
    private final UserService userService; // To get current user

    @Operation(summary = "Lấy danh sách lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lấy danh sách thành công")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<RepairResponse>>> searchRepairs(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<RepairResponse> responses = repairService.searchRepairs(keyword, status, fromDate, toDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @Operation(summary = "Lấy chi tiết lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Lấy thông tin thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Lệnh sửa chữa không tồn tại (REP01)")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairResponse>> getRepairById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(repairService.getRepairById(id)));
    }

    @Operation(summary = "Tạo lệnh sửa chữa mới")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Tạo lệnh thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Dữ liệu đầu vào không hợp lệ")
    @PostMapping
    public ResponseEntity<ApiResponse<RepairResponse>> createRepair(@Valid @RequestBody RepairRequest request) {
        Long userId = userService.getCurrentUserId();
        RepairResponse response = repairService.createRepair(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "Cập nhật lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Cập nhật lệnh thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Trạng thái không cho phép cập nhật (REP03)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RepairResponse>> updateRepair(@PathVariable Long id, @Valid @RequestBody RepairRequest request) {
        Long userId = userService.getCurrentUserId();
        RepairResponse response = repairService.updateRepair(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Thêm linh kiện vào lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Thêm linh kiện thành công")
    @PostMapping("/{id}/lines")
    public ResponseEntity<ApiResponse<RepairLineResponse>> addRepairLine(@PathVariable Long id, @Valid @RequestBody RepairLineRequest request) {
        Long userId = userService.getCurrentUserId();
        RepairLineResponse response = repairService.addRepairLine(id, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "Lấy danh sách linh kiện của lệnh sửa chữa")
    @GetMapping("/{id}/lines")
    public ResponseEntity<ApiResponse<List<RepairLineResponse>>> getRepairLines(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(repairService.getRepairLines(id)));
    }

    @Operation(summary = "Thêm phí dịch vụ vào lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Thêm phí dịch vụ thành công")
    @PostMapping("/{id}/fees")
    public ResponseEntity<ApiResponse<RepairFeeResponse>> addRepairFee(@PathVariable Long id, @Valid @RequestBody RepairFeeRequest request) {
        Long userId = userService.getCurrentUserId();
        RepairFeeResponse response = repairService.addRepairFee(id, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(summary = "Lấy danh sách phí dịch vụ của lệnh sửa chữa")
    @GetMapping("/{id}/fees")
    public ResponseEntity<ApiResponse<List<RepairFeeResponse>>> getRepairFees(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(repairService.getRepairFees(id)));
    }

    @Operation(summary = "Chuyển trạng thái lệnh sửa chữa")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Chuyển trạng thái thành công")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Không đủ tồn kho (INV04/INV05) hoặc Kho đang kiểm kê (REP05)")
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(@PathVariable Long id, @Valid @RequestBody RepairStatusUpdateRequest request) {
        Long userId = userService.getCurrentUserId();
        repairWorkflowService.updateStatus(id, request, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
