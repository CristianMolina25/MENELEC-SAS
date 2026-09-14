package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Propuesta;

public interface PropuestaRepository extends JpaRepository<Propuesta, Long> {
    List<Propuesta> findByDocumentoMetadataId(Long metadataId);
    void deleteByDocumentoMetadataId(Long metadataId);
}