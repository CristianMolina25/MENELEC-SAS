package com.backend.demo.controller;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import org.springframework.http.MediaType;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import com.backend.demo.JwtUtil;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.dto.OnlyOfficeCallbackDTO;
import com.backend.demo.model.Contrato;
import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.model.ProcesoEnEstudio;
import com.backend.demo.model.Propuesta;
import com.backend.demo.model.ServicioPostventa;
import com.backend.demo.model.Tarea;
import com.backend.demo.model.Usuario;
import com.backend.demo.repository.ContratoRepository;
import com.backend.demo.repository.DocumentoMetadataRepository;
import com.backend.demo.repository.ProcesoEnEstudioRepository;
import com.backend.demo.repository.PropuestaRepository;
import com.backend.demo.repository.ServicioPostventaRepository;
import com.backend.demo.repository.TareaRepository;
import com.backend.demo.repository.UsuarioRepository;
import com.backend.demo.service.DocumentArchiverService;
import com.backend.demo.service.ExcelIndexerService;
import com.backend.demo.service.FileStorageService;
import com.backend.demo.service.TablaControlIndexerService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@RestController
@RequestMapping("/api/archivos")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://10.187.227.204:5173", "http://10.187.227.59:5173", "http://localhost:9000", "http://127.0.0.1:9000" })
public class FileController {

    @Value("${file.upload-dir}")
    private String ROOT_PATH;

    @Autowired
    private Environment environment;

    @Autowired
    private ContratoRepository contratoRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private TablaControlIndexerService tablaControlIndexerService;

    @Autowired
    private ProcesoEnEstudioRepository procesoEnEstudioRepository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private com.backend.demo.service.DocumentTextExtractorService textExtractorService;

    @Autowired
    private com.backend.demo.service.DocumentClassifierService classifierService;

    @Autowired
    private com.backend.demo.service.MetadataExtractorService metadataExtractorService;

    @Autowired
    private ExcelIndexerService excelIndexerService;

    @Autowired
    private ServicioPostventaRepository servicioPostventaRepository;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(FileController.class);

    @Autowired
    private TesoreriaController tesoreriaController;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private DocumentArchiverService archiverService;

    @Autowired
    private DocumentoMetadataRepository metadataRepository;

    @Autowired
    private TareaRepository tareaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private JwtUtil jwtUtil;  // ✅ Inyectado para generar/validar tokens

    @Value("${onlyoffice.secret}")  // ✅ Clave secreta del servidor ONLYOFFICE
    private String onlyOfficeSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ==================== MÉTODOS EXISTENTES (sin cambios) ====================

    @GetMapping("/departamentos")
    public ResponseEntity<?> listarDepartamentos() {
        try {
            File root = new File(ROOT_PATH);
            if (!root.exists()) root.mkdirs();
            String[] carpetas = root.list((current, name) -> new File(current, name).isDirectory());
            return ResponseEntity.ok(carpetas != null ? carpetas : new String[0]);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al leer ROOT_PATH");
        }
    }

    @GetMapping("/tabla-control/buscar")
    public ResponseEntity<List<Map<String, Object>>> buscarEnTablaControl(
            @RequestParam String texto,
            @RequestParam(required = false) Long metadataId) {

        List<Map<String, Object>> resultados = new ArrayList<>();
        String lowerTexto = texto.toLowerCase();

        java.util.function.Predicate<String> contiene = s -> s != null && s.toLowerCase().contains(lowerTexto);

        List<ProcesoEnEstudio> procesos = (metadataId != null)
            ? procesoEnEstudioRepository.findByDocumentoMetadataId(metadataId)
            : procesoEnEstudioRepository.findAll();
        for (ProcesoEnEstudio p : procesos) {
            if (contiene.test(p.getNumeroProceso()) || contiene.test(p.getCategoria()) ||
                contiene.test(p.getObjeto()) || contiene.test(p.getModalidad()) ||
                contiene.test(p.getObservacion()) || contiene.test(p.getCiudad())) {
                Map<String, Object> item = new HashMap<>();
                item.put("tipo", "EN ESTUDIO");
                item.put("id", p.getId());
                item.put("numeroProceso", p.getNumeroProceso());
                item.put("entidad", p.getCategoria());
                item.put("objeto", p.getObjeto());
                resultados.add(item);
            }
        }

        List<Propuesta> propuestas = (metadataId != null)
            ? propuestaRepository.findByDocumentoMetadataId(metadataId)
            : propuestaRepository.findAll();
        for (Propuesta p : propuestas) {
            if (contiene.test(p.getNumeroProceso()) || contiene.test(p.getEntidad()) ||
                contiene.test(p.getObjeto()) || contiene.test(p.getEstadoProceso())) {
                Map<String, Object> item = new HashMap<>();
                item.put("tipo", "PROPUESTAS");
                item.put("id", p.getId());
                item.put("numeroProceso", p.getNumeroProceso());
                item.put("entidad", p.getEntidad());
                item.put("objeto", p.getObjeto());
                resultados.add(item);
            }
        }

        List<Contrato> contratos = (metadataId != null)
            ? contratoRepository.findByDocumentoMetadataId(metadataId)
            : contratoRepository.findAll();
        for (Contrato c : contratos) {
            if (contiene.test(c.getNumeroContrato()) || contiene.test(c.getEntidad()) ||
                contiene.test(c.getObjeto()) || contiene.test(c.getEmpresaContratista())) {
                Map<String, Object> item = new HashMap<>();
                item.put("tipo", "CONTRATOS");
                item.put("id", c.getId());
                item.put("numeroProceso", c.getNumeroContrato());
                item.put("entidad", c.getEntidad());
                item.put("objeto", c.getObjeto());
                resultados.add(item);
            }
        }

        return ResponseEntity.ok(resultados);
    }

