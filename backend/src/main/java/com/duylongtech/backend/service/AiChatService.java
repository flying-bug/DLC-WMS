package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.AiChatResponse;
import com.duylongtech.backend.dto.response.AiSourceResponse;
import com.duylongtech.backend.dto.response.WarehouseStockAiRow;
import com.duylongtech.backend.entity.AssemblyOrder;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.Product;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.Repair;
import com.duylongtech.backend.entity.StockTransfer;
import com.duylongtech.backend.entity.Warranty;
import com.duylongtech.backend.entity.Warehouse;
import com.duylongtech.backend.repository.AssemblyOrderRepository;
import com.duylongtech.backend.repository.InventoryBalanceRepository;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.RepairRepository;
import com.duylongtech.backend.repository.StockTransferRepository;
import com.duylongtech.backend.repository.WarrantyRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
import com.duylongtech.backend.entity.InventoryDocument;
import com.duylongtech.backend.entity.PurchaseOrder;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.repository.InventoryDocumentRepository;
import com.duylongtech.backend.repository.PurchaseOrderRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
import com.duylongtech.backend.dto.request.AiChatMessageDto;

public interface AiChatService {
    AiChatResponse chat(String rawMessage);
    AiChatResponse chat(String rawMessage, List<AiChatMessageDto> history);
}
