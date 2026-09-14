package com.backend.demo.repository;

import com.backend.demo.model.SoporteDocumental;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SoporteDocumentalRepository extends JpaRepository<SoporteDocumental, Long> {
    List<SoporteDocumental> findByCategoria(String categoria);
}