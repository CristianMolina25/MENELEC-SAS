package com.backend.demo.model;

import java.time.LocalDateTime;

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
@Table(name = "documento_extracion")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentoExtracion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "documento_metadata_id")
    private Long documentoMetadataId;
    
    @Column(name = "tipo_documento")
    private String tipoDocumento;
    
    @Column(name = "campo_extraido")
    private String campoExtraido;
    
    @Column(name = "valor_extraido", columnDefinition = "TEXT")
    private String valorExtraido;
    
    @Column(name = "fecha_extraccion")
    private LocalDateTime fechaExtraccion;
}