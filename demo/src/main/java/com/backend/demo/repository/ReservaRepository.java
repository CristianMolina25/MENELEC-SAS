package com.backend.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Reserva;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    Reserva findByTipo(String tipo);   // ← necesario
}