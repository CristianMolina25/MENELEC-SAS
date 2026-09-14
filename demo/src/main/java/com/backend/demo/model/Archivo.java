package com.backend.demo.model;

import lombok.Data;

@Data
public class Archivo {
    private String nombre;
    private String ruta;
    private String extension;
    private long tamano;
    private String ultimaModificacion;
    private boolean esCarpeta; // <--- AGREGAR ESTO

    // Actualiza tu constructor
    public Archivo(String nombre, String ruta, String extension, long tamano, String ultimaModificacion, boolean esCarpeta) {
        this.nombre = nombre;
        this.ruta = ruta;
        this.extension = extension;
        this.tamano = tamano;
        this.ultimaModificacion = ultimaModificacion;
        this.esCarpeta = esCarpeta;
    }
    // Getters y Setters...
}