package com.backend.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
}