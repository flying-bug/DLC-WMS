package com.duylongtech.backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface CodeGeneratorService {
    String generateCode(String tableName, String columnName, String prefix, int padding);
}
