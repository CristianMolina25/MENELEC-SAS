package com.backend.demo.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class SoporteDocumentalRequest {
    private String nombreArchivo;
    private String origen;
    private LocalDate vencimiento;
    private String subcategoria;
    private String emisor;
    private String anio;
}