package com.backend.demo.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.backend.demo.model.ServicioPostventa;

public interface ServicioPostventaRepository extends JpaRepository<ServicioPostventa, Long> {
    
    List<ServicioPostventa> findByDocumentoMetadataId(Long docId);

    @Query("SELECT s FROM ServicioPostventa s WHERE s.vigenciaGarantia BETWEEN :hoy AND :limite AND (s.estado IS NULL OR s.estado != 'CERRADO')")
    List<ServicioPostventa> findGarantiasPorVencer(@Param("hoy") LocalDate hoy, @Param("limite") LocalDate limite);

    // ✅ Método para búsqueda libre (texto en múltiples campos)
    @Query("SELECT s FROM ServicioPostventa s WHERE " +
           "LOWER(s.numeroContrato) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
           "LOWER(s.equipo) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
           "LOWER(s.detalleServicio) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
           "LOWER(s.estado) LIKE LOWER(CONCAT('%', :texto, '%')) OR " +
           "LOWER(s.lugar) LIKE LOWER(CONCAT('%', :texto, '%'))")
    List<ServicioPostventa> busquedaLibre(@Param("texto") String texto);

    // ✅ Método para búsqueda por campos específicos (opcional)
    @Query("SELECT s FROM ServicioPostventa s WHERE " +
           "(:contrato IS NULL OR s.numeroContrato = :contrato) AND " +
           "(:equipo IS NULL OR LOWER(s.equipo) LIKE LOWER(CONCAT('%', :equipo, '%'))) AND " +
           "(:detalle IS NULL OR LOWER(s.detalleServicio) LIKE LOWER(CONCAT('%', :detalle, '%'))) AND " +
           "(:estado IS NULL OR s.estado = :estado)")
    List<ServicioPostventa> busquedaPorCampos(@Param("contrato") String contrato,
                                               @Param("equipo") String equipo,
                                               @Param("detalle") String detalle,
                                               @Param("estado") String estado);
}