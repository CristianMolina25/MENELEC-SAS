# MENELEC

Sistema integral de gestión documental, operativa y administrativa para la empresa MENELEC, desarrollado con Spring Boot en el backend y React + Vite en el frontend.

[![Java](https://img.shields.io/badge/Java-21-orange)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.13-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1)](https://www.mysql.com/)

## ¿De qué trata este proyecto?

Este proyecto es un sistema empresarial web para gestionar la documentación y la operación interna de una compañía, enfocándose en centralizar información que normalmente está dispersa en carpetas, Excel, correos, archivos físicos y procesos manuales.

En concreto, la aplicación ayuda a la empresa a controlar:
- Documentos y archivos por áreas.
- Procesos y contratos.
- Facturas y soporte documental.
- Inventario y productos.
- Tesorería y movimientos financieros.
- Servicio postventa y garantías.
- Tareas internas y seguimiento operativo.
- Usuarios, perfiles y permisos de acceso.

La solución está dividida en dos partes:
- **Backend:** Java con Spring Boot.
- **Frontend:** React con Vite.

Esto permite que la empresa tenga una plataforma web moderna para trabajar desde un mismo lugar, en vez de depender de archivos sueltos o procesos improvisados.

---

## ¿A qué ayuda a la empresa?

1. **Centraliza la información:** Organiza los documentos por áreas, tipos y relaciones para que sean más fáciles de consultar.
2. **Mejora la trazabilidad:** Cada documento o proceso queda relacionado con datos importantes como fechas, estados, responsables y rutas de archivo.
3. **Reduce errores manuales:** Automatiza tareas administrativas repetitivas como revisar estados, buscar facturas o controlar garantías.
4. **Acelera decisiones:** Proporciona paneles, búsquedas, filtros y seguimiento de tareas para ver rápidamente qué está pendiente o próximo a vencer.
5. **Mejora el control operativo:** Supervisa tareas internas, alertas, cuentas por pagar/cobrar, inventario y soporte postventa.
6. **Da orden a la gestión documental:** Mantiene un historial claro y organizado, clave para auditorías y continuidad operativa.

---

## Objetivos del sistema

- Centralizar la gestión documental por áreas y tipos de archivo.
- Organizar procesos, contratos, facturas y documentación asociada.
- Controlar inventarios y productos del mercado empresarial.
- Gestionar tesorería, soporte documental y seguimiento de cuentas.
- Programar y controlar tareas internas y alertas de vencimiento.
- Integrar servicios de edición documental y sincronización con Google Calendar.
- Facilitar acceso a la información a través de un panel administrativo y una interfaz moderna.

---

## Stack tecnológico

### Backend
- Java 21
- Spring Boot 3.5.13
- Spring Web
- Spring Data JPA
- Spring Security
- JWT para autenticación
- MySQL
- Apache POI para lectura de archivos Excel
- Tika para extracción de metadatos/documentos
- OpenAPI / Springdoc
- Google API para integración con calendario
- Twilio para notificaciones o mensajes

### Frontend
- React 18
- Vite
- Axios
- React Icons
- FullCalendar
- Recharts
- Responsive design para uso en escritorio y móvil

---

## Funcionalidades principales

### 1. Gestión documental
- Carga, organización y consulta de documentos por áreas.
- Clasificación automática según tipo documental.
- Extracción de metadatos desde archivos Excel, PDF y otros formatos.
- Visualización y edición colaborativa de documentos con OnlyOffice.
- Búsqueda por rutas, carpetas y contenido relacionado.

### 2. Administración de procesos y contratos
- Registro y seguimiento de procesos en estudio.
- Gestión de propuestas y contratos.
- Búsqueda por número de proceso, entidad, objeto o estado.
- Relación entre documentos y registros de negocio.

### 3. Servicio postventa
- Control de servicios, equipos, garantías y contratos.
- Alertas de vencimiento de garantías.
- Búsqueda libre y filtrado por campos específicos.
- Registro de soporte documental asociado.

### 4. Tesorería y contabilidad
- Carga de archivos contables y tesoreros.
- Lectura de datos desde Excel.
- Registro de facturas, movimientos, cheques, cuentas por pagar y cobrar.
- Organización por empresa, soporte y transacciones.

### 5. Inventario y mercado
- Gestión de productos e inventario.
- Registro de información comercial y fichas técnicas.
- Administración de catálogo de mercado.
- Carga de archivos asociados a productos.

### 6. Tareas y seguimiento operativo
- Creación y administración de tareas internas.
- Asignación por responsables.
- Cambio de estados y alertas.
- Integración con Google Calendar para sincronizar eventos y recordatorios.

### 7. Seguridad y autenticación
- Registro e inicio de sesión de usuarios.
- Autenticación basada en JWT.
- Control de acceso por roles y rutas.
- CORS y configuración de seguridad orientada a la aplicación web.

---

## 🚀 Requisitos Previos

Asegúrate de tener instalado en tu equipo:
- **Node.js** (para el Frontend)
- **Java JDK** (versión compatible con Spring Boot)
- **Maven** (para la ejecución del Backend)
- **Git**

---

## ⚙️ Configuración y Ejecución Automática

Este repositorio incluye un script en Batch para iniciar todos los servicios del sistema de manera simultánea en Windows sin necesidad de abrir múltiples terminales manualmente.

### Instrucciones de uso:

1. Clona el repositorio en tu máquina local:
   ```bash
   git clone [https://github.com/CristianMolina25/MENELEC-SAS.git](https://github.com/CristianMolina25/MENELEC-SAS.git)

## Estructura del repositorio

```text
MENELEC/
├── demo/                   # Backend Spring Boot
│   ├── src/main/java/       # Código fuente Java
│   ├── src/main/resources/   # Recursos y configuración
│   ├── src/test/java/        # Pruebas del backend
│   ├── pom.xml               # Dependencias Maven
│   ├── mvnw                  # Wrapper de Maven
│   └── target/               # Artefactos compilados
│
├── frontend/               # Aplicación React / Vite
│   ├── src/                  # Código fuente frontend
│   ├── public/               # Archivos públicos
│   ├── package.json          # Dependencias npm
│   ├── vite.config.js        # Configuración de Vite
│   └── README.md             # README específico del frontend
│
├── logs/                   # Registros del sistema
├── .gitignore
├── .github/                # Configuraciones del repositorio
└── README.md               # README principal del proyecto
