package com.backend.demo.controller;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.model.RegistroTesoreria;
import com.backend.demo.model.SoporteTesoreria;
import com.backend.demo.repository.DocumentoMetadataRepository;
import com.backend.demo.repository.RegistroTesoreriaRepository;
import com.backend.demo.repository.SoporteTesoreriaRepository;
import com.backend.demo.service.TesoreriaExcelService;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.transaction.Transactional;

@RestController
@RequestMapping("/api/tesoreria")
@CrossOrigin(origins = {"http://localhost:5173", "http://10.187.227.204:5173", "http://10.187.227.59:5173"})
public class TesoreriaController {

    @Value("${file.upload-dir}")
    private String ROOT_PATH;

    @Autowired
    private DocumentoMetadataRepository metadataRepository;

    @Autowired
    private RegistroTesoreriaRepository registroRepo;

    @Autowired
    private SoporteTesoreriaRepository soporteRepo;

    @Autowired
    private TesoreriaExcelService excelService;

    @Autowired
    private ObjectMapper objectMapper;

    // ========== GET /upload (para evitar error 405) ==========
    @GetMapping("/upload")
    public ResponseEntity<?> uploadGet() {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body("Método GET no permitido. Use POST para subir archivos.");
    }

    // ========== UPLOAD EXCEL ==========
    @PostMapping("/upload")
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            Path directorio = obtenerDirectorioTesoreria();
            Files.createDirectories(directorio);
            Path archivoDestino = directorio.resolve(file.getOriginalFilename());
            Files.write(archivoDestino, bytes);

