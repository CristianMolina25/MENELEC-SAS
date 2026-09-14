package com.backend.demo.model;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "tareas")
public class Tarea {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titulo;
    
    @Column(length = 1000)
    private String descripcion;
    
    @Column(length = 255)
    private String googleEventId;
    
    private String prioridad;
    
    private LocalDateTime fechaEntrega;  // ✅ Cambiar de String a LocalDateTime

    private String estado; 

    @ElementCollection
    @CollectionTable(
        name = "tarea_responsables", 
        joinColumns = @JoinColumn(name = "tarea_id")
    )
    @Column(name = "email_responsable")
    private List<String> responsables;

    @Column(name = "documento_id")
    private Long documentoId;

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    
    public String getGoogleEventId() { return googleEventId; }
    public void setGoogleEventId(String googleEventId) { this.googleEventId = googleEventId; }
    
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    
    public String getPrioridad() { return prioridad; }
    public void setPrioridad(String prioridad) { this.prioridad = prioridad; }
    
    public LocalDateTime getFechaEntrega() { return fechaEntrega; }  // ✅ LocalDateTime
    public void setFechaEntrega(LocalDateTime fechaEntrega) { this.fechaEntrega = fechaEntrega; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public List<String> getResponsables() { return responsables; }
    public void setResponsables(List<String> responsables) { this.responsables = responsables; }

    public Long getDocumentoId() { return documentoId; }
    public void setDocumentoId(Long documentoId) { this.documentoId = documentoId; }

    @Column(name = "creador_email")
    private String creadorEmail;

    public String getCreadorEmail() { return creadorEmail; }
    public void setCreadorEmail(String creadorEmail) { this.creadorEmail = creadorEmail; }
    
}