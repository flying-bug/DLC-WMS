package com.duylongtech.backend.feature.partner;

import com.duylongtech.backend.feature.partner.PartnerLedger;
import com.duylongtech.backend.feature.partner.PartnerLedgerRepository;
import com.duylongtech.backend.feature.partner.PartnerLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerLedgerService {

    public static final String RECEIVABLE = "RECEIVABLE";
    public static final String PAYABLE = "PAYABLE";

    private final PartnerLedgerRepository partnerLedgerRepository;
    private final PartnerRepository partnerRepository;

    @Transactional
    public PartnerLedger recordLedger(Long partnerId, String entityType, Long entityId,
                                       String referenceCode, BigDecimal amountDebt,
                                       BigDecimal amountReceipt, String note) {
        return recordLedger(partnerId, inferAccountType(entityType), entityType, entityId,
                referenceCode, amountDebt, amountReceipt, note);
    }

    @Transactional
    public PartnerLedger recordLedger(Long partnerId, String accountType, String entityType, Long entityId,
                                       String referenceCode, BigDecimal amountDebt,
                                       BigDecimal amountReceipt, String note) {
        if (partnerId == null) {
            log.warn("[PartnerLedger] Bỏ qua ghi nhận công nợ do partnerId null. RefCode={}", referenceCode);
            return null;
        }

        // Khóa dòng Partner trước khi đọc "số dư gần nhất" - nếu không khóa, 2 giao dịch
        // ghi công nợ đồng thời cho cùng 1 partner (vd 2 nhân viên cùng ghi sổ phiếu xuất
        // cho cùng khách hàng) có thể cùng đọc 1 prevBalance rồi cùng ghi đè lên nhau,
        // làm "Dư nợ hiện tại" chạy sai. Khóa dòng cụ thể (thay vì khóa PartnerLedger, bảng
        // chỉ insert-thêm) mới thật sự tuần tự hóa được các lần ghi cho cùng 1 partner.
        if (partnerRepository.findByIdForUpdate(partnerId).isEmpty()) {
            log.warn("[PartnerLedger] Bỏ qua ghi nhận công nợ do không tìm thấy Partner ID {}. RefCode={}",
                    partnerId, referenceCode);
            return null;
        }

        BigDecimal safeDebt = amountDebt != null ? amountDebt : BigDecimal.ZERO;
        BigDecimal safeReceipt = amountReceipt != null ? amountReceipt : BigDecimal.ZERO;

        BigDecimal prevBalance = partnerLedgerRepository.findTopByPartnerIdAndAccountTypeOrderByIdDesc(partnerId, accountType)
                .map(PartnerLedger::getBalanceAfter)
                .orElse(BigDecimal.ZERO);

        BigDecimal balanceAfter = prevBalance.add(safeDebt).subtract(safeReceipt);

        PartnerLedger ledger = new PartnerLedger();
        ledger.initEntry(partnerId, accountType, entityType, entityId, referenceCode, safeDebt, safeReceipt, balanceAfter, note);

        PartnerLedger saved = partnerLedgerRepository.save(ledger);
        log.info("[PartnerLedger] Ghi nhận công nợ cho PartnerID {}. Loại={}. Mã={}. Dư nợ mới={}", 
                partnerId, entityType, referenceCode, balanceAfter);

        return saved;
    }

    /**
     * Hoàn tác đúng số tiền của lần ghi công nợ gần nhất cho 1 chứng từ cụ thể (vd. bỏ ghi
     * sổ phiếu xuất/nhập sau khi đã ghi công nợ lúc post). Tìm dòng sổ cái gần nhất khớp
     * (entityType, entityId) rồi đảo ngược đúng amountDebt/amountReceipt của chính nó - an
     * toàn hơn tính lại từ đầu (không lệch nếu dữ liệu chứng từ đã đổi giữa lúc post và
     * unpost), và tự động đúng cho cả trường hợp 1 chứng từ được post/unpost nhiều lần vì
     * luôn chỉ đảo ngược lần post gần nhất. Không làm gì nếu không tìm thấy dòng gốc (vd.
     * chứng từ không gắn partner khi post).
     */
    @Transactional
    public void reverseLedger(String entityType, Long entityId, String reverseEntityType, String referenceCode, String note) {
        partnerLedgerRepository.findTopByEntityTypeAndEntityIdOrderByIdDesc(entityType, entityId)
                .ifPresent(original -> recordLedger(
                        original.getPartnerId(),
                        original.getAccountType(),
                        reverseEntityType,
                        entityId,
                        referenceCode,
                        original.getAmountReceipt(),
                        original.getAmountDebt(),
                        note
                ));
    }

    private String inferAccountType(String entityType) {
        String normalized = entityType != null ? entityType.toUpperCase() : "";
        return normalized.contains("VOUCHER") || normalized.contains("IMPORT") || normalized.contains("PURCHASE")
                ? PAYABLE : RECEIVABLE;
    }
}
