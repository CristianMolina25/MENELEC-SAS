package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.GastoFuncionamiento;

public interface GastoFuncionamientoRepository extends JpaRepository<GastoFuncionamiento, Long> {
    List<GastoFuncionamiento> findAllByOrderByFechaDesc();
}