            try (InputStream is = new ByteArrayInputStream(bytes);
                 Workbook workbook = new XSSFWorkbook(is)) {

                List<RegistroTesoreria> registrosLiccont = excelService.leerHoja(workbook, "LICCONT", null);
                List<RegistroTesoreria> registrosMenelec = excelService.leerHoja(workbook, "MENELEC SAS", null);

                String rutaRelativa = "Tesoreria/" + archivoDestino.getFileName().toString();
                DocumentoMetadata metadata = metadataRepository.findByRuta(rutaRelativa)
                    .orElseGet(DocumentoMetadata::new);
                metadata.setNombre(archivoDestino.getFileName().toString());
                metadata.setRuta(rutaRelativa);
                metadata.setTipoDocumento("EXCEL");
                metadata.setCreadorEmail("sistema@menelec.com");
                metadata.setFechaSubida(LocalDateTime.now());
                metadata.setEstado("PENDIENTE");
                Map<String, String> metadatosMap = new HashMap<>();
                metadatosMap.put("modulo", "Tesoreria");
                metadatosMap.put("tipoDocumento", "Excel");
                metadata.setMetadatosJson(objectMapper.writeValueAsString(metadatosMap));
                metadataRepository.save(metadata);

                registrosLiccont.forEach(r -> r.setMetadataId(metadata.getId()));
                registrosMenelec.forEach(r -> r.setMetadataId(metadata.getId()));
                registroRepo.saveAll(registrosLiccont);
                registroRepo.saveAll(registrosMenelec);

                return ResponseEntity.ok(Map.of(
                    "mensaje", "Excel procesado y guardado",
                    "metadataId", metadata.getId(),
                    "ruta", rutaRelativa,
                    "nombre", archivoDestino.getFileName().toString()
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private Path obtenerDirectorioTesoreria() throws IOException {
        Path carpetaAlterna = Paths.get(ROOT_PATH, "Tesoreria");
        Path carpetaConAcento = Paths.get(ROOT_PATH, "Tesorería");
        if (Files.exists(carpetaAlterna)) {
            return carpetaAlterna;
        }
        if (Files.exists(carpetaConAcento)) {
            return carpetaConAcento;
        }
        Files.createDirectories(carpetaAlterna);
        return carpetaAlterna;
    }

    // ========== OBTENER ARCHIVO ACTUAL ==========
    @GetMapping("/archivo")
    public ResponseEntity<?> getArchivoTesoreria() {
        try {
            Path carpeta = obtenerDirectorioTesoreria();
            if (!Files.exists(carpeta)) return ResponseEntity.ok(Map.of());

            Optional<Path> ultimoExcel = Files.list(carpeta)
                    .filter(p -> p.toString().toLowerCase().endsWith(".xlsx"))
                    .max((p1, p2) -> {
                        try { return Files.getLastModifiedTime(p1).compareTo(Files.getLastModifiedTime(p2)); }
                        catch (IOException e) { return 0; }
                    });

            if (ultimoExcel.isPresent()) {
                Path archivo = ultimoExcel.get();
                String rutaRelativa = "Tesoreria/" + archivo.getFileName().toString();
                Optional<DocumentoMetadata> meta = metadataRepository.findByRuta(rutaRelativa);
                if (!meta.isPresent()) {
                    meta = metadataRepository.findByRuta("Tesorería/" + archivo.getFileName().toString());
                }
                if (meta.isPresent()) {
                    return ResponseEntity.ok(Map.of(
                        "metadataId", meta.get().getId(),
                        "ruta", rutaRelativa,
                        "nombre", archivo.getFileName().toString()
                    ));
                }
            }
            return ResponseEntity.ok(Map.of());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/datos")
    public ResponseEntity<List<RegistroTesoreria>> getDatos(
            @RequestParam Long metadataId,
            @RequestParam String empresa) {
        List<RegistroTesoreria> registros = registroRepo.findByMetadataIdAndEmpresa(metadataId, empresa);
        return ResponseEntity.ok(registros);
    }

    @PostMapping("/fila/{rowId}/soportes")
    public ResponseEntity<?> uploadSoportes(@PathVariable Long rowId,
                                            @RequestParam("files") List<MultipartFile> files) {
    try {
        Optional<RegistroTesoreria> optReg = registroRepo.findById(rowId);
        if (optReg.isEmpty()) return ResponseEntity.notFound().build();
        RegistroTesoreria reg = optReg.get();

        String empresa = reg.getEmpresa(); // <-- Se obtiene la empresa

        String subFolder = sanitizeFolderName(
            (reg.getNumeroContrato() != null ? reg.getNumeroContrato() : "SN") + " - " +
            (reg.getNumeroFactura() != null ? reg.getNumeroFactura() : "SN") + " - " +
            (reg.getTerceroBeneficiario() != null ? reg.getTerceroBeneficiario() : "SN")
        );

        // La carpeta ahora incluye la empresa
        Path dir = Paths.get(fileUploadDir, "Tesorería", empresa, subFolder);
        Files.createDirectories(dir);

        List<Map<String, String>> resultados = new ArrayList<>();
        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename();
            String storedName = System.currentTimeMillis() + "_" + originalName;
            Path filePath = dir.resolve(storedName);
            Files.write(filePath, file.getBytes());

            // La ruta relativa incluye la empresa
            String rutaRelativa = "Tesorería/" + empresa + "/" + subFolder + "/" + storedName;

            SoporteTesoreria soporte = new SoporteTesoreria();
            soporte.setRegistroId(rowId);
            soporte.setNombreArchivo(originalName);
            soporte.setRutaRelativa(rutaRelativa);
            soporte.setTipo(determinarTipo(originalName));
            soporte.setFechaSubida(LocalDateTime.now());
            soporteRepo.save(soporte);

            resultados.add(Map.of("nombre", originalName, "ruta", rutaRelativa));
        }
        return ResponseEntity.ok(Map.of("mensaje", "Archivos subidos", "archivos", resultados));
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("Error al subir soportes: " + e.getMessage());
    }
}

// Obtener soportes de una fila
@GetMapping("/fila/{rowId}/soportes")
public ResponseEntity<List<SoporteTesoreria>> getSoportes(@PathVariable Long rowId) {
    return ResponseEntity.ok(soporteRepo.findByRegistroId(rowId));
}

// Eliminar soporte
@DeleteMapping("/soporte/{id}")
public ResponseEntity<?> deleteSoporte(@PathVariable Long id) {
    try {
        Optional<SoporteTesoreria> opt = soporteRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        SoporteTesoreria s = opt.get();
        Path filePath = Paths.get(fileUploadDir).resolve(s.getRutaRelativa());
        Files.deleteIfExists(filePath);
        soporteRepo.delete(s);
        return ResponseEntity.ok(Map.of("mensaje", "Soporte eliminado"));
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
    }
}

// Método auxiliar para limpiar nombres de carpeta
private String sanitizeFolderName(String name) {
    return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
}

private String determinarTipo(String fileName) {
    String ext = fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase();
    switch (ext) {
        case "PDF": return "PDF";
        case "XLSX": case "XLS": return "EXCEL";
        case "JPG": case "JPEG": case "PNG": case "GIF": return "IMAGEN";
        default: return "OTRO";
    }
}

// No olvides inyectar fileUploadDir desde application.properties
@Value("${file.upload-dir}")
private String fileUploadDir;
    // ========== AGREGAR NUEVA FILA ==========
    @PostMapping("/fila")
    @Transactional
    public ResponseEntity<?> agregarFila(@RequestBody Map<String, Object> body) {
        try {
            Long metadataId = Long.parseLong(body.get("metadataId").toString());
            String empresa = body.get("empresa").toString();
            Map<String, String> filaMap = (Map<String, String>) body.get("fila");

            RegistroTesoreria nuevo = new RegistroTesoreria();
            nuevo.setMetadataId(metadataId);
            nuevo.setEmpresa(empresa);
            nuevo.setFecha(LocalDate.parse(filaMap.get("fecha")));
            nuevo.setFuente(filaMap.get("fuente"));
            nuevo.setCentroCostos(filaMap.get("centroCostos"));
            nuevo.setResponsablePago(filaMap.get("responsablePago"));
            nuevo.setNumeroContrato(filaMap.get("numeroContrato"));
            nuevo.setConcepto(filaMap.get("concepto"));
            nuevo.setTerceroBeneficiario(filaMap.get("terceroBeneficiario"));
            nuevo.setNumeroFactura(filaMap.get("numeroFactura"));
            nuevo.setValor(new BigDecimal(filaMap.get("valor")));
            if (filaMap.get("reteFuente") != null && !filaMap.get("reteFuente").isEmpty())
                nuevo.setReteFuente(new BigDecimal(filaMap.get("reteFuente")));
            if (filaMap.get("reteIca") != null && !filaMap.get("reteIca").isEmpty())
                nuevo.setReteIca(new BigDecimal(filaMap.get("reteIca")));
            if (filaMap.get("reteIva") != null && !filaMap.get("reteIva").isEmpty())
                nuevo.setReteIva(new BigDecimal(filaMap.get("reteIva")));
            nuevo.setObservaciones(filaMap.get("observaciones"));

            registroRepo.save(nuevo);
            actualizarExcel(metadataId);

            return ResponseEntity.ok(Map.of("mensaje", "Fila agregada correctamente"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    // ========== ACTUALIZAR EXCEL ==========
    private void actualizarExcel(Long metadataId) throws Exception {
        Optional<DocumentoMetadata> opt = metadataRepository.findById(metadataId);
        if (opt.isEmpty()) throw new Exception("Metadata no encontrada");
        DocumentoMetadata meta = opt.get();
        Path archivoPath = Paths.get(ROOT_PATH).resolve(meta.getRuta()).normalize();

        // Verificar si el archivo está bloqueado
        if (!Files.exists(archivoPath)) {
            throw new Exception("El archivo no existe: " + archivoPath);
        }

        List<RegistroTesoreria> todos = registroRepo.findByMetadataId(metadataId);
        
        // 🔥 CORREGIDO: Filtrar por empresas correctas
        List<RegistroTesoreria> liccont = todos.stream()
            .filter(r -> "LICCONT".equalsIgnoreCase(r.getEmpresa()) || 
                        "MENELEC SAS".equalsIgnoreCase(r.getEmpresa()))
            .toList();
        List<RegistroTesoreria> menelec = todos.stream()
            .filter(r -> "MENELEC SAS".equalsIgnoreCase(r.getEmpresa()))
            .toList();

        // Si no hay datos, crear hojas vacías
        if (liccont.isEmpty() && menelec.isEmpty()) {
            liccont = new ArrayList<>();
            menelec = new ArrayList<>();
        }

        // 🔥 ESCRIBIR EN UN ARCHIVO TEMPORAL Y LUEGO REEMPLAZAR (evita bloqueos)
        Path tempFile = Files.createTempFile("tesoreria_", ".xlsx");
        try {
            try (Workbook workbook = new XSSFWorkbook()) {
                Sheet sheet1 = workbook.createSheet("LICCONT");
                crearHojaExcel(sheet1, liccont);
                
                Sheet sheet2 = workbook.createSheet("MENELEC SAS");
                crearHojaExcel(sheet2, menelec);

                try (var fos = Files.newOutputStream(tempFile)) {
                    workbook.write(fos);
                    fos.flush();
                }
            }

            // Reemplazar el archivo original
            Files.copy(tempFile, archivoPath, StandardCopyOption.REPLACE_EXISTING);
            
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }
    private void crearHojaExcel(Sheet sheet, List<RegistroTesoreria> registros) {
        String[] columnas = {"FECHA", "FUENTE", "CENTRO DE COSTOS", "RESPONSABLE DEL PAGO",
                "NUMERO CONTRATO", "CONCEPTO", "TERCERO BENEFICIARIO",
                "NUMERO DE FACTURA", "VALOR", "RETE FUENTE", "RETE ICA",
                "RETE IVA", "OBSERVACIONES"};
        Row header = sheet.createRow(0);
        for (int i = 0; i < columnas.length; i++) {
            header.createCell(i).setCellValue(columnas[i]);
        }
        
        if (registros == null || registros.isEmpty()) {
            System.out.println("⚠️ No hay registros para la hoja: " + sheet.getSheetName());
            return;
        }

        int rowNum = 1;
        for (RegistroTesoreria r : registros) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(r.getFecha() != null ? r.getFecha().toString() : "");
            row.createCell(1).setCellValue(r.getFuente() != null ? r.getFuente() : "");
            row.createCell(2).setCellValue(r.getCentroCostos() != null ? r.getCentroCostos() : "");
            row.createCell(3).setCellValue(r.getResponsablePago() != null ? r.getResponsablePago() : "");
            row.createCell(4).setCellValue(r.getNumeroContrato() != null ? r.getNumeroContrato() : "");
            row.createCell(5).setCellValue(r.getConcepto() != null ? r.getConcepto() : "");
            row.createCell(6).setCellValue(r.getTerceroBeneficiario() != null ? r.getTerceroBeneficiario() : "");
            row.createCell(7).setCellValue(r.getNumeroFactura() != null ? r.getNumeroFactura() : "");
            row.createCell(8).setCellValue(r.getValor() != null ? r.getValor().doubleValue() : 0);
            row.createCell(9).setCellValue(r.getReteFuente() != null ? r.getReteFuente().doubleValue() : 0);
            row.createCell(10).setCellValue(r.getReteIca() != null ? r.getReteIca().doubleValue() : 0);
            row.createCell(11).setCellValue(r.getReteIva() != null ? r.getReteIva().doubleValue() : 0);
            row.createCell(12).setCellValue(r.getObservaciones() != null ? r.getObservaciones() : "");
        }
    }

    // ========== ELIMINAR FILA ==========
    @DeleteMapping("/fila/{id}")
    @Transactional
    public ResponseEntity<?> eliminarFila(@PathVariable Long id) {
        try {
            Optional<RegistroTesoreria> opt = registroRepo.findById(id);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            RegistroTesoreria fila = opt.get();
            Long metadataId = fila.getMetadataId();
            registroRepo.deleteById(id);
            actualizarExcel(metadataId);
            return ResponseEntity.ok(Map.of("mensaje", "Fila eliminada"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    // ========== ACTUALIZAR FILA ==========
    @PutMapping("/fila/{id}")
    @Transactional
    public ResponseEntity<?> actualizarFila(@PathVariable Long id, @RequestBody RegistroTesoreria filaActualizada) {
        try {
            Optional<RegistroTesoreria> opt = registroRepo.findById(id);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            RegistroTesoreria fila = opt.get();
            fila.setFecha(filaActualizada.getFecha());
            fila.setFuente(filaActualizada.getFuente());
            fila.setCentroCostos(filaActualizada.getCentroCostos());
            fila.setResponsablePago(filaActualizada.getResponsablePago());
            fila.setNumeroContrato(filaActualizada.getNumeroContrato());
            fila.setConcepto(filaActualizada.getConcepto());
            fila.setTerceroBeneficiario(filaActualizada.getTerceroBeneficiario());
            fila.setNumeroFactura(filaActualizada.getNumeroFactura());
            fila.setValor(filaActualizada.getValor());
            fila.setReteFuente(filaActualizada.getReteFuente());
            fila.setReteIca(filaActualizada.getReteIca());
            fila.setReteIva(filaActualizada.getReteIva());
            fila.setObservaciones(filaActualizada.getObservaciones());

            registroRepo.save(fila);
            actualizarExcel(fila.getMetadataId());
            return ResponseEntity.ok(Map.of("mensaje", "Fila actualizada"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    // ========== REINDEXAR EXCEL ==========
    @PostMapping("/reindexar")
    @Transactional
    public ResponseEntity<?> reindexar(@RequestParam Long metadataId) {
        try {
            Optional<DocumentoMetadata> opt = metadataRepository.findById(metadataId);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            DocumentoMetadata meta = opt.get();
            Path archivoPath = Paths.get(ROOT_PATH).resolve(meta.getRuta()).normalize();
            if (!Files.exists(archivoPath)) {
                return ResponseEntity.badRequest().body("Archivo no encontrado");
            }

            // Eliminar registros antiguos
            registroRepo.deleteByMetadataId(metadataId);

            // Leer el archivo como bytes (evita problemas de stream)
            byte[] bytes = Files.readAllBytes(archivoPath);
            try (InputStream is = new ByteArrayInputStream(bytes);
                 Workbook workbook = new XSSFWorkbook(is)) {
                
                List<RegistroTesoreria> liccont = excelService.leerHoja(workbook, "MENELEC SAS", metadataId);
                List<RegistroTesoreria> menelec = excelService.leerHoja(workbook, "MENELEC SAS", metadataId);
                
                registroRepo.saveAll(liccont);
                registroRepo.saveAll(menelec);
            }
            
            return ResponseEntity.ok(Map.of("mensaje", "Reindexado exitoso"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}