    @GetMapping("/estadisticas-areas")
    public ResponseEntity<?> obtenerEstadisticasAreas() {
        try {
            List<Map<String, Object>> areasStats = new ArrayList<>();
            File root = new File(ROOT_PATH);
            String[] areas = root.list((current, name) -> new File(current, name).isDirectory());
            if (areas == null) areas = new String[0];

            for (String area : areas) {
                long totalDocs = metadataRepository.countByRutaStartingWith(area + "/");
                List<String> subcarpetas = new ArrayList<>();
                File areaDir = new File(ROOT_PATH, area);
                File[] subs = areaDir.listFiles(File::isDirectory);
                if (subs != null) {
                    for (File sub : subs) {
                        subcarpetas.add(sub.getName());
                    }
                }
                Map<String, Object> stat = new HashMap<>();
                stat.put("nombre", area);
                stat.put("totalDocumentos", totalDocs);
                stat.put("subcarpetas", subcarpetas);
                stat.put("storageGB", String.format("%.1f", totalDocs * 0.5 / 1024));
                areasStats.add(stat);
            }
            return ResponseEntity.ok(areasStats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al obtener estadísticas: " + e.getMessage());
        }
    }

    private long contarArchivosRecursivamente(File carpeta) {
        long count = 0;
        File[] files = carpeta.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    count += contarArchivosRecursivamente(f);
                } else {
                    count++;
                }
            }
        }
        return count;
    }

    @GetMapping("/listar")
    public ResponseEntity<List<Map<String, Object>>> listarContenido(
            @RequestParam String ruta,
            @RequestParam(defaultValue = "false") boolean recursivo) {
        try {
            Path pathRaiz = Paths.get(ROOT_PATH).resolve(ruta).normalize();
            if (!Files.exists(pathRaiz) || !Files.isDirectory(pathRaiz)) {
                return ResponseEntity.ok(new ArrayList<Map<String, Object>>());
            }

            List<Map<String, Object>> respuesta = new ArrayList<>();

            if (recursivo) {
                Files.walk(pathRaiz)
                    .filter(Files::isRegularFile)
                    .forEach(entry -> {
                        try {
                            Map<String, Object> info = new HashMap<>();
                            BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);
                            String nombre = entry.getFileName().toString();
                            info.put("nombre", nombre);
                            info.put("esCarpeta", false);
                            info.put("ultimaModificacion", attrs.lastModifiedTime().toInstant().toEpochMilli());
                            String extension = "";
                            if (nombre.contains(".")) {
                                extension = nombre.substring(nombre.lastIndexOf(".") + 1);
                            }
                            info.put("extension", extension);
                            String rutaRelativa = entry.toString()
                                    .replace(ROOT_PATH.replace("/", File.separator), "")
                                    .replace("\\", "/");
                            if (rutaRelativa.startsWith("/")) rutaRelativa = rutaRelativa.substring(1);
                            Optional<DocumentoMetadata> meta = metadataRepository.findByRuta(rutaRelativa);
                            info.put("ruta", rutaRelativa);
                            if (meta.isPresent()) {
                                DocumentoMetadata docMeta = meta.get();
                                info.put("estadoAprobacion", docMeta.getEstado());
                                String json = docMeta.getMetadatosJson();
                                if (json != null && !json.isEmpty()) {
                                    try {
                                        ObjectMapper mapper = new ObjectMapper();
                                        JsonNode node = mapper.readTree(json);
                                        info.put("modulo", node.has("modulo") ? node.get("modulo").asText() : "");
                                        info.put("tipoDocumento", node.has("tipoDocumento") ? node.get("tipoDocumento").asText() : docMeta.getTipoDocumento());
                                        info.put("numeroReferencia", node.has("numeroReferencia") ? node.get("numeroReferencia").asText() : "");
                                        info.put("cliente", node.has("cliente") ? node.get("cliente").asText() : "");
                                        info.put("contratoOC", node.has("contratoOC") ? node.get("contratoOC").asText() : "");
                                        info.put("fechaDocumento", node.has("fechaDocumento") ? node.get("fechaDocumento").asText() : "");
                                        info.put("descripcion", node.has("descripcion") ? node.get("descripcion").asText() : "");
                                    } catch (Exception e) {
                                        setDefaultMetadata(info, docMeta);
                                    }
                                } else {
                                    setDefaultMetadata(info, docMeta);
                                }
                            } else {
                                info.put("estadoAprobacion", null);
                                setEmptyMetadata(info);
                            }
                            respuesta.add(info);
                        } catch (Exception e) {
                            // ignorar
                        }
                    });
            } else {
                try (DirectoryStream<Path> stream = Files.newDirectoryStream(pathRaiz)) {
                    for (Path entry : stream) {
                        Map<String, Object> info = new HashMap<>();
                        BasicFileAttributes attrs = Files.readAttributes(entry, BasicFileAttributes.class);
                        String nombre = entry.getFileName().toString();
                        boolean esCarpeta = Files.isDirectory(entry);
                        info.put("nombre", nombre);
                        info.put("esCarpeta", esCarpeta);
                        info.put("ultimaModificacion", attrs.lastModifiedTime().toInstant().toEpochMilli());
                        if (!esCarpeta && nombre.contains(".")) {
                            info.put("extension", nombre.substring(nombre.lastIndexOf(".") + 1));
                        } else {
                            info.put("extension", "");
                        }
                        String rutaElemento = ruta.isEmpty() ? nombre : ruta + "/" + nombre;
                        info.put("ruta", rutaElemento);
                        if (!esCarpeta) {
                            String rutaRelativa = ruta.isEmpty() ? nombre : ruta + "/" + nombre;
                            info.put("ruta", rutaRelativa);
                            Optional<DocumentoMetadata> meta = metadataRepository.findByRuta(rutaRelativa);
                            if (meta.isPresent()) {
                                DocumentoMetadata docMeta = meta.get();
                                info.put("metadataId", docMeta.getId());
                                info.put("estadoAprobacion", docMeta.getEstado());
                                String json = docMeta.getMetadatosJson();
                                if (json != null && !json.isEmpty()) {
                                    try {
                                        ObjectMapper mapper = new ObjectMapper();
                                        JsonNode node = mapper.readTree(json);
                                        info.put("modulo", node.has("modulo") ? node.get("modulo").asText() : "");
                                        info.put("tipoDocumento", node.has("tipoDocumento") ? node.get("tipoDocumento").asText() : docMeta.getTipoDocumento());
                                        info.put("numeroReferencia", node.has("numeroReferencia") ? node.get("numeroReferencia").asText() : "");
                                        info.put("cliente", node.has("cliente") ? node.get("cliente").asText() : "");
                                        info.put("contratoOC", node.has("contratoOC") ? node.get("contratoOC").asText() : "");
                                        info.put("fechaDocumento", node.has("fechaDocumento") ? node.get("fechaDocumento").asText() : "");
                                        info.put("descripcion", node.has("descripcion") ? node.get("descripcion").asText() : "");
                                    } catch (Exception e) {
                                        setDefaultMetadata(info, docMeta);
                                    }
                                } else {
                                    setDefaultMetadata(info, docMeta);
                                }
                            } else {
                                info.put("estadoAprobacion", null);
                                setEmptyMetadata(info);
                            }
                        } else {
                            info.put("estadoAprobacion", null);
                            setEmptyMetadata(info);
                        }
                        respuesta.add(info);
                    }
                }
            }
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private void limpiarExcelPostventa() throws IOException {
        List<DocumentoMetadata> metadatos = metadataRepository.findByRutaStartingWith("Postventa/");
        if (!metadatos.isEmpty()) {
            metadataRepository.deleteAll(metadatos);
            log.info("Eliminados {} metadatos de Postventa", metadatos.size());
        }
        Path postventaPath = Paths.get(ROOT_PATH, "Postventa");
        if (Files.exists(postventaPath)) {
            try (Stream<Path> files = Files.walk(postventaPath, 1)) {
                List<Path> excels = files
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().toLowerCase().endsWith(".xlsx") || p.toString().toLowerCase().endsWith(".xls"))
                    .collect(Collectors.toList());
                for (Path excel : excels) {
                    Files.deleteIfExists(excel);
                }
            }
        }
    }

    private void limpiarExcelTablaControl() throws IOException {
        List<DocumentoMetadata> metadatos = metadataRepository.findByRutaStartingWith("TablaControl/");
        if (!metadatos.isEmpty()) {
            metadataRepository.deleteAll(metadatos);
            log.info("Eliminados {} metadatos de TablaControl", metadatos.size());
        }
        Path tablaPath = Paths.get(ROOT_PATH, "TablaControl");
        if (Files.exists(tablaPath)) {
            try (Stream<Path> files = Files.walk(tablaPath, 1)) {
                List<Path> excels = files
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().toLowerCase().endsWith(".xlsx") || p.toString().toLowerCase().endsWith(".xls"))
                    .collect(Collectors.toList());
                for (Path excel : excels) {
                    Files.deleteIfExists(excel);
                    log.info("Eliminado archivo físico: {}", excel);
                }
            }
        }
    }

    private void setDefaultMetadata(Map<String, Object> info, DocumentoMetadata docMeta) {
        info.put("modulo", "");
        info.put("tipoDocumento", docMeta.getTipoDocumento() != null ? docMeta.getTipoDocumento() : "");
        info.put("numeroReferencia", "");
        info.put("cliente", "");
        info.put("contratoOC", "");
        info.put("fechaDocumento", "");
        info.put("descripcion", "");
    }

    private void setEmptyMetadata(Map<String, Object> info) {
        info.put("modulo", "");
        info.put("tipoDocumento", "");
        info.put("numeroReferencia", "");
        info.put("cliente", "");
        info.put("contratoOC", "");
        info.put("fechaDocumento", "");
        info.put("descripcion", "");
    }

    // ==================== NUEVOS MÉTODOS MODIFICADOS PARA ONLYOFFICE ====================

    /**
     * Endpoint que devuelve la configuración para el editor de ONLYOFFICE,
     * incluyendo el token JWT firmado con la clave secreta del servidor.
     */
