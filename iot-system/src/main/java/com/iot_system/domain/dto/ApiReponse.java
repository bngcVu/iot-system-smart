package com.iot_system.domain.dto;
import java.util.List;

public class ApiReponse<T> {
    private String message;
    private List<T> data;

    public ApiReponse(String message, List<T> data) {
        this.message = message;
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public List<T> getData() {
        return data;
    }

    
}
