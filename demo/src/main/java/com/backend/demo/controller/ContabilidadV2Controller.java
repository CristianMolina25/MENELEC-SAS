package com.backend.demo.controller;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.JwtUtil;
import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.repository.DocumentoMetadataRepository;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/contabilidad/v2")
@CrossOrigin(origins = "*", allowedHeaders = "*",
             methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class ContabilidadV2Controller {

    @Value("${file.upload-dir}")
    private String ROOT_PATH;

    @Autowired
    private DocumentoMetadataRepository metadataRepository;

    @Autowired
    private JwtUtil jwtUtil;  // Inyectado para generar tokens de la aplicación

    @Value("${onlyoffice.secret}")  // Clave secreta del servidor ONLYOFFICE
    private String onlyOfficeSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Métodos existentes (sin cambios) ──────────────────────────────────────

    private Path basePath(String tipo, String nombre) {
        if (nombre == null || nombre.trim().isEmpty()) {
            return Paths.get(ROOT_PATH, "Contabilidad", tipo);
        }
        return Paths.get(ROOT_PATH, "Contabilidad", tipo, nombre.trim());
    }

    @GetMapping("/tipos")
    public ResponseEntity<List<String>> getTipos() {
        return ResponseEntity.ok(List.of("FACTURA_COMPRA", "FACTURA_VENTA"));
    }

    @GetMapping("/expedientes")
    public ResponseEntity<List<String>> listarExpedientes(@RequestParam String tipo) {
        Path dir = Paths.get(ROOT_PATH, "Contabilidad", tipo);
        if (!Files.exists(dir)) {
            return ResponseEntity.ok(List.of());
        }
        try {
            List<String> carpetas = Files.list(dir)
                    .filter(Files::isDirectory)
                    .map(p -> p.getFileName().toString())
                    .collect(Collectors.toList());
            return ResponseEntity.ok(carpetas);
        } catch (IOException e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/expedientes/subcontenido")
    public ResponseEntity<List<Map<String, Object>>> subContenido(
            @RequestParam String tipo,
            @RequestParam(required = false) String nombre,
            @RequestParam String subcarpeta,
            @RequestParam(required = false) String anio) {
        Path base = basePath(tipo, nombre);
        if (anio != null && !anio.isEmpty()) {
            base = base.resolve(anio);
        }
        Path dir = base.resolve(subcarpeta);
        if (!Files.exists(dir)) return ResponseEntity.notFound().build();
        try {
            List<Map<String, Object>> items = new ArrayList<>();
            Files.list(dir).forEach(p -> {
                Map<String, Object> item = new HashMap<>();
                item.put("nombre", p.getFileName().toString());
                item.put("esCarpeta", Files.isDirectory(p));
                String rutaRelativa = "Contabilidad/" + tipo;
                if (nombre != null && !nombre.trim().isEmpty()) rutaRelativa += "/" + nombre.trim();
                if (anio != null && !anio.isEmpty()) rutaRelativa += "/" + anio;
                rutaRelativa += "/" + subcarpeta + "/" + p.getFileName().toString();
                item.put("ruta", rutaRelativa);
                items.add(item);
            });
            return ResponseEntity.ok(items);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/expedientes")
    public ResponseEntity<?> crearExpediente(@RequestBody Map<String, String> body) {
        String tipo = body.get("tipo");
        String nombre = body.get("nombre");
        String anio = body.get("anio");

        if (tipo == null || nombre == null || nombre.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("tipo y nombre son obligatorios");
        }
        try {
            Path expedienteDir = Paths.get(ROOT_PATH, "Contabilidad", tipo, nombre.trim());
            if (Files.exists(expedienteDir)) {
                return ResponseEntity.badRequest().body("El expediente ya existe");
            }
            Files.createDirectories(expedienteDir);

            Path raizSubcarpetas = expedienteDir;
            if (anio != null && !anio.trim().isEmpty()) {
                raizSubcarpetas = expedienteDir.resolve(anio.trim());
                Files.createDirectories(raizSubcarpetas);
            }

            if ("FACTURA_COMPRA".equals(tipo)) {
                Files.createDirectories(raizSubcarpetas.resolve("HERRAMIENTA_AUXILIAR"));
                Files.createDirectories(raizSubcarpetas.resolve("DATOS_CONTADORA"));
                Files.createDirectories(raizSubcarpetas.resolve("IMPUESTOS"));
            } else if ("FACTURA_VENTA".equals(tipo)) {
                Files.createDirectories(raizSubcarpetas.resolve("HERRAMIENTA_AUXILIAR"));
                Files.createDirectories(raizSubcarpetas.resolve("SOPORTE_DOCUMENTAL"));
                Files.createDirectories(raizSubcarpetas.resolve("DATOS_ENTIDAD"));
                Files.createDirectories(raizSubcarpetas.resolve("IMPUESTOS"));
            }

            return ResponseEntity.ok(Map.of("mensaje", "Expediente creado"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al crear expediente");
        }
    }

    @PutMapping("/expedientes/renombrar")
    public ResponseEntity<?> renombrarArchivo(
            @RequestParam String tipo,
            @RequestParam String nombre,
            @RequestParam String ruta,
            @RequestParam String nuevoNombre,
            @RequestParam(required = false) String subcarpeta) {
        try {
            Path origen = Paths.get(ROOT_PATH).resolve(ruta).normalize();
            if (!Files.exists(origen)) {
                return ResponseEntity.status(404).body("Elemento no encontrado");
            }
            Path directorioPadre = origen.getParent();
            Path destino = directorioPadre.resolve(nuevoNombre).normalize();
            if (Files.exists(destino)) {
                return ResponseEntity.badRequest().body("Ya existe un elemento con ese nombre");
            }
            Files.move(origen, destino, StandardCopyOption.REPLACE_EXISTING);

            if (Files.isRegularFile(destino)) {
                metadataRepository.findByRuta(ruta).ifPresent(meta -> {
                    String nuevaRuta = directorioPadre.resolve(nuevoNombre).toString()
                            .replace(ROOT_PATH.replace("/", "\\"), "")
                            .replace("\\", "/");
                    if (nuevaRuta.startsWith("/")) nuevaRuta = nuevaRuta.substring(1);
                    meta.setRuta(nuevaRuta);
                    meta.setNombre(nuevoNombre);
                    metadataRepository.save(meta);
                });
            } else {
                String rutaOrigenRelativa = Paths.get(ROOT_PATH).relativize(origen).toString().replace("\\", "/");
                String rutaDestinoRelativa = Paths.get(ROOT_PATH).relativize(destino).toString().replace("\\", "/");
                List<DocumentoMetadata> metadatos = metadataRepository.findByRutaStartingWith(rutaOrigenRelativa + "/");
                for (DocumentoMetadata meta : metadatos) {
                    String rutaActualizada = rutaDestinoRelativa + meta.getRuta().substring(rutaOrigenRelativa.length());
                    meta.setRuta(rutaActualizada);
                    metadataRepository.save(meta);
                }
            }
            return ResponseEntity.ok(Map.of("mensaje", "Elemento renombrado"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al renombrar: " + e.getMessage());
        }
    }

    @GetMapping("/expedientes/contenido")
    public ResponseEntity<List<Map<String, Object>>> contenidoExpediente(
            @RequestParam String tipo,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String anio) {
        Path base = basePath(tipo, nombre);
        if (anio != null && !anio.isEmpty()) {
            base = base.resolve(anio);
        }
        if (!Files.exists(base)) return ResponseEntity.notFound().build();
        try {
            List<Map<String, Object>> items = new ArrayList<>();
            Files.list(base).forEach(p -> {
                Map<String, Object> item = new HashMap<>();
                item.put("nombre", p.getFileName().toString());
                item.put("esCarpeta", Files.isDirectory(p));
                String rutaRelativa = "Contabilidad/" + tipo;
                if (nombre != null && !nombre.trim().isEmpty()) rutaRelativa += "/" + nombre.trim();
                if (anio != null && !anio.isEmpty()) rutaRelativa += "/" + anio;
                rutaRelativa += "/" + p.getFileName().toString();
                item.put("ruta", rutaRelativa);
                if (!Files.isDirectory(p)) {
                    metadataRepository.findByRuta(rutaRelativa).ifPresent(meta -> {
                        item.put("metadataId", meta.getId());
                    });
                }
                items.add(item);
            });
            return ResponseEntity.ok(items);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/expedientes/subir")
    public ResponseEntity<?> subirArchivo(
            @RequestParam("file") MultipartFile file,
            @RequestParam String tipo,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String subcarpeta,
            @RequestParam(required = false) String anio,
            Authentication authentication) {
        try {
            Path baseDir = basePath(tipo, nombre);
            if (anio != null && !anio.isEmpty()) {
                baseDir = baseDir.resolve(anio);
            }
            if (subcarpeta != null && !subcarpeta.isEmpty()) {
                baseDir = baseDir.resolve(subcarpeta);
            }
            Files.createDirectories(baseDir);

            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.trim().isEmpty()) {
                originalName = "archivo";
            }
            Path destino = baseDir.resolve(originalName);
            int count = 1;
            while (Files.exists(destino)) {
                String name = originalName.contains(".") ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                String ext = originalName.contains(".") ? originalName.substring(originalName.lastIndexOf('.')) : "";
                destino = baseDir.resolve(name + "_" + count + ext);
                count++;
            }

            Files.copy(file.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);

            String rutaRelativa = "Contabilidad/" + tipo;
            if (nombre != null && !nombre.trim().isEmpty()) rutaRelativa += "/" + nombre.trim();
            if (anio != null && !anio.isEmpty()) rutaRelativa += "/" + anio;
            if (subcarpeta != null && !subcarpeta.isEmpty()) rutaRelativa += "/" + subcarpeta;
            rutaRelativa += "/" + destino.getFileName().toString();

            DocumentoMetadata meta = new DocumentoMetadata();
            meta.setNombre(destino.getFileName().toString());
            meta.setRuta(rutaRelativa);
            meta.setTipoDocumento("CONTABILIDAD");
            meta.setCreadorEmail(authentication != null ? authentication.getName() : "anonimo@menelec.sas");
            meta.setFechaSubida(LocalDateTime.now());
            meta.setEstado("PENDIENTE");
            meta.setMetadatosJson("{}");
            metadataRepository.save(meta);

            return ResponseEntity.ok(Map.of("mensaje", "Archivo subido", "ruta", rutaRelativa));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al subir");
        }
    }

    @GetMapping("/buscar-carpetas")
    public ResponseEntity<List<Map<String, Object>>> buscarCarpetas(@RequestParam String texto) {
        Path root = Paths.get(ROOT_PATH, "Contabilidad");
        if (!Files.exists(root)) {
            return ResponseEntity.ok(List.of());
        }

        String lowerTexto = texto.toLowerCase().trim();
        String normalizedTexto = Normalizer.normalize(lowerTexto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        List<Map<String, Object>> resultados = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(root)) {
            walk.filter(Files::isDirectory)
                .filter(path -> {
                    String nombreCarpeta = path.getFileName().toString().toLowerCase();
                    String nombreNormalizado = Normalizer.normalize(nombreCarpeta, Normalizer.Form.NFD)
                            .replaceAll("\\p{M}", "");
                    if (nombreNormalizado.contains(normalizedTexto)) return true;
                    String rutaRelativa = root.relativize(path).toString().replace("\\", "/").toLowerCase();
                    String rutaNormalizada = Normalizer.normalize(rutaRelativa, Normalizer.Form.NFD)
                            .replaceAll("\\p{M}", "");
                    return rutaNormalizada.contains(normalizedTexto);
                })
                .forEach(carpeta -> {
                    String rutaRelativa = root.relativize(carpeta).toString().replace("\\", "/");
                    String[] partes = rutaRelativa.split("/");
                    if (partes.length >= 2) {
                        Map<String, Object> item = new HashMap<>();
                        item.put("nombre", carpeta.getFileName().toString());
                        item.put("ruta", "Contabilidad/" + rutaRelativa);
                        item.put("tipo", partes[0]);
                        item.put("anio", partes[1]);
                        String subcarpeta = String.join("/", java.util.Arrays.copyOfRange(partes, 2, partes.length));
                        item.put("subcarpeta", subcarpeta);
                        resultados.add(item);
                    }
                });
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
        return ResponseEntity.ok(resultados);
    }

    @GetMapping("/expedientes/descargar-zip")
    public ResponseEntity<Resource> descargarExpedienteZip(
            @RequestParam String tipo,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String anio,
            @RequestParam(required = false) String subcarpeta) {
        if (tipo == null || tipo.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Path base = basePath(tipo, nombre);
        if (!Files.exists(base)) {
            return ResponseEntity.notFound().build();
        }
        try {
            if (anio != null && !anio.isEmpty()) {
                base = base.resolve(anio);
                if (!Files.exists(base)) {
                    return ResponseEntity.notFound().build();
                }
            }
            if (subcarpeta != null && !subcarpeta.isEmpty()) {
                base = base.resolve(subcarpeta);
                if (!Files.exists(base)) {
                    return ResponseEntity.notFound().build();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(null);
        }
        if (!Files.isDirectory(base)) {
            return ResponseEntity.badRequest().body(null);
        }
        final Path finalBase = base;
        try {
            long fileCount = Files.walk(finalBase).filter(Files::isRegularFile).count();
            if (fileCount == 0) {
                return ResponseEntity.noContent().build();
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos)) {
                Files.walk(finalBase)
                    .filter(Files::isRegularFile)
                    .forEach(file -> {
                        try {
                            String entryName = finalBase.relativize(file).toString().replace("\\", "/");
                            zos.putNextEntry(new ZipEntry(entryName));
                            Files.copy(file, zos);
                            zos.closeEntry();
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
            }
            byte[] zipBytes = baos.toByteArray();
            if (zipBytes.length == 0) {
                return ResponseEntity.noContent().build();
            }
            ByteArrayResource resource = new ByteArrayResource(zipBytes);
            String zipName = finalBase.getFileName().toString();
            if (zipName == null || zipName.isEmpty()) zipName = "contenido";
            String filename = zipName + ".zip";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(zipBytes.length)
                    .body(resource);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/expedientes/anio")
    public ResponseEntity<?> crearAnioExpediente(@RequestParam String tipo,
                                                @RequestParam(required = false) String nombre,
                                                @RequestParam String anio) {
        Path anioDir = basePath(tipo, nombre).resolve(anio);
        if (Files.exists(anioDir)) {
            return ResponseEntity.badRequest().body("El año ya existe");
        }
        try {
            Files.createDirectories(anioDir);
            if (nombre != null && !nombre.trim().isEmpty()) {
                if ("FACTURA_COMPRA".equals(tipo)) {
                    Files.createDirectories(anioDir.resolve("HERRAMIENTA_AUXILIAR"));
                    Files.createDirectories(anioDir.resolve("DATOS_CONTADORA"));
                    Files.createDirectories(anioDir.resolve("IMPUESTOS"));
                } else if ("FACTURA_VENTA".equals(tipo)) {
                    Files.createDirectories(anioDir.resolve("HERRAMIENTA_AUXILIAR"));
                    Files.createDirectories(anioDir.resolve("SOPORTE_DOCUMENTAL"));
                    Files.createDirectories(anioDir.resolve("DATOS_ENTIDAD"));
                    Files.createDirectories(anioDir.resolve("IMPUESTOS"));
                }
            }
            return ResponseEntity.ok(Map.of("mensaje", "Año creado"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al crear año");
        }
    }

    @PostMapping("/expedientes/mes")
    public ResponseEntity<?> crearMes(@RequestParam String tipo,
                                      @RequestParam(required = false) String nombre,
                                      @RequestParam String anio,
                                      @RequestParam String mes) {
        Path mesDir = basePath(tipo, nombre).resolve(anio).resolve(mes);
        if (Files.exists(mesDir)) {
            return ResponseEntity.badRequest().body("El mes ya existe");
        }
        try {
            Files.createDirectories(mesDir);
            return ResponseEntity.ok(Map.of("mensaje", "Mes creado"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al crear mes");
        }
    }

    @PostMapping("/expedientes/registro")
    public ResponseEntity<?> crearRegistro(@RequestParam String tipo,
                                           @RequestParam(required = false) String nombre,
                                           @RequestParam String anio,
                                           @RequestParam String mes,
                                           @RequestBody Map<String, String> body) {
        String contrato = body.getOrDefault("contrato", "").trim();
        String factura = body.getOrDefault("factura", "").trim();
        String cliente = body.getOrDefault("cliente", "").trim();

        if (anio == null || anio.isEmpty() || mes == null || mes.isEmpty()) {
            return ResponseEntity.badRequest().body("anio y mes son obligatorios");
        }

        String carpetaNombre;
        if ("FACTURA_COMPRA".equals(tipo)) {
            carpetaNombre = String.join("-", contrato, factura, cliente).trim();
        } else {
            carpetaNombre = String.join("-", factura, contrato, cliente).trim();
        }
        carpetaNombre = carpetaNombre.replaceAll("\\s+", " ").replaceAll("[\\/:*?\"<>|]", "_");

        Path destino = basePath(tipo, nombre).resolve(anio).resolve(mes).resolve(carpetaNombre);
        if (Files.exists(destino)) {
            return ResponseEntity.badRequest().body("El registro ya existe");
        }
        try {
            Files.createDirectories(destino);
            String recordatorio;
            if ("FACTURA_COMPRA".equals(tipo)) {
                recordatorio = "📁 Archivos a subir: Factura + Soporte de Pago";
            } else if ("FACTURA_VENTA".equals(tipo)) {
                recordatorio = "📁 Archivos a subir: Factura + Informe + Banco + Seguro Social + Egreso";
            } else {
                recordatorio = "📁 Archivos a subir en esta carpeta";
            }
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "Registro creado");
            response.put("nombre", carpetaNombre);
            response.put("recordatorio", recordatorio);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al crear registro: " + e.getMessage());
        }
    }

    @DeleteMapping("/expedientes")
    public ResponseEntity<?> eliminarExpediente(@RequestParam String tipo, @RequestParam String nombre) {
        Path expedienteDir = Paths.get(ROOT_PATH, "Contabilidad", tipo, nombre).normalize();
        if (!Files.exists(expedienteDir)) {
            return ResponseEntity.notFound().build();
        }
        try {
            Files.walk(expedienteDir)
                .filter(Files::isRegularFile)
                .forEach(file -> {
                    try {
                        String relativa = expedienteDir.relativize(file).toString().replace("\\", "/");
                        String ruta = "Contabilidad/" + tipo + "/" + nombre + "/" + relativa;
                        metadataRepository.findByRuta(ruta).ifPresent(metadataRepository::delete);
                    } catch (Exception e) {
                        System.err.println("Error eliminando metadata de " + file + ": " + e.getMessage());
                    }
                });
            try (var files = Files.walk(expedienteDir)) {
                files.sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            System.err.println("No se pudo eliminar " + path + ": " + e.getMessage());
                        }
                    });
            }
            return ResponseEntity.ok(Map.of("mensaje", "Expediente eliminado correctamente"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al eliminar: " + e.getMessage());
        }
    }

    @DeleteMapping("/archivo")
    public ResponseEntity<?> eliminarArchivo(@RequestParam String ruta) {
        Path filePath = Paths.get(ROOT_PATH).resolve(ruta).normalize();
        if (!Files.exists(filePath)) return ResponseEntity.notFound().build();
        try {
            Files.deleteIfExists(filePath);
            metadataRepository.findByRuta(ruta).ifPresent(metadataRepository::delete);
            return ResponseEntity.ok(Map.of("mensaje", "Archivo eliminado"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al eliminar archivo");
        }
    }

    @DeleteMapping("/expedientes/carpeta")
    public ResponseEntity<?> eliminarCarpeta(@RequestParam String ruta) {
        Path target = Paths.get(ROOT_PATH).resolve(ruta).normalize();
        Path root = Paths.get(ROOT_PATH).normalize();
        if (!target.startsWith(root)) {
            return ResponseEntity.badRequest().body("Ruta no válida");
        }
        if (!Files.exists(target)) {
            return ResponseEntity.notFound().build();
        }
        try {
            if (Files.isRegularFile(target)) {
                String rutaRelativa = root.relativize(target).toString().replace("\\", "/");
                metadataRepository.findByRuta(rutaRelativa).ifPresent(metadataRepository::delete);
                Files.deleteIfExists(target);
            } else {
                Files.walk(target)
                        .sorted(Comparator.reverseOrder())
                        .forEach(path -> {
                            try {
                                if (Files.isRegularFile(path)) {
                                    String rutaRelativa = root.relativize(path).toString().replace("\\", "/");
                                    metadataRepository.findByRuta(rutaRelativa).ifPresent(metadataRepository::delete);
                                }
                                Files.deleteIfExists(path);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        });
            }
            return ResponseEntity.ok(Map.of("mensaje", "Carpeta eliminada"));
        } catch (RuntimeException | IOException e) {
            return ResponseEntity.internalServerError().body("Error al eliminar carpeta");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  NUEVO ENDPOINT PARA ONLYOFFICE (MODIFICADO)
    // ═══════════════════════════════════════════════════════════════════════════


    /**
     * Genera un token JWT para ONLYOFFICE con el payload completo.
     * La clave secreta debe coincidir con la del servidor.
     */
    private String generateOnlyOfficeToken(Map<String, Object> payload, String secret) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            return Jwts.builder()
                    .setPayload(jsonPayload)
                    .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                    .compact();
        } catch (Exception e) {
            throw new RuntimeException("Error generando token de ONLYOFFICE", e);
        }
    }

    // ─── Métodos auxiliares ──────────────────────────────────────────────────────

    private String getBackendBaseUrl(HttpServletRequest request) {
        // Puedes usar la misma lógica que en FileController o usar una propiedad fija
        String host = request.getServerName();
        int port = request.getServerPort();
        String scheme = request.getScheme();
        String portPart = (port == 80 || port == 443) ? "" : ":" + port;
        return scheme + "://" + host + portPart;
    }

    private String getDocType(String ext) {
        if (ext == null) return "word";
        switch (ext.toLowerCase().trim()) {
            case "doc": case "docx": case "txt": case "rtf": return "word";
            case "xls": case "xlsx": case "csv": return "cell";
            case "ppt": case "pptx": return "slide";
            default: return "word";
        }
    }
}