package com.backend.demo;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.demo.dto.LoginRequest;
import com.backend.demo.model.Usuario;
import com.backend.demo.repository.UsuarioRepository;

@RestController
@RequestMapping("/api/auth")
// Nota: La configuración de CrossOrigin ya la maneja SecurityConfig globalmente
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        
        
        // 1. Buscar el usuario por email
        Optional<Usuario> oUsuario = usuarioRepository.findByEmail(request.getEmail());
        
        if (oUsuario.isEmpty()) {
            System.out.println("❌ Resultado: Usuario no encontrado en la Base de Datos.");
            return ResponseEntity.status(401).body("Credenciales incorrectas");
        }

        Usuario usuario = oUsuario.get();

        // 2. Validar contraseña usando BCrypt
        boolean matches = passwordEncoder.matches(request.getPassword(), usuario.getPassword());


        if (matches) {
            // 3. Generar el Token JWT
            String token = jwtUtil.generateToken(usuario.getEmail()); 
            
            // 4. Construir la respuesta (Esto es lo que faltaba definir)
            Map<String, Object> response = new HashMap<>();
            response.put("id", usuario.getId());
            response.put("nombre", usuario.getNombre());
            response.put("email", usuario.getEmail());
            response.put("rol", usuario.getRol());
            response.put("token", token);

            return ResponseEntity.ok(response);
        } else {
            System.out.println("❌ Resultado: Contraseña incorrecta para el usuario " + request.getEmail());
            return ResponseEntity.status(401).body("Credenciales incorrectas");
        }
    }

    // Endpoint temporal para desarrollo: crea/actualiza el usuario admin con contraseña 'admin123'
    @PostMapping("/create-admin")
    public ResponseEntity<?> createAdmin() {
        String email = "admin@menelec.sas";
        Usuario usuario;
        Optional<Usuario> o = usuarioRepository.findByEmail(email);

        if (o.isPresent()) {
            usuario = o.get();
            usuario.setPassword(passwordEncoder.encode("admin123"));
            usuario.setNombre("Administrador");
            usuario.setRol("ADMIN");
            usuario.setArea("ADMIN");
        } else {
            usuario = new Usuario();
            usuario.setEmail(email);
            usuario.setPassword(passwordEncoder.encode("admin123"));
            usuario.setNombre("Administrador");
            usuario.setRol("ADMIN");
            usuario.setArea("ADMIN");
        }

        Usuario saved = usuarioRepository.save(usuario);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", saved.getId());
        resp.put("email", saved.getEmail());
        return ResponseEntity.ok(resp);
    }
}