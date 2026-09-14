package com.backend.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "soporte_documental")
@Data
@NoArgsConstructor
public class SoporteDocumental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String categoria; // CAPACIDAD_JURIDICA, EXPERIENCIA, CAPACIDAD_TECNICA

    // Campos para CAPACIDAD_JURIDICA
    private String nombreArchivo;
    private String origen;
    private LocalDate vencimiento;

    // Campos para EXPERIENCIA y CAPACIDAD_TECNICA
    private String subcategoria;
    private String emisor;
    private String anio;

    @Column(nullable = false)
    private String rutaRelativa;

    private LocalDateTime fechaSubida = LocalDateTime.now();

    private Long usuarioId; // opcional
}