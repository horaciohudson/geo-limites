package com.momorialPro.CadMemorial.exception;

public class OpenAiRateLimitException extends RuntimeException {

    public OpenAiRateLimitException(String message) {
        super(message);
    }

    public OpenAiRateLimitException(String message, Throwable cause) {
        super(message, cause);
    }
}
