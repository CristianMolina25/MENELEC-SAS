package com.backend.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class MetadataExtractorService {

    private final Map<String, List<ExtractionRule>> rules = new HashMap<>();

    @PostConstruct
    public void initRules() {
        // ========== REGLAS MEJORADAS PARA FACTURA COLOMBIANA ==========
        rules.put("FACTURA", List.of(
            // Número de factura (busca FE, FACTURA, o número después de "FE")
            new ExtractionRule("numero_factura", 
                Pattern.compile("(?:FACTURA\\s+ELECTRONICA\\s+DE\\s+VENTA\\s*\\n?\\s*)(\\d+)|FE\\s+(\\d+)|Factura\\s+N[°º]?\\s*(\\d+)", Pattern.CASE_INSENSITIVE)),
            
            // Fecha de factura (formato dd/mm/yyyy o yyyy-mm-dd)
            new ExtractionRule("fecha", 
                Pattern.compile("Fecha\\s+factura\\s*:\\s*(\\d{4}-\\d{2}-\\d{2})|Fecha\\s+de\\s+Timbrado:\\s*(\\d{4}-\\d{2}-\\d{2})", Pattern.CASE_INSENSITIVE)),
            
            // Proveedor (Nombre del comprador/cliente)
            new ExtractionRule("proveedor", 
                Pattern.compile("Nombre\\s*:\\s*([A-ZÑÁÉÍÓÚ\\s]+)(?:\\n|$)", Pattern.CASE_INSENSITIVE)),
            
            // NIT del proveedor
            new ExtractionRule("nit", 
                Pattern.compile("NIT:\\s*(\\d+\\s*-\\s*\\d+)", Pattern.CASE_INSENSITIVE)),
            
            // Subtotal
            new ExtractionRule("subtotal", 
                Pattern.compile("SUBTOTAL\\s*\\n?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE)),
            
            // IVA
            new ExtractionRule("iva", 
                Pattern.compile("I\\.V\\.A\\.\\s*\\n?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE)),
            
            // Total venta
            new ExtractionRule("total", 
                Pattern.compile("TOTAL\\s+VENTA\\s*\\n?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE)),
            
            // Total en letras (opcional)
            new ExtractionRule("total_letras", 
                Pattern.compile("SON:\\s*\\n?\\s*([A-ZÑÁÉÍÓÚ\\s]+?)(?:\\n|CONDICIONES)", Pattern.CASE_INSENSITIVE)),
            
            // CUFE (Código Único de Factura Electrónica)
            new ExtractionRule("cufe", 
                Pattern.compile("CUFE:\\s*([a-fA-F0-9]+)", Pattern.CASE_INSENSITIVE)),
            
            // Autorización DIAN
            new ExtractionRule("autorizacion_dian", 
                Pattern.compile("Autorizacion DIAN No\\.\\s*(\\d+)", Pattern.CASE_INSENSITIVE))
        ));
        
        // Reglas para CONTRATO
        rules.put("CONTRATO", List.of(
            new ExtractionRule("numero_contrato", Pattern.compile("(?:CONTRATO|No\\.?)\\s*[:.]?\\s*([A-Z0-9\\-]+)", Pattern.CASE_INSENSITIVE)),
            new ExtractionRule("fecha", Pattern.compile("(?:FECHA|FECHADO)\\s*[:.]?\\s*(\\d{1,2})[/\\-\\s](\\d{1,2})[/\\-\\s](\\d{4})", Pattern.CASE_INSENSITIVE)),
            new ExtractionRule("cliente", Pattern.compile("(?:CLIENTE|CONTRATANTE)\\s*[:.]?\\s*([A-ZÑÁÉÍÓÚ\\s]+)", Pattern.CASE_INSENSITIVE)),
            new ExtractionRule("valor", Pattern.compile("(?:VALOR|PRECIO)\\s*[:.]?\\s*\\$?\\s*([\\d.,]+)", Pattern.CASE_INSENSITIVE))
        ));
    }

    public Map<String, String> extractMetadata(String texto, String tipoDocumento) {
        Map<String, String> metadatos = new HashMap<>();
        List<ExtractionRule> reglas = rules.get(tipoDocumento);
        
        if (reglas != null) {
            for (ExtractionRule regla : reglas) {
                String valor = regla.extract(texto);
                if (valor != null && !valor.isEmpty()) {
                    metadatos.put(regla.getCampo(), valor);
                    System.out.println("✅ Extraído " + regla.getCampo() + ": " + valor);
                } else {
                    System.out.println("❌ No se pudo extraer: " + regla.getCampo());
                }
            }
        }
        
        return metadatos;
    }
    
    static class ExtractionRule {
        private String campo;
        private Pattern pattern;
        
        public ExtractionRule(String campo, Pattern pattern) {
            this.campo = campo;
            this.pattern = pattern;
        }
        
        public String getCampo() { return campo; }
        
        public String extract(String texto) {
            Matcher matcher = pattern.matcher(texto);
            if (matcher.find()) {
                for (int i = 1; i <= matcher.groupCount(); i++) {
                    if (matcher.group(i) != null && !matcher.group(i).trim().isEmpty()) {
                        return matcher.group(i).trim();
                    }
                }
            }
            return null;
        }
    }
}