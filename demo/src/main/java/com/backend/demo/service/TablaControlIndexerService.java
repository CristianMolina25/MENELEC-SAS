package com.backend.demo.service;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.demo.model.Contrato;
import com.backend.demo.model.ProcesoEnEstudio;
import com.backend.demo.model.Propuesta;
import com.backend.demo.repository.ContratoRepository;
import com.backend.demo.repository.ProcesoEnEstudioRepository;
import com.backend.demo.repository.PropuestaRepository;

@Service
public class TablaControlIndexerService {

    @Autowired
    private ProcesoEnEstudioRepository repository;

    @Autowired
    private PropuestaRepository propuestaRepository;

    @Autowired
    private ContratoRepository contratoRepository;

    private static final DateTimeFormatter DATE_FORMATTER_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_FORMATTER_DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_FORMATTER_DMY_HMS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final Pattern NUMERIC_PATTERN = Pattern.compile("\\d+(?:\\.\\d+)?");
    private static final Pattern MONEY_PATTERN = Pattern.compile("[\\d.,]+");

    @Transactional
    public int indexarHojaEnEstudio(InputStream excelStream, Long metadataId) throws Exception {
        System.out.println("===== Indexando para metadataId: " + metadataId);
        Workbook workbook = WorkbookFactory.create(excelStream);

        Sheet sheet = null;
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String name = workbook.getSheetName(i);
            if (name.trim().equals("EN ESTUDIO")) {
                sheet = workbook.getSheetAt(i);
                break;
            }
        }
        if (sheet == null) {
            System.err.println("ERROR: No se encontró la hoja 'EN ESTUDIO'");
            return 0;
        }

        Iterator<Row> rows = sheet.iterator();
        if (!rows.hasNext()) return 0;
        Row headerRow = rows.next(); // saltar cabecera

        List<ProcesoEnEstudio> procesos = new ArrayList<>();
        int contador = 0;

        while (rows.hasNext()) {
            Row row = rows.next();
            String numeroProceso = getCellString(row.getCell(4));
            if (numeroProceso == null || numeroProceso.trim().isEmpty()) {
                continue;
            }
            contador++;

            ProcesoEnEstudio proceso = new ProcesoEnEstudio();
            proceso.setEmpresa(getCellString(row.getCell(0)));       // EMPRESA
            proceso.setCategoria(getCellString(row.getCell(1)));     // CATEGORIA
            proceso.setNumero(getCellInt(row.getCell(2)));           // No.
            proceso.setFecha(parseDate(getCellString(row.getCell(3)))); // FECHA
            proceso.setNumeroProceso(getCellString(row.getCell(4))); // NUMERO DE PROCESO
            proceso.setEntidad(getCellString(row.getCell(5)));       // ENTIDAD
            proceso.setObjeto(getCellString(row.getCell(6)));        // OBJETO
            proceso.setModalidad(getCellString(row.getCell(7)));     // MODALIDAD
            proceso.setPresupuesto(parseMoney(getCellString(row.getCell(8)))); // PRESUPUESTO
            proceso.setCiudad(getCellString(row.getCell(9)));        // CIUDAD
            proceso.setObservacion(getCellString(row.getCell(10)));  // OBSERVACION
            proceso.setLink(getCellString(row.getCell(11)));         // LINK
            proceso.setCierre(getCellString(row.getCell(12)));       // CIERRE
            proceso.setEstado(getCellString(row.getCell(13)));       // ESTADO
            proceso.setDocumentoMetadataId(metadataId);

            procesos.add(proceso);
        }

