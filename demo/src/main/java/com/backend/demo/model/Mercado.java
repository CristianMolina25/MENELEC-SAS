package com.backend.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "mercado")
public class Mercado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String marca;
    private String nombre;

    @Column(length = 1000)
    private String descripcion;

    private String categoria;
    private Double precio;
    private String proveedor;
    private String fechaCotizacion;

    private String vendedor;
    private String telefono;
    private String email;
    private String serie;

    @Column(name = "archivo_ficha_tecnica")
    private String archivoFichaTecnica;
}