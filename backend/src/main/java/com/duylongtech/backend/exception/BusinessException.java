package com.duylongtech.backend.exception;

import com.duylongtech.backend.constant.SystemMessage;

public class BusinessException extends RuntimeException {
    private SystemMessage systemMessage;

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(SystemMessage systemMessage) {
        super(systemMessage.getMessage());
        this.systemMessage = systemMessage;
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }

    public SystemMessage getSystemMessage() {
        return systemMessage;
    }
}
