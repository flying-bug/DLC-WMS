package com.duylongtech.backend.exception;

import com.duylongtech.backend.constant.SystemMessage;

public class ValidationException extends BusinessException {
    public ValidationException(String message) {
        super(message);
    }

    public ValidationException(SystemMessage systemMessage) {
        super(systemMessage);
    }
}
