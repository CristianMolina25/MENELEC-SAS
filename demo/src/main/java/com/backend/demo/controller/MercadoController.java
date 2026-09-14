package com.backend.demo.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.model.Mercado;
import com.backend.demo.service.MercadoService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/mercado")
public class MercadoController {

    private static final Logger log = LoggerFactory.getLogger(MercadoController.class);

    @Autowired
    private MercadoService mercadoService;

    @Autowired(required = false)
    private HttpServletRequest request;

    @GetMapping("/listar")
    public ResponseEntity<List<Mercado>> listar() {
        return ResponseEntity.ok(mercadoService.listarProductos());
    }

    @PostMapping("/guardar")
    public ResponseEntity<?> guardar(@RequestBody Mercado mercado) {
        try {
            Mercado guardado = mercadoService.guardarProducto(mercado);
            return ResponseEntity.ok(guardado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al guardar: " + e.getMessage());
        }
    }

    @PostMapping(value = "/guardar-con-archivo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> guardarConArchivo(
            @RequestParam("nombre") String nombre,
            @RequestParam("marca") String marca,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            @RequestParam("categoria") String categoria,
            @RequestParam("precio") Double precio,
            @RequestParam("proveedor") String proveedor,
            @RequestParam("fechaCotizacion") String fechaCotizacion,
            @RequestParam("vendedor") String vendedor,
            @RequestParam("serie") String serie,
            @RequestParam("telefono") String telefono,
            @RequestParam("email") String email,
            @RequestPart(value = "file", required = false) MultipartFile archivo) {
        try {
            Mercado mercado = new Mercado();
            mercado.setNombre(nombre);
            mercado.setMarca(marca);
            mercado.setDescripcion(descripcion);
            mercado.setCategoria(categoria);
            mercado.setPrecio(precio);
            mercado.setProveedor(proveedor);
            mercado.setFechaCotizacion(fechaCotizacion);
            mercado.setVendedor(vendedor);
            mercado.setSerie(serie);
            mercado.setTelefono(telefono);
            mercado.setEmail(email);

            Mercado guardado = mercadoService.guardarProductoConArchivo(mercado, archivo);
            return ResponseEntity.ok(guardado);
        } catch (Exception e) {
            log.error("Error guardando", e);
            return ResponseEntity.badRequest().body("Error interno");
        }
    }

    @PutMapping("/actualizar/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Mercado mercado) {
        try {
            Mercado actualizado = mercadoService.actualizarProducto(id, mercado);
            return ResponseEntity.ok(actualizado);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al actualizar: " + e.getMessage());
        }
    }

@PutMapping(value = "/actualizar-con-archivo/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public ResponseEntity<?> actualizarConArchivo(
        @PathVariable Long id,
        @RequestParam("nombre") String nombre,
        @RequestParam("marca") String marca,
        @RequestParam(value = "descripcion", required = false) String descripcion,
        @RequestParam("categoria") String categoria,
        @RequestParam("precio") Double precio,
        @RequestParam("proveedor") String proveedor,
        @RequestParam("fechaCotizacion") String fechaCotizacion,
        @RequestParam("vendedor") String vendedor,
        @RequestParam("serie") String serie,
        @RequestParam("telefono") String telefono,
        @RequestParam("email") String email,
        @RequestPart(value = "file", required = false) MultipartFile archivo) {
    try {
        Mercado mercado = new Mercado();
        mercado.setNombre(nombre);
        mercado.setMarca(marca);
        mercado.setDescripcion(descripcion);
        mercado.setCategoria(categoria);
        mercado.setPrecio(precio);
        mercado.setProveedor(proveedor);
        mercado.setFechaCotizacion(fechaCotizacion);
        mercado.setVendedor(vendedor);
        mercado.setSerie(serie);
        mercado.setTelefono(telefono);
        mercado.setEmail(email);

        Mercado actualizado = mercadoService.actualizarProductoConArchivo(id, mercado, archivo);
        return ResponseEntity.ok(actualizado);
    } catch (Exception e) {
        log.error("Error actualizando con archivo", e);
        return ResponseEntity.badRequest().body("Error: " + e.getMessage());
    }
}



    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            mercadoService.eliminarProducto(id);
            return ResponseEntity.ok("Elemento eliminado correctamente");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al eliminar: " + e.getMessage());
        }
    }

    // Descargar archivo (ahora acepta token opcional para OnlyOffice)
    @GetMapping("/descargar-archivo/{id}")
    public ResponseEntity<?> descargarArchivo(@PathVariable Long id,
                                              @RequestParam(required = false) String token) {
        // El token se recibe como query param para permitir descargas desde OnlyOffice (sin cabecera Authorization)
        // Si tu seguridad requiere validarlo, puedes hacerlo aquí o en un filtro.
        try {
            byte[] archivo = mercadoService.descargarArchivo(id);
            Mercado mercado = mercadoService.obtenerProductoPorId(id);
            String nombreArchivo = mercado.getArchivoFichaTecnica();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(archivo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al descargar archivo: " + e.getMessage());
        }
    }

}
