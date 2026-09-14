package com.backend.demo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.backend.demo.model.DocumentoMetadata;
import com.backend.demo.model.ReglaArchivado;
import com.backend.demo.repository.DocumentoMetadataRepository;
import com.backend.demo.repository.ReglaArchivadoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class DocumentArchiverService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Autowired
    private ReglaArchivadoRepository reglaRepository;
    
    @Autowired
    private DocumentoMetadataRepository metadataRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generarNuevaRuta(DocumentoMetadata metadata, String area) throws IOException {
        Optional<ReglaArchivado> reglaOpt = reglaRepository
                .findByTipoDocumentoAndActivoTrueOrderByPrioridadDesc(metadata.getTipoDocumento())
                .stream().findFirst();
        if (reglaOpt.isEmpty()) return metadata.getRuta();

        ReglaArchivado regla = reglaOpt.get();
        String patron = regla.getPatronRuta();
        
        JsonNode metadatos = objectMapper.readTree(metadata.getMetadatosJson());
        
        String anio = LocalDate.now().getYear() + "";
        if (metadatos.has("fecha") && !metadatos.get("fecha").asText().isEmpty()) {
            try {
                String fechaStr = metadatos.get("fecha").asText();
                LocalDate fecha;
                if (fechaStr.contains("-")) {
                    // Formato ISO (yyyy-MM-dd)
                    fecha = LocalDate.parse(fechaStr);
                } else {
                    // Formato dd/MM/yyyy
                    fecha = LocalDate.parse(fechaStr, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
                anio = fecha.getYear() + "";
            } catch (Exception e) {
                // Si falla, se deja el año actual
            }
        }
        
        String numero = metadatos.has("numero_factura") ? metadatos.get("numero_factura").asText() : "SIN_NUMERO";
        String proveedor = metadatos.has("proveedor") ? sanitizar(metadatos.get("proveedor").asText()) : "DESCONOCIDO";
        String extension = metadata.getNombre().substring(metadata.getNombre().lastIndexOf(".") + 1);
        
        String nuevaRuta = patron
            .replace("{area}", area)
            .replace("{anio}", anio)
            .replace("{numero}", numero)
            .replace("{proveedor}", proveedor)
            .replace("{extension}", extension);
        
        if (!nuevaRuta.toLowerCase().endsWith("." + extension.toLowerCase())) {
            nuevaRuta += "." + extension;
        }
        
        // Asegurar unicidad tanto en disco como en BD
        return generarRutaUnica(nuevaRuta);
    }

    /**
     * Genera una ruta única añadiendo sufijos numéricos si ya existe en disco o en BD.
     */
    private String generarRutaUnica(String rutaBase) {
        String rutaFinal = rutaBase;
        int counter = 1;
        while (existeEnDisco(rutaFinal) || existeEnBD(rutaFinal)) {
            int lastDot = rutaBase.lastIndexOf(".");
            if (lastDot == -1) {
                rutaFinal = rutaBase + "_" + counter;
            } else {
                String name = rutaBase.substring(0, lastDot);
                String ext = rutaBase.substring(lastDot);
                rutaFinal = name + "_" + counter + ext;
            }
            counter++;
        }
        return rutaFinal;
    }

    private boolean existeEnDisco(String ruta) {
        return Files.exists(Paths.get(uploadDir, ruta));
    }

    private boolean existeEnBD(String ruta) {
        return metadataRepository.findByRuta(ruta).isPresent();
    }

    public void moverArchivo(DocumentoMetadata metadata, String nuevaRuta) throws IOException {
        Path origen = Paths.get(uploadDir, metadata.getRuta());
        Path destino = Paths.get(uploadDir, nuevaRuta);
        Path padreDestino = destino.getParent();
        if (padreDestino != null) {
            Files.createDirectories(padreDestino);
        }
        Files.move(origen, destino, StandardCopyOption.REPLACE_EXISTING);
        metadata.setRuta(nuevaRuta);
    }

    private String sanitizar(String texto) {
        return texto.trim()
            .toUpperCase()
            .replaceAll("[^A-Z0-9]", "_")
            .replaceAll("_+", "_");
    }
}