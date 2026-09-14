package com.backend.demo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.backend.demo.model.Tarea;

@Repository
public interface TareaRepository extends JpaRepository<Tarea, Long> {
    
    // Query explícita para buscar tareas por email responsable
    @Query("SELECT t FROM Tarea t WHERE :email MEMBER OF t.responsables")
    List<Tarea> findByResponsablesContains(@Param("email") String email);
    
    // Cambiamos el JOIN por MEMBER OF para buscar el email dentro de la lista
    @Query("SELECT t FROM Tarea t LEFT JOIN FETCH t.responsables WHERE :email MEMBER OF t.responsables")
    List<Tarea> findByResponsableEmail(@Param("email") String email);
    
    List<Tarea> findByCreadorEmail(String creadorEmail);
    
    List<Tarea> findByEstadoInAndFechaEntregaBefore(List<String> estados, LocalDateTime fechaLimite);
    
    boolean existsByDescripcionContainingAndFechaEntregaAfter(String descripcion, LocalDateTime fecha);
}