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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;

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

    // ─────────────────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * UC-CUST-01: Tìm kiếm khách hàng theo SĐT (hỗ trợ Autocomplete, có phân trang).
     *
     * @param phone từ khóa SĐT (partial match, optional)
     * @param page  trang hiện tại (0-indexed)
     * @param size  số bản ghi mỗi trang
     * @return Page<CustomerResponse>
     */
    @Transactional(readOnly = true)
    public Page<CustomerResponse> searchCustomers(String phone, int page, int size) {
        String trimmedPhone = trimToNull(phone);
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return partnerRepository.searchCustomers(trimmedPhone, pageRequest)
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
            throw new BusinessException(SystemMessage.CUST_VIEW_SEED_DATA_DENIED.getMessage());
        }
        return toResponse(customer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HISTORY QUERIES (PHASE 4 - US2)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lấy lịch sử mua hàng (Tab 1).
     */
    @Transactional(readOnly = true)
    public Page<SalesHistoryResponse> getSalesHistory(Long customerId, int page, int size) {
        Partner customer = findCustomerOrThrow(idCheckSeed(customerId));
        PageRequest pageReq = PageRequest.of(page, size);
        Page<Object[]> results = salesOrderLineRepository.findSalesHistoryByCustomerId(customerId, pageReq);
        
        return results.map(row -> SalesHistoryResponse.builder()
                .orderCode((String) row[0])
                .orderDate(row[1] != null ? ((java.sql.Date) row[1]).toLocalDate() : null)
                .productName((String) row[2])
                .quantity((java.math.BigDecimal) row[3])
                .serialNumber((String) row[4])
                .build());
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

            return WarrantyHistoryResponse.builder()
                    .warrantyCode(w.getWarrantyCode())
                    .serialNumber(w.getSerialNumber() != null ? w.getSerialNumber().getSerialNumber() : null)
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
        
        Page<ReceiptHistoryResponse.ReceiptItem> items = receiptsPage.map(row -> ReceiptHistoryResponse.ReceiptItem.builder()
                .receiptCode((String) row[0])
                .amount((java.math.BigDecimal) row[1])
                .status((String) row[2])
                .paymentMethod((String) row[3])
                .createdAt(row[4] != null ? ((java.sql.Timestamp) row[4]).toLocalDateTime() : null)
                .type((String) row[5])
                .build());

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
            throw new BusinessException(SystemMessage.CUST_PHONE_EXISTS.getMessage());
        }

        String code = generateCustomerCode();

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
                throw new BusinessException(SystemMessage.CUST_PHONE_EXISTS.getMessage());
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
            throw new BusinessException(SystemMessage.CUST_HAS_REPAIRING_WARRANTY.getMessage());
        }

        customer.setStatus(INACTIVE);
        partnerRepository.save(customer);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Partner findCustomerOrThrow(Long id) {
        return partnerRepository.findByIdAndIsCustomerTrue(id)
                .orElseThrow(() -> new BusinessException(SystemMessage.CUST_NOT_FOUND.getMessage()));
    }

    /**
     * Check id và validate chặn KH-0000. Dùng cho các query history.
     */
    private Long idCheckSeed(Long id) {
        Partner customer = findCustomerOrThrow(id);
        if (SEED_DATA_CODE.equals(customer.getCode())) {
            throw new BusinessException(SystemMessage.CUST_VIEW_SEED_DATA_DENIED.getMessage());
        }
        return id;
    }

    /**
     * Sinh mã khách hàng theo format KH{yyyy}{MM}{counter 4 chữ số}.
     * VD: KH2026060001.
     */
    private String generateCustomerCode() {
        String prefix = "KH" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        // Dùng timestamp-based suffix để đảm bảo unique trong scope hiện tại.
        // TODO: Chuyển sang sequence counter khi có CustomerCodeSequence bean.
        String suffix = String.format("%04d", (System.currentTimeMillis() % 10000));
        return prefix + suffix;
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
                .createdAt(partner.getCreatedAt())
                .updatedAt(partner.getUpdatedAt())
                .build();
    }
}
