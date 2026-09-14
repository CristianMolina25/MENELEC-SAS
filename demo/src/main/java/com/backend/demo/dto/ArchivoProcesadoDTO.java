package com.backend.demo.dto;

public class ArchivoProcesadoDTO {
    private Long metadataId;
    private String nombreOriginal;
    private String rutaOriginal;
    private String rutaSugerida;
    private String tipoDocumento;
    private String metadatosJson;

    // Constructor vacío
    public ArchivoProcesadoDTO() {}

    // Constructor con todos los campos
    public ArchivoProcesadoDTO(Long metadataId, String nombreOriginal, String rutaOriginal, String rutaSugerida, String tipoDocumento, String metadatosJson) {
        this.metadataId = metadataId;
        this.nombreOriginal = nombreOriginal;
        this.rutaOriginal = rutaOriginal;
        this.rutaSugerida = rutaSugerida;
        this.tipoDocumento = tipoDocumento;
        this.metadatosJson = metadatosJson;
    }

    // Getters y Setters
    public Long getMetadataId() { return metadataId; }
    public void setMetadataId(Long metadataId) { this.metadataId = metadataId; }
    public String getNombreOriginal() { return nombreOriginal; }
    public void setNombreOriginal(String nombreOriginal) { this.nombreOriginal = nombreOriginal; }
    public String getRutaOriginal() { return rutaOriginal; }
    public void setRutaOriginal(String rutaOriginal) { this.rutaOriginal = rutaOriginal; }
    public String getRutaSugerida() { return rutaSugerida; }
    public void setRutaSugerida(String rutaSugerida) { this.rutaSugerida = rutaSugerida; }
    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String tipoDocumento) { this.tipoDocumento = tipoDocumento; }
    public String getMetadatosJson() { return metadatosJson; }
    public void setMetadatosJson(String metadatosJson) { this.metadatosJson = metadatosJson; }
}