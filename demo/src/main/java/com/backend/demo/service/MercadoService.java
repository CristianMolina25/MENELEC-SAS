package com.backend.demo.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.backend.demo.model.Mercado;
import com.backend.demo.repository.MercadoRepository;

@Service
public class MercadoService {

    @Autowired
    private MercadoRepository mercadoRepository;

    @Value("${app.storage.mercado.path}")
    private String storagePath;  // Se inyecta desde application.properties

    public List<Mercado> listarProductos() {
        return mercadoRepository.findAll();
    }

    public Mercado obtenerProductoPorId(Long id) {
        return mercadoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Elemento de mercado no encontrado"));
    }

    public Mercado guardarProducto(Mercado mercado) {
        return mercadoRepository.save(mercado);
    }

    // Guardar con archivo (creación)
    public Mercado guardarProductoConArchivo(Mercado mercado, MultipartFile archivo) throws IOException {
        if (archivo != null && !archivo.isEmpty()) {
            String originalFilename = StringUtils.cleanPath(archivo.getOriginalFilename());
            String uniqueName = UUID.randomUUID() + "_" + originalFilename;
            Path targetPath = Paths.get(storagePath, uniqueName);
            Files.createDirectories(targetPath.getParent());  // Crea directorios si no existen
            archivo.transferTo(targetPath);
            mercado.setArchivoFichaTecnica(uniqueName);  // Solo guardamos el nombre único
        }
        return mercadoRepository.save(mercado);
    }

    // Actualizar sin cambiar el archivo (usando JSON)
    public Mercado actualizarProducto(Long id, Mercado mercadoActualizado) {
        Mercado existente = obtenerProductoPorId(id);
        existente.setNombre(mercadoActualizado.getNombre());
        existente.setMarca(mercadoActualizado.getMarca());
        existente.setDescripcion(mercadoActualizado.getDescripcion());
        existente.setCategoria(mercadoActualizado.getCategoria());
        existente.setPrecio(mercadoActualizado.getPrecio());
        existente.setProveedor(mercadoActualizado.getProveedor());
        existente.setFechaCotizacion(mercadoActualizado.getFechaCotizacion());
        existente.setVendedor(mercadoActualizado.getVendedor());
        existente.setSerie(mercadoActualizado.getSerie());
        existente.setTelefono(mercadoActualizado.getTelefono());
        existente.setEmail(mercadoActualizado.getEmail());
        // No se actualiza el archivo aquí
        return mercadoRepository.save(existente);
    }

    // Actualizar permitiendo cambiar el archivo (opcional, si necesitas subir uno nuevo)
public Mercado actualizarProductoConArchivo(Long id, Mercado mercadoActualizado, MultipartFile archivo) throws IOException {
    Mercado existente = obtenerProductoPorId(id);
    existente.setNombre(mercadoActualizado.getNombre());
    existente.setMarca(mercadoActualizado.getMarca());
    existente.setDescripcion(mercadoActualizado.getDescripcion());
    existente.setCategoria(mercadoActualizado.getCategoria());
    existente.setPrecio(mercadoActualizado.getPrecio());
    existente.setProveedor(mercadoActualizado.getProveedor());
    existente.setFechaCotizacion(mercadoActualizado.getFechaCotizacion());
    existente.setVendedor(mercadoActualizado.getVendedor());
    existente.setSerie(mercadoActualizado.getSerie());
    existente.setTelefono(mercadoActualizado.getTelefono());
    existente.setEmail(mercadoActualizado.getEmail());

    if (archivo != null && !archivo.isEmpty()) {
        // Eliminar archivo anterior si existe
        if (existente.getArchivoFichaTecnica() != null) {
            Path oldPath = Paths.get(storagePath, existente.getArchivoFichaTecnica());
            Files.deleteIfExists(oldPath);
        }
        // Guardar nuevo archivo
        String originalFilename = StringUtils.cleanPath(archivo.getOriginalFilename());
        String uniqueName = UUID.randomUUID() + "_" + originalFilename;
        Path targetPath = Paths.get(storagePath, uniqueName);
        Files.createDirectories(targetPath.getParent());
        archivo.transferTo(targetPath);
        existente.setArchivoFichaTecnica(uniqueName);
    }
    return mercadoRepository.save(existente);
}


    // Eliminar producto y su archivo asociado
    public void eliminarProducto(Long id) throws IOException {
        Mercado mercado = obtenerProductoPorId(id);
        if (mercado.getArchivoFichaTecnica() != null) {
            Path filePath = Paths.get(storagePath, mercado.getArchivoFichaTecnica());
            Files.deleteIfExists(filePath);
        }
        mercadoRepository.deleteById(id);
    }

    // Descargar archivo (reconstruye ruta completa)
    public byte[] descargarArchivo(Long id) throws IOException {
        Mercado mercado = obtenerProductoPorId(id);
        if (mercado.getArchivoFichaTecnica() == null) {
            throw new RuntimeException("El producto no tiene archivo asociado");
        }
        Path rutaArchivo = Paths.get(storagePath, mercado.getArchivoFichaTecnica());
        if (!Files.exists(rutaArchivo)) {
            throw new RuntimeException("El archivo no existe en el servidor");
        }
        return Files.readAllBytes(rutaArchivo);
    }
}