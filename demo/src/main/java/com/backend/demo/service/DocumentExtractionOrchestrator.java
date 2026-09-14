package com.backend.demo.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.repository.ServicioPostventaRepository;

@Service
public class DocumentExtractionOrchestrator {
    
    @Autowired
    private DocumentClassifierService classifier;
    
    @Autowired
    private MetadataExtractorService metadataExtractor;
    
    @Autowired
    private ExcelIndexerService excelIndexerService;
    
    @Autowired
    private ServicioPostventaRepository servicioRepo;
    
    @Autowired
    private DocumentTextExtractorService textExtractorService;
    
    public ExtractionResult extract(MultipartFile file, Long documentoMetadataId) throws Exception {
        // 1. Extraer texto
        String texto = textExtractorService.extractText(file);
        
        // 2. Detectar tipo
        String tipo = classifier.detectarTipo(texto);
        
        // 3. Extraer metadatos generales
        Map<String, String> metadatos = metadataExtractor.extractMetadata(texto, tipo);
        metadatos.put("tipoDetectado", tipo);
        
        // 4. Si es Excel, indexar filas
        if (file.getOriginalFilename().endsWith(".xlsx") && tipo.equals("REPORTE_POSTVENTA")) {
            Path tempFile = Files.createTempFile("temp_", ".xlsx");
            file.transferTo(tempFile.toFile());
            int count = excelIndexerService.indexarExcel(tempFile, documentoMetadataId);
            metadatos.put("filas_indexadas", String.valueOf(count));
            Files.delete(tempFile);
        }
        
        return new ExtractionResult(tipo, metadatos);
    }
    
    // Clase interna para el resultado
    public static class ExtractionResult {
        private String tipo;
        private Map<String, String> metadatos;
        
        public ExtractionResult(String tipo, Map<String, String> metadatos) {
            this.tipo = tipo;
            this.metadatos = metadatos;
        }
        
        public String getTipo() { return tipo; }
        public Map<String, String> getMetadatos() { return metadatos; }
        
    }
}