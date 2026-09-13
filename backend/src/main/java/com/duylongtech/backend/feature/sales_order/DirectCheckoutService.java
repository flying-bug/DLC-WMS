package com.duylongtech.backend.feature.sales_order;

import com.duylongtech.backend.feature.sales_order.DirectCheckoutRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.InventoryDocumentLineRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentRequest;
import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.inventory.InventoryDocumentResponse;
import com.duylongtech.backend.feature.sales_order.SalesOrderResponse;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.sales_order.SalesOrder;
import com.duylongtech.backend.feature.sales_order.SalesOrderLine;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.sales_order.SalesOrderRepository;
import com.duylongtech.backend.feature.auth.UserRepository;
import com.duylongtech.backend.feature.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public interface DirectCheckoutService {
    SalesOrderResponse directCheckout(DirectCheckoutRequest request, String actor);
}
