package com.backend.demo.service;

import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Collections;

import org.springframework.stereotype.Service;

import com.backend.demo.dto.TareaGoogleDTO;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.CalendarScopes;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;

@Service
public class GoogleCalendarService {

    private static final String APPLICATION_NAME = "MENELEC SAS Software";
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    
    // ID del calendario maestro de la empresa
    private static final String CALENDAR_ID = "b96fb5fe5e8a03ab0818502463c971f33b1dfef88f3d69e4b7d800bc87036962@group.calendar.google.com";

    /**
     * Crea un evento en el calendario maestro y retorna el ID de Google.
     */
    public String crearEvento(TareaGoogleDTO dto) throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        Calendar service = getService(HTTP_TRANSPORT);

        if (service == null) throw new IOException("No se pudo conectar con Google API");

        Event event = construirObjetoEvento(dto);

        // ✉️ Se desactiva el envío de notificaciones por correo
        Event eventoCreado = service.events().insert(CALENDAR_ID, event)
                .setSendNotifications(false)   // ← Evita correos automáticos
                .execute();
        System.out.println("✅ Evento creado exitosamente. ID: " + eventoCreado.getId());
        
        return eventoCreado.getId();
    }

    public void actualizarEvento(String eventId, TareaGoogleDTO dto) throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        Calendar service = getService(HTTP_TRANSPORT);

        if (service == null) throw new IOException("No se pudo conectar con Google API");

        Event event = construirObjetoEvento(dto);
        
        // ✉️ "none" evita notificaciones a los miembros del calendario
        service.events().update(CALENDAR_ID, eventId, event)
                .setSendUpdates("none")   // ← Sin notificaciones
                .execute();
        
        System.out.println("🔄 Evento actualizado en línea: " + eventId);
    }
    

    
    /**
     * Elimina un evento existente del calendario maestro.
     */
    public void eliminarEvento(String eventId) throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();
        Calendar service = getService(HTTP_TRANSPORT);

        if (service == null) throw new IOException("No se pudo conectar con Google API");

        service.events().delete(CALENDAR_ID, eventId).execute();
        System.out.println("❌ Evento eliminado en línea: " + eventId);
    }

    /**
     * Lógica centralizada para construir el título con emojis, prioridad y estado.
     */
    private Event construirObjetoEvento(TareaGoogleDTO dto) {
        String estadoActual = (dto.getEstado() != null) ? dto.getEstado().toUpperCase() : "PENDIENTE";
        String prio = (dto.getPrioridad() != null) ? dto.getPrioridad().toUpperCase() : "MEDIA";
        String responsablesStr = (dto.getResponsables() != null) ? String.join(", ", dto.getResponsables()) : "Sin asignar";

        // Lógica de Emojis Dinámica
        String emojiVisual = "";
        if ("FINALIZADO".equals(estadoActual) || "COMPLETADA".equals(estadoActual)) {
            emojiVisual = "✅ ";
        } else if (estadoActual.contains("PROCESO")) {
            emojiVisual = "🔵 ";
        } else {
            switch (prio) {
                case "ALTA":  emojiVisual = "🔴 "; break;
                case "MEDIA": emojiVisual = "🟡 "; break;
                case "BAJA":  emojiVisual = "🟢 "; break;
                default:      emojiVisual = "⚪ "; break;
            }
        }

        String tituloConEstado = emojiVisual + "[" + prio + "] [" + estadoActual + "] MENELEC: " + dto.getTitulo();

        Event event = new Event()
            .setSummary(tituloConEstado)
            .setDescription(
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "📊 ESTADO: " + estadoActual + "\n" +
                "🔥 PRIORIDAD: " + prio + "\n" +
                "👥 RESPONSABLES: " + responsablesStr + "\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "📝 DETALLES:\n" + dto.getDescripcion()
            );

        // ✅ CORREGIDO: Parsear String a LocalDateTime
        java.util.Date date;
        if (dto.getFechaEntrega() != null && !dto.getFechaEntrega().isEmpty()) {
            try {
                // Parsear el string ISO (ej: 2024-01-20T14:30:00) a LocalDateTime
                java.time.LocalDateTime localDateTime = java.time.LocalDateTime.parse(dto.getFechaEntrega());
                date = java.util.Date.from(localDateTime.atZone(java.time.ZoneId.of("America/Bogota")).toInstant());
            } catch (Exception e) {
                System.err.println("⚠️ Error parseando fecha: " + dto.getFechaEntrega() + " - " + e.getMessage());
                // Fallback: usar ahora + 1 día a las 9 AM
                java.time.LocalDateTime defaultDate = java.time.LocalDateTime.now()
                    .plusDays(1)
                    .withHour(9)
                    .withMinute(0)
                    .withSecond(0);
                date = java.util.Date.from(defaultDate.atZone(java.time.ZoneId.of("America/Bogota")).toInstant());
            }
        } else {
            // Si no hay fecha, usar ahora + 1 día a las 9 AM
            java.time.LocalDateTime defaultDate = java.time.LocalDateTime.now()
                .plusDays(1)
                .withHour(9)
                .withMinute(0)
                .withSecond(0);
            date = java.util.Date.from(defaultDate.atZone(java.time.ZoneId.of("America/Bogota")).toInstant());
        }
        
        DateTime googleDateTime = new DateTime(date);
        
        // Evento con HORA ESPECÍFICA
        EventDateTime startDateTime = new EventDateTime()
            .setDateTime(googleDateTime)
            .setTimeZone("America/Bogota");
        
        // Duración de 1 hora por defecto
        long durationMillis = 60 * 60 * 1000; // 1 hora
        DateTime endDateTime = new DateTime(date.getTime() + durationMillis);
        EventDateTime endDateTimeObj = new EventDateTime()
            .setDateTime(endDateTime)
            .setTimeZone("America/Bogota");
        
        event.setStart(startDateTime).setEnd(endDateTimeObj);

        return event;
    }

    private Calendar getService(NetHttpTransport transport) throws IOException {
        InputStream in = getClass().getResourceAsStream("/credentials.json");
        if (in == null) {
            in = Thread.currentThread().getContextClassLoader().getResourceAsStream("credentials.json");
        }
        if (in == null) throw new IOException("Archivo credentials.json no encontrado.");

        GoogleCredentials credentials = GoogleCredentials.fromStream(in)
                .createScoped(Collections.singleton(CalendarScopes.CALENDAR));

        return new Calendar.Builder(transport, JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();
    }
}