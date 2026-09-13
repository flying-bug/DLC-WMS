package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.feature.system.AiChatResponse;
import com.duylongtech.backend.feature.system.AiSourceResponse;
import com.duylongtech.backend.feature.warehouse.WarehouseStockAiRow;
import com.duylongtech.backend.feature.assembly.AssemblyOrder;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.repair.Repair;
import com.duylongtech.backend.feature.warehouse.StockTransfer;
import com.duylongtech.backend.feature.warranty.Warranty;
import com.duylongtech.backend.feature.warehouse.Warehouse;
import com.duylongtech.backend.feature.assembly.AssemblyOrderRepository;
import com.duylongtech.backend.feature.inventory.InventoryBalanceRepository;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.repair.RepairRepository;
import com.duylongtech.backend.feature.warehouse.StockTransferRepository;
import com.duylongtech.backend.feature.warranty.WarrantyRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import com.duylongtech.backend.feature.inventory.InventoryDocument;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRepository;
import com.duylongtech.backend.feature.purchase_order.PurchaseOrderRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
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
import com.duylongtech.backend.feature.system.AiChatMessageDto;

public interface AiChatService {
    AiChatResponse chat(String rawMessage);
    AiChatResponse chat(String rawMessage, List<AiChatMessageDto> history);
}
