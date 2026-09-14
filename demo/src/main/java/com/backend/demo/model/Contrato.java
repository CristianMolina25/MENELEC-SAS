package com.backend.demo.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "contrato")
@Data
public class Contrato {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 100)  // Ajusta la longitud según lo que uses
    private String estadoContrato;

    private String empresaContratista;
    private String item;
    private String numeroContrato;
    private String entidad;
    @Column(length = 4000)
    private String objeto;
    private BigDecimal subtotal;
    private BigDecimal valorContrato;
    private LocalDate plazoEjecucion;
    private String contacto;
    private String fechaRadicadoCuenta;
    private String polizaCumplimiento;
    private BigDecimal retencion;
    private BigDecimal valorPagar;
    private String contacto2;
    private String actaInicio;
    private String adicion;
    private LocalDate fechaEntrega;
    private BigDecimal pago;
    private String bancoFecha;
    private Long documentoMetadataId;
}