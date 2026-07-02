package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.AiChatResponse;
import com.duylongtech.backend.dto.response.AiSourceResponse;
import com.duylongtech.backend.dto.response.WarehouseStockAiRow;
import com.duylongtech.backend.entity.Warehouse;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AiChatService {
    private static final int MAX_ROWS_IN_ANSWER = 10;

    private final WarehouseRepository warehouseRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;

    @Transactional(readOnly = true)
    public AiChatResponse chat(String rawMessage) {
        String message = rawMessage == null ? "" : rawMessage.trim();
        String normalized = normalize(message);

        if (isWarehouseStockQuestion(normalized)) {
            return answerWarehouseStock(message, normalized);
        }

        return AiChatResponse.builder()
                .intent("GENERAL_NOT_CONNECTED")
                .answer("Minh chua co bo xu ly du lieu cho cau hoi nay. Hien tai AI da doc duoc nhom cau hoi ve kho va ton kho, vi du: \"Kho A co bao nhieu hang?\", \"Ton kho kho HN\", \"San pham trong kho A\". De tra loi moi cau hoi, can bo sung intent va nguon du lieu tu database hoac tai lieu RAG.")
                .sources(List.of(AiSourceResponse.builder()
                        .type("system")
                        .name("AI router")
                        .description("Chua tim thay intent phu hop")
                        .build()))
                .suggestions(defaultSuggestions())
                .build();
    }

    private AiChatResponse answerWarehouseStock(String originalMessage, String normalizedMessage) {
        Optional<Warehouse> warehouse = resolveWarehouse(originalMessage, normalizedMessage);
        if (warehouse.isEmpty()) {
            return AiChatResponse.builder()
                    .intent("WAREHOUSE_STOCK_QUERY")
                    .answer("Minh nhan ra ban dang hoi ve ton kho, nhung chua xac dinh duoc kho nao. Hay hoi ro hon, vi du: \"Kho A co bao nhieu hang?\" hoac dung ma kho nhu \"Ton kho WH001\".")
                    .sources(List.of(AiSourceResponse.builder()
                            .type("database")
                            .name("WAREHOUSES")
                            .description("Dung de tim kho theo ma hoac ten")
                            .build()))
                    .suggestions(defaultSuggestions())
                    .build();
        }

        Warehouse selectedWarehouse = warehouse.get();
        List<WarehouseStockAiRow> rows = inventoryBalanceRepository.findStockRowsForAiByWarehouseId(selectedWarehouse.getId());

        if (rows.isEmpty()) {
            return AiChatResponse.builder()
                    .intent("WAREHOUSE_STOCK_QUERY")
                    .answer("Kho " + displayWarehouse(selectedWarehouse) + " hien chua co ton kho duoc ghi nhan trong he thong.")
                    .sources(warehouseStockSources())
                    .suggestions(defaultSuggestions())
                    .build();
        }

        BigDecimal totalQuantity = rows.stream()
                .map(WarehouseStockAiRow::getQuantityOnHand)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAvailable = rows.stream()
                .map(WarehouseStockAiRow::getAvailableQuantity)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalValue = rows.stream()
                .map(WarehouseStockAiRow::getInventoryValue)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<WarehouseStockAiRow> topRows = rows.stream()
                .sorted(Comparator.comparing(WarehouseStockAiRow::getQuantityOnHand, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_ROWS_IN_ANSWER)
                .toList();

        StringBuilder answer = new StringBuilder();
        answer.append("Kho ").append(displayWarehouse(selectedWarehouse))
                .append(" hien co tong so luong ton la ")
                .append(formatNumber(totalQuantity))
                .append(", kha dung ")
                .append(formatNumber(totalAvailable))
                .append(", voi ")
                .append(rows.size())
                .append(" dong ton kho.");

        answer.append("\n\nCac mat hang noi bat:");
        for (int i = 0; i < topRows.size(); i++) {
            WarehouseStockAiRow row = topRows.get(i);
            answer.append("\n")
                    .append(i + 1)
                    .append(". ")
                    .append(row.getProductName())
                    .append(" - ")
                    .append(row.getVariantName())
                    .append(" (SKU: ")
                    .append(row.getSku())
                    .append("): ton ")
                    .append(formatNumber(row.getQuantityOnHand()))
                    .append(", kha dung ")
                    .append(formatNumber(row.getAvailableQuantity()));
        }

        if (rows.size() > MAX_ROWS_IN_ANSWER) {
            answer.append("\n... va ")
                    .append(rows.size() - MAX_ROWS_IN_ANSWER)
                    .append(" dong ton kho khac.");
        }

        answer.append("\n\nGia tri ton kho uoc tinh: ")
                .append(formatMoney(totalValue))
                .append(". So lieu lay truc tiep tu database tai thoi diem truy van.");

        return AiChatResponse.builder()
                .intent("WAREHOUSE_STOCK_QUERY")
                .answer(answer.toString())
                .sources(warehouseStockSources())
                .suggestions(List.of(
                        "San pham nao trong kho nay sap het?",
                        "Gia tri ton kho cua kho nay la bao nhieu?",
                        "Liet ke 10 SKU ton nhieu nhat"
                ))
                .build();
    }

    private boolean isWarehouseStockQuestion(String normalized) {
        boolean mentionsWarehouse = normalized.contains("kho") || normalized.contains("warehouse");
        boolean mentionsStock = normalized.contains("ton")
                || normalized.contains("hang")
                || normalized.contains("san pham")
                || normalized.contains("sku")
                || normalized.contains("so luong")
                || normalized.contains("bao nhieu");
        return mentionsWarehouse && mentionsStock;
    }

    private Optional<Warehouse> resolveWarehouse(String originalMessage, String normalizedMessage) {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        if (warehouses.isEmpty()) {
            return Optional.empty();
        }

        String normalizedOriginal = normalize(originalMessage);
        Optional<Warehouse> exactMatch = warehouses.stream()
                .filter(warehouse -> normalizedOriginal.contains(normalize(warehouse.getCode()))
                        || normalizedOriginal.contains(normalize(warehouse.getName())))
                .findFirst();
        if (exactMatch.isPresent()) {
            return exactMatch;
        }

        Optional<String> candidate = extractWarehouseCandidate(normalizedMessage);
        if (candidate.isEmpty()) {
            return Optional.empty();
        }

        String candidateValue = candidate.get();
        return warehouses.stream()
                .filter(warehouse -> normalize(warehouse.getCode()).contains(candidateValue)
                        || normalize(warehouse.getName()).contains(candidateValue)
                        || candidateValue.contains(normalize(warehouse.getCode()))
                        || candidateValue.contains(normalize(warehouse.getName())))
                .findFirst();
    }

    private Optional<String> extractWarehouseCandidate(String normalizedMessage) {
        List<Pattern> patterns = List.of(
                Pattern.compile("\\bkho\\s+([a-z0-9_-]+)"),
                Pattern.compile("\\bwarehouse\\s+([a-z0-9_-]+)")
        );

        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(normalizedMessage);
            if (matcher.find()) {
                return Optional.of(matcher.group(1));
            }
        }
        return Optional.empty();
    }

    private List<AiSourceResponse> warehouseStockSources() {
        List<AiSourceResponse> sources = new ArrayList<>();
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("WAREHOUSES")
                .description("Xac dinh kho theo ma va ten")
                .build());
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("INVENTORY_BALANCES")
                .description("Lay so luong ton, so luong giu cho va gia tri ton")
                .build());
        sources.add(AiSourceResponse.builder()
                .type("database")
                .name("PRODUCT_VARIANTS, PRODUCTS")
                .description("Lay SKU, ten bien the va ten san pham")
                .build());
        return sources;
    }

    private List<String> defaultSuggestions() {
        return List.of(
                "Kho A co bao nhieu hang?",
                "Ton kho kho HN hien tai",
                "Kho nao dang co nhieu SKU nhat?"
        );
    }

    private String displayWarehouse(Warehouse warehouse) {
        return warehouse.getName() + " (" + warehouse.getCode() + ")";
    }

    private String formatNumber(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private String formatMoney(BigDecimal value) {
        return formatNumber(value) + " VND";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT).trim();
    }
}
