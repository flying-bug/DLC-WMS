package com.duylongtech.backend.feature.repair;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/repairs")
@RequiredArgsConstructor
public class PublicRepairController {

    private final RepairTokenService repairTokenService;
    private final RepairWorkflowService repairWorkflowService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicRepairResponse> getRepairByToken(@PathVariable String token) {
        return ResponseEntity.ok(repairTokenService.getRepairByToken(token));
    }

    @PostMapping("/{token}/approve")
    public ResponseEntity<Void> approveQuotation(@PathVariable String token) {
        RepairToken repairToken = repairTokenService.validateToken(token);
        repairWorkflowService.approve(repairToken.getRepairId());
        repairTokenService.markTokenAsUsed(token);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{token}/decline")
    public ResponseEntity<Void> declineQuotation(@PathVariable String token, @RequestBody Map<String, String> payload) {
        RepairToken repairToken = repairTokenService.validateToken(token);
        String reason = payload.getOrDefault("reason", "Khách hàng từ chối qua link báo giá");
        repairWorkflowService.decline(repairToken.getRepairId(), reason);
        repairTokenService.markTokenAsUsed(token);
        return ResponseEntity.ok().build();
    }
}
