package com.backend.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Cheque;

public interface ChequeRepository extends JpaRepository<Cheque, Long> {
    List<Cheque> findAllByOrderByFechaDesc();
}