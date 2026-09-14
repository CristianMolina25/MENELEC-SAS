package com.backend.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class Producto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer cantidad = 1;

    private String marca;
    private String nombre;
    
    @Column(length = 1000)
    private String descripcion;
    
    private String categoria;
    private Double precio;
    private String proveedor;
    private String fechaCotizacion;

    // Nuevos campos necesarios para el formulario del frontend
    private String vendedor;
    private String telefono;
    private String email;
    private String ubicacion;
    private String serie;
    private String garantia;

    @Column(name = "archivo_ficha_tecnica")
    private String archivoFichaTecnica;
}