package com.backend.demo.service;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

@Service
public class DocumentClassifierService {

    private static final Map<String, Pattern[]> RULES = new HashMap<>();

    static {
        // ========== REGLAS PARA FACTURA (MEJORADAS) ==========
        RULES.put("FACTURA", new Pattern[]{
            Pattern.compile("(?i)\\b(factura\\s*electrónica|factura\\s*electronica|factura\\s*de\\s*venta)\\b"),
            Pattern.compile("(?i)\\b(NIT|RUC|CUIT)\\s*:?\\s*[\\d\\-]+"),
            Pattern.compile("(?i)\\b(SUBTOTAL|I\\.V\\.A\\.|TOTAL\\s+VENTA)\\b"),
            Pattern.compile("(?i)\\b(CUFE|Código\\s+Único\\s+de\\s+Factura)\\b"),
            Pattern.compile("(?i)\\b(Autorizacion DIAN|RESOLUCIÓN\\s+DIAN)\\b")
        });
        
        // ========== REGLAS PARA CONTRATO ==========
        RULES.put("CONTRATO", new Pattern[]{
            Pattern.compile("(?i)\\b(contrato|acuerdo|convenio)\\b"),
            Pattern.compile("(?i)\\b(cláusula|clausula)\\b"),
            Pattern.compile("(?i)\\b(partes|comparecientes)\\b")
        });
        
        // ========== REGLAS PARA ACTA ==========
        RULES.put("ACTA", new Pattern[]{
            Pattern.compile("(?i)\\b(acta|reunión|acuerdo)\\b"),
            Pattern.compile("(?i)\\b(orden del día|punto)\\b")
        });
        
        // ========== REGLAS PARA HOJA_VIDA ==========
        RULES.put("HOJA_VIDA", new Pattern[]{
            Pattern.compile("(?i)\\b(hoja de vida|cv|curriculum|currículum)\\b"),
            Pattern.compile("(?i)\\b(experiencia laboral|educación|formación)\\b")
        });
        
        // ========== REGLAS PARA REPORTE_POSTVENTA ==========
        RULES.put("REPORTE_POSTVENTA", new Pattern[]{
            Pattern.compile("(?i)\\b(postventa|post-venta|servicio técnico)\\b"),
            Pattern.compile("(?i)\\b(garantía|garantia)\\b"),
            Pattern.compile("(?i)\\b(corrosion|no prende|goteo|encendido)\\b")
        });
    }

    public String detectarTipo(String texto) {
        Map<String, Integer> puntuaciones = new HashMap<>();
        for (Map.Entry<String, Pattern[]> entry : RULES.entrySet()) {
            int score = 0;
            for (Pattern p : entry.getValue()) {
                if (p.matcher(texto).find()) score++;
            }
            if (score > 0) puntuaciones.put(entry.getKey(), score);
        }
        return puntuaciones.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("OTRO");
    }
}