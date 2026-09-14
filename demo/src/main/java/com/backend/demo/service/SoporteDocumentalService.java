package com.backend.demo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.dto.SoporteDocumentalDto;
import com.backend.demo.dto.SoporteDocumentalRequest;
import com.backend.demo.model.SoporteDocumental;
import com.backend.demo.repository.SoporteDocumentalRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SoporteDocumentalService {

    private final SoporteDocumentalRepository repository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final String BASE_FOLDER = "SoporteDocumental";

    public List<SoporteDocumentalDto> listarPorCategoria(String categoria) {
        return repository.findByCategoria(categoria)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public SoporteDocumentalDto guardar(String categoria,
                                        SoporteDocumentalRequest datos,
                                        MultipartFile file) throws IOException {

        // Validar campos obligatorios según categoría
        if ("CAPACIDAD_JURIDICA".equals(categoria)) {
            if (datos.getNombreArchivo() == null || datos.getNombreArchivo().trim().isEmpty()) {
                throw new IllegalArgumentException("El nombre del archivo es obligatorio");
            }
            if (datos.getVencimiento() == null) {
                throw new IllegalArgumentException("La fecha de vencimiento es obligatoria");
            }
        } else { // EXPERIENCIA o CAPACIDAD_TECNICA
            if (datos.getSubcategoria() == null || datos.getSubcategoria().trim().isEmpty()) {
                throw new IllegalArgumentException("La categoría es obligatoria");
            }
        }

        // Construir ruta: uploadDir/Soporte Documental/categoria/
        Path categoriaDir = Paths.get(uploadDir, BASE_FOLDER, categoria);
        if (!Files.exists(categoriaDir)) {
            Files.createDirectories(categoriaDir);
        }

        // Generar nombre único
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString() + extension;
        Path filePath = categoriaDir.resolve(fileName);

        // Guardar archivo físico
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Ruta relativa (para el endpoint /download)
        String rutaRelativa = BASE_FOLDER + "/" + categoria + "/" + fileName;

        // Crear entidad
        SoporteDocumental entity = new SoporteDocumental();
        entity.setCategoria(categoria);
        entity.setNombreArchivo(datos.getNombreArchivo());
        entity.setOrigen(datos.getOrigen());
        entity.setVencimiento(datos.getVencimiento());
        entity.setSubcategoria(datos.getSubcategoria());
        entity.setEmisor(datos.getEmisor());
        entity.setAnio(datos.getAnio());
        entity.setRutaRelativa(rutaRelativa);

        SoporteDocumental saved = repository.save(entity);
        return toDto(saved);
    }

    public SoporteDocumentalDto actualizarArchivo(Long id, MultipartFile file) throws IOException {
        SoporteDocumental entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        // ✅ Sumar 1 mes a la fecha de vencimiento (si existe)
        if (entity.getVencimiento() != null) {
            entity.setVencimiento(entity.getVencimiento().plusMonths(1));
        }

        // Eliminar archivo anterior
        Path oldPath = Paths.get(uploadDir).resolve(entity.getRutaRelativa()).normalize();
        if (Files.exists(oldPath)) {
            Files.delete(oldPath);
        }

        // Guardar nuevo archivo
        String categoria = entity.getCategoria();
        Path categoriaDir = Paths.get(uploadDir, BASE_FOLDER, categoria);
        if (!Files.exists(categoriaDir)) {
            Files.createDirectories(categoriaDir);
        }

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString() + extension;
        Path newPath = categoriaDir.resolve(fileName);
        Files.copy(file.getInputStream(), newPath, StandardCopyOption.REPLACE_EXISTING);

        // Actualizar ruta
        String nuevaRutaRelativa = BASE_FOLDER + "/" + categoria + "/" + fileName;
        entity.setRutaRelativa(nuevaRutaRelativa);
        repository.save(entity);

        return toDto(entity);
    }

    public void eliminar(Long id) throws IOException {
        SoporteDocumental entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        // Eliminar archivo físico
        Path filePath = Paths.get(uploadDir).resolve(entity.getRutaRelativa()).normalize();
        if (Files.exists(filePath)) {
            Files.delete(filePath);
        }
        repository.delete(entity);
    }

    private SoporteDocumentalDto toDto(SoporteDocumental entity) {
        SoporteDocumentalDto dto = new SoporteDocumentalDto();
        dto.setId(entity.getId());
        dto.setCategoria(entity.getCategoria());
        dto.setNombreArchivo(entity.getNombreArchivo());
        dto.setOrigen(entity.getOrigen());
        dto.setVencimiento(entity.getVencimiento());
        dto.setSubcategoria(entity.getSubcategoria());
        dto.setEmisor(entity.getEmisor());
        dto.setAnio(entity.getAnio());
        dto.setRutaRelativa(entity.getRutaRelativa());
        dto.setFechaSubida(entity.getFechaSubida());
        dto.setUsuarioId(entity.getUsuarioId());
        return dto;
    }
}