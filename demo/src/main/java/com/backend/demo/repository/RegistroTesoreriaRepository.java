package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.backend.demo.model.RegistroTesoreria;

@Repository
public interface RegistroTesoreriaRepository extends JpaRepository<RegistroTesoreria, Long> {
    List<RegistroTesoreria> findByMetadataIdAndEmpresa(Long metadataId, String empresa);
    List<RegistroTesoreria> findByMetadataId(Long metadataId);
    
    @Modifying
    @Transactional
    void deleteByMetadataId(Long metadataId);
}