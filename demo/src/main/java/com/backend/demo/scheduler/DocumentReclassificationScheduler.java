package com.backend.demo.scheduler;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXException;

import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.repository.DocumentoMetadataRepository;
import com.backend.demo.service.DocumentClassifierService;
import com.backend.demo.service.MetadataExtractorService;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@EnableScheduling
public class DocumentReclassificationScheduler {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private DocumentoMetadataRepository metadataRepo;

    @Autowired
    private DocumentClassifierService classifier;

    @Autowired
    private MetadataExtractorService metadataExtractor;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(cron = "0 0 2 * * *") // cada día a las 2 AM
    public void reclassifyPendingDocuments() {
        List<DocumentoMetadata> sinTipo = metadataRepo.findAll().stream()
                .filter(d -> d.getTipoDocumento() == null || "OTRO".equals(d.getTipoDocumento()))
                .toList();

        for (DocumentoMetadata doc : sinTipo) {
            try {
                Path filePath = Paths.get(uploadDir, doc.getRuta());
                if (!Files.exists(filePath)) continue;
                String texto = extractTextFromPath(filePath);
                if (texto != null && !texto.trim().isEmpty()) {
                    String nuevoTipo = classifier.detectarTipo(texto);
                    doc.setTipoDocumento(nuevoTipo);
                    if ("FACTURA".equals(nuevoTipo)) {
                        Map<String, String> meta = metadataExtractor.extractMetadata(texto, nuevoTipo);
                        if (!meta.isEmpty()) {
                            doc.setMetadatosJson(objectMapper.writeValueAsString(meta));
                        }
                    }
                    metadataRepo.save(doc);
                    System.out.println("Reclasificado: " + doc.getRuta() + " -> " + nuevoTipo);
                }
            } catch (Exception e) {
                System.err.println("Error reclasificando " + doc.getRuta() + ": " + e.getMessage());
            }
        }
    }

    private String extractTextFromPath(Path path) throws IOException, TikaException, SAXException {
        try (InputStream is = Files.newInputStream(path)) {
            AutoDetectParser parser = new AutoDetectParser();
            BodyContentHandler handler = new BodyContentHandler(-1);
            parser.parse(is, handler, new Metadata(), new ParseContext());
            return handler.toString();
        }
    }
}