package com.backend.demo.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.backend.demo.dto.TareaGoogleDTO;
import com.backend.demo.model.Tarea;
import com.backend.demo.repository.TareaRepository;
import com.backend.demo.service.GoogleCalendarService;
import com.backend.demo.service.TareaLimpiezaService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/tareas")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class TareaController {
    @Autowired
    private TareaLimpiezaService tareaLimpiezaService;

    @Autowired
    private GoogleCalendarService googleCalendarService;

    @Autowired
    private TareaRepository tareaRepository;

    // La misma clave secreta que usas en tu JWT (de application.properties)
    private static final String JWT_SECRET = "MenelecSAS2026ClaveJWT12345678901234567890";

    @GetMapping("/listar")
    public ResponseEntity<List<Tarea>> listarTareas(Authentication authentication) {
        String email = authentication.getName();
        List<Tarea> tareas = tareaRepository.findByResponsablesContains(email); // ✅
        return ResponseEntity.ok(tareas);
    }

    @GetMapping("/listar-todas")
    public ResponseEntity<List<Tarea>> listarTodasTareas() {
        List<Tarea> todas = tareaRepository.findAll();
        return ResponseEntity.ok(todas);
    }

    @PostMapping("/limpiar")
    public ResponseEntity<?> limpiarAhora() {
        tareaLimpiezaService.eliminarTareasAntiguas();   
        return ResponseEntity.ok("Limpieza manual ejecutada");
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Tarea tarea = tareaRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));

            String nuevoEstado = body.get("estado").toUpperCase().trim();
            tarea.setEstado(nuevoEstado);

            if (tarea.getGoogleEventId() != null) {
                if (nuevoEstado.equals("COMPLETADO") || nuevoEstado.equals("FINALIZADO")) {
                    googleCalendarService.eliminarEvento(tarea.getGoogleEventId());
                    tarea.setGoogleEventId(null);
                } else {
                    TareaGoogleDTO dto = convertirATareaGoogleDTO(tarea);
                    googleCalendarService.actualizarEvento(tarea.getGoogleEventId(), dto);
                }
            }

            tareaRepository.save(tarea);
            return ResponseEntity.ok("✅ Estado sincronizado");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error de sincronización: " + e.getMessage());
        }
    }

    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<?> eliminarTarea(@PathVariable Long id) {
        try {
            Tarea tarea = tareaRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));

            if (tarea.getGoogleEventId() != null) {
                try {
                    googleCalendarService.eliminarEvento(tarea.getGoogleEventId());
                    System.out.println("✅ Evento eliminado de Google: " + tarea.getGoogleEventId());
                } catch (Exception googleEx) {
                    System.err.println("⚠️ No se pudo borrar en Google (posiblemente ya no existe): " + googleEx.getMessage());
                }
            }

            tareaRepository.deleteById(id);
            return ResponseEntity.ok("✅ Tarea eliminada localmente (Sincronización de calendario procesada)");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error crítico al eliminar en DB: " + e.getMessage());
        }
    }

    @PostMapping("/crear-con-sincronizacion")
    public ResponseEntity<?> crearTarea(@RequestBody TareaGoogleDTO dto, Authentication authentication) {
        try {
            if (dto.getResponsables() == null || dto.getResponsables().isEmpty()) {
                return ResponseEntity.badRequest().body("❌ Error: No hay responsables.");
            }
            Tarea tarea = new Tarea();
            tarea.setTitulo(dto.getTitulo());
            tarea.setDescripcion(dto.getDescripcion());
            tarea.setPrioridad(dto.getPrioridad());
            tarea.setFechaEntrega(parseFlexible(dto.getFechaEntrega()));
            tarea.setResponsables(dto.getResponsables());
            tarea.setEstado("ASIGNADA");

            // ✅ Obtener email real desde el token JWT
            String creador = obtenerEmailDesdeToken();
            if (creador == null) {
                // Fallback por si no se pudo obtener el token (raro)
                creador = authentication.getName();
            }
            System.out.println("Creador email: " + creador);
            tarea.setCreadorEmail(creador);

            String idGenerado = googleCalendarService.crearEvento(dto);
            tarea.setGoogleEventId(idGenerado);

            Tarea tareaGuardada = tareaRepository.save(tarea);
            return ResponseEntity.ok(tareaGuardada);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/actualizar/{id}")
    public ResponseEntity<?> actualizarTarea(@PathVariable Long id, @RequestBody TareaGoogleDTO dto,
                                            Authentication authentication) {
        try {
            Tarea tarea = tareaRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Tarea no encontrada"));

            tarea.setTitulo(dto.getTitulo());
            tarea.setDescripcion(dto.getDescripcion());
            tarea.setPrioridad(dto.getPrioridad());
            tarea.setFechaEntrega(parseFlexible(dto.getFechaEntrega()));
            tarea.setResponsables(dto.getResponsables());
            // El estado no se modifica al editar (se mantiene el que tenía)
            // tarea.setEstado(...); 
            if (tarea.getGoogleEventId() != null) {
                try {
                    TareaGoogleDTO dtoActualizado = convertirATareaGoogleDTO(tarea);
                    googleCalendarService.actualizarEvento(tarea.getGoogleEventId(), dtoActualizado);
                } catch (Exception e) {
                    System.err.println("⚠️ Error actualizando evento en Google: " + e.getMessage());
                    // Opcional: limpiar el ID si el evento ya no existe
                    // tarea.setGoogleEventId(null);
                }
            }

            tareaRepository.save(tarea);
            return ResponseEntity.ok(tarea);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error al actualizar: " + e.getMessage());
        }
    }
    private LocalDateTime parseFlexible(String fechaStr) {
        if (fechaStr == null) return null;
        try {
            // Intenta con segundos
            return LocalDateTime.parse(fechaStr, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        } catch (DateTimeParseException e1) {
            try {
                // Intenta sin segundos (formato del input datetime-local)
                return LocalDateTime.parse(fechaStr, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
            } catch (DateTimeParseException e2) {
                throw new RuntimeException("Formato de fecha inválido: " + fechaStr);
            }
        }
    }
    // ---------- MÉTODOS AUXILIARES ----------

    private String obtenerEmailDesdeToken() {
        try {
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                    .getRequest();
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                Claims claims = Jwts.parser()
                        .setSigningKey(JWT_SECRET)
                        .parseClaimsJws(token)
                        .getBody();
                // El subject del token es el email
                return claims.getSubject();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private TareaGoogleDTO convertirATareaGoogleDTO(Tarea tarea) {
        return TareaGoogleDTO.builder()
                .titulo(tarea.getTitulo())
                .descripcion(tarea.getDescripcion())
                .fechaEntrega(tarea.getFechaEntrega().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")))
                .prioridad(tarea.getPrioridad())
                .estado(tarea.getEstado())
                .responsables(tarea.getResponsables())
                .build();
    }
}