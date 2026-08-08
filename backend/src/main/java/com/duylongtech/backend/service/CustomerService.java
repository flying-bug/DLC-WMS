package com.duylongtech.backend.service;

import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.CustomerRequest;
import com.duylongtech.backend.dto.response.CustomerResponse;
import com.duylongtech.backend.dto.response.SalesHistoryResponse;
import com.duylongtech.backend.dto.response.WarrantyHistoryResponse;
import com.duylongtech.backend.dto.response.ReceiptHistoryResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.SalesOrderLineRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
import com.duylongtech.backend.entity.PartnerLedger;
import java.math.BigDecimal;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.dto.request.CustomerRequest.CustomerExcelDTO;
import com.duylongtech.backend.dto.response.CustomerResponse.ImportPreviewResponse;

/**
 * Service xử lý nghiệp vụ Quản lý Khách hàng (Customer Management).
 *
 * <p>Các Use Case được implement:
 * <ul>
 *   <li>UC-CUST-01: Tìm kiếm Khách hàng → {@link #searchCustomers(String, int, int)}</li>
 *   <li>UC-CUST-02: Tạo mới Khách hàng  → {@link #createCustomer(CustomerRequest)}</li>
 *   <li>UC-CUST-03: Xem chi tiết        → {@link #getCustomerById(Long)}</li>
 *   <li>UC-CUST-04: Cập nhật            → {@link #updateCustomer(Long, CustomerRequest, String)}</li>
 *   <li>UC-CUST-05: Vô hiệu hóa        → {@link #deactivateCustomer(Long)}</li>
 * </ul>
 *
 * <p>Business Rules áp dụng (theo spec.md & clarify.md):
 * <ul>
 *   <li>SĐT là business key: unique, ghi AUDIT_LOG khi thay đổi.</li>
 *   <li>Khách vãng lai (KH-0000): Không được xem chi tiết từ service này.</li>
 *   <li>Soft Delete: Chuyển INACTIVE, không Hard Delete.</li>
 *   <li>Chặn vô hiệu hóa nếu còn thiết bị đang sửa chữa (RECEIVED/REPAIRING).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final String SEED_DATA_CODE  = "KH-0000";
    private static final String INDIVIDUAL_TYPE  = "INDIVIDUAL";
    private static final String APPROVED         = "APPROVED";
    private static final String INACTIVE         = "INACTIVE";
    private static final String DEFAULT_GROUP    = "RETAIL";
    private static final Set<String> VALID_GROUPS = Set.of("RETAIL", "WHOLESALE", "DISTRIBUTOR");
    private static final Set<String> REPAIRING_STATUSES = Set.of("RECEIVED", "REPAIRING");

    private final PartnerRepository partnerRepository;
    private final AuditLogService   auditLogService;
    private final SalesOrderLineRepository salesOrderLineRepository;
    private final WarrantyRepository warrantyRepository;
    private final RepairRepository repairRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final PartnerLedgerRepository partnerLedgerRepository;

    private static final String[] EXCEL_HEADERS = {
            "Mã KH", "Tên khách hàng", "Số điện thoại", "Email", "Địa chỉ", "Nhóm KH", "Trạng thái"
    };

    private static final String[] TEMPLATE_HEADERS = {
            "Tên khách hàng", "Số điện thoại", "Email", "Địa chỉ", "Nhóm KH"
    };

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-01: Tìm kiếm khách hàng (hỗ trợ Autocomplete, có phân trang).
     * - keyword: tìm theo Tên hoặc SĐT
     * - status: lọc theo trạng thái (APPROVED / INACTIVE)
     * - groupType: lọc theo nhóm (RETAIL / WHOLESALE / DISTRIBUTOR)
     *
     * @param keyword  từ khóa tìm kiếm (partial match, optional)
     * @param status   trạng thái khách hàng (optional)
     * @param groupType nhóm khách hàng (optional)
     * @param page     trang hiện tại (0-indexed)
     * @param size     số bản ghi mỗi trang
     * @return Page<CustomerResponse>
     */
    @Transactional(readOnly = true)
    public Page<CustomerResponse> searchCustomers(String keyword, String status, String groupType, int page, int size) {
        String trimmedKeyword = trimToNull(keyword);
        String trimmedStatus  = trimToNull(status);
        String trimmedGroup   = trimToNull(groupType);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return partnerRepository.searchCustomers(trimmedKeyword, trimmedStatus, trimmedGroup, pageRequest)
                .map(this::toResponse);
    }

    /**
     * UC-CUST-03: Xem chi tiết một khách hàng theo ID.
     * Chặn truy cập nếu là Khách vãng lai (KH-0000) theo spec.md.
     *
     * @param id ID khách hàng
     * @return CustomerResponse
     * @throws BusinessException nếu là KH-0000 hoặc không tìm thấy
     */
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        Partner customer = findCustomerOrThrow(id);
        // CUST04: Chặn xem chi tiết Khách vãng lai
        if (SEED_DATA_CODE.equals(customer.getCode())) {
            throw new BusinessException(SystemMessage.CUST_VIEW_SEED_DATA_DENIED);
        }
        return toResponse(customer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EXPORT & IMPORT
    // ─────────────────────────────────────────────────────────────────────────
    
    public byte[] exportTemplateToExcel() {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Template");

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.BLACK.getIndex());

            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerCellStyle.setBorderBottom(BorderStyle.THIN);
            headerCellStyle.setBorderTop(BorderStyle.THIN);
            headerCellStyle.setBorderLeft(BorderStyle.THIN);
            headerCellStyle.setBorderRight(BorderStyle.THIN);

            Row headerRow = sheet.createRow(0);

            for (int col = 0; col < TEMPLATE_HEADERS.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(TEMPLATE_HEADERS[col]);
                cell.setCellStyle(headerCellStyle);
                sheet.autoSizeColumn(col);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi tạo file Excel Template: " + e.getMessage());
        }
    }

    public byte[] exportToExcel(List<Partner> customers) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("KhachHang");

            // Header Font
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.BLACK.getIndex());

            // Header Style
            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerCellStyle.setBorderBottom(BorderStyle.THIN);
            headerCellStyle.setBorderTop(BorderStyle.THIN);
            headerCellStyle.setBorderLeft(BorderStyle.THIN);
            headerCellStyle.setBorderRight(BorderStyle.THIN);

            // Row for Header
            Row headerRow = sheet.createRow(0);

            // Header
            for (int col = 0; col < EXCEL_HEADERS.length; col++) {
                Cell cell = headerRow.createCell(col);
                cell.setCellValue(EXCEL_HEADERS[col]);
                cell.setCellStyle(headerCellStyle);
            }

            // Data Style
            CellStyle dataCellStyle = workbook.createCellStyle();
            dataCellStyle.setBorderBottom(BorderStyle.THIN);
            dataCellStyle.setBorderTop(BorderStyle.THIN);
            dataCellStyle.setBorderLeft(BorderStyle.THIN);
            dataCellStyle.setBorderRight(BorderStyle.THIN);

            // Data rows
            int rowIdx = 1;
            for (Partner customer : customers) {
                Row row = sheet.createRow(rowIdx++);

                row.createCell(0).setCellValue(customer.getCode() != null ? customer.getCode() : "");
                row.createCell(1).setCellValue(customer.getName() != null ? customer.getName() : "");
                row.createCell(2).setCellValue(customer.getPhone() != null ? customer.getPhone() : "");
                row.createCell(3).setCellValue(customer.getEmail() != null ? customer.getEmail() : "");
                row.createCell(4).setCellValue(customer.getAddress() != null ? customer.getAddress() : "");
                
                String groupTypeStr = "";
                if ("RETAIL".equals(customer.getGroupType())) groupTypeStr = "Khách lẻ";
                else if ("WHOLESALE".equals(customer.getGroupType())) groupTypeStr = "Khách thợ";
                else if ("DISTRIBUTOR".equals(customer.getGroupType())) groupTypeStr = "Đại lý";
                row.createCell(5).setCellValue(groupTypeStr);
                
                String statusStr = "APPROVED".equals(customer.getStatus()) ? "Đang hoạt động" : "Ngừng hoạt động";
                row.createCell(6).setCellValue(statusStr);

                for (int i = 0; i < EXCEL_HEADERS.length; i++) {
                    Cell cell = row.getCell(i);
                    if (cell == null) {
                        cell = row.createCell(i);
                    }
                    cell.setCellStyle(dataCellStyle);
                }
            }

            for (int col = 0; col < EXCEL_HEADERS.length; col++) {
                sheet.autoSizeColumn(col);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi tạo file Excel: " + e.getMessage());
        }
    }

    public ImportPreviewResponse previewImport(MultipartFile file) {
        List<CustomerExcelDTO> validRows = new ArrayList<>();
        List<CustomerExcelDTO> duplicateRows = new ArrayList<>();
        List<CustomerExcelDTO> errorRows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int rowCount = sheet.getPhysicalNumberOfRows();

            for (int i = 1; i < rowCount; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                CustomerExcelDTO dto = new CustomerExcelDTO();
                dto.setName(getCellValueAsString(row.getCell(0)));
                dto.setPhone(getCellValueAsString(row.getCell(1)));
                String email = getCellValueAsString(row.getCell(2));
                String address = getCellValueAsString(row.getCell(3));
                String groupType = getCellValueAsString(row.getCell(4));
                
                dto.setEmail(email.isBlank() ? null : email);
                dto.setAddress(address.isBlank() ? null : address);
                dto.setGroupType(groupType.isBlank() ? null : groupType);
                // Code và Status sẽ được tự động generate khi lưu

                if (dto.getName() == null || dto.getName().isBlank()) {
                    dto.setValid(false);
                    dto.setValidationMessage("Tên không được để trống");
                    errorRows.add(dto);
                    continue;
                }
                if (dto.getPhone() == null || dto.getPhone().isBlank() || !dto.getPhone().matches("^0[0-9]{9}$")) {
                    dto.setValid(false);
                    dto.setValidationMessage("SĐT không hợp lệ");
                    errorRows.add(dto);
                    continue;
                }

                partnerRepository.findByPhoneAndIsCustomerTrue(dto.getPhone()).ifPresentOrElse(
                        existing -> {
                            dto.setValid(false);
                            dto.setDuplicate(true);
                            dto.setExistingCustomerId(existing.getId());
                            dto.setValidationMessage("Trùng Số điện thoại với khách hàng: " + existing.getName());
                            duplicateRows.add(dto);
                        },
                        () -> {
                            dto.setValid(true);
                            dto.setDuplicate(false);
                            validRows.add(dto);
                        }
                );
            }

            return ImportPreviewResponse.builder()
                    .totalRows(rowCount - 1)
                    .validCount(validRows.size())
                    .duplicateCount(duplicateRows.size())
                    .errorCount(errorRows.size())
                    .validRows(validRows)
                    .duplicateRows(duplicateRows)
                    .errorRows(errorRows)
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Không thể đọc file Excel: " + e.getMessage());
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toString();
                }
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }
    
    @Transactional(readOnly = true)
    public java.util.List<Partner> getCustomersForExport(java.util.List<Long> ids, String keyword, String status, String groupType) {
        if (ids != null && !ids.isEmpty()) {
            return partnerRepository.findCustomersByIds(ids);
        } else {
            return partnerRepository.findAllCustomersForExport(
                    keyword != null && !keyword.isBlank() ? keyword : null,
                    status != null && !status.isBlank() ? status : null,
                    groupType != null && !groupType.isBlank() ? groupType : null
            );
        }
    }

    @Transactional
    public void confirmImport(com.duylongtech.backend.dto.request.CustomerRequest.ImportConfirmRequest request, String actor) {
        java.util.List<Partner> toSave = new java.util.ArrayList<>();
        
        // 1. Insert Valid Rows
        if (request.getValidRows() != null) {
            for (CustomerExcelDTO dto : request.getValidRows()) {
                Partner newPartner = Partner.builder()
                        .code(generateCustomerCode()) // Tự sinh mã KH
                        .name(dto.getName())
                        .phone(dto.getPhone())
                        .email(dto.getEmail())
                        .address(dto.getAddress())
                        .type("INDIVIDUAL")
                        .groupType(mapGroupTypeFromExcel(dto.getGroupType()))
                        .status("APPROVED")
                        .isCustomer(true)
                        .creditLimit(java.math.BigDecimal.ZERO)
                        .paymentTermDays(0)
                        .build();
                toSave.add(newPartner);
            }
        }

        // 2. Merge Duplicate Rows (OVERWRITE)
        if (request.getDuplicateRowsToMerge() != null) {
            for (CustomerExcelDTO dto : request.getDuplicateRowsToMerge()) {
                if (dto.getExistingCustomerId() != null) {
                    Partner existing = partnerRepository.findByIdAndIsCustomerTrue(dto.getExistingCustomerId())
                            .orElse(null);
                    if (existing != null) {
                        existing.setName(dto.getName());
                        if (dto.getEmail() != null && !dto.getEmail().isBlank()) existing.setEmail(dto.getEmail());
                        if (dto.getAddress() != null && !dto.getAddress().isBlank()) existing.setAddress(dto.getAddress());
                        existing.setGroupType(mapGroupTypeFromExcel(dto.getGroupType()));
                        toSave.add(existing);
                        
                        auditLogService.logEvent(
                                actor, "UPDATE", "Customer", existing.getId(),
                                "SUCCESS", "Gộp dữ liệu từ file Excel (Overwrite). Tên mới: " + dto.getName(),
                                "SYSTEM", null
                        );
                    }
                }
            }
        }

        if (!toSave.isEmpty()) {
            partnerRepository.saveAll(toSave);
            auditLogService.logEvent(
                    actor, "IMPORT", "Customer", null,
                    "SUCCESS", "Import Excel thành công " + toSave.size() + " khách hàng",
                    "SYSTEM", null
            );
        }
    }
    
    private String mapGroupTypeFromExcel(String excelVal) {
        if (excelVal == null) return "RETAIL";
        if (excelVal.equalsIgnoreCase("Khách thợ")) return "WHOLESALE";
        if (excelVal.equalsIgnoreCase("Đại lý")) return "DISTRIBUTOR";
        return "RETAIL";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TAB: LỊCH SỬ MUA HÀNG & BẢO HÀNH
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy lịch sử mua hàng (Tab 1).
     */
    @Transactional(readOnly = true)
    public Page<SalesHistoryResponse> getSalesHistory(Long customerId, int page, int size) {
        Partner customer = findCustomerOrThrow(idCheckSeed(customerId));
        PageRequest pageReq = PageRequest.of(page, size);
        Page<Object[]> results = salesOrderLineRepository.findSalesHistoryByCustomerId(customerId, pageReq);
        
        return results.map(row -> {
            Object orderDateValue = row[1];
            LocalDate orderDate = orderDateValue instanceof java.sql.Date date
                    ? date.toLocalDate()
                    : orderDateValue instanceof LocalDate localDate ? localDate : null;

            return SalesHistoryResponse.builder()
                    .orderCode((String) row[0])
                    .orderDate(orderDate)
                    .productName((String) row[2])
                    .quantity((java.math.BigDecimal) row[3])
                    .serialNumber((String) row[4])
                    .build();
        });
    }

    /**
     * Lấy lịch sử bảo hành (Tab 2).
     */
    @Transactional(readOnly = true)
    public Page<WarrantyHistoryResponse> getWarrantyHistory(Long customerId, int page, int size) {
        Partner customer = findCustomerOrThrow(idCheckSeed(customerId));
        PageRequest pageReq = PageRequest.of(page, size);
        Page<Warranty> warranties = warrantyRepository.findWarrantiesByCustomerId(customerId, pageReq);
        
        return warranties.map(w -> {
            java.util.List<Repair> repairs = repairRepository.findByWarrantyId(w.getId());
            java.util.List<WarrantyHistoryResponse.RepairHistory> repairDtos = repairs.stream()
                .map(r -> WarrantyHistoryResponse.RepairHistory.builder()
                        .repairCode(r.getRepairCode())
                        .receivedDate(r.getReceivedDate())
                        .repairStatus(r.getRepairStatus())
                        .build())
                .toList();

            String serials = w.getLines().stream()
                .filter(l -> l.getSerialNumber() != null)
                .map(l -> l.getSerialNumber().getSerialNumber())
                .collect(java.util.stream.Collectors.joining(", "));

            return WarrantyHistoryResponse.builder()
                    .warrantyCode(w.getWarrantyCode())
                    .serialNumber(serials.isEmpty() ? null : serials)
                    .startDate(w.getStartDate())
                    .endDate(w.getEndDate())
                    .warrantyStatus(w.getWarrantyStatus())
                    .repairs(repairDtos)
                    .build();
        });
    }

    /**
     * Lấy lịch sử thu chi (Tab 3).
     */
    @Transactional(readOnly = true)
    public ReceiptHistoryResponse getReceiptHistory(Long customerId, int page, int size) {
        Partner customer = findCustomerOrThrow(idCheckSeed(customerId));
        PageRequest pageReq = PageRequest.of(page, size);
        
        java.math.BigDecimal totalPaid = partnerRepository.getTotalPaidByCustomerId(customerId);
        Page<Object[]> receiptsPage = partnerRepository.findPaymentHistoryByCustomerId(customerId, pageReq);
        
        Page<ReceiptHistoryResponse.ReceiptItem> items = receiptsPage.map(row -> {
            Object createdAtValue = row[4];
            LocalDateTime createdAt = createdAtValue instanceof java.sql.Timestamp timestamp
                    ? timestamp.toLocalDateTime()
                    : createdAtValue instanceof LocalDateTime localDateTime ? localDateTime : null;

            return ReceiptHistoryResponse.ReceiptItem.builder()
                    .receiptCode((String) row[0])
                    .amount((java.math.BigDecimal) row[1])
                    .status((String) row[2])
                    .paymentMethod((String) row[3])
                    .createdAt(createdAt)
                    .type((String) row[5])
                    .note((String) row[6])
                    .build();
        });

        return ReceiptHistoryResponse.builder()
                .summary(ReceiptHistoryResponse.Summary.builder().totalPaid(totalPaid).build())
                .receipts(items)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-02: Tạo mới khách hàng.
     *
     * <p>Logic:
     * <ul>
     *   <li>Validate SĐT chưa tồn tại trong hệ thống (đã active).</li>
     *   <li>Nếu SĐT trùng với KH INACTIVE → trả lời gợi ý kích hoạt lại (CUST02).</li>
     *   <li>Tự sinh mã: KH{yyyy}{mm}{counter}.</li>
     *   <li>Mặc định: is_customer=true, type=INDIVIDUAL, groupType=RETAIL.</li>
     * </ul>
     *
     * @param req dữ liệu tạo mới
     * @return CustomerResponse
     */
    @Transactional
    public CustomerResponse createCustomer(CustomerRequest req) {
        String phone = req.getPhone().trim();

        // CUST02: Kiểm tra SĐT đã tồn tại
        if (partnerRepository.existsByPhoneAndIsCustomerTrue(phone)) {
            throw new BusinessException(SystemMessage.CUST_PHONE_EXISTS);
        }

        String code;
        if (req.getCode() != null && !req.getCode().trim().isEmpty()) {
            code = req.getCode().trim();
            if (partnerRepository.existsByCode(code)) {
                throw new BusinessException(SystemMessage.CUST_CODE_EXISTS); // Giả sử có mã lỗi này
            }
        } else {
            code = generateCustomerCode();
        }

        Partner partner = Partner.builder()
                .code(code)
                .type(INDIVIDUAL_TYPE)
                .name(req.getName().trim())
                .phone(phone)
                .email(trimToNull(req.getEmail()))
                .address(trimToNull(req.getAddress()))
                .groupType(resolveGroupType(req.getGroupType()))
                .status(APPROVED)
                .isCustomer(true)
                .isSupplier(false)
                .build();

        return toResponse(partnerRepository.save(partner));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-04: Cập nhật thông tin khách hàng.
     *
     * <p>Nếu SĐT thay đổi → ghi AUDIT_LOG (quyết định Issue #2 - clarify.md).
     *
     * @param id    ID khách hàng
     * @param req   dữ liệu cập nhật
     * @param actor username người thực hiện (để ghi log)
     * @return CustomerResponse
     */
    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest req, String actor) {
        Partner customer = findCustomerOrThrow(id);

        String newPhone = req.getPhone().trim();
        boolean phoneChanged = !newPhone.equals(customer.getPhone());

        // CUST02: Nếu đổi SĐT → kiểm tra unique
        if (phoneChanged) {
            if (partnerRepository.existsByPhoneAndIsCustomerTrueAndIdNot(newPhone, id)) {
                throw new BusinessException(SystemMessage.CUST_PHONE_EXISTS);
            }
            // Ghi Audit Log khi đổi SĐT (Issue #2 - SĐT là khóa định danh sở hữu thiết bị)
            auditLogService.logEvent(
                    actor, "UPDATE_PHONE", "Customer", id,
                    "SUCCESS",
                    "Thay đổi SĐT: " + customer.getPhone() + " → " + newPhone,
                    null, null
            );
            customer.setPhone(newPhone);
        }

        customer.setName(req.getName().trim());
        customer.setEmail(trimToNull(req.getEmail()));
        customer.setAddress(trimToNull(req.getAddress()));
        if (req.getGroupType() != null) {
            customer.setGroupType(resolveGroupType(req.getGroupType()));
        }

        return toResponse(partnerRepository.save(customer));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEACTIVATE (Soft Delete)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-05: Vô hiệu hóa khách hàng (Soft Delete).
     *
     * <p>Business Rule: Chặn nếu còn thiết bị đang trong trạng thái RECEIVED hoặc REPAIRING.
     *
     * @param id ID khách hàng
     * @throws BusinessException nếu còn thiết bị đang sửa chữa
     */
    @Transactional
    public void deactivateCustomer(Long id) {
        Partner customer = findCustomerOrThrow(id);

        // CUST03: Kiểm tra có thiết bị đang sửa chữa không
        boolean hasRepairingDevice = partnerRepository.hasActiveRepairByPartnerId(id);
        if (hasRepairingDevice) {
            throw new BusinessException(SystemMessage.CUST_HAS_REPAIRING_WARRANTY);
        }

        customer.setStatus(INACTIVE);
        partnerRepository.save(customer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVATE (Re-activate)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-05b: Kích hoạt lại khách hàng đã bị vô hiệu hóa.
     *
     * @param id ID khách hàng
     * @throws BusinessException nếu khách hàng không tồn tại hoặc đã đang APPROVED
     */
    @Transactional
    public void activateCustomer(Long id) {
        Partner customer = findCustomerOrThrow(id);
        if (APPROVED.equals(customer.getStatus())) {
            throw new BusinessException(SystemMessage.CUST_ALREADY_ACTIVE);
        }
        customer.setStatus(APPROVED);
        partnerRepository.save(customer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Partner findCustomerOrThrow(Long id) {
        return partnerRepository.findByIdAndIsCustomerTrue(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CUST_NOT_FOUND));
    }

    /**
     * Check id và validate chặn KH-0000. Dùng cho các query history.
     */
    private Long idCheckSeed(Long id) {
        Partner customer = findCustomerOrThrow(id);
        if (SEED_DATA_CODE.equals(customer.getCode())) {
            throw new BusinessException(SystemMessage.CUST_VIEW_SEED_DATA_DENIED);
        }
        return id;
    }

    /**
     * Sinh mã khách hàng tự động tuần tự.
     * VD: KH000001
     */
    private String generateCustomerCode() {
        return codeGeneratorService.generateCode("partners", "code", "KH", 6);
    }

    private String resolveGroupType(String groupType) {
        if (groupType == null || groupType.isBlank()) {
            return DEFAULT_GROUP;
        }
        String normalized = groupType.toUpperCase().trim();
        if (!VALID_GROUPS.contains(normalized)) {
            return DEFAULT_GROUP; // Fallback an toàn
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private CustomerResponse toResponse(Partner partner) {
        BigDecimal currentDebt = BigDecimal.ZERO;
        Optional<PartnerLedger> latestLedger = partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partner.getId());
        if (latestLedger.isPresent()) {
            currentDebt = latestLedger.get().getBalanceAfter();
        }

        return CustomerResponse.builder()
                .id(partner.getId())
                .code(partner.getCode())
                .type(partner.getType())
                .name(partner.getName())
                .phone(partner.getPhone())
                .email(partner.getEmail())
                .address(partner.getAddress())
                .groupType(partner.getGroupType())
                .status(partner.getStatus())
                .currentDebt(currentDebt)
                .createdAt(partner.getCreatedAt())
                .updatedAt(partner.getUpdatedAt())
                .build();
    }
}
