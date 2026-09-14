package com.backend.demo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.dto.ArchivoProcesadoDTO;
import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.model.Tarea;
import com.backend.demo.model.Usuario;
import com.backend.demo.repository.DocumentoMetadataRepository;
import com.backend.demo.repository.TareaRepository;
import com.backend.demo.repository.UsuarioRepository;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;  

    @Autowired
    private DocumentTextExtractorService textExtractor;

    @Autowired
    private DocumentClassifierService classifier;

    @Autowired
    private MetadataExtractorService metadataExtractor;

    @Autowired
    private DocumentoMetadataRepository metadataRepository;

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private DocumentArchiverService archiverService;

    public String guardarArchivo(MultipartFile file, String rutaRelativa, String creadorEmail) throws IOException {
        // Normalizar ruta
        String rutaNormalizada = rutaRelativa.replace("\\", "/").replaceAll("^/|/$", "");
        Path directorioDestino = Paths.get(uploadDir, rutaNormalizada);
        Files.createDirectories(directorioDestino);

        String nombreOriginal = file.getOriginalFilename();
        Path rutaCompleta = directorioDestino.resolve(nombreOriginal);

        // Evitar duplicados
        int counter = 1;
        String nombreFinal = nombreOriginal;
        while (Files.exists(rutaCompleta)) {
            String base = nombreOriginal.substring(0, nombreOriginal.lastIndexOf('.'));
            String ext = nombreOriginal.substring(nombreOriginal.lastIndexOf('.'));
            nombreFinal = base + "_" + counter + ext;
            rutaCompleta = directorioDestino.resolve(nombreFinal);
            counter++;
        }
        Files.copy(file.getInputStream(), rutaCompleta, StandardCopyOption.REPLACE_EXISTING);

        String rutaRelativaArchivo = rutaNormalizada + "/" + nombreFinal;

        // ========== CLASIFICACIÓN Y EXTRACCIÓN DE METADATOS ==========
        String tipo = "OTRO";
        String metadatosJson = "{}";
        String textoExtraido = "";

        try {
            textoExtraido = textExtractor.extractText(file);
            System.out.println("Texto extraído (primeros 300): " +
                    (textoExtraido.length() > 300 ? textoExtraido.substring(0, 300) : textoExtraido));
        } catch (Exception e) {
            System.err.println("Error al extraer texto: " + e.getMessage());
        }

        if (textoExtraido != null && !textoExtraido.trim().isEmpty()) {
            tipo = classifier.detectarTipo(textoExtraido);
            System.out.println("Tipo detectado por contenido: " + tipo);
        } else {
            tipo = detectarTipoDocumento(rutaNormalizada, nombreOriginal);
            System.out.println("Tipo detectado por reglas de carpeta/nombre: " + tipo);
        }
    if ("FACTURA".equals(tipo) && textoExtraido != null && !textoExtraido.isEmpty()) {
        try {
            java.util.Map<String, String> metadatos = metadataExtractor.extractMetadata(textoExtraido, tipo);  // ← CORREGIDO
            if (metadatos != null && !metadatos.isEmpty()) {
                com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                metadatosJson = objectMapper.writeValueAsString(metadatos);
                System.out.println("Metadatos extraídos: " + metadatosJson);
            }
        } catch (Exception e) {
            System.err.println("Error al extraer metadatos: " + e.getMessage());
        }
    }

        // ========== GUARDAR METADATA ==========
        String responsableEmail = obtenerResponsableArea(rutaNormalizada);
        DocumentoMetadata metadata = new DocumentoMetadata();
        metadata.setNombre(nombreFinal);
        metadata.setRuta(rutaRelativaArchivo);
        metadata.setTipoDocumento(tipo);
        metadata.setEstado("PENDIENTE");
        metadata.setFechaSubida(LocalDateTime.now());
        metadata.setCreadorEmail(creadorEmail);
        metadata.setResponsableAprobacionEmail(responsableEmail);
        metadata.setMetadatosJson(metadatosJson);

        metadata = metadataRepository.save(metadata);
        
        // ========== CREAR TAREA DE APROBACIÓN (SI NO ES "OTRO") ==========
        if (!"OTRO".equals(tipo)) {
            Tarea tarea = new Tarea();
            tarea.setTitulo("Revisar " + nombreFinal);
            tarea.setDescripcion("El documento requiere aprobación.\nRuta: " + rutaRelativaArchivo +
                    (metadatosJson.contains("numero_factura") ? "\nFactura N°: " + extraerValorJSON(metadatosJson, "numero_factura") : ""));
            tarea.setPrioridad("MEDIA");
            tarea.setFechaEntrega(LocalDateTime.now().plusDays(2));
            tarea.setResponsables(List.of(responsableEmail));
            tarea.setEstado("PENDIENTE");
            tarea.setDocumentoId(metadata.getId());
            tarea = tareaRepository.save(tarea);
            metadata.setTareaId(tarea.getId());
            metadataRepository.save(metadata);
        }
        String rutaFinal = rutaRelativaArchivo;
        if (!"OTRO".equals(tipo)) {
            try {
                System.out.println("=== INICIANDO ARCHIVADO AUTOMÁTICO ===");
                System.out.println("Ruta actual del metadata: " + metadata.getRuta());
                System.out.println("Ruta normalizada: " + rutaNormalizada);
                
                String area = rutaNormalizada.split("/")[0];
                System.out.println("Área detectada: " + area);
                
                String nuevaRuta = archiverService.generarNuevaRuta(metadata, area);
                System.out.println("Nueva ruta generada por regla: " + nuevaRuta);
                System.out.println("¿Es igual a la actual? " + nuevaRuta.equals(metadata.getRuta()));
                
                if (!nuevaRuta.equals(metadata.getRuta())) {
                    System.out.println("Intentando mover archivo...");
                    archiverService.moverArchivo(metadata, nuevaRuta);
                    metadata.setRuta(nuevaRuta);
                    metadataRepository.save(metadata);
                    rutaFinal = nuevaRuta;
                    System.out.println("✅ Movimiento exitoso. Nueva ruta: " + nuevaRuta);
                } else {
                    System.out.println("La ruta generada es igual a la actual, no se mueve.");
                }
            } catch (Exception e) {
                System.err.println("❌ Error al archivar automáticamente: " + e.getMessage());
                e.printStackTrace();
            }
        }

        return rutaFinal;  
    }

    // Método auxiliar para extraer un valor de un JSON simple
    private String extraerValorJSON(String json, String clave) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(json);
            return node.has(clave) ? node.get(clave).asText() : "";
        } catch (Exception e) {
            return "";
        }
    }

    public ArchivoProcesadoDTO procesarYGuardar(MultipartFile file, String rutaRelativa, String creadorEmail) throws IOException {
        // Normalizar ruta
        String rutaNormalizada = rutaRelativa.replace("\\", "/").replaceAll("^/|/$", "");
        Path directorioDestino = Paths.get(uploadDir, rutaNormalizada);
        Files.createDirectories(directorioDestino);

        String nombreOriginal = file.getOriginalFilename();
        Path rutaCompleta = directorioDestino.resolve(nombreOriginal);

        // Evitar duplicados
        int counter = 1;
        String nombreFinal = nombreOriginal;
        while (Files.exists(rutaCompleta)) {
            String base = nombreOriginal.substring(0, nombreOriginal.lastIndexOf('.'));
            String ext = nombreOriginal.substring(nombreOriginal.lastIndexOf('.'));
            nombreFinal = base + "_" + counter + ext;
            rutaCompleta = directorioDestino.resolve(nombreFinal);
            counter++;
        }
        Files.copy(file.getInputStream(), rutaCompleta, StandardCopyOption.REPLACE_EXISTING);
        String rutaRelativaArchivo = rutaNormalizada + "/" + nombreFinal;

        // ========== CLASIFICACIÓN Y EXTRACCIÓN DE METADATOS ==========
        String tipo = "OTRO";
        String metadatosJson = "{}";
        String textoExtraido = "";

        try {
            textoExtraido = textExtractor.extractText(file);
            System.out.println("Texto extraído (primeros 300): " +
                    (textoExtraido.length() > 300 ? textoExtraido.substring(0, 300) : textoExtraido));
        } catch (Exception e) {
            System.err.println("Error al extraer texto: " + e.getMessage());
        }

        if (textoExtraido != null && !textoExtraido.trim().isEmpty()) {
            tipo = classifier.detectarTipo(textoExtraido);
            System.out.println("Tipo detectado por contenido: " + tipo);
        } else {
            tipo = detectarTipoDocumento(rutaNormalizada, nombreOriginal);
            System.out.println("Tipo detectado por reglas de carpeta/nombre: " + tipo);
        }

        if ("FACTURA".equals(tipo) && textoExtraido != null && !textoExtraido.isEmpty()) {
            try {
                java.util.Map<String, String> metadatos = metadataExtractor.extractMetadata(textoExtraido, tipo);
                if (metadatos != null && !metadatos.isEmpty()) {
                    com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    metadatosJson = objectMapper.writeValueAsString(metadatos);
                    System.out.println("Metadatos extraídos: " + metadatosJson);
                }
            } catch (Exception e) {
                System.err.println("Error al extraer metadatos: " + e.getMessage());
            }
        }

        // ========== GUARDAR METADATA ==========
        String responsableEmail = obtenerResponsableArea(rutaNormalizada);
        DocumentoMetadata metadata = new DocumentoMetadata();
        metadata.setNombre(nombreFinal);
        metadata.setRuta(rutaRelativaArchivo);
        metadata.setTipoDocumento(tipo);
        metadata.setEstado("PENDIENTE");
        metadata.setFechaSubida(LocalDateTime.now());
        metadata.setCreadorEmail(creadorEmail);
        metadata.setResponsableAprobacionEmail(responsableEmail);
        metadata.setMetadatosJson(metadatosJson);
        metadata = metadataRepository.save(metadata);

        // ========== CREAR TAREA DE APROBACIÓN (SI NO ES "OTRO") ==========
        if (!"OTRO".equals(tipo)) {
            Tarea tarea = new Tarea();
            tarea.setTitulo("Revisar " + nombreFinal);
            tarea.setDescripcion("El documento requiere aprobación.\nRuta: " + rutaRelativaArchivo +
                    (metadatosJson.contains("numero_factura") ? "\nFactura N°: " + extraerValorJSON(metadatosJson, "numero_factura") : ""));
            tarea.setPrioridad("MEDIA");
            tarea.setFechaEntrega(LocalDateTime.now().plusDays(2));
            tarea.setResponsables(List.of(responsableEmail));
            tarea.setEstado("PENDIENTE");
            tarea.setDocumentoId(metadata.getId());
            tarea = tareaRepository.save(tarea);
            metadata.setTareaId(tarea.getId());
            metadataRepository.save(metadata);
        }

        // ========== GENERAR RUTA SUGERIDA (sin mover) ==========
        String rutaSugerida = null;
        if (!"OTRO".equals(tipo)) {
            try {
                String area = rutaNormalizada.split("/")[0];
                rutaSugerida = archiverService.generarNuevaRuta(metadata, area);
            } catch (Exception e) {
                System.err.println("Error generando ruta sugerida: " + e.getMessage());
            }
        }

        // Crear DTO
        ArchivoProcesadoDTO dto = new ArchivoProcesadoDTO();
        dto.setMetadataId(metadata.getId());
        dto.setNombreOriginal(nombreFinal);
        dto.setRutaOriginal(rutaRelativaArchivo);
        dto.setRutaSugerida(rutaSugerida);
        dto.setTipoDocumento(tipo);
        dto.setMetadatosJson(metadatosJson);
        return dto;
    }

    private String detectarTipoDocumento(String rutaRelativa, String nombreArchivo) {
        String rutaUpper = rutaRelativa.toUpperCase();
        String nombreLower = nombreArchivo.toLowerCase();
        
        // Reglas por nombre de carpeta
        if (rutaUpper.contains("FACTURAS") || nombreLower.contains("factura")) return "FACTURA";
        if (rutaUpper.contains("CONTRATOS") || nombreLower.contains("contrato")) return "CONTRATO";
        if (rutaUpper.contains("ACTAS") || nombreLower.contains("acta")) return "ACTA";
        if (rutaUpper.contains("RECURSOS HUMANOS") || nombreLower.contains("hoja de vida")) return "HOJA_VIDA";
        if (rutaUpper.contains("POSTVENTA") || nombreLower.contains("postventa")) return "REPORTE_POSTVENTA";
        if (rutaUpper.contains("INFORMES") || nombreLower.contains("informe")) return "INFORME";
        if (rutaUpper.contains("CERTIFICADOS") || nombreLower.contains("certificado")) return "CERTIFICADO";
        
        // Reglas por extensión
        if (nombreLower.endsWith(".pdf")) return "PDF";
        if (nombreLower.endsWith(".docx") || nombreLower.endsWith(".doc")) return "WORD";
        if (nombreLower.endsWith(".xlsx") || nombreLower.endsWith(".xls")) return "EXCEL";
        
        return "OTRO";
    }

    private String obtenerResponsableArea(String rutaRelativa) {
        String[] partes = rutaRelativa.split("/");
        if (partes.length > 0) {
            String area = partes[0];
            Optional<Usuario> responsable = usuarioRepository.findByAreaIgnoreCase(area);
            if (responsable.isPresent()) return responsable.get().getEmail();
        }
        return usuarioRepository.findFirstByRol("ADMIN")
                .map(Usuario::getEmail)
                .orElseThrow(() -> new RuntimeException("No hay administrador configurado"));
    }

    public void eliminarArchivo(String rutaRelativa) throws IOException {
        Path rutaCompleta = Paths.get(uploadDir, rutaRelativa);
        Files.deleteIfExists(rutaCompleta);
        metadataRepository.findByRuta(rutaRelativa).ifPresent(metadataRepository::delete);
    }



    public byte[] obtenerArchivo(String rutaRelativa) throws IOException {
        Path rutaCompleta = Paths.get(uploadDir, rutaRelativa);
        return Files.readAllBytes(rutaCompleta);
    }
    
}