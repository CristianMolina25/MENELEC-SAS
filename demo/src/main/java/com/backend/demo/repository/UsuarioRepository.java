package com.backend.demo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.demo.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Usuario> findByRol(String rol);
    // --- NUEVOS MÉTODOS PARA LA AUTOMATIZACIÓN ---
    Optional<Usuario> findByAreaIgnoreCase(String area);
    Optional<Usuario> findFirstByRol(String rol);
}