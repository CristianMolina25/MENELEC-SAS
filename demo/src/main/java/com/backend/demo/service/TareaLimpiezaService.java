package com.backend.demo.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.demo.model.Tarea;
import com.backend.demo.repository.TareaRepository;

@Service
public class TareaLimpiezaService {

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private GoogleCalendarService googleCalendarService;  // si ya lo tienes inyectable

    @Scheduled(cron = "0 0 3 * * ?")  // todos los días a las 03:00 AM
    @Transactional
    public void eliminarTareasAntiguas() {
        LocalDateTime hace5Dias = LocalDateTime.now().minusDays(5);
        // Solo eliminamos tareas que estén COMPLETADO o FINALIZADO
        List<String> estadosFinalizados = List.of("COMPLETADO", "FINALIZADO");
        List<Tarea> tareasParaEliminar = tareaRepository
                .findByEstadoInAndFechaEntregaBefore(estadosFinalizados, hace5Dias);

        for (Tarea tarea : tareasParaEliminar) {
            // 1. Borrar el evento en Google Calendar si existe
            if (tarea.getGoogleEventId() != null) {
                try {
                    googleCalendarService.eliminarEvento(tarea.getGoogleEventId());
                } catch (Exception e) {
                    // Si el evento ya no existe, simplemente lo ignoramos
                    System.err.println("No se pudo borrar evento de Google: " + e.getMessage());
                }
            }
            // 2. Borrar la tarea de la base de datos
            tareaRepository.delete(tarea);
        }

        System.out.println("✅ Limpieza completada: " + tareasParaEliminar.size() + " tareas eliminadas.");
    }
}