package com.backend.demo.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;

import com.backend.demo.model.RegistroTesoreria;

@Service
public class TesoreriaExcelService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public List<RegistroTesoreria> leerHoja(Workbook workbook, String nombreHoja, Long metadataId) {
        List<RegistroTesoreria> registros = new ArrayList<>();
        Sheet sheet = workbook.getSheet(nombreHoja);
        if (sheet == null) return registros;

        int rowStart = 1;
        for (int i = rowStart; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            if (isRowEmpty(row)) continue;

            RegistroTesoreria reg = new RegistroTesoreria();
            reg.setEmpresa(nombreHoja);
            reg.setMetadataId(metadataId);

            reg.setFecha(getFecha(row.getCell(0)));
            reg.setFuente(getString(row.getCell(1)));
            reg.setCentroCostos(getString(row.getCell(2)));
            reg.setResponsablePago(getString(row.getCell(3)));
            reg.setNumeroContrato(getString(row.getCell(4)));
            reg.setConcepto(getString(row.getCell(5)));
            reg.setTerceroBeneficiario(getString(row.getCell(6)));
            reg.setNumeroFactura(getString(row.getCell(7)));
            reg.setValor(getBigDecimal(row.getCell(8)));
            reg.setReteFuente(getBigDecimal(row.getCell(9)));
            reg.setReteIca(getBigDecimal(row.getCell(10)));
            reg.setReteIva(getBigDecimal(row.getCell(11)));
            reg.setObservaciones(getString(row.getCell(12)));

            if (reg.getFecha() != null || (reg.getConcepto() != null && !reg.getConcepto().isEmpty())) {
                registros.add(reg);
            }
        }
        return registros;
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int i = 0; i < 13; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                return false;
            }
        }
        return true;
    }

    private String getString(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) {
            return cell.getStringCellValue().trim();
        } else if (cell.getCellType() == CellType.NUMERIC) {
            return String.valueOf((long) cell.getNumericCellValue());
        }
        return null;
    }

    private LocalDate getFecha(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            } else if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim();
                // Intentar varios formatos
                try {
                    return LocalDate.parse(val, DATE_FORMATTER);
                } catch (Exception e) {
                    // Intentar formato ISO
                    return LocalDate.parse(val);
                }
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }

    private BigDecimal getBigDecimal(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            } else if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().replace(",", "").trim();
                if (val.isEmpty()) return null;
                return new BigDecimal(val);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }
}