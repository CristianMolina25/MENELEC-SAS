package com.backend.demo.dto;
import java.util.List;

import lombok.Data;
@Data
public class OnlyOfficeCallbackDTO {
    private String url;    // URL del archivo modificado
    private int status;    // 2 = El documento está listo para ser guardado
    private String key;    // La llave del documento
    private List<String> users;
}