package com.backend.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Mercado;

public interface MercadoRepository extends JpaRepository<Mercado, Long> {
}