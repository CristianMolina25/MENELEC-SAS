package com.backend.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.demo.model.Usuario;
import com.backend.demo.repository.UsuarioRepository;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class UsuarioController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/listar")
    public ResponseEntity<List<Usuario>> listarUsuarios() {
        return ResponseEntity.ok(usuarioRepository.findAll());
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrarOActualizarUsuario(@RequestBody Usuario usuario) {
        if (usuario.getId() == null && usuarioRepository.existsByEmail(usuario.getEmail())) {
            return ResponseEntity.badRequest().body("El correo ya existe.");
        }
        if (usuario.getPassword() != null && !usuario.getPassword().isEmpty()) {
            usuario.setPassword(passwordEncoder.encode(usuario.getPassword()));
        } else if (usuario.getId() != null) {
            Usuario usuarioExistente = usuarioRepository.findById(usuario.getId()).orElse(null);
            if (usuarioExistente != null) {
                usuario.setPassword(usuarioExistente.getPassword());
            }
        }
        usuarioRepository.save(usuario);
        return ResponseEntity.ok("Datos actualizados correctamente.");
    }

    @DeleteMapping("/eliminar/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id) {
        return usuarioRepository.findById(id)
            .map(usuario -> {
                usuarioRepository.delete(usuario);
                return ResponseEntity.ok("Usuario eliminado exitosamente");
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ========== NUEVOS ENDPOINTS PARA PERFIL ==========

    @GetMapping("/perfil")
    public ResponseEntity<?> obtenerPerfil(Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Map<String, Object> perfil = new HashMap<>();
        perfil.put("id", usuario.getId());
        perfil.put("nombre", usuario.getNombre());
        perfil.put("email", usuario.getEmail());
        perfil.put("rol", usuario.getRol());
        perfil.put("area", usuario.getArea());
        return ResponseEntity.ok(perfil);
    }

    @PutMapping("/actualizar-perfil")
    public ResponseEntity<?> actualizarPerfil(@RequestBody Map<String, String> datos, Authentication authentication) {
        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        String nuevoNombre = datos.get("nombre");
        String nuevoEmail = datos.get("email");
        
        if (nuevoNombre != null && !nuevoNombre.trim().isEmpty()) {
            usuario.setNombre(nuevoNombre.trim());
        }
        if (nuevoEmail != null && !nuevoEmail.trim().isEmpty() && !nuevoEmail.equals(email)) {
            if (usuarioRepository.existsByEmail(nuevoEmail)) {
                return ResponseEntity.badRequest().body("El correo ya está registrado");
            }
            usuario.setEmail(nuevoEmail);
        }
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(Map.of("mensaje", "Perfil actualizado correctamente"));
    }

    @PutMapping("/cambiar-password")
    public ResponseEntity<?> cambiarPassword(@RequestBody Map<String, String> passwords, Authentication authentication) {
        String email = authentication.getName();
        String oldPassword = passwords.get("oldPassword");
        String newPassword = passwords.get("newPassword");
        if (oldPassword == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body("La nueva contraseña debe tener al menos 6 caracteres");
        }
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (!passwordEncoder.matches(oldPassword, usuario.getPassword())) {
            return ResponseEntity.badRequest().body("Contraseña actual incorrecta");
        }
        usuario.setPassword(passwordEncoder.encode(newPassword));
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(Map.of("mensaje", "Contraseña actualizada correctamente"));
    }
}