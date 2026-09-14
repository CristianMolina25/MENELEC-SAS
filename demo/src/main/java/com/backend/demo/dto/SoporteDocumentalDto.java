package com.backend.demo.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class SoporteDocumentalDto {
    private Long id;
    private String categoria;
    private String nombreArchivo;
    private String origen;
    private LocalDate vencimiento;
    private String subcategoria;
    private String emisor;
    private String anio;
    private String rutaRelativa;
    private LocalDateTime fechaSubida;
    private Long usuarioId;
}