package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.SoporteTesoreria;

public interface SoporteTesoreriaRepository extends JpaRepository<SoporteTesoreria, Long> {
    List<SoporteTesoreria> findByRegistroId(Long registroId);
    void deleteByRegistroId(Long registroId);
}