@GetMapping(value = "/onlyoffice/config", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<Map<String, Object>> getOnlyOfficeConfig(
        @RequestParam String ruta,
        @RequestParam(required = false) String tokenParam,
        HttpServletRequest request,
        Authentication authentication) {

    // Validar archivo
    Path path = Paths.get(ROOT_PATH).resolve(ruta).normalize();
    File file = path.toFile();
    if (!file.exists()) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    String fileName = file.getName();
    String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase() : "";
    String documentKey = "LC_" + Math.abs((ruta + file.lastModified()).hashCode());

    // Obtener email del usuario autenticado
    String email = "anonimo@menelec.sas";

    if (authentication != null && authentication.isAuthenticated()) {
        email = authentication.getName();
        log.info("✅ Email obtenido de Authentication: {}", email);
    } else {
        // Fallback: header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String bearerToken = authHeader.substring(7);
            try {
                String extractedEmail = jwtUtil.extractUsername(bearerToken);
                if (extractedEmail != null) {
                    email = extractedEmail;
                    log.info("✅ Email extraído del header (fallback): {}", email);
                }
            } catch (Exception e) {
                log.warn("⚠️ Error validando token del header: {}", e.getMessage());
            }
        }

        // Fallback: parámetro URL
        if (email.equals("anonimo@menelec.sas") && tokenParam != null && !tokenParam.isEmpty()) {
            try {
                String extractedEmail = jwtUtil.extractUsername(tokenParam);
                if (extractedEmail != null) {
                    email = extractedEmail;
                    log.info("✅ Email extraído del parámetro URL (fallback): {}", email);
                }
            } catch (Exception e) {
                log.warn("⚠️ Error validando token del parámetro URL: {}", e.getMessage());
            }
        }
    }

    log.info("📧 Email final para appToken: {}", email);

    // Generar appToken
    String appToken = jwtUtil.generateToken(email);
    log.info("🔑 appToken generado: {}", appToken);

    // Codificar el token para la URL
    String rutaEncoded = URLEncoder.encode(ruta, StandardCharsets.UTF_8).replace("+", "%20");
    String serverBaseUrl = getBackendBaseUrl(request);
    String urlDescarga = serverBaseUrl + "/api/archivos/download?ruta=" + rutaEncoded 
            + "&token=" + URLEncoder.encode(appToken, StandardCharsets.UTF_8);
    String urlCallback = serverBaseUrl + "/api/archivos/onlyoffice/callback?ruta=" + rutaEncoded 
            + "&token=" + URLEncoder.encode(appToken, StandardCharsets.UTF_8);

    // Construir configuración
    Map<String, Object> config = new HashMap<>();
    config.put("documentType", getDocType(ext));
    config.put("width", "100%");
    config.put("height", "100%");

    Map<String, Object> document = new HashMap<>();
    document.put("fileType", ext);
    document.put("key", documentKey);
    document.put("title", fileName);
    document.put("url", urlDescarga);
    document.put("permissions", Map.of(
        "chat", true,
        "comment", true,
        "edit", true,
        "download", true
    ));
    config.put("document", document);

    Map<String, Object> editorConfig = new HashMap<>();
    editorConfig.put("callbackUrl", urlCallback);
    editorConfig.put("lang", "es");
    editorConfig.put("canCoAuthoring", true);
    editorConfig.put("user", Map.of(
        "id", email,
        "name", email.equals("anonimo@menelec.sas") ? "Anónimo" : "Usuario Menelec"
    ));
    editorConfig.put("customization", Map.of(
        "forcesave", true,
        "help", false,
        "compactToolbar", false
    ));
    config.put("editorConfig", editorConfig);

    // Generar token de ONLYOFFICE
    String onlyOfficeToken = generateOnlyOfficeToken(config, onlyOfficeSecret);
    config.put("token", onlyOfficeToken);

    return ResponseEntity.ok(config);
}
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
@GetMapping("/download")
public ResponseEntity<Resource> descargarArchivo(
        @RequestParam String ruta,
        @RequestParam(required = false) String token,
        HttpServletRequest request) {

    String fullUrl = request.getRequestURL() + "?" + request.getQueryString();
    log.info("📥 URL completa de descarga: {}", fullUrl);
    log.info("🔑 Token recibido (crudo): {}", token);

    // 🔥 LIMPIEZA DEL TOKEN: si tiene más de 2 puntos, tomar solo los primeros 3 segmentos
    if (token != null && !token.isEmpty()) {
        String[] parts = token.split("\\.");
        if (parts.length > 3) {
            token = parts[0] + "." + parts[1] + "." + parts[2];
            log.info("🔑 Token limpiado a: {}", token);
        }
    }

    try {
        log.info("Token a validar: {}", token);
        String email = null;

        // 1. Intentar con el token de la URL (ya limpiado)
        if (token != null && !token.isEmpty()) {
            email = jwtUtil.extractUsername(token);
            log.info("📧 Email extraído del token: {}", email);
        }

        // 2. Si falla, intentar con el header Authorization (fallback)
        if (email == null) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String bearerToken = authHeader.substring(7);
                email = jwtUtil.extractUsername(bearerToken);
                log.info("📧 Email extraído del header: {}", email);
            }
        }

        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Descargar archivo
        String rutaDecodificada = URLDecoder.decode(ruta, StandardCharsets.UTF_8);
        Path file = Paths.get(ROOT_PATH).resolve(rutaDecodificada).normalize();
        Resource resource = new UrlResource(file.toUri());
        if (resource.exists() && resource.isReadable()) {
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "application/octet-stream")
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
        }
        return ResponseEntity.notFound().build();
    } catch (Exception e) {
        log.error("Error en descarga", e);
        return ResponseEntity.internalServerError().build();
    }
}
    @PostMapping("/onlyoffice/callback")
    public Map<String, Object> onlyOfficeCallback(
            @RequestParam String ruta,
            @RequestParam(required = false) String token,
            @RequestBody OnlyOfficeCallbackDTO callbackData) {
        try {
            if (token == null || token.isEmpty()) {
                log.error("Callback sin token");
                return Map.of("error", 1, "message", "Token requerido");
            }
            String email = jwtUtil.extractUsername(token);
            if (email == null) {
                log.error("Token inválido en callback");
                return Map.of("error", 1, "message", "Token inválido");
            }

            String rutaDecodificada = URLDecoder.decode(ruta, StandardCharsets.UTF_8);

            if (callbackData.getStatus() == 2) {
                // Descargar el archivo desde la URL que envía OnlyOffice
                String urlDescargaOficial = callbackData.getUrl();
                Path pathDestino = Paths.get(ROOT_PATH).resolve(rutaDecodificada).normalize();
                Files.createDirectories(pathDestino.getParent());
                URL url = new URL(urlDescargaOficial);
                try (InputStream in = url.openStream()) {
                    Files.copy(in, pathDestino, StandardCopyOption.REPLACE_EXISTING);
                }
                log.info("Archivo guardado exitosamente: {}", pathDestino);

                // Reindexar automáticamente si es Excel
                if (rutaDecodificada.toLowerCase().endsWith(".xlsx") || rutaDecodificada.toLowerCase().endsWith(".xls")) {
                    Optional<DocumentoMetadata> opt = metadataRepository.findByRuta(rutaDecodificada);
                    if (opt.isPresent()) {
                        Long metadataId = opt.get().getId();
                        if (rutaDecodificada.toLowerCase().contains("postventa")) {
                            List<ServicioPostventa> antiguos = servicioPostventaRepository.findByDocumentoMetadataId(metadataId);
                            if (!antiguos.isEmpty()) {
                                servicioPostventaRepository.deleteAll(antiguos);
                            }
                            int count = excelIndexerService.indexarExcel(pathDestino, metadataId);
                            log.info("Postventa re-indexado: {} filas", count);
                        }
                        if (rutaDecodificada.toLowerCase().contains("tabla de control")) {
                            try (InputStream is = Files.newInputStream(pathDestino)) {
                                int countEstudio = tablaControlIndexerService.indexarHojaEnEstudio(is, metadataId);
                                log.info("Tabla Control - EN ESTUDIO re-indexado: {} registros", countEstudio);
                            }
                            try (InputStream is = Files.newInputStream(pathDestino)) {
                                int countPropuestas = tablaControlIndexerService.indexarHojaPropuestas(is, metadataId);
                                log.info("Tabla Control - PROPUESTAS re-indexado: {} registros", countPropuestas);
                            }
                            try (InputStream is = Files.newInputStream(pathDestino)) {
                                int countContratos = tablaControlIndexerService.indexarHojaContratos(is, metadataId);
                                log.info("Tabla Control - CONTRATOS re-indexado: {} registros", countContratos);
                            }
                        }
                        if (rutaDecodificada.toLowerCase().contains("tesorería")) {
                            try {
                                tesoreriaController.reindexar(metadataId);
                                log.info("Tesorería re-indexada para metadataId: {}", metadataId);
                            } catch (Exception e) {
                                log.error("Error al reindexar Tesorería", e);
                            }
                        }
                    } else {
                        log.warn("No se encontró metadata para ruta: {}", rutaDecodificada);
                    }
                }
            }
            return Map.of("error", 0);
        } catch (Exception e) {
            log.error("Error en callback de ONLYOFFICE", e);
            return Map.of("error", 1);
        }
    }

    // ==================== RESTO DE MÉTODOS EXISTENTES (sin cambios) ====================

    @GetMapping("/buscar-servicios")
    public ResponseEntity<?> buscarServicios(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String contrato,
            @RequestParam(required = false) String equipo,
            @RequestParam(required = false) String detalle,
            @RequestParam(required = false) String estado) {

        List<ServicioPostventa> resultados = new ArrayList<>();
        if (texto != null && !texto.isEmpty()) {
            resultados = servicioPostventaRepository.busquedaLibre(texto);
        } else if ((contrato != null && !contrato.isEmpty()) ||
                   (equipo != null && !equipo.isEmpty()) ||
                   (detalle != null && !detalle.isEmpty()) ||
                   (estado != null && !estado.isEmpty())) {
            resultados = servicioPostventaRepository.busquedaPorCampos(contrato, equipo, detalle, estado);
        } else {
            return ResponseEntity.ok(new ArrayList<>());
        }

        List<Map<String, Object>> response = new ArrayList<>();
        for (ServicioPostventa s : resultados) {
            Optional<DocumentoMetadata> docMeta = metadataRepository.findById(s.getDocumentoMetadataId());
            if (docMeta.isPresent()) {
                Map<String, Object> item = new HashMap<>();
                item.put("servicio", s);
                item.put("documento", docMeta.get());
                item.put("rutaDocumento", docMeta.get().getRuta());
                response.add(item);
            } else {
                servicioPostventaRepository.delete(s);
                log.warn("Servicio huérfano eliminado: ID {}", s.getId());
            }
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/renombrar")
    public ResponseEntity<?> renombrar(@RequestParam String rutaAntigua, @RequestParam String nombreNuevo) {
        try {
            Path origen = Paths.get(ROOT_PATH).resolve(rutaAntigua.replace("/", File.separator)).normalize();
            Path destino = origen.getParent().resolve(nombreNuevo).normalize();
            if (Files.exists(destino)) {
                return ResponseEntity.badRequest().body("El nombre de destino ya existe.");
            }
            Files.move(origen, destino, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            metadataRepository.findByRuta(rutaAntigua).ifPresent(meta -> {
                String nuevaRuta = rutaAntigua.substring(0, rutaAntigua.lastIndexOf('/') + 1) + nombreNuevo;
                meta.setRuta(nuevaRuta);
                metadataRepository.save(meta);
            });
            return ResponseEntity.ok(Map.of("mensaje", "Renombrado exitoso"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/eliminar")
    public ResponseEntity<?> eliminar(@RequestParam String ruta) {
        try {
            Path path = Paths.get(ROOT_PATH).resolve(ruta).normalize();
            if (Files.exists(path)) {
                Files.walk(path)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); }
                        catch (IOException e) { throw new RuntimeException(e); }
                    });
            }
            List<DocumentoMetadata> docs = metadataRepository.findByRutaStartingWith(ruta);
            metadataRepository.deleteAll(docs);
            return ResponseEntity.ok(Map.of("mensaje", "Área eliminada con éxito"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al eliminar: " + e.getMessage());
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("ruta") String ruta,
            @RequestParam(value = "tareaId", required = false) Long tareaId,
            @RequestParam(value = "modulo", required = false) String modulo,
            @RequestParam(value = "tipoDocumento", required = false) String tipoDocumento,
            @RequestParam(value = "numeroReferencia", required = false) String numeroReferencia,
            @RequestParam(value = "cliente", required = false) String cliente,
            @RequestParam(value = "contratoOC", required = false) String contratoOC,
            @RequestParam(value = "fechaDocumento", required = false) String fechaDocumento,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            if ("Postventa".equals(ruta)) {
                limpiarExcelPostventa();
            }
            if ("Tabla de Control".equals(ruta)) {
                limpiarExcelTablaControl();
            }
            String nombreOriginal = file.getOriginalFilename();
            Path directorioDestino = Paths.get(ROOT_PATH).resolve(ruta).normalize();
            Files.createDirectories(directorioDestino);
            Path archivoDestino = directorioDestino.resolve(nombreOriginal);
            Files.copy(file.getInputStream(), archivoDestino, StandardCopyOption.REPLACE_EXISTING);

            Map<String, String> metadatosMap = new HashMap<>();
            metadatosMap.put("modulo", modulo != null ? modulo : "");
            metadatosMap.put("tipoDocumento", tipoDocumento != null ? tipoDocumento : "");
            metadatosMap.put("numeroReferencia", numeroReferencia != null ? numeroReferencia : "");
            metadatosMap.put("cliente", cliente != null ? cliente : "");
            metadatosMap.put("contratoOC", contratoOC != null ? contratoOC : "");
            metadatosMap.put("fechaDocumento", fechaDocumento != null ? fechaDocumento : "");
            metadatosMap.put("descripcion", descripcion != null ? descripcion : "");
            String metadatosJson = objectMapper.writeValueAsString(metadatosMap);

            String rutaRelativa = ruta.isEmpty() ? archivoDestino.getFileName().toString() : ruta + "/" + archivoDestino.getFileName().toString();
            DocumentoMetadata metadata = new DocumentoMetadata();
            metadata.setNombre(archivoDestino.getFileName().toString());
            metadata.setRuta(rutaRelativa);
            metadata.setTipoDocumento(tipoDocumento != null ? tipoDocumento : "OTRO");
            metadata.setMetadatosJson(metadatosJson);
            metadata.setCreadorEmail(email);
            metadata.setFechaSubida(LocalDateTime.now());
            metadata.setEstado("PENDIENTE");
            if (tareaId != null) {
                metadata.setTareaId(tareaId);
            }
            metadataRepository.save(metadata);

            if ("Tabla de Control".equals(ruta) && (nombreOriginal.endsWith(".xlsx") || nombreOriginal.endsWith(".xls"))) {
                try (InputStream is = Files.newInputStream(archivoDestino)) {
                    int countEstudio = tablaControlIndexerService.indexarHojaEnEstudio(is, metadata.getId());
                    log.info("Hoja EN ESTUDIO indexada: {} registros", countEstudio);
                }
                try (InputStream is2 = Files.newInputStream(archivoDestino)) {
                    int countPropuestas = tablaControlIndexerService.indexarHojaPropuestas(is2, metadata.getId());
                    log.info("Hoja PROPUESTAS indexada: {} registros", countPropuestas);
                }
                try (InputStream is3 = Files.newInputStream(archivoDestino)) {
                    int countContratos = tablaControlIndexerService.indexarHojaContratos(is3, metadata.getId());
                    log.info("Hoja CONTRATOS indexada: {} registros", countContratos);
                }
            }

            String area = ruta.split("/")[0];
            String rutaSugerida = archiverService.generarNuevaRuta(metadata, area);

            Map<String, Object> response = new HashMap<>();
            response.put("metadataId", metadata.getId());
            response.put("rutaOriginal", metadata.getRuta());
            response.put("rutaSugerida", rutaSugerida);
            response.put("tipoDocumento", metadata.getTipoDocumento());
            response.put("mensaje", "Archivo subido correctamente");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error al subir archivo: " + e.getMessage());
        }
    }

    @GetMapping("/tabla-control/contratos")
    public ResponseEntity<?> getContratos(@RequestParam Long metadataId) {
        List<Contrato> contratos = contratoRepository.findByDocumentoMetadataId(metadataId);
        return ResponseEntity.ok(contratos);
    }

    @GetMapping("/tabla-control/propuestas")
    public ResponseEntity<?> getPropuestas(@RequestParam Long metadataId) {
        List<Propuesta> propuestas = propuestaRepository.findByDocumentoMetadataId(metadataId);
        return ResponseEntity.ok(propuestas);
    }

    @PostMapping("/confirmar-movimiento")
    public ResponseEntity<?> confirmarMovimiento(@RequestParam Long metadataId,
                                                @RequestParam String rutaDestino,
                                                Authentication authentication) {
        try {
            String email = authentication.getName();
            DocumentoMetadata metadata = metadataRepository.findById(metadataId)
                    .orElseThrow(() -> new RuntimeException("Metadata no encontrada"));
            boolean esAdmin = authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
            if (!metadata.getCreadorEmail().equals(email) && !esAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No autorizado");
            }
            archiverService.moverArchivo(metadata, rutaDestino);
            metadata.setRuta(rutaDestino);
            metadataRepository.save(metadata);
            return ResponseEntity.ok(Map.of("mensaje", "Archivo movido correctamente", "nuevaRuta", rutaDestino));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al mover: " + e.getMessage());
        }
    }

    @PostMapping("/upload-procesar")
    public ResponseEntity<?> uploadProcesar(@RequestParam("file") MultipartFile file,
                                            @RequestParam("ruta") String ruta,
                                            Authentication authentication) {
        return uploadFile(file, ruta, null, null, null, null, null, null, null, null, authentication);
    }

    @GetMapping("/ultimos-con-metadatos")
    public ResponseEntity<?> ultimosConMetadatos() {
        try {
            List<DocumentoMetadata> docs = metadataRepository.findTop10ByMetadatosJsonIsNotNullOrderByFechaSubidaDesc();
            return ResponseEntity.ok(docs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/tabla-control/en-estudio")
    public ResponseEntity<?> getProcesosEnEstudio(@RequestParam Long metadataId) {
        List<ProcesoEnEstudio> procesos = procesoEnEstudioRepository.findByDocumentoMetadataId(metadataId);
        return ResponseEntity.ok(procesos);
    }

    @GetMapping("/tabla-control/archivo")
    public ResponseEntity<?> getArchivoTablaControl() {
        Path carpeta = Paths.get(ROOT_PATH, "Tabla de Control");
        if (!Files.exists(carpeta)) return ResponseEntity.notFound().build();
        try (Stream<Path> files = Files.list(carpeta)) {
            Optional<Path> excel = files.filter(p -> p.toString().toLowerCase().endsWith(".xlsx")).findFirst();
            if (excel.isPresent()) {
                Path archivo = excel.get();
                String rutaRelativa = "Tabla de Control/" + archivo.getFileName().toString();
                Optional<DocumentoMetadata> meta = metadataRepository.findByRuta(rutaRelativa);
                if (meta.isPresent()) {
                    Map<String, Object> response = Map.of(
                        "metadataId", meta.get().getId(),
                        "ruta", rutaRelativa,
                        "nombre", archivo.getFileName().toString()
                    );
                    return ResponseEntity.ok(response);
                }
            }
            return ResponseEntity.ok(Map.of());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/por-tarea")
    public ResponseEntity<List<DocumentoMetadata>> listarPorTarea(@RequestParam Long tareaId) {
        List<DocumentoMetadata> docs = metadataRepository.findByTareaId(tareaId);
        return ResponseEntity.ok(docs);
    }

    @PostMapping("/aprobar")
    public ResponseEntity<?> aprobarDocumento(@RequestParam String ruta,
                                              @RequestParam boolean aprobado,
                                              Authentication authentication) {
        try {
            String email = authentication.getName();
            DocumentoMetadata metadata = metadataRepository.findByRuta(ruta)
                    .orElseThrow(() -> new RuntimeException("Documento no encontrado"));
            boolean esAdmin = authentication.getAuthorities().stream()
                    .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
            if (!metadata.getResponsableAprobacionEmail().equals(email) && !esAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No autorizado");
            }
            metadata.setEstado(aprobado ? "APROBADO" : "RECHAZADO");
            metadataRepository.save(metadata);
            if (metadata.getTareaId() != null) {
                Tarea tarea = tareaRepository.findById(metadata.getTareaId()).orElse(null);
                if (tarea != null) {
                    tarea.setEstado(aprobado ? "COMPLETADO" : "RECHAZADO");
                    tareaRepository.save(tarea);
                }
            }
            return ResponseEntity.ok(Map.of("estado", metadata.getEstado()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/crear-carpeta")
    public ResponseEntity<?> crearCarpeta(@RequestBody Map<String, String> request) {
        try {
            String categoria = request.get("categoria");
            String nombre = request.get("nombre");
            Path nuevaRuta = Paths.get(ROOT_PATH).resolve(categoria).resolve(nombre).normalize();
            if (Files.exists(nuevaRuta)) {
                return ResponseEntity.badRequest().body("La carpeta ya existe");
            }
            Files.createDirectories(nuevaRuta);
            return ResponseEntity.ok(Map.of("mensaje", "Carpeta creada con éxito"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al crear carpeta: " + e.getMessage());
        }
    }

    @GetMapping("/buscar-documentos")
    public ResponseEntity<?> buscarDocumentos(
            @RequestParam(required = false) String texto,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String tipoDocumento,
            @RequestParam(required = false) String numeroReferencia,
            @RequestParam(required = false) String cliente,
            @RequestParam(required = false) String contratoOC,
            @RequestParam(required = false) String fechaDocumento,
            Authentication authentication) {
        try {
            CriteriaBuilder cb = entityManager.getCriteriaBuilder();
            CriteriaQuery<DocumentoMetadata> cq = cb.createQuery(DocumentoMetadata.class);
            Root<DocumentoMetadata> root = cq.from(DocumentoMetadata.class);
            List<Predicate> predicates = new ArrayList<>();

            if (tipoDocumento != null && !tipoDocumento.isEmpty()) {
                predicates.add(cb.equal(root.get("tipoDocumento"), tipoDocumento));
            }

            if (texto != null && !texto.isEmpty()) {
                String like = "%" + texto + "%";
                List<Predicate> textPredicates = new ArrayList<>();
                textPredicates.add(cb.like(root.get("nombre"), like));
                Expression<String> numeroRef = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.numeroReferencia")));
                textPredicates.add(cb.like(numeroRef, like));
                Expression<String> clienteExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.cliente")));
                textPredicates.add(cb.like(clienteExpr, like));
                Expression<String> contratoExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.contratoOC")));
                textPredicates.add(cb.like(contratoExpr, like));
                Expression<String> moduloExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.modulo")));
                textPredicates.add(cb.like(moduloExpr, like));
                predicates.add(cb.or(textPredicates.toArray(new Predicate[0])));
            }

            if (modulo != null && !modulo.isEmpty()) {
                Expression<String> moduloExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.modulo")));
                predicates.add(cb.equal(moduloExpr, modulo));
            }
            if (numeroReferencia != null && !numeroReferencia.isEmpty()) {
                Expression<String> numRefExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.numeroReferencia")));
                predicates.add(cb.like(numRefExpr, "%" + numeroReferencia + "%"));
            }
            if (cliente != null && !cliente.isEmpty()) {
                Expression<String> clienteExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.cliente")));
                predicates.add(cb.like(clienteExpr, "%" + cliente + "%"));
            }
            if (contratoOC != null && !contratoOC.isEmpty()) {
                Expression<String> contratoExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.contratoOC")));
                predicates.add(cb.like(contratoExpr, "%" + contratoOC + "%"));
            }
            if (fechaDocumento != null && !fechaDocumento.isEmpty()) {
                Expression<String> fechaExpr = cb.function("JSON_UNQUOTE", String.class,
                        cb.function("JSON_EXTRACT", String.class, root.get("metadatosJson"), cb.literal("$.fechaDocumento")));
                predicates.add(cb.equal(fechaExpr, fechaDocumento));
            }

            cq.where(predicates.toArray(new Predicate[0]));
            List<DocumentoMetadata> resultados = entityManager.createQuery(cq).getResultList();

            List<DocumentoMetadata> existentes = new ArrayList<>();
            for (DocumentoMetadata doc : resultados) {
                Path rutaCompleta = Paths.get(ROOT_PATH).resolve(doc.getRuta()).normalize();
                if (Files.exists(rutaCompleta)) {
                    existentes.add(doc);
                }
            }
            return ResponseEntity.ok(existentes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error en búsqueda: " + e.getMessage());
        }
    }

    @DeleteMapping("/limpiar-huerfanos")
    public ResponseEntity<?> limpiarMetadatosHuerfanos() {
        List<DocumentoMetadata> todos = metadataRepository.findAll();
        int eliminados = 0;
        for (DocumentoMetadata doc : todos) {
            Path ruta = Paths.get(ROOT_PATH).resolve(doc.getRuta()).normalize();
            if (!Files.exists(ruta)) {
                metadataRepository.delete(doc);
                eliminados++;
            }
        }
        return ResponseEntity.ok(Map.of("mensaje", "Metadatos huérfanos eliminados", "cantidad", eliminados));
    }

    @GetMapping("/servicios-postventa")
    public ResponseEntity<?> getServiciosPostventa(@RequestParam Long metadataId) {
        List<ServicioPostventa> servicios = servicioPostventaRepository.findByDocumentoMetadataId(metadataId);
        return ResponseEntity.ok(servicios);
    }

    @PostMapping("/indexar-excel")
    public ResponseEntity<?> indexarExcel(@RequestParam Long metadataId, Authentication authentication) {
        Optional<DocumentoMetadata> opt = metadataRepository.findById(metadataId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        DocumentoMetadata doc = opt.get();
        Path filePath = Paths.get(ROOT_PATH).resolve(doc.getRuta());
        if (!Files.exists(filePath)) return ResponseEntity.badRequest().body("Archivo no encontrado");
        try {
            int count = excelIndexerService.indexarExcel(filePath, metadataId);
            return ResponseEntity.ok(Map.of("indexados", count));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al indexar: " + e.getMessage());
        }
    }

    @PostMapping("/sincronizar")
    public ResponseEntity<?> sincronizarMetadatos() {
        Map<String, Object> result = new HashMap<>();
        AtomicInteger procesados = new AtomicInteger(0);
        AtomicInteger ignorados = new AtomicInteger(0);
        try {
            File root = new File(ROOT_PATH);
            if (!root.exists() || !root.isDirectory()) {
                return ResponseEntity.badRequest().body("Ruta raíz no accesible");
            }
            Files.walk(root.toPath())
                .filter(Files::isRegularFile)
                .forEach(filePath -> {
                    try {
                        String rutaAbsoluta = filePath.toString();
                        String rutaRelativa = rutaAbsoluta.substring(ROOT_PATH.length())
                                .replace(File.separator, "/");
                        if (rutaRelativa.startsWith("/")) rutaRelativa = rutaRelativa.substring(1);
                        if (metadataRepository.findByRuta(rutaRelativa).isPresent()) {
                            ignorados.incrementAndGet();
                            return;
                        }
                        String nombre = filePath.getFileName().toString();
                        String extension = "";
                        if (nombre.contains(".")) {
                            extension = nombre.substring(nombre.lastIndexOf(".") + 1).toLowerCase();
                        }
                        String tipoDocumento = "OTRO";
                        if (extension.matches("pdf|docx?|xlsx?|pptx?")) {
                            tipoDocumento = extension.toUpperCase();
                        }
                        String area = rutaRelativa.split("/")[0];
                        DocumentoMetadata meta = new DocumentoMetadata();
                        meta.setNombre(nombre);
                        meta.setRuta(rutaRelativa);
                        meta.setTipoDocumento(tipoDocumento);
                        meta.setEstado("PENDIENTE");
                        meta.setFechaSubida(LocalDateTime.now());
                        meta.setCreadorEmail("sistema@menelec.com");
                        meta.setResponsableAprobacionEmail(obtenerResponsableArea(area));
                        meta.setMetadatosJson("{}");
                        metadataRepository.save(meta);
                        procesados.incrementAndGet();
                    } catch (Exception e) {
                        // log error
                    }
                });
            result.put("mensaje", "Sincronización completada");
            result.put("procesados", procesados.get());
            result.put("ignorados", ignorados.get());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private String obtenerResponsableArea(String area) {
        Optional<Usuario> responsable = usuarioRepository.findByAreaIgnoreCase(area);
        if (responsable.isPresent()) {
            return responsable.get().getEmail();
        }
        List<Usuario> admins = usuarioRepository.findByRol("ADMIN");
        if (!admins.isEmpty()) {
            return admins.get(0).getEmail();
        }
        return "cristian200525molina@gmail.com";
    }

    private String getBackendBaseUrl(HttpServletRequest request) {
        String configuredDockerHost = environment.getProperty("onlyoffice.docker.host");
        String host = (configuredDockerHost != null && !configuredDockerHost.isBlank())
            ? configuredDockerHost
            : request.getServerName();
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

    @PostConstruct
    public void sincronizarInicial() {
        if (metadataRepository.count() == 0) {
            System.out.println("📁 Inicializando metadatos desde archivos existentes...");
            ResponseEntity<?> response = sincronizarMetadatos();
            System.out.println("Resultado de sincronización inicial: " + response.getBody());
        } else {
            System.out.println("✅ Ya existen metadatos. No se ejecuta sincronización automática.");
        }
    }

    @PostMapping("/previsualizar")
    public ResponseEntity<?> previsualizarArchivo(@RequestParam("file") MultipartFile file) {
        try {
            String texto = textExtractorService.extractText(file);
            if (texto == null || texto.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("error", "No se pudo extraer texto del archivo"));
            }
            String tipo = classifierService.detectarTipo(texto);
            Map<String, String> metadatos = metadataExtractorService.extractMetadata(texto, tipo);
            metadatos.put("tipoDetectado", tipo);
            metadatos.put("nombreOriginal", file.getOriginalFilename());
            metadatos.put("tamano", String.format("%.2f KB", file.getSize() / 1024.0));
            if (file.getOriginalFilename().endsWith(".xlsx")) {
                List<Map<String, String>> preview = getExcelPreview(file);
                metadatos.put("preview", preview.toString());
            }
            return ResponseEntity.ok(metadatos);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private List<Map<String, String>> getExcelPreview(MultipartFile file) {
        List<Map<String, String>> preview = new ArrayList<>();
        try (InputStream is = file.getInputStream()) {
            Workbook workbook = WorkbookFactory.create(is);
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();
            int rowCount = 0;
            while (rows.hasNext() && rowCount < 5) {
                Row row = rows.next();
                Map<String, String> rowData = new HashMap<>();
                Iterator<Cell> cells = row.cellIterator();
                int colIdx = 0;
                while (cells.hasNext()) {
                    Cell cell = cells.next();
                    String cellValue = "";
                    switch (cell.getCellType()) {
                        case STRING: cellValue = cell.getStringCellValue(); break;
                        case NUMERIC: cellValue = String.valueOf(cell.getNumericCellValue()); break;
                        case BOOLEAN: cellValue = String.valueOf(cell.getBooleanCellValue()); break;
                        default: cellValue = "";
                    }
                    rowData.put("col_" + colIdx, cellValue);
                    colIdx++;
                }
                preview.add(rowData);
                rowCount++;
            }
        } catch (Exception e) {
            log.warn("Error generando preview del Excel: {}", e.getMessage());
        }
        return preview;
    }
}