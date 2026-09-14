package com.backend.demo.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "servicio_postventa")
@Data
public class ServicioPostventa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private LocalDate fechaEntrega;
    private String numeroContrato;
    private Integer anioContrato;
    private String proveedor;
    private String equipo;
    @Column(length = 2000)
    private String lugar;
    private LocalDate fechaSolicitud;
    private String detalleServicio;
    private Long costo;
    private LocalDate vigenciaGarantia;
    private String estado; // CERRADO, NO NECESITO, vacío = ABIERTO

    private Long documentoMetadataId; // FK al archivo Excel
}