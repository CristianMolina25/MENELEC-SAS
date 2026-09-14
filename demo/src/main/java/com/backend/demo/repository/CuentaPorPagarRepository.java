package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.CuentaPorPagar;

public interface CuentaPorPagarRepository extends JpaRepository<CuentaPorPagar, Long> {
    List<CuentaPorPagar> findAllByOrderByFechaVencimientoAsc();
}