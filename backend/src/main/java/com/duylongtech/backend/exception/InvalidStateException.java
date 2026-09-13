package com.duylongtech.backend.exception;

import com.duylongtech.backend.constant.SystemMessage;

public class InvalidStateException extends BusinessException {
    public InvalidStateException(String message) {
        super(message);
    }

    public InvalidStateException(SystemMessage systemMessage) {
        super(systemMessage);
    }
}
