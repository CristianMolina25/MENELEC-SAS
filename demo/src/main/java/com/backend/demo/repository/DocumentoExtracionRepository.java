package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.DocumentoExtracion;

public interface DocumentoExtracionRepository extends JpaRepository<DocumentoExtracion, Long> {
    List<DocumentoExtracion> findByDocumentoMetadataId(Long documentoMetadataId);
    List<DocumentoExtracion> findByTipoDocumento(String tipoDocumento);
}