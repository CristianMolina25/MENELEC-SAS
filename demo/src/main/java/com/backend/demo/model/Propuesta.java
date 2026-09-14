    package com.backend.demo.model;

    import java.math.BigDecimal;
    import java.time.LocalDate;

    import jakarta.persistence.Column;
    import jakarta.persistence.Entity;
    import jakarta.persistence.GeneratedValue;
    import jakarta.persistence.GenerationType;
    import jakarta.persistence.Id;
    import jakarta.persistence.Table;
    import lombok.Data;

    @Entity
    @Table(name = "propuesta")
    @Data
    public class Propuesta {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        private String empresa;
        private String estado;
        private Integer numero;
        private LocalDate fechaCierre;
        private String numeroProceso;
        private String entidad;
        private BigDecimal propuesta;
        @Column(length = 4000)
        private String objeto;
        private BigDecimal valorPresupuesto;
        private LocalDate fechaEvaluacion;
        private String estadoProceso;
        @Column(length = 2000)
        private String link;
        private BigDecimal costosRadicacion;
        private BigDecimal seriedad;
        private Long documentoMetadataId;
    }