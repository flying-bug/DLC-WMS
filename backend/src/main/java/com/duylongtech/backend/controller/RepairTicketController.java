package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.RepairTicketRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.RepairTicketResponse;
import com.duylongtech.backend.service.RepairTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/repair-tickets")
@RequiredArgsConstructor
@Tag(name = "Repair Ticket Management", description = "API quan ly phieu sua chua bao hanh")
public class RepairTicketController {

    private final RepairTicketService repairTicketService;

    @GetMapping
    @Operation(summary = "View repair ticket list")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<RepairTicketResponse>> getRepairTickets(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.success(repairTicketService.getRepairTickets(keyword, status, fromDate, toDate, page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "View repair ticket detail")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RepairTicketResponse> getRepairTicketById(@PathVariable Long id) {
        return ApiResponse.success(repairTicketService.getRepairTicketById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create repair ticket")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RepairTicketResponse> createRepairTicket(@RequestBody RepairTicketRequest request) {
        return ApiResponse.success(repairTicketService.createRepairTicket(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update repair ticket")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<RepairTicketResponse> updateRepairTicket(@PathVariable Long id,
                                                                @RequestBody RepairTicketRequest request) {
        return ApiResponse.success(repairTicketService.updateRepairTicket(id, request));
    }
}
