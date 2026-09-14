package com.backend.demo.controller;

import com.backend.demo.dto.SoporteDocumentalDto;
import com.backend.demo.dto.SoporteDocumentalRequest;
import com.backend.demo.service.SoporteDocumentalService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/soporte-documental")
@RequiredArgsConstructor
public class SoporteDocumentalController {

    private final SoporteDocumentalService service;
    private final ObjectMapper objectMapper;

    @GetMapping("/{categoria}")
    public ResponseEntity<List<SoporteDocumentalDto>> listarPorCategoria(@PathVariable String categoria) {
        return ResponseEntity.ok(service.listarPorCategoria(categoria));
    }

    @PostMapping("/{categoria}")
    public ResponseEntity<SoporteDocumentalDto> crear(
            @PathVariable String categoria,
            @RequestPart("datos") String datosJson,
            @RequestPart("file") MultipartFile file) throws IOException {

        SoporteDocumentalRequest datos = objectMapper.readValue(datosJson, SoporteDocumentalRequest.class);
        SoporteDocumentalDto saved = service.guardar(categoria, datos, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{categoria}/{id}")
    public ResponseEntity<SoporteDocumentalDto> actualizarArchivo(
            @PathVariable String categoria,
            @PathVariable("id") Long id,
            @RequestPart("file") MultipartFile file) throws IOException {

        SoporteDocumentalDto updated = service.actualizarArchivo(id, file);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{categoria}/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable String categoria,
            @PathVariable("id") Long id) throws IOException {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}