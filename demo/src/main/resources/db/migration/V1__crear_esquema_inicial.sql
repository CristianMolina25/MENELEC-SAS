-- Eliminar tablas si existen (para reiniciar)
DROP TABLE IF EXISTS tarea_responsables;
DROP TABLE IF EXISTS tarea;
DROP TABLE IF EXISTS usuario;

-- Tabla de Usuarios (coincide con tu modelo Java)
CREATE TABLE usuario (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50)
);

-- Tabla de Tareas (coincide con tu modelo Tarea.java)
CREATE TABLE tarea (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    google_event_id VARCHAR(500),
    prioridad VARCHAR(50),
    fecha_entrega VARCHAR(100),
    estado VARCHAR(50) DEFAULT 'PENDIENTE'
);

-- Tabla para Responsables (coincide con @ElementCollection)
CREATE TABLE tarea_responsables (
    tarea_id BIGINT NOT NULL,
    email_responsable VARCHAR(255) NOT NULL,
    PRIMARY KEY (tarea_id, email_responsable),
    FOREIGN KEY (tarea_id) REFERENCES tarea(id) ON DELETE CASCADE
);