package com.backend.demo.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "documento_metadata")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String ruta;

    @Column(name = "tipo_documento")
    private String tipoDocumento;

    @Column(nullable = false)
    private String estado = "PENDIENTE";

    @Column(name = "fecha_subida")
    private LocalDateTime fechaSubida;

    @Column(name = "creador_email")
    private String creadorEmail;

    @Column(name = "estado_contable")
    private String estadoContable; // valores: FACTURA_COMPRA, FACTURA_VENTA, HERRAMIENTA_AUXILIAR, etc.

    @Column(name = "tipo_contable")
    private String tipoContable; // FACTURA_COMPRA, FACTURA_VENTA, CONTRATO, SOPORTE

    @Column(name = "datos_auxiliares", columnDefinition = "TEXT")
    private String datosAuxiliares; // JSON con información de factura, retenciones, etc.

    @Column(name = "responsable_aprobacion_email")
    private String responsableAprobacionEmail;

    @Column(name = "metadatos_json", columnDefinition = "TEXT")
    private String metadatosJson;

    @Column(name = "tarea_id")
    private Long tareaId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}