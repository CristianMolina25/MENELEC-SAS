package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.ProcesoEnEstudio;

public interface ProcesoEnEstudioRepository extends JpaRepository<ProcesoEnEstudio, Long> {
    List<ProcesoEnEstudio> findByDocumentoMetadataId(Long metadataId);
    void deleteByDocumentoMetadataId(Long metadataId);
}