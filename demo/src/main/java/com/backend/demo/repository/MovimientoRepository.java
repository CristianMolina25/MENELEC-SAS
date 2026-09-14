package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Movimiento;

public interface MovimientoRepository extends JpaRepository<Movimiento, Long> {
    List<Movimiento> findAllByOrderByFechaDesc();
}