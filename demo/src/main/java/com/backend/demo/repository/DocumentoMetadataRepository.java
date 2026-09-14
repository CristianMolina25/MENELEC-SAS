package com.backend.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.DocumentoMetadata;

public interface DocumentoMetadataRepository extends JpaRepository<DocumentoMetadata, Long> {
    Optional<DocumentoMetadata> findByRuta(String ruta);
    List<DocumentoMetadata> findByRutaStartingWith(String ruta);
    List<DocumentoMetadata> findTop10ByMetadatosJsonIsNotNullOrderByFechaSubidaDesc();
  

    // ✅ Nuevo método para listar documentos de una tarea
    List<DocumentoMetadata> findByTareaId(Long tareaId);
    long countByRutaStartingWith(String ruta);

    List<DocumentoMetadata> findByEstadoContable(String estado);
    List<DocumentoMetadata> findByEstadoContableIn(List<String> estados);
    List<DocumentoMetadata> findByEstadoContableIsNotNull();
}