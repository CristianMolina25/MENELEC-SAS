package com.backend.demo.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "soportes_tesoreria")
public class SoporteTesoreria {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "registro_id", nullable = false)
    private Long registroId;
    
    @Column(name = "nombre_archivo")
    private String nombreArchivo;
    
    @Column(name = "ruta_relativa")
    private String rutaRelativa;
    
    private String tipo; // PDF, EXCEL, IMAGEN, etc.
    
    @Column(name = "fecha_subida")
    private LocalDateTime fechaSubida = LocalDateTime.now();
    
    // Constructor vacío obligatorio para JPA
    public SoporteTesoreria() {}

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getRegistroId() { return registroId; }
    public void setRegistroId(Long registroId) { this.registroId = registroId; }
    
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    
    public String getRutaRelativa() { return rutaRelativa; }
    public void setRutaRelativa(String rutaRelativa) { this.rutaRelativa = rutaRelativa; }
    
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    
    public LocalDateTime getFechaSubida() { return fechaSubida; }
    public void setFechaSubida(LocalDateTime fechaSubida) { this.fechaSubida = fechaSubida; }
}