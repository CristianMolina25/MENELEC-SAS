package com.backend.demo.dto;

import java.io.Serializable;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TareaGoogleDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String titulo;
    private String descripcion;
    private String fechaEntrega;  // ✅ Cambiar de LocalDateTime a String
    private String prioridad;
    private String estado;
    private List<String> responsables; 

    public String getResponsableEmail() {
        return (responsables != null && !responsables.isEmpty()) ? responsables.get(0) : null;
    }
}