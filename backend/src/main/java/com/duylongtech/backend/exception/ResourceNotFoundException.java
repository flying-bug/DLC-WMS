package com.duylongtech.backend.exception;

import com.duylongtech.backend.constant.SystemMessage;

public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(SystemMessage systemMessage) {
        super(systemMessage);
    }
}
