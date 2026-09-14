import React, { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import Login from "./Login";
import FileExplorer from "./FileExplorer";
import AdminPanel from "./AdminPanel";
import CrearTarea from "./CrearTarea";
import MisTareas from "./MisTareas";
import PasswordPrompt from './PasswordPrompt';
import PerfilUsuario from './PerfilUsuario';
import NotificationBell from './NotificationBell';
import GestionDocumental from "./GestionDocumental";
import GestionContabilidad from "./GestionContabilidad";
import OnlyOfficeEditor from "./OnlyOfficeEditor";
import GestionTablaControl from "./GestionTablaControl";
import Inventario from "./Inventario";
import GestionMercado from "./GestionMercado";
import { useMediaQuery } from 'react-responsive';
import toast from 'react-hot-toast';
import "./Responsive.css";
import {
  FaChartLine,
  FaCheckDouble,
  FaFolderOpen,
  FaRocket,
  FaClock,
  FaCalendarCheck,
  FaUserCircle,
  FaBars,
  FaTimes,
  FaClipboardList,
  FaBell,
  FaCalendarAlt,
  FaFileContract,
  FaGavel
} from "react-icons/fa";

// Detectar si estamos en producción o desarrollo
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const apiHost = isProduction ? window.location.hostname : 'localhost';


// Permitir sobrescribir mediante Vite env var VITE_API_BASE_URL, si no usar el backend en 8080 (dev)
const envBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ? import.meta.env.VITE_API_BASE_URL : null;
axios.defaults.baseURL = envBase || `http://${apiHost}:8080`;
axios.defaults.timeout = 10000;

const tokenInicial = localStorage.getItem('token');
if (tokenInicial) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${tokenInicial}`;
}

axios.interceptors.response.use(
  response => response,
  error => {
    const requestUrl = error.config?.url || '';
    // Excluir todas las peticiones relacionadas con ONLYOFFICE
    const isOnlyOfficeRequest = 
      requestUrl.includes('/onlyoffice/') || 
      requestUrl.includes('/download') ||
      requestUrl.includes('/callback') ||
      requestUrl.includes('/api/archivos/onlyoffice');

    // Si es un error de autenticación (401 o 403) y NO es de ONLYOFFICE, redirigir
    if ((error.response?.status === 401 || error.response?.status === 403) && !isOnlyOfficeRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuarios');
      localStorage.removeItem('role');
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/';
      // Opcional: muestra un mensaje solo si no es OnlyOffice
      if (!isOnlyOfficeRequest) {
        alert('Sesión expirada. Inicia sesión nuevamente.');
      }
    }
    return Promise.reject(error);
  }
);

// ========== FUNCIONES PARA ALERTAS ==========
const parseDateLocal = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;

  // Limpiar: eliminar paréntesis, hora, a.m./p.m., etc.
  let cleaned = fechaStr.replace(/\(.*?\)/g, '')   // quita ( ... )
                       .replace(/\d{1,2}:\d{2}(:\d{2})?.*$/i, '') // quita hora
                       .replace(/[aApP][mM]\.?/g, '') // quita a.m./p.m.
                       .trim();

  // Detectar separador
  let separador = '/';
  if (cleaned.includes('-')) separador = '-';
  if (!cleaned.includes(separador) && cleaned.includes('.')) separador = '.';

  const partes = cleaned.split(separador);
  if (partes.length !== 3) return null;

  let dia, mes, año;

  // Si la primera parte tiene 4 dígitos -> YYYY-MM-DD
  if (partes[0].length === 4) {
    año = parseInt(partes[0]);
    mes = parseInt(partes[1]);
    dia = parseInt(partes[2]);
  } else {
    // Asume DD/MM/YYYY o DD-MM-YYYY
    dia = parseInt(partes[0]);
    mes = parseInt(partes[1]);
    año = parseInt(partes[2]);
  }

  if (isNaN(dia) || isNaN(mes) || isNaN(año)) return null;

  return new Date(año, mes - 1, dia);
};

const calcularDiasRestantes = (fechaStr) => {
  const fecha = parseDateLocal(fechaStr);
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTime = fecha - hoy;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getUrgenciaColor = (dias) => {
  if (dias === null) return '#64748b';
  if (dias <= 3) return '#ef4444';
  if (dias <= 7) return '#f59e0b';
  if (dias <= 15) return '#eab308';
  if (dias <= 30) return '#3b82f6';
  return '#10b981';
};

/* ─────────────────────────────────────────────
    ESTILOS GLOBALES MEJORADOS (incluye responsivos)
  ───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&family=Outfit:wght@600;700;800&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: radial-gradient(circle at 10% 20%, #0a0f2a, #020617);
    color: #f1f5f9;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #0f172a;
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: #4f46e5;
    border-radius: 10px;
    border: 2px solid #0f172a;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #818cf8;
  }

  .glass-card {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 28px;
  }
  .gradient-text {
    background: linear-gradient(135deg, #c084fc, #60a5fa);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .animate-fade-up {
    animation: fadeUp 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
  }
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.4); }
    50% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.8); }
  }

  /* Botón flotante móvil */
  .mobile-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1100;
    background: linear-gradient(135deg, #4f46e5, #7c3aed);
    border: none;
    border-radius: 60px;
    width: 56px;
    height: 56px;
    display: none;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .mobile-toggle:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
  }
  @media (max-width: 768px) {
    .mobile-toggle {
      display: flex;
    }
  }

  /* Ajustes responsivos para el dashboard */
  @media (max-width: 768px) {
    .dashboard-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .banner-circle, .banner-circle2 {
      display: none;
    }
    .system-status {
      display: none !important;
    }
    .scroll-container {
      padding: 16px !important;
    }
    .header {
      padding: 12px 16px !important;
    }
    .welcome-text {
      font-size: 20px !important;
    }
    .rol-badge {
      font-size: 10px !important;
    }
    .kpi-card {
      padding: 16px !important;
    }
    .kpi-value {
      font-size: 24px !important;
    }
    .upcoming-panel {
      padding: 16px !important;
    }
    .task-item {
      padding: 12px !important;
    }
    .alerts-grid {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }
  }

  /* Mejoras hover y transiciones */
  .task-item:hover {
    background: rgba(51, 65, 85, 0.5) !important;
    border-color: #6366f1 !important;
    transform: translateX(4px);
  }
  .kpi-card:hover {
    border-color: rgba(99, 102, 241, 0.4) !important;
    transform: translateY(-2px);
  }
  .icon-button:hover {
    background: rgba(99, 102, 241, 0.1) !important;
    border-color: #6366f1 !important;
    color: #a5b4fc !important;
  }
  .alert-card:hover {
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.4) !important;
  }
  .alert-item:hover {
    background: rgba(51, 65, 85, 0.5) !important;
  }
`;

// ========== COMPONENTE DE ALERTAS PARA CIERRES (EN ESTUDIO) ==========
const AlertasCierres = ({ procesos }) => {
  if (!procesos || procesos.length === 0) return null;
  
  // Filtrar procesos descartados
  const procesosActivos = procesos.filter(p => {
    const observacion = (p.observacion || '').toUpperCase();
    const cierre = (p.cierre || '').toUpperCase();
    const estado = (p.estado || '').toUpperCase();
    const objeto = (p.objeto || '').toUpperCase();
    const palabrasDescartado = ['DESCARTADO', 'DECARTADO', 'DESCARTABLE', 'DESCARTAD'];
    const esDescartado = palabrasDescartado.some(palabra => 
      observacion.includes(palabra) || cierre.includes(palabra) || estado.includes(palabra) || objeto.includes(palabra)
    );
    return !esDescartado;
  });
  
  const proximosCierres = procesosActivos.filter(p => {
    const dias = calcularDiasRestantes(p.cierre);
    return dias !== null && dias >= 0 && dias <= 15;
  }).sort((a, b) => {
    const diasA = calcularDiasRestantes(a.cierre);
    const diasB = calcularDiasRestantes(b.cierre);
    return diasA - diasB;
  });

  if (proximosCierres.length === 0) return null;

  return (
    <div className="alert-card" style={alertCardStyles.container}>
      <div style={{ ...alertCardStyles.header, background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <FaGavel style={{ color: '#818cf8' }} />
        <span style={alertCardStyles.title}>Cierres próximos En Estudio</span>
        <span style={{ ...alertCardStyles.badge, background: '#818cf8' }}>{proximosCierres.length}</span>
      </div>
      <div style={alertCardStyles.list}>
        {proximosCierres.map(p => {   // ✅ sin slice, muestra todos
          const dias = calcularDiasRestantes(p.cierre);
          const color = getUrgenciaColor(dias);
          return (
            <div key={p.id} style={alertCardStyles.item}>
              <div style={alertCardStyles.itemInfo}>
                <span style={alertCardStyles.itemTitle}>{p.numeroProceso}</span>
                <span style={alertCardStyles.itemSub}>{p.categoria}</span>
              </div>
              <div style={{ ...alertCardStyles.itemDate, color }}>
                <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                {p.cierre}
                {dias !== null && dias >= 0 && (
                  <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>
                    ({dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ========== COMPONENTE DE ALERTAS PARA POSTVENTA (FECHAS DE ENTREGA) ==========
const AlertasPostventa = ({ servicios }) => {
  if (!servicios || servicios.length === 0) return null;

  const proximasEntregas = servicios
    .filter(s => {
      const dias = calcularDiasRestantes(s.fechaEntrega);
      return dias !== null && dias >= 0 && dias <= 15;
    })
    .sort((a, b) => {
      const diasA = calcularDiasRestantes(a.fechaEntrega);
      const diasB = calcularDiasRestantes(b.fechaEntrega);
      return diasA - diasB;
    });

  if (proximasEntregas.length === 0) return null;

  return (
    <div className="alert-card" style={alertCardStyles.container}>
      <div style={{ ...alertCardStyles.header, background: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <FaBell style={{ color: '#10b981' }} />
        <span style={alertCardStyles.title}>Entregas Postventa próximas</span>
        <span style={{ ...alertCardStyles.badge, background: '#10b981' }}>{proximasEntregas.length}</span>
      </div>
      <div style={alertCardStyles.list}>
        {proximasEntregas.map(s => {
          const dias = calcularDiasRestantes(s.fechaEntrega);
          const color = getUrgenciaColor(dias);
          return (
            <div key={s.id} style={alertCardStyles.item}>
              <div style={alertCardStyles.itemInfo}>
                <span style={alertCardStyles.itemTitle}>{s.numeroContrato || 'Sin contrato'}</span>
                <span style={alertCardStyles.itemSub}>{s.equipo}</span>
              </div>
              <div style={{ ...alertCardStyles.itemDate, color }}>
                <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                {s.fechaEntrega}
                {dias !== null && dias >= 0 && (
                  <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>
                    ({dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
// ========== COMPONENTE DE ALERTAS PARA EVALUACIONES (PROPUESTAS) ==========
const AlertasEvaluaciones = ({ propuestas }) => {
  if (!propuestas || propuestas.length === 0) return null;
  
  const propuestasActivas = propuestas.filter(p => 
    p.estado && p.estado.toUpperCase() !== 'ARCHIVO' && p.estado.toUpperCase() !== 'ARCHIVO - PERDIDAS'
  );
  
  const proximasEvaluaciones = propuestasActivas.filter(p => {
    const dias = calcularDiasRestantes(p.fechaEvaluacion);
    return dias !== null && dias >= 0 && dias <= 15;
  }).sort((a, b) => {
    const diasA = calcularDiasRestantes(a.fechaEvaluacion);
    const diasB = calcularDiasRestantes(b.fechaEvaluacion);
    return diasA - diasB;
  });

  if (proximasEvaluaciones.length === 0) return null;

  return (
    <div className="alert-card" style={alertCardStyles.container}>
      <div style={{ ...alertCardStyles.header, background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
        <FaBell style={{ color: '#f59e0b' }} />
        <span style={alertCardStyles.title}>Evaluaciones próximas En Propuestas</span>
        <span style={{ ...alertCardStyles.badge, background: '#f59e0b', color: '#0f172a' }}>{proximasEvaluaciones.length}</span>
      </div>
      <div style={alertCardStyles.list}>
        {proximasEvaluaciones.map(p => {
          const dias = calcularDiasRestantes(p.fechaEvaluacion);
          const color = getUrgenciaColor(dias);
          return (
            <div key={p.id} style={alertCardStyles.item}>
              <div style={alertCardStyles.itemInfo}>
                <span style={alertCardStyles.itemTitle}>{p.numeroProceso}</span>
                <span style={alertCardStyles.itemSub}>{p.entidad}</span>
              </div>
              <div style={{ ...alertCardStyles.itemDate, color }}>
                <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                {p.fechaEvaluacion}
                {dias !== null && dias >= 0 && (
                  <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>
                    ({dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ========== COMPONENTE DE ALERTAS PARA PLAZOS DE CONTRATOS ==========
const AlertasPlazosContratos = ({ contratos }) => {
  if (!contratos || contratos.length === 0) return null;
  
  const proximosPlazos = contratos.filter(c => {
    const dias = calcularDiasRestantes(c.plazoEjecucion);
    return dias !== null && dias >= 0 && dias <= 30;
  }).sort((a, b) => {
    const diasA = calcularDiasRestantes(a.plazoEjecucion);
    const diasB = calcularDiasRestantes(b.plazoEjecucion);
    return diasA - diasB;
  });

  if (proximosPlazos.length === 0) return null;

  return (
    <div className="alert-card" style={alertCardStyles.container}>
      <div style={{ ...alertCardStyles.header, background: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <FaFileContract style={{ color: '#10b981' }} />
        <span style={alertCardStyles.title}>Plazos de ejecución</span>
        <span style={{ ...alertCardStyles.badge, background: '#10b981' }}>{proximosPlazos.length}</span>
      </div>
      <div style={alertCardStyles.list}>
        {proximosPlazos.map(c => {
          const dias = calcularDiasRestantes(c.plazoEjecucion);
          const color = getUrgenciaColor(dias);
          return (
            <div key={c.id} style={alertCardStyles.item}>
              <div style={alertCardStyles.itemInfo}>
                <span style={alertCardStyles.itemTitle}>{c.numeroContrato}</span>
                <span style={alertCardStyles.itemSub}>{c.entidad}</span>
              </div>
              <div style={{ ...alertCardStyles.itemDate, color }}>
                <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                {c.plazoEjecucion}
                {dias !== null && dias >= 0 && (
                  <span style={{ fontWeight: 'bold', marginLeft: '6px' }}>
                    ({dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const alertCardStyles = {
  container: {
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
    transition: 'transform 0.2s, border-color 0.2s',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#fff'
  },
  list: {
    maxHeight: '220px',
    overflowY: 'auto'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    transition: 'background 0.2s',
    cursor: 'pointer'
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    marginRight: '12px'
  },
  itemTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  itemSub: {
    fontSize: '11px',
    color: '#64748b'
  },
  itemDate: {
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  }
};

function App() {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState(null);
  const [pendingView, setPendingView] = useState(null);
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [metricas, setMetricas] = useState({ tareas: 0, archivos: 0, estado: "Conectado" });
  const [proximasTareas, setProximasTareas] = useState([]);
  const [rutaArchivos, setRutaArchivos] = useState('');
  const [serviciosPostventa, setServiciosPostventa] = useState([]);
  const [cargandoPostventa, setCargandoPostventa] = useState(false);
  const [mostrarSoporteDocumental, setMostrarSoporteDocumental] = useState(false);
  // Estados para las alertas de Tabla de Control
  const [procesos, setProcesos] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(false);
  const [metadataId, setMetadataId] = useState(null);

  const isMobile = useMediaQuery({ maxWidth: 768 });
  const API_URL = `${window.location.protocol}//${window.location.hostname}:8080/api`;
  const API_BASE = '/api/archivos';

  // Inyectar estilos globales
  useEffect(() => {
    if (!document.getElementById("app-global-styles")) {
      const styleTag = document.createElement("style");
      styleTag.id = "app-global-styles";
      styleTag.textContent = GLOBAL_CSS;
      document.head.appendChild(styleTag);
    }
  }, []);

  useEffect(() => {
    if (usuarioLogueado && vistaActiva === "inicio") {
      cargarEstadisticas();
      cargarDatosTablaControl();
      cargarDatosPostventa();   // <-- agregar esta línea
    }
  }, [usuarioLogueado, vistaActiva]);

  // Cargar todos los datos de la Tabla de Control
  const cargarDatosTablaControl = async () => {
    setCargandoAlertas(true);
    try {
      const token = localStorage.getItem('token');
      
      // Primero obtener el metadataId del archivo de Tabla de Control
      const archivoRes = await axios.get(`${API_BASE}/tabla-control/archivo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (archivoRes.data && archivoRes.data.metadataId) {
        const id = archivoRes.data.metadataId;
        setMetadataId(id);
        
        // Cargar procesos (EN ESTUDIO)
        const procesosRes = await axios.get(`${API_BASE}/tabla-control/en-estudio?metadataId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProcesos(procesosRes.data);
        
        // Cargar propuestas
        const propuestasRes = await axios.get(`${API_BASE}/tabla-control/propuestas?metadataId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPropuestas(propuestasRes.data);
        
        // Cargar contratos
        const contratosRes = await axios.get(`${API_BASE}/tabla-control/contratos?metadataId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContratos(contratosRes.data);
      }
    } catch (error) {
      console.error('Error al cargar datos de Tabla de Control:', error);
      // No mostrar toast para no molestar al usuario
    } finally {
      setCargandoAlertas(false);
    }
  };
  const cargarDatosPostventa = async () => {
    setCargandoPostventa(true);
    try {
      const token = localStorage.getItem('token');
      // 1. Buscar el archivo Excel en la carpeta Postventa
      const listRes = await axios.get(`${API_BASE}/listar`, {
        params: { ruta: 'Postventa' },
        headers: { Authorization: `Bearer ${token}` }
      });
      const archivos = listRes.data;
      const excel = archivos.find(f => !f.esCarpeta && (f.nombre.endsWith('.xlsx') || f.nombre.endsWith('.xls')));
      if (excel && excel.metadataId) {
        // 2. Cargar servicios indexados
        const serviciosRes = await axios.get(`${API_BASE}/servicios-postventa?metadataId=${excel.metadataId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setServiciosPostventa(serviciosRes.data);
      } else {
        setServiciosPostventa([]);
      }
    } catch (error) {
      console.error('Error al cargar datos de Postventa:', error);
      setServiciosPostventa([]);
    } finally {
      setCargandoPostventa(false);
    }
  };
  const handleSetVistaActiva = (view) => {
    if (view === 'admin' && !adminAuthenticated) {
      setPendingView(view);
      setShowPasswordPrompt(true);
    } else if (view === 'tablaControl') {
      setVistaActiva(view);
      setMenuAbierto(false);
    } else {
      setVistaActiva(view);
      setMenuAbierto(false);
    }
  };

  const manejarNavegacion = (carpeta) => {
    setRutaArchivos(carpeta);
    setVistaActiva('archivos');
  };

  const onPasswordSuccess = () => {
    setAdminAuthenticated(true);
    setShowPasswordPrompt(false);
    if (pendingView) setVistaActiva(pendingView);
    setPendingView(null);
  };

  const onPasswordCancel = () => {
    setShowPasswordPrompt(false);
    setPendingView(null);
  };

  const cargarEstadisticas = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const resTareas = await axios.get(`${API_URL}/tareas/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const misTareas = resTareas.data.filter((t) =>
        t.responsables?.includes(usuarioLogueado.email)
      );
      
      const tareasActivas = misTareas.filter(t => {
        const estado = (t.estado || "").toString().toUpperCase().trim();
        return estado !== "COMPLETADO" && estado !== "FINALIZADO";
      });
      
      setMetricas({
        tareas: tareasActivas.length,
        archivos: 158,
        estado: "En línea",
      });
      
      const urgentes = tareasActivas
        .sort((a, b) => {
          const fechaA = a.fechaEntrega ? new Date(a.fechaEntrega) : null;
          const fechaB = b.fechaEntrega ? new Date(b.fechaEntrega) : null;
          if (!fechaA && !fechaB) return 0;
          if (!fechaA) return 1;
          if (!fechaB) return -1;
          return fechaA - fechaB;
        })
      
      setProximasTareas(urgentes);
    } catch (err) {
      console.error("Error al cargar métricas:", err);
    }
  };

  if (!usuarioLogueado) {
    return <Login setUsuarioLogueado={setUsuarioLogueado} />;
  }

  return (
    <div style={styles.appContainer}>
      {/* Overlay móvil */}
      {menuAbierto && (
        <div style={styles.mobileOverlay} onClick={() => setMenuAbierto(false)} />
      )}

      {/* Botón móvil flotante */}
      <button 
        className="mobile-toggle"
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-label="Menú"
      >
        {menuAbierto ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <Sidebar
        isMobile={isMobile}
        usuario={usuarioLogueado}
        vistaActiva={vistaActiva}
        setVistaActiva={(view) => {
          handleSetVistaActiva(view);
          setMenuAbierto(false);
        }}
        cerrarSesion={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('usuarios');
          localStorage.removeItem('role');
          delete axios.defaults.headers.common['Authorization'];
          setUsuarioLogueado(null);
          setAdminAuthenticated(false);
        }}
        menuAbierto={menuAbierto}
      />

      <main style={styles.mainContent}>
        <header style={styles.header} className="header">
          <div style={styles.headerLeft}>
            <div>
              <h1 style={styles.welcomeText} className="welcome-text">
                Hola, <span className="gradient-text">{usuarioLogueado.nombre?.split(' ')[0] || "Usuario"}</span>
              </h1>
              <div style={styles.badgeContainer}>
                <span style={styles.rolBadge} className="rol-badge">
                  {usuarioLogueado.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
                </span>
              </div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <NotificationBell usuario={usuarioLogueado} setVistaActiva={setVistaActiva} />
            {!isMobile && (
              <div style={styles.systemStatus} className="system-status">
                <div style={styles.statusDot}></div>
                <span>Sistema operativo</span>
              </div>
            )}
            <button 
              onClick={() => setVistaActiva('perfil')} 
              style={styles.iconButton}
              className="icon-button"
              title="Perfil"
            >
              <FaUserCircle size={22} />
            </button>
          </div>
        </header>

        <div style={styles.scrollContainer} className="scroll-container">
          {vistaActiva === "inicio" && (
            <section style={styles.viewSection}>
              <div style={styles.welcomeBanner}>
                <div style={styles.bannerContent}>
                  <div style={styles.bannerText}>
                    <FaRocket style={{ color: '#c084fc', fontSize: '32px', animation: 'float 3s ease-in-out infinite' }} />
                    <h3 style={styles.bannerTitle}>Panel de Control</h3>
                    <p style={styles.bannerDesc}>
                      Bienvenido al centro de operaciones. Tienes <strong style={{ color: '#818cf8' }}>{metricas.tareas} tareas activas</strong>. 
                      El rendimiento del sistema es óptimo.
                    </p>
                  </div>
                  <div style={styles.bannerDecor}>
                    <div className="banner-circle" style={styles.bannerCircle}></div>
                    <div className="banner-circle2" style={styles.bannerCircle2}></div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE ALERTAS - Los 3 tipos de alertas en grid */}
              {(!cargandoAlertas || !cargandoPostventa) && 
              (procesos.length > 0 || propuestas.length > 0 || contratos.length > 0 || serviciosPostventa.length > 0) && (
                <div className="alerts-grid" style={styles.alertsGrid}>
                  <AlertasCierres procesos={procesos} />
                  <AlertasEvaluaciones propuestas={propuestas} />
                  <AlertasPlazosContratos contratos={contratos} />
                  <AlertasPostventa servicios={serviciosPostventa} />
                </div>
              )}

              {cargandoAlertas && (
                <div style={styles.cargandoAlertas}>
                  <div className="spin" style={styles.spinner}></div>
                  <span>Cargando alertas...</span>
                </div>
              )}

              <div style={styles.dashboardGrid} className="dashboard-grid">
              

                <div className="kpi-grid" style={styles.gridKPI}>
                  <KPICard
                    icon={<FaChartLine />}
                    label="ESTADO DEL SISTEMA"
                    value={metricas.estado}
                    sub="Sesión activa"
                    color="#818cf8"
                    bg="rgba(99, 102, 241, 0.1)"
                    gradient="linear-gradient(135deg, #4f46e5, #7c3aed)"
                  />
                  <KPICard
                    icon={<FaCheckDouble />}
                    label="TAREAS EN CURSO"
                    value={`${metricas.tareas} Activas`}
                    sub="Asignadas a ti"
                    color="#34d399"
                    bg="rgba(16, 185, 129, 0.1)"
                    gradient="linear-gradient(135deg, #10b981, #34d399)"
                  />
                  <KPICard
                    icon={<FaFolderOpen />}
                    label="DOCUMENTOS"
                    value={metricas.archivos}
                    sub="En repositorio"
                    color="#fbbf24"
                    bg="rgba(245, 158, 11, 0.1)"
                    gradient="linear-gradient(135deg, #d97706, #fbbf24)"
                  />
                </div>
              </div>
            </section>
          )}

{vistaActiva === "archivos" && (
  <section style={styles.viewSection}>
    <FileExplorer
      rutaInicial={rutaArchivos}
      onOpenWithOnlyOffice={async (ruta) => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`/api/archivos/onlyoffice/config?ruta=${encodeURIComponent(ruta)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setOnlyOfficeConfig(res.data);
          setVistaActiva('onlyoffice');
        } catch (error) {
          console.error('Error al obtener configuración de OnlyOffice:', error);
          toast.error('No se pudo abrir el editor.');
        }
      }}
    />
  </section>
)}
          
          {vistaActiva === "admin" && usuarioLogueado.rol === "ADMIN" && (
            <section style={styles.viewSection}>
              <AdminPanel />
            </section>
          )}
          
          {vistaActiva === "tareas" && (
            <section style={styles.viewSection}>
              <CrearTarea usuario={usuarioLogueado} setVistaActiva={handleSetVistaActiva} />
            </section>
          )}
{vistaActiva === "onlyoffice" && onlyOfficeConfig && (
  <section style={styles.viewSection}>
    <ErrorBoundary onBack={() => {
      setOnlyOfficeConfig(null);
      setVistaActiva('archivos');
    }}>
      <OnlyOfficeEditor
        config={onlyOfficeConfig}
        onBack={() => {
          setOnlyOfficeConfig(null);
          setVistaActiva('archivos');
        }}
      />
    </ErrorBoundary>
  </section>
)}
          {vistaActiva === "misTareas" && (
            <section style={styles.viewSection}>
              <MisTareas usuario={usuarioLogueado} setVistaActiva={handleSetVistaActiva} />
            </section>
          )}
          
          {vistaActiva === "gestion" && (
            <section style={styles.viewSection}>
              <GestionDocumental />
            </section>
          )}
          
          {vistaActiva === "tablaControl" && (
            <section style={styles.viewSection}>
              <GestionTablaControl onBack={() => setVistaActiva('inicio')} />
            </section>
          )}
          
          {vistaActiva === "inventario" && (
            <section style={styles.viewSection}>
              <Inventario />
            </section>
          )}
          
          {vistaActiva === "mercado" && (
            <section style={styles.viewSection}>
              <GestionMercado />
            </section>
          )}
          
          {vistaActiva === "perfil" && (
            <PerfilUsuario usuarioLogueado={usuarioLogueado} setUsuarioLogueado={setUsuarioLogueado} />
          )}
          
          {showPasswordPrompt && (
            <PasswordPrompt
              onSuccess={onPasswordSuccess}
              onCancel={onPasswordCancel}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const KPICard = ({ icon, label, value, sub, color, bg, gradient }) => (
  <div className="kpi-card" style={styles.kpiCard}>
    <div style={{ ...styles.kpiIcon, backgroundColor: bg, color, boxShadow: `0 0 20px ${color}30` }}>
      {icon}
    </div>
    <div style={styles.kpiInfo}>
      <h4 style={styles.kpiLabel}>{label}</h4>
      <p style={{ ...styles.kpiValue, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="kpi-value">
        {value}
      </p>
      <span style={styles.kpiSub}>{sub}</span>
    </div>
  </div>
);

const styles = {
  appContainer: {
    display: "flex",
    minHeight: "100vh",
    background: "radial-gradient(circle at 20% 30%, #0a0f2a, #020617)",
    position: "relative",
  },
  mobileOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    zIndex: 900,
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
    zIndex: 10,
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  welcomeText: {
    fontSize: "24px",
    fontWeight: "800",
    margin: 0,
    color: "#f1f5f9",
    lineHeight: 1.2,
  },
  badgeContainer: {
    marginTop: "4px",
  },
  rolBadge: {
    background: "rgba(99, 102, 241, 0.15)",
    padding: "4px 12px",
    borderRadius: "30px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#a5b4fc",
    border: "1px solid rgba(99, 102, 241, 0.4)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  systemStatus: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#0f172a",
    padding: "8px 16px",
    borderRadius: "40px",
    fontSize: "12px",
    border: "1px solid #1e293b",
    color: "#94a3b8",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    background: "#22c55e",
    borderRadius: "50%",
    boxShadow: "0 0 10px #22c55e",
    animation: "pulse-glow 2s infinite",
  },
  iconButton: {
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid #334155",
    borderRadius: "14px",
    padding: "10px",
    color: "#94a3b8",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
  },
  viewSection: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    animation: "fadeUp 0.4s ease-out",
  },
  welcomeBanner: {
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))",
    backdropFilter: "blur(12px)",
    borderRadius: "32px",
    padding: "40px",
    marginBottom: "32px",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  bannerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "24px",
  },
  bannerText: {
    flex: "1 1 300px",
  },
  bannerTitle: {
    fontSize: "28px",
    fontWeight: "800",
    margin: "12px 0",
    fontFamily: "'Outfit', sans-serif",
  },
  bannerDesc: {
    color: "#94a3b8",
    fontSize: "16px",
    lineHeight: 1.6,
  },
  bannerDecor: {
    display: "flex",
    gap: "20px",
    opacity: 0.6,
  },
  bannerCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #818cf8, #4f46e5)",
    filter: "blur(20px)",
  },
  bannerCircle2: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #c084fc, #a855f7)",
    filter: "blur(20px)",
  },
  alertsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
  },
  cargandoAlertas: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "20px",
    marginBottom: "20px",
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: "16px",
    color: "#94a3b8"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #334155",
    borderTopColor: "#818cf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    alignItems: "start",
  },
  upcomingPanel: {
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(12px)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(99, 102, 241, 0.15)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  panelIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    background: "rgba(99, 102, 241, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: {
    fontSize: "18px",
    fontWeight: "700",
    flex: 1,
  },
  panelCount: {
    background: "rgba(99, 102, 241, 0.2)",
    color: "#a5b4fc",
    borderRadius: "20px",
    padding: "4px 12px",
    fontSize: "13px",
    fontWeight: "700",
  },
  tasksList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "420px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  taskItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(30, 41, 59, 0.6)",
    padding: "16px",
    borderRadius: "16px",
    border: "1px solid #334155",
    transition: "all 0.2s",
    cursor: "pointer",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontWeight: "600",
    marginBottom: "4px",
    fontSize: "15px",
  },
  taskDate: {
    fontSize: "13px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
  },
  priorityTag: {
    fontSize: "11px",
    fontWeight: "800",
    padding: "4px 10px",
    borderRadius: "30px",
    whiteSpace: "nowrap",
  },
  emptyTasks: {
    textAlign: "center",
    padding: "30px",
    color: "#64748b",
  },
  gridKPI: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(8px)",
    borderRadius: "24px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    border: "1px solid #1e293b",
    transition: "transform 0.3s, border-color 0.3s",
    cursor: "default",
  },
  kpiIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },
  kpiInfo: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: "1.5px",
    marginBottom: "4px",
  },
  kpiValue: {
    fontSize: "28px",
    fontWeight: "800",
    margin: "4px 0",
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: "12px",
    color: "#64748b",
  },
};

export default App;