        repository.deleteByDocumentoMetadataId(metadataId);
        if (!procesos.isEmpty()) {
            repository.saveAll(procesos);
            System.out.println("Guardados " + procesos.size() + " registros para metadataId " + metadataId);
        }
        return procesos.size();
    }

    @Transactional
    public int indexarHojaPropuestas(InputStream excelStream, Long metadataId) throws Exception {
        System.out.println("===== Indexando PROPUESTAS para metadataId: " + metadataId);
        Workbook workbook = WorkbookFactory.create(excelStream);

        Sheet sheet = null;
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String name = workbook.getSheetName(i);
            if (name.trim().equals("PROPUESTAS")) {
                sheet = workbook.getSheetAt(i);
                break;
            }
        }
        if (sheet == null) {
            System.err.println("ERROR: No se encontró la hoja 'PROPUESTAS'");
            return 0;
        }

        Iterator<Row> rows = sheet.iterator();
        if (!rows.hasNext()) return 0;
        Row headerRow = rows.next(); // saltar cabecera

        List<Propuesta> propuestas = new ArrayList<>();
        int contador = 0;

        while (rows.hasNext()) {
            Row row = rows.next();
            String numeroProceso = getCellString(row.getCell(4));
            if (numeroProceso == null || numeroProceso.trim().isEmpty()) {
                continue;
            }
            contador++;

            Propuesta p = new Propuesta();
            p.setEmpresa(getCellString(row.getCell(0)));                    // EMPRESA
            p.setEstado(getCellString(row.getCell(1)));                    // ESTADO
            p.setNumero(getCellInt(row.getCell(2)));                       // No.
            p.setFechaCierre(parseDate(getCellString(row.getCell(3))));    // FECHA
            p.setNumeroProceso(numeroProceso);                             // No. DE PROCESO
            p.setEntidad(getCellString(row.getCell(5)));                   // ENTIDAD
            p.setPropuesta(parseMoney(getCellString(row.getCell(6))));     // PROPUESTA
            p.setObjeto(getCellString(row.getCell(7)));                    // OBJETO
            p.setValorPresupuesto(parseMoney(getCellString(row.getCell(8)))); // VALOR PRESUPUESTO
            p.setFechaEvaluacion(parseDate(getCellString(row.getCell(9)))); // FECHA DE EVALUACION
            p.setEstadoProceso(getCellString(row.getCell(10)));            // ESTADO DEL PROCESO
            p.setLink(getCellString(row.getCell(11)));                     // LINK
            p.setCostosRadicacion(parseMoney(getCellString(row.getCell(12)))); // COSTOS RADICACION
            p.setSeriedad(parseMoney(getCellString(row.getCell(13))));     // SERIEDAD
            p.setDocumentoMetadataId(metadataId);

            propuestas.add(p);
        }

        propuestaRepository.deleteByDocumentoMetadataId(metadataId);
        if (!propuestas.isEmpty()) {
            propuestaRepository.saveAll(propuestas);
            System.out.println("Guardadas " + propuestas.size() + " propuestas para metadataId " + metadataId);
        }
        return propuestas.size();
    }

    @Transactional
    public int indexarHojaContratos(InputStream excelStream, Long metadataId) throws Exception {
        System.out.println("===== Indexando CONTRATOS para metadataId: " + metadataId);
        Workbook workbook = WorkbookFactory.create(excelStream);

        Sheet sheet = null;
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String name = workbook.getSheetName(i);
            if (name.trim().equals("CONTRATOS")) {
                sheet = workbook.getSheetAt(i);
                break;
            }
        }
        if (sheet == null) {
            System.err.println("ERROR: No se encontró la hoja 'CONTRATOS'");
            return 0;
        }

        Iterator<Row> rows = sheet.iterator();
        if (!rows.hasNext()) return 0;
        Row headerRow = rows.next(); // saltar cabecera

        List<Contrato> contratos = new ArrayList<>();
        int contador = 0;

        while (rows.hasNext()) {
            Row row = rows.next();
            String empresa = getCellString(row.getCell(0));
            String numContrato = getCellString(row.getCell(2));
            if (numContrato == null || numContrato.trim().isEmpty()) {
                continue;
            }
            // Saltar pedidos internos de CLINICA MEDICAL sin empresa
            if (empresa == null && numContrato.matches("OC\\d+")) {
                continue;
            }
            // Saltar fila de resumen
            if (numContrato.equals("PELA PAPA, CONGELADOR, CALDEROS")) {
                continue;
            }

            contador++;

            // ----- ÍNDICES CORREGIDOS según encabezado real -----
            // 0: EMPRESA CONTRATISTA
            // 1: Item.
            // 2: No. contrato.
            // 3: Entidad
            // 4: Objeto.
            // 5: SUBTOTAL
            // 6: Valor contrato
            // 7: Plazo de ejecución.
            // 8: ESTADO DEL CONTRATO       <-- AHORA SE LEE
            // 9: CONTACTO (principal)
            // 10: FECHA DE RADICADO CUENTA
            // 11: POLIZA DE CUMPLIMIENTO SI/NO No
            // 12: RETENCION
            // 13: VALOR A PAGAR
            // 14: CONTACTO (secundario)
            // 15: ACTA DE INICIO
            // 16: ADICION
            // 17: ENTREGA
            // 18: PAGO
            // 19: BANCO Y FECHA

            String entidad = getCellString(row.getCell(3));   // Entidad
            String objeto = getCellString(row.getCell(4));    // Objeto.

            Contrato c = new Contrato();
            c.setEmpresaContratista(empresa);
            c.setItem(getCellString(row.getCell(1)));
            c.setNumeroContrato(numContrato);
            c.setEntidad(entidad != null ? entidad : "");
            c.setObjeto(objeto != null ? objeto : "");
            c.setSubtotal(parseMoney(getCellString(row.getCell(5))));
            c.setValorContrato(parseMoney(getCellString(row.getCell(6))));
            c.setPlazoEjecucion(parseDate(getCellString(row.getCell(7))));

            // --- ¡Nuevo! ESTADO DEL CONTRATO (columna 8) ---
            c.setEstadoContrato(getCellString(row.getCell(8)));

            // Contactos (índices 9 y 14)
            String contacto1 = getCellString(row.getCell(9));
            String contacto2 = getCellString(row.getCell(14));
            String contactoCompleto = contacto1;
            if (contacto2 != null && !contacto2.isEmpty()) {
                contactoCompleto = (contacto1 != null ? contacto1 + " / " : "") + contacto2;
            }
            c.setContacto(contactoCompleto);

            // Fechas y otros datos financieros
            c.setFechaRadicadoCuenta(getCellString(row.getCell(10)));
            c.setPolizaCumplimiento(getCellString(row.getCell(11)));
            c.setRetencion(parseMoney(getCellString(row.getCell(12))));
            c.setValorPagar(parseMoney(getCellString(row.getCell(13))));

            c.setActaInicio(getCellString(row.getCell(15)));
            c.setAdicion(getCellString(row.getCell(16)));
            c.setFechaEntrega(parseDate(getCellString(row.getCell(17))));
            c.setPago(parseMoney(getCellString(row.getCell(18))));
            c.setBancoFecha(getCellString(row.getCell(19)));

            c.setDocumentoMetadataId(metadataId);
            contratos.add(c);
        }

        contratoRepository.deleteByDocumentoMetadataId(metadataId);
        if (!contratos.isEmpty()) {
            contratoRepository.saveAll(contratos);
            System.out.println("Guardados " + contratos.size() + " contratos para metadataId " + metadataId);
        }
        return contratos.size();
    }

    // ========== MÉTODOS AUXILIARES ==========
    private String getCellString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toLocalDate()
                            .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
                double val = cell.getNumericCellValue();
                if (val >= 1 && val <= 50000) {
                    LocalDate date = DateUtil.getLocalDateTime(val).toLocalDate();
                    return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
                if (val == (long) val) {
                    return String.valueOf((long) val);
                }
                return String.valueOf(val);
            default:
                return null;
        }
    }

    private Integer getCellInt(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        }
        String str = getCellString(cell);
        if (str != null && !str.isEmpty()) {
            try { return Integer.parseInt(str); } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        dateStr = dateStr.replaceAll("[()]", "").trim();
        if (!dateStr.matches(".*\\d.*")) return null;

        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
        };
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(dateStr.split(" ")[0], formatter);
            } catch (Exception ignored) {}
        }
        return null;
    }

    private BigDecimal parseMoney(String moneyStr) {
        if (moneyStr == null || moneyStr.isEmpty()) return BigDecimal.ZERO;
        System.out.println("parseMoney input: " + moneyStr);
        String clean = moneyStr.replaceAll("[^\\d.,-]", "");
        if (clean.isEmpty()) return BigDecimal.ZERO;
        if (clean.contains(",")) {
            int lastComma = clean.lastIndexOf(',');
            String integerPart = clean.substring(0, lastComma).replace(".", "");
            String decimalPart = clean.substring(lastComma + 1);
            if (decimalPart.length() > 2) decimalPart = decimalPart.substring(0, 2);
            clean = integerPart + "." + decimalPart;
        } else {
            clean = clean.replace(".", "");
        }
        try {
            return new BigDecimal(clean);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
