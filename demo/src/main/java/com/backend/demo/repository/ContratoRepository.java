package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Contrato;

public interface ContratoRepository extends JpaRepository<Contrato, Long> {
    List<Contrato> findByDocumentoMetadataId(Long metadataId);
    void deleteByDocumentoMetadataId(Long metadataId);
}