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
@Table(name = "proceso_en_estudio")
public class ProcesoEnEstudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String empresa;
    private String categoria;
    private Integer numero;
    private LocalDate fecha;
    private String numeroProceso;

    // NUEVO CAMPO
    @Column(length = 500)  // suficiente para nombres de entidades
    private String entidad;

    @Column(length = 1000) // el objeto puede ser largo
    private String objeto;

    @Column(length = 100)  // modalidad es corta (SUBASTA, MINIMA CUANTIA, etc.)
    private String modalidad;

    private BigDecimal presupuesto;
    private String ciudad;

    @Column(length = 500)
    private String observacion;

    @Column(length = 500)
    private String link;

    private String cierre;
    private String estado;

    private Long documentoMetadataId;

    // constructores, getters y setters

    public ProcesoEnEstudio() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getNumeroProceso() { return numeroProceso; }
    public void setNumeroProceso(String numeroProceso) { this.numeroProceso = numeroProceso; }

    public String getEntidad() { return entidad; }
    public void setEntidad(String entidad) { this.entidad = entidad; }

    public String getObjeto() { return objeto; }
    public void setObjeto(String objeto) { this.objeto = objeto; }

    public String getModalidad() { return modalidad; }
    public void setModalidad(String modalidad) { this.modalidad = modalidad; }

    public BigDecimal getPresupuesto() { return presupuesto; }
    public void setPresupuesto(BigDecimal presupuesto) { this.presupuesto = presupuesto; }

    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public String getCierre() { return cierre; }
    public void setCierre(String cierre) { this.cierre = cierre; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public Long getDocumentoMetadataId() { return documentoMetadataId; }
    public void setDocumentoMetadataId(Long documentoMetadataId) { this.documentoMetadataId = documentoMetadataId; }
}
