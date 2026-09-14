    package com.backend.demo.controller;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;
    import java.nio.file.StandardCopyOption;
    import java.util.List;
    import java.util.UUID;

    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.core.io.Resource;
    import org.springframework.core.io.UrlResource;
    import org.springframework.http.HttpHeaders;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.CrossOrigin;
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

    import com.backend.demo.model.Producto;
    import com.backend.demo.repository.ProductoRepository;

    import jakarta.annotation.PostConstruct;

    @RestController
    @RequestMapping("/api/inventario")
    @CrossOrigin(origins = "*")
    public class ProductoController {

        @Autowired
        private ProductoRepository productoRepository;

        // Directorio donde se guardarán los archivos, cargado desde application.properties
        @Value("${app.upload.dir}")
        private String uploadDir;

        // Asegura que el directorio de subida exista al iniciar la aplicación
        @PostConstruct
        public void init() {
            try {
                Files.createDirectories(Paths.get(uploadDir));
            } catch (IOException e) {
                throw new RuntimeException("No se pudo crear el directorio de subida", e);
            }
        }

        @GetMapping("/listar")
        public List<Producto> listar() {
            return productoRepository.findAll();
        }

        @PostMapping("/guardar")
        public ResponseEntity<Producto> guardar(@RequestBody Producto producto) {
            return ResponseEntity.ok(productoRepository.save(producto));
        }
    @PutMapping(value = "/actualizar-con-archivo/{id}", consumes = "multipart/form-data")
    public ResponseEntity<?> actualizarConArchivo(
            @PathVariable Long id,
            @RequestParam("marca") String marca,
            @RequestParam("nombre") String nombre,
            @RequestParam("descripcion") String descripcion,
            @RequestParam("categoria") String categoria,
            @RequestParam("precio") Double precio,
            @RequestParam("proveedor") String proveedor,
            @RequestParam("fechaCotizacion") String fechaCotizacion,
            @RequestParam("vendedor") String vendedor,
            @RequestParam("telefono") String telefono,
            @RequestParam("email") String email,
            @RequestParam("ubicacion") String ubicacion,
            @RequestParam("serie") String serie,
            @RequestParam("garantia") String garantia,
            @RequestParam("cantidad") Integer cantidad,
            @RequestPart(value = "file", required = false) MultipartFile archivo) {

        try {
            Producto producto = productoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

            producto.setMarca(marca);
            producto.setNombre(nombre);
            producto.setDescripcion(descripcion);
            producto.setCategoria(categoria);
            producto.setPrecio(precio);
            producto.setProveedor(proveedor);
            producto.setFechaCotizacion(fechaCotizacion);
            producto.setVendedor(vendedor);
            producto.setTelefono(telefono);
            producto.setEmail(email);
            producto.setUbicacion(ubicacion);
            producto.setSerie(serie);
            producto.setGarantia(garantia);
            producto.setCantidad(cantidad != null ? cantidad : 1);

            if (archivo != null && !archivo.isEmpty()) {
                if (archivo.getSize() > 10 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body("El archivo no debe superar los 10 MB");
                }

                // Eliminar archivo anterior si existe
                String rutaAnterior = producto.getArchivoFichaTecnica();
                if (rutaAnterior != null) {
                    Path anterior = Paths.get(rutaAnterior);
                    Files.deleteIfExists(anterior);
                }

                // Guardar nuevo archivo
                String nombreArchivo = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();
                Path destino = Paths.get(uploadDir, nombreArchivo);
                Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
                producto.setArchivoFichaTecnica(destino.toString());
            }

            Producto actualizado = productoRepository.save(producto);
            return ResponseEntity.ok(actualizado);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error al procesar el archivo");
        }
    }


        // NUEVO ENDPOINT para guardar con archivo adjunto
        @PostMapping(value = "/guardar-con-archivo", consumes = "multipart/form-data")
        public ResponseEntity<?> guardarConArchivo(
                @RequestParam("marca") String marca,
                @RequestParam("nombre") String nombre,
                @RequestParam("descripcion") String descripcion,
                @RequestParam("categoria") String categoria,
                @RequestParam("precio") Double precio,
                @RequestParam("proveedor") String proveedor,
                @RequestParam("fechaCotizacion") String fechaCotizacion,
                @RequestParam("vendedor") String vendedor,
                @RequestParam("telefono") String telefono,
                @RequestParam("email") String email,
                @RequestParam("ubicacion") String ubicacion,
                @RequestParam("serie") String serie,
                @RequestParam("garantia") String garantia,
                @RequestParam(value = "file", required = false) MultipartFile archivo) {

            try {
                Producto producto = new Producto();
                producto.setMarca(marca);
                producto.setNombre(nombre);
                producto.setDescripcion(descripcion);
                producto.setCategoria(categoria);
                producto.setPrecio(precio);
                producto.setProveedor(proveedor);
                producto.setFechaCotizacion(fechaCotizacion);
                producto.setVendedor(vendedor);
                producto.setTelefono(telefono);
                producto.setEmail(email);
                producto.setUbicacion(ubicacion);
                producto.setSerie(serie);
                producto.setGarantia(garantia);

                // Procesar archivo si fue enviado
                if (archivo != null && !archivo.isEmpty()) {
                    // Validar tamaño máximo (10 MB)
                    if (archivo.getSize() > 10 * 1024 * 1024) {
                        return ResponseEntity.badRequest().body("El archivo no debe superar los 10 MB");
                    }

                    // Generar nombre único para evitar colisiones
                    String nombreArchivo = UUID.randomUUID().toString() 
                            + "_" + archivo.getOriginalFilename();
                    Path destino = Paths.get(uploadDir, nombreArchivo);
                    Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
                    producto.setArchivoFichaTecnica(destino.toString());
                    
                    // Guardar ruta relativa en la entidad
                    producto.setArchivoFichaTecnica(destino.toString());
                }

                Producto guardado = productoRepository.save(producto);
                return ResponseEntity.ok(guardado);

            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Error al guardar el archivo");
            }
        }

        @DeleteMapping("/eliminar/{id}")
        public ResponseEntity<?> eliminar(@PathVariable Long id) {
            try {
                Producto producto = productoRepository.findById(id).orElse(null);
                if (producto != null && producto.getArchivoFichaTecnica() != null && !producto.getArchivoFichaTecnica().isBlank()) {
                    Path rutaArchivo = Paths.get(producto.getArchivoFichaTecnica());
                    Files.deleteIfExists(rutaArchivo);
                }
                productoRepository.deleteById(id);
                return ResponseEntity.ok().build();
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Error al eliminar la ficha técnica");
            }
        }
        

        @PutMapping("/actualizar/{id}")
        public ResponseEntity<Producto> actualizar(@PathVariable Long id, @RequestBody Producto detalles) {
            return productoRepository.findById(id)
                    .map(producto -> {
                        producto.setMarca(detalles.getMarca());
                        producto.setNombre(detalles.getNombre());
                        producto.setDescripcion(detalles.getDescripcion());
                        producto.setCategoria(detalles.getCategoria());
                        producto.setPrecio(detalles.getPrecio());
                        producto.setProveedor(detalles.getProveedor());
                        producto.setFechaCotizacion(detalles.getFechaCotizacion());
                        producto.setVendedor(detalles.getVendedor());
                        producto.setTelefono(detalles.getTelefono());
                        producto.setEmail(detalles.getEmail());
                        producto.setUbicacion(detalles.getUbicacion());
                        producto.setSerie(detalles.getSerie());
                        producto.setGarantia(detalles.getGarantia());
                        // No actualizamos el archivo desde este endpoint, se mantiene el existente

                        Producto actualizado = productoRepository.save(producto);
                        return ResponseEntity.ok(actualizado);
                    })
                    .orElse(ResponseEntity.notFound().build());
        }

        @GetMapping("/descargar-archivo/{id}")
        public ResponseEntity<Resource> descargarArchivo(@PathVariable Long id) {
            try {
                Producto producto = productoRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                String rutaArchivo = producto.getArchivoFichaTecnica();
                if (rutaArchivo == null || rutaArchivo.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                Path filePath = Paths.get(rutaArchivo);
                Resource resource = new UrlResource(filePath.toUri());
                if (resource.exists() && resource.isReadable()) {
                    return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, "application/octet-stream")
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
                } else {
                    return ResponseEntity.notFound().build();
                }
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.internalServerError().build();
            }
        }
        
    }