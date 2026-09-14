package com.backend.demo.scheduler;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.backend.demo.model.ServicioPostventa;
import com.backend.demo.model.Tarea;
import com.backend.demo.repository.ServicioPostventaRepository;
import com.backend.demo.repository.TareaRepository;
import com.backend.demo.repository.UsuarioRepository;

@Component
public class GarantiaAlertScheduler {

    @Autowired
    private ServicioPostventaRepository servicioRepo;

    @Autowired
    private TareaRepository tareaRepo;

    @Autowired
    private UsuarioRepository usuarioRepo;

    @Scheduled(cron = "0 0 8 * * *") // Cada día a las 8:00 AM
    public void verificarGarantiasPorVencer() {
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(30);
        List<ServicioPostventa> servicios = servicioRepo.findGarantiasPorVencer(hoy, limite);

        for (ServicioPostventa servicio : servicios) {
            // Evitar duplicados en los últimos 7 días
            boolean yaExiste = tareaRepo.existsByDescripcionContainingAndFechaEntregaAfter(
                servicio.getNumeroContrato(), LocalDateTime.now().minusDays(7));
            if (yaExiste) continue;

            Tarea tarea = new Tarea();
            tarea.setTitulo("⚠️ Garantía próxima a vencer - " + servicio.getEquipo());
            tarea.setDescripcion(String.format(
                "El servicio del contrato %s (equipo %s) vence el %s. Detalle: %s. Costo: $%d",
                servicio.getNumeroContrato(),
                servicio.getEquipo(),
                servicio.getVigenciaGarantia(),
                servicio.getDetalleServicio(),
                servicio.getCosto()
            ));
            tarea.setEstado("PENDIENTE");
            tarea.setPrioridad("ALTA"); // Opcional
            tarea.setFechaEntrega(servicio.getVigenciaGarantia().atTime(LocalTime.MAX)); // fin del día de vencimiento

            // Asignar responsable: usar la lista con un solo email
            String responsableEmail = obtenerResponsableArea("Postventa");
            tarea.setResponsables(Collections.singletonList(responsableEmail));

            // Quién crea la tarea (el sistema)
            tarea.setCreadorEmail("sistema@menelec.com");

            tareaRepo.save(tarea);
        }
    }

private String obtenerResponsableArea(String area) {
    return usuarioRepo.findByAreaIgnoreCase(area)
            .map(u -> u.getEmail())
            .orElseGet(() -> usuarioRepo.findByRol("ADMIN").get(0).getEmail());
}
}