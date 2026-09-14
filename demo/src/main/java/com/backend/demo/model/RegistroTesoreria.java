package com.backend.demo.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "registro_tesoreria")
public class RegistroTesoreria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String empresa; // "MENELEC SAS"
    private LocalDate fecha;
    private String fuente;
    private String centroCostos;
    private String responsablePago;
    private String numeroContrato;
    private String concepto;
    private String terceroBeneficiario;
    private String numeroFactura;
    private BigDecimal valor;
    private BigDecimal reteFuente;
    private BigDecimal reteIca;
    private BigDecimal reteIva;
    private String observaciones;

    @Column(name = "metadata_id")
    private Long metadataId;

    // ========== GETTERS Y SETTERS ==========
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }

    public String getCentroCostos() { return centroCostos; }
    public void setCentroCostos(String centroCostos) { this.centroCostos = centroCostos; }

    public String getResponsablePago() { return responsablePago; }
    public void setResponsablePago(String responsablePago) { this.responsablePago = responsablePago; }

    public String getNumeroContrato() { return numeroContrato; }
    public void setNumeroContrato(String numeroContrato) { this.numeroContrato = numeroContrato; }

    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }

    public String getTerceroBeneficiario() { return terceroBeneficiario; }
    public void setTerceroBeneficiario(String terceroBeneficiario) { this.terceroBeneficiario = terceroBeneficiario; }

    public String getNumeroFactura() { return numeroFactura; }
    public void setNumeroFactura(String numeroFactura) { this.numeroFactura = numeroFactura; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public BigDecimal getReteFuente() { return reteFuente; }
    public void setReteFuente(BigDecimal reteFuente) { this.reteFuente = reteFuente; }

    public BigDecimal getReteIca() { return reteIca; }
    public void setReteIca(BigDecimal reteIca) { this.reteIca = reteIca; }

    public BigDecimal getReteIva() { return reteIva; }
    public void setReteIva(BigDecimal reteIva) { this.reteIva = reteIva; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public Long getMetadataId() { return metadataId; }
    public void setMetadataId(Long metadataId) { this.metadataId = metadataId; }
}