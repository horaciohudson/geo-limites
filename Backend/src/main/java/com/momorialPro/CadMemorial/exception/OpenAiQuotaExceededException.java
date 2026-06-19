package com.momorialPro.CadMemorial.exception;

public class OpenAiQuotaExceededException extends RuntimeException {

    public OpenAiQuotaExceededException(String message) {
        super(message);
    }

    public OpenAiQuotaExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
