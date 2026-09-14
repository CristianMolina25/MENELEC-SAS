package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.CuentaPorCobrar;

public interface CuentaPorCobrarRepository extends JpaRepository<CuentaPorCobrar, Long> {
    List<CuentaPorCobrar> findAllByOrderByFechaEsperadaAsc();
}