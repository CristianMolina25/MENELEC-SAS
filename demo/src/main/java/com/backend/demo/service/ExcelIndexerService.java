package com.backend.demo.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.backend.demo.model.ServicioPostventa;
import com.backend.demo.repository.ServicioPostventaRepository;

@Service
public class ExcelIndexerService {

    @Autowired
    private ServicioPostventaRepository repository;

    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public int indexarExcel(Path filePath, Long documentoMetadataId) throws IOException {
        try (InputStream is = Files.newInputStream(filePath)) {
            return indexarDesdeInputStream(is, documentoMetadataId);
        }
    }

    private int indexarDesdeInputStream(InputStream is, Long documentoMetadataId) throws IOException {
        List<ServicioPostventa> servicios = new ArrayList<>();
        Workbook workbook = WorkbookFactory.create(is);
        
        // Procesar todas las hojas
        for (int sheetIdx = 0; sheetIdx < workbook.getNumberOfSheets(); sheetIdx++) {
            Sheet sheet = workbook.getSheetAt(sheetIdx);
            System.out.println("Procesando hoja: " + sheet.getSheetName());
            
            Iterator<Row> rows = sheet.iterator();
            if (!rows.hasNext()) continue;

            // Leer cabecera para mapear columnas por nombre
            Row headerRow = rows.next();
            Map<String, Integer> columnIndexMap = buildColumnMap(headerRow);

            // Procesar filas de datos
            while (rows.hasNext()) {
                Row row = rows.next();
                
                // Omitir filas completamente vacías
                boolean filaVacia = true;
                for (Cell cell : row) {
                    if (cell != null && cell.getCellType() != CellType.BLANK && !getCellString(cell).isEmpty()) {
                        filaVacia = false;
                        break;
                    }
                }
                if (filaVacia) continue;

                try {
                    ServicioPostventa servicio = crearServicioDesdeRow(row, columnIndexMap);
                    servicio.setDocumentoMetadataId(documentoMetadataId);
                    servicios.add(servicio);
                } catch (Exception e) {
                    System.err.println("Error procesando fila " + row.getRowNum() + ": " + e.getMessage());
                }
            }
        }

        repository.saveAll(servicios);
        return servicios.size();
    }
    
    private Map<String, Integer> buildColumnMap(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (Cell cell : headerRow) {
            String header = getCellString(cell).trim().toLowerCase();
            map.put(header, cell.getColumnIndex());
            System.out.println("🔍 Cabecera encontrada: '" + header + "'");
        }
        return map;
    }

    private ServicioPostventa crearServicioDesdeRow(Row row, Map<String, Integer> colMap) {
        ServicioPostventa servicio = new ServicioPostventa();
        
        // Buscar "numero de contrato" o variantes
        String numeroContrato = getCellStringFromMap(row, colMap, "numero de contrato", "n° de contrato", "contrato");
        servicio.setNumeroContrato(numeroContrato);
        
        // Año del contrato
        int anio = (int) getNumericCellFromMap(row, colMap, "año del contrato", "año");
        servicio.setAnioContrato(anio > 0 ? anio : 0);

        String proveedor = getCellStringFromMap(row, colMap, 
            "proveedor", 
            "proveedor  y datos de contacto",
            "proveedor/contacto",
            "proveedor (contacto)",
            "proveedor / contacto"
        );
        System.out.println("📦 Valor de proveedor fila " + row.getRowNum() + ": '" + proveedor + "'");
        servicio.setProveedor(proveedor);
        
        // Equipo
        String equipo = getCellStringFromMap(row, colMap, "equipo");
        servicio.setEquipo(equipo);
        
        // Lugar (puede tener variantes como "lugar  y datos de contacto")
        String lugar = getCellStringFromMap(row, colMap, "lugar", "lugar  y datos de contacto", "ubicación");
        servicio.setLugar(lugar);
        
        // Fecha de solicitud
        LocalDate fechaSolicitud = getParsedDateFromMap(row, colMap, "fecha de solicitud", "fecha");
        servicio.setFechaSolicitud(fechaSolicitud);
        
        // Fecha de entrega (puede no existir en todas las hojas)
        LocalDate fechaEntrega = getParsedDateFromMap(row, colMap, "fecha de entrega");
        servicio.setFechaEntrega(fechaEntrega);
        
        // Detalle (puede ser "detalle del servicio" o "detalle de la falla")
        String detalle = getCellStringFromMap(row, colMap, "detalle del servicio", "detalle de la falla", "detalle");
        servicio.setDetalleServicio(detalle);
        
        // Costos
        long costo = (long) getNumericCellFromMap(row, colMap, "costos", "costo");
        servicio.setCosto(costo);
        
        // Vigencia de la garantía
        LocalDate vigencia = getParsedDateFromMap(row, colMap, "vigencia de la garantía", "garantía");
        servicio.setVigenciaGarantia(vigencia);
        
        // Estado
        String estado = getCellStringFromMap(row, colMap, "estado");
        servicio.setEstado(estado);
        
        return servicio;
    }

    private String getCellStringFromMap(Row row, Map<String, Integer> colMap, String... possibleNames) {
        for (String name : possibleNames) {
            Integer colIdx = colMap.get(name.toLowerCase());
            if (colIdx != null && colIdx >= 0) {
                return getCellString(row.getCell(colIdx));
            }
        }
        return "";
    }

    private double getNumericCellFromMap(Row row, Map<String, Integer> colMap, String... possibleNames) {
        for (String name : possibleNames) {
            Integer colIdx = colMap.get(name.toLowerCase());
            if (colIdx != null && colIdx >= 0) {
                return getNumericCellValue(row.getCell(colIdx));
            }
        }
        return 0;
    }

    private LocalDate getParsedDateFromMap(Row row, Map<String, Integer> colMap, String... possibleNames) {
        for (String name : possibleNames) {
            Integer colIdx = colMap.get(name.toLowerCase());
            if (colIdx != null && colIdx >= 0) {
                LocalDate date = parseDateFromCell(row.getCell(colIdx));
                if (date != null) return date;
            }
        }
        return null;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return "";
        }
    }

    private double getNumericCellValue(Cell cell) {
        if (cell == null) return 0;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Double.parseDouble(cell.getStringCellValue().trim());
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    private LocalDate parseDateFromCell(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        String dateStr = getCellString(cell);
        if (dateStr.isEmpty()) return null;
        // Intentar varios formatos: yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy
        try {
            return LocalDate.parse(dateStr, dateFormatter);
        } catch (Exception e) {
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } catch (Exception e2) {
                try {
                    return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
                } catch (Exception e3) {
                    return null;
                }
            }
        }
    }
}