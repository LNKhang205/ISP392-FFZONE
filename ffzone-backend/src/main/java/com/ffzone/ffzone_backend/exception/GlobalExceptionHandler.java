package com.ffzone.ffzone_backend.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<Map<String, Object>> handleApp(AppException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
            "timestamp", LocalDateTime.now().toString(),
            "status",    ex.getStatus().value(),
            "error",     ex.getStatus().getReasonPhrase(),
            "message",   ex.getMessage()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(500).body(Map.of(
            "timestamp", LocalDateTime.now().toString(),
            "status",    500,
            "error",     "Internal Server Error",
            "message",   ex.getMessage()
        ));
    }
}
