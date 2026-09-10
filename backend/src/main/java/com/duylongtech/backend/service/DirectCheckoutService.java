package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.DirectCheckoutRequest;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.request.InventoryDocumentLineRequest;
import com.duylongtech.backend.dto.request.InventoryDocumentRequest;
import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.InventoryDocumentResponse;
import com.duylongtech.backend.dto.response.SalesOrderResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.SalesOrder;
import com.duylongtech.backend.entity.SalesOrderLine;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.SalesOrderRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.duylongtech.backend.repository.WarehouseRepository;
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
