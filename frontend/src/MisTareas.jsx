import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaCheckCircle, FaClock, FaCalendarDay, FaUser, 
  FaExclamationCircle, FaSearch, FaInbox, 
  FaCheckDouble, FaQuestionCircle, FaArrowRight, 
  FaSortAmountDownAlt, FaRedoAlt, FaTimes,
  FaPaperclip, FaDownload, FaFolderOpen,
  FaSpinner, FaClipboardList, FaFire, FaLayerGroup,
  FaChevronDown, FaChevronUp, FaFilter, FaThLarge,
  FaList, FaChartBar, FaTrashAlt, FaRegClock,
  FaRegCheckCircle, FaRegQuestionCircle, FaSyncAlt,
  FaBolt, FaTag, FaEye, FaEyeSlash, FaGripVertical
} from 'react-icons/fa';

// ==================== CONSTANTES Y MAPEOS ====================
const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080/api/tareas`;
const API_ARCHIVOS = `${window.location.protocol}//${window.location.hostname}:8080/api/archivos`;

const estadoMapping = {
  'NUEVAS': ['', 'NULL', 'PENDIENTE', 'NUEVA', 'ASIGNADA'],
  'PROCESO': ['EN PROCESO', 'PROCESO', 'EN_PROCESO'],
  'COMPLETADO': ['COMPLETADO', 'FINALIZADO']
};

const priorityConfig = {
  'ALTA': { label: 'URGENTE', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: <FaFire size={14} />, glow: '0 0 20px rgba(239, 68, 68, 0.3)' },
  'MEDIA': { label: 'MEDIA', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: <FaBolt size={14} />, glow: '0 0 20px rgba(245, 158, 11, 0.3)' },
  'NORMAL': { label: 'NORMAL', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: <FaBolt size={14} />, glow: '0 0 20px rgba(245, 158, 11, 0.3)' },
  'BAJA': { label: 'BAJA', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: <FaTag size={14} />, glow: '0 0 20px rgba(16, 185, 129, 0.3)' },
  'SPORTE': { label: 'BAJA', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: <FaTag size={14} />, glow: '0 0 20px rgba(16, 185, 129, 0.3)' },
  'DEFAULT': { label: 'NORMAL', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', icon: <FaBolt size={14} />, glow: '0 0 20px rgba(234, 179, 8, 0.3)' }
};

const normalizarEstado = (estadoRaw) => {
  const upperEstado = (estadoRaw || "").toString().toUpperCase().trim();
  for (const [canonico, variantes] of Object.entries(estadoMapping)) {
    if (variantes.includes(upperEstado)) return canonico;
  }
  return null;
};

const formatearFecha = (fechaISO) => {
  if (!fechaISO) return 'Sin fecha';
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return 'Sin fecha';
  return fecha.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    timeZone: 'UTC' 
  });
};

const formatearFechaLarga = (fechaISO) => {
  if (!fechaISO) return 'Sin fecha definida';
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return 'Sin fecha definida';
  return fecha.toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'UTC' 
  });
};

const calcularDiasRestantes = (fechaISO) => {
  if (!fechaISO) return null;
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  return diff;
};

// ==================== COMPONENTE PRINCIPAL ====================
const MisTareas = ({ usuario, setVistaActiva }) => {
  const [todasLasTareas, setTodasLasTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [tabActual, setTabActual] = useState('NUEVAS');
  const [sortOption, setSortOption] = useState('prioridad_alta');
  const [tareaActualizando, setTareaActualizando] = useState(null);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [documentosTarea, setDocumentosTarea] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');
  const [expandirFiltros, setExpandirFiltros] = useState(false);
  const [cargandoDocumentos, setCargandoDocumentos] = useState(false);
  const [dragOverTab, setDragOverTab] = useState(null);
  const [documentosMap, setDocumentosMap] = useState({});
  const abortControllerRef = useRef(null);
  const observerRef = useRef(null);

  const handleEliminarTarea = async (id) => {
    if (!window.confirm("¿Eliminar esta tarea completada?")) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/eliminar/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setTodasLasTareas(prev => prev.filter(t => t.id !== id));
      toast.success("Tarea eliminada");
    } catch (err) {
      console.error("Error al eliminar tarea", err);
      toast.error("No se pudo eliminar la tarea");
    }
  };

  // ========== OBTENER TAREAS ==========
  const cargarIndicadoresArchivos = async (tareas) => {
    const token = localStorage.getItem('token');
    const limite = 5;
    const resultados = {};
    const consultarTarea = async (tarea) => {
      try {
        const res = await axios.get(`${API_ARCHIVOS}/por-tarea?tareaId=${tarea.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.length > 0) resultados[tarea.id] = true;
      } catch (err) { /* silencioso */ }
    };
    for (let i = 0; i < tareas.length; i += limite) {
      const lote = tareas.slice(i, i + limite);
      await Promise.allSettled(lote.map(consultarTarea));
    }
    setDocumentosMap(prev => ({ ...prev, ...resultados }));
  };

  const obtenerTareas = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;

    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No hay sesión activa. Inicia sesión nuevamente.');
      setCargando(false);
      return;
    }

    try {
      // Usamos listar-todas para obtener todas las tareas y luego filtramos por responsable
      const res = await axios.get(`${API_URL}/listar-todas`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal
      });
      
      
      res.data.forEach(t => {
        
      });
      
      const misTareas = res.data.filter(tarea => 
        tarea.responsables?.some(responsable => {
          const emailResponsable = typeof responsable === 'string' ? responsable : responsable.email;
          const coincide = emailResponsable?.toLowerCase().trim() === usuario.email.toLowerCase().trim();
          if (tarea.titulo === "PRUEBA 2") {
            console.log(`🔎 Comparando PRUEBA 2: responsable=${emailResponsable}, usuario=${usuario.email}, coincide=${coincide}`);
          }
          return coincide;
        })
      );
      
      setTodasLasTareas(misTareas);
    } catch (err) {
      if (err.name !== 'CanceledError') {
        console.error("Error cargando tareas", err);
        setError(err.response?.status === 401 
          ? 'Sesión expirada. Vuelve a iniciar sesión.' 
          : 'No se pudieron cargar tus tareas. Intenta más tarde.');
      }
    } finally {
      setCargando(false);
    }
  }, [usuario.email]);

  useEffect(() => {
    obtenerTareas();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, [obtenerTareas]);

  // ========== CARGAR DOCUMENTOS AL SELECCIONAR UNA TAREA ==========
  useEffect(() => {
    if (tareaSeleccionada?.id) {
      setCargandoDocumentos(true);
      const token = localStorage.getItem('token');
      axios.get(`${API_ARCHIVOS}/por-tarea?tareaId=${tareaSeleccionada.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setDocumentosTarea(res.data))
      .catch(() => setDocumentosTarea([]))
      .finally(() => setCargandoDocumentos(false));
    } else {
      setDocumentosTarea([]);
    }
  }, [tareaSeleccionada]);

  // ========== FILTRADO Y BÚSQUEDA ==========
  const tareasFiltradas = useMemo(() => {
    let tareas = todasLasTareas.filter(tarea => {
      const estadoCanonico = normalizarEstado(tarea.estado);
      return estadoCanonico === tabActual;
    });

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      tareas = tareas.filter(t => 
        (t.titulo || '').toLowerCase().includes(q) ||
        (t.descripcion || '').toLowerCase().includes(q)
      );
    }

    if (filtroPrioridad !== 'TODAS') {
      tareas = tareas.filter(t => (t.prioridad || 'NORMAL').toUpperCase() === filtroPrioridad);
    }

    return tareas;
  }, [tabActual, todasLasTareas, busqueda, filtroPrioridad]);

  // ========== ORDENAMIENTO ==========
  const getPriorityOrder = (prioridad) => {
    const key = prioridad?.toUpperCase() || 'DEFAULT';
    if (key === 'ALTA') return 3;
    if (key === 'MEDIA' || key === 'NORMAL') return 2;
    if (key === 'BAJA' || key === 'SPORTE') return 1;
    return 0;
  };

  const getFechaValida = (fecha) => {
    const d = fecha ? new Date(fecha) : null;
    return d instanceof Date && !isNaN(d) ? d : null;
  };

  const tareasOrdenadas = useMemo(() => {
    const tareas = [...tareasFiltradas];
    
    switch (sortOption) {
      case 'fecha_cercana':
        return tareas.sort((a, b) => {
          const fechaA = getFechaValida(a.fechaEntrega);
          const fechaB = getFechaValida(b.fechaEntrega);
          if (!fechaA && !fechaB) return 0;
          if (!fechaA) return 1;
          if (!fechaB) return -1;
          return fechaA - fechaB;
        });
      case 'fecha_lejana':
        return tareas.sort((a, b) => {
          const fechaA = getFechaValida(a.fechaEntrega);
          const fechaB = getFechaValida(b.fechaEntrega);
          if (!fechaA && !fechaB) return 0;
          if (!fechaA) return 1;
          if (!fechaB) return -1;
          return fechaB - fechaA;
        });
      case 'titulo_asc':
        return tareas.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
      case 'titulo_desc':
        return tareas.sort((a, b) => (b.titulo || '').localeCompare(a.titulo || ''));
      case 'prioridad_alta':
        return tareas.sort((a, b) => getPriorityOrder(b.prioridad) - getPriorityOrder(a.prioridad));
      case 'prioridad_normal':
        return tareas.sort((a, b) => getPriorityOrder(b.prioridad) - getPriorityOrder(a.prioridad));
      case 'prioridad_baja':
        return tareas.sort((a, b) => getPriorityOrder(a.prioridad) - getPriorityOrder(b.prioridad));
      default:
        return tareas;
    }
  }, [tareasFiltradas, sortOption]);

  // ========== ESTADÍSTICAS ==========
  const estadisticas = useMemo(() => {
    const total = todasLasTareas.length;
    const nuevas = todasLasTareas.filter(t => normalizarEstado(t.estado) === 'NUEVAS').length;
    const proceso = todasLasTareas.filter(t => normalizarEstado(t.estado) === 'PROCESO').length;
    const completadas = todasLasTareas.filter(t => normalizarEstado(t.estado) === 'COMPLETADO').length;
    const urgentes = todasLasTareas.filter(t => (t.prioridad || '').toUpperCase() === 'ALTA' && normalizarEstado(t.estado) !== 'COMPLETADO').length;
    const vencidas = todasLasTareas.filter(t => {
      const dias = calcularDiasRestantes(t.fechaEntrega);
      return dias !== null && dias < 0 && normalizarEstado(t.estado) !== 'COMPLETADO';
    }).length;
    return { total, nuevas, proceso, completadas, urgentes, vencidas };
  }, [todasLasTareas]);

  // ========== ACTUALIZAR ESTADO DE TAREA ==========
  const actualizarEstado = async (id, nuevoEstado) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
      return;
    }

    const tareaAnterior = todasLasTareas.find(t => t.id === id);
    if (!tareaAnterior) return;

    setTareaActualizando(id);
    setTodasLasTareas(prev => 
      prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t)
    );

    try {
      await axios.patch(`${API_URL}/${id}/estado`, { estado: nuevoEstado }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const emojis = { 'EN PROCESO': '🚀', 'COMPLETADO': '🎉' };
      toast.success(`${emojis[nuevoEstado] || '✅'} Estado actualizado`, {
        icon: nuevoEstado === 'COMPLETADO' ? '🎉' : '🚀',
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } catch (err) {
      console.error('Error al mover tarea', err);
      setTodasLasTareas(prev => 
        prev.map(t => t.id === id ? tareaAnterior : t)
      );
      toast.error(
        err.response?.status === 401 
          ? 'Sesión expirada. Vuelve a iniciar sesión.' 
          : 'No se pudo mover la tarea. Intenta de nuevo.',
        { style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }
      );
    } finally {
      setTareaActualizando(null);
    }
  };

  // ========== DRAG & DROP PARA KANBAN ==========
  // NOTA: Ya no usamos Kanban, pero mantenemos las funciones de drag&drop por si se usaran en lista (no es necesario, pero no dañan)
  const handleDragStart = (e, tarea) => {
    e.dataTransfer.setData('tareaId', tarea.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, tabId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTab(tabId);
  };

  const handleDragLeave = () => {
    setDragOverTab(null);
  };

  const handleDrop = (e, nuevoTab) => {
    e.preventDefault();
    setDragOverTab(null);
    const tareaId = parseInt(e.dataTransfer.getData('tareaId'));
    if (!tareaId) return;

    const estadoMappingKanban = {
      'NUEVAS': 'EN PROCESO',
      'PROCESO': 'COMPLETADO',
      'COMPLETADO': null
    };

    const nuevoEstado = estadoMappingKanban[nuevoTab];
    if (nuevoEstado) {
      actualizarEstado(tareaId, nuevoEstado);
    }
  };

  // ========== FUNCIONES AUXILIARES PARA DOCUMENTOS ==========
  const descargarDocumento = (ruta) => {
    window.open(`${API_ARCHIVOS}/download?ruta=${encodeURIComponent(ruta)}`);
  };

  const verUbicacion = (ruta) => {
    window.dispatchEvent(new CustomEvent('navigateToFile', { detail: ruta }));
    setTareaSeleccionada(null);
  };

  // ========== ACCIONES RÁPIDAS ==========
  const moverTodasAProceso = async () => {
    const pendientes = todasLasTareas.filter(t => normalizarEstado(t.estado) === 'NUEVAS');
    if (pendientes.length === 0) {
      toast('No hay tareas pendientes para mover', { icon: 'ℹ️' });
      return;
    }
    for (const tarea of pendientes) {
      await actualizarEstado(tarea.id, 'EN PROCESO');
    }
  };

  // ========== INYECTAR ESTILOS ==========
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // ========== RENDER ==========
  if (cargando) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIconWrapper}>
          <FaExclamationCircle size={64} style={{ color: '#ef4444' }} />
        </div>
        <h2 style={styles.errorTitle}>¡Algo salió mal!</h2>
        <p style={styles.errorMessage}>{error}</p>
        <button onClick={() => { setCargando(true); obtenerTareas(); }} style={styles.retryButton}>
          <FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      
      {/* HEADER CON ESTADÍSTICAS */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.statusBadge}>
              <FaLayerGroup size={12} /> MENELEC WORKFLOW
            </div>
            <h1 style={styles.title}>
              Tus Tareas
              <span style={styles.titleAccent}> {usuario.nombre.split(' ')[0]}</span>
            </h1>
            <p style={styles.subtitle}>Gestión inteligente del proceso de tus tareas</p>
          </div>
          <div style={styles.headerActions}>
            {/* Botón de actualizar */}
            <button onClick={obtenerTareas} style={styles.refreshButton} title="Actualizar">
              <FaSyncAlt />
            </button>
            <button
              onClick={() => setVistaActiva ? setVistaActiva('eventos') : window.history.back()}
              style={styles.closeButton}
              title="Cerrar Mis Tareas"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <FaClipboardList style={{ color: '#6366f1', fontSize: '20px' }} />
            <span style={styles.statNumber}>{estadisticas.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #f87171' }}>
            <FaFire style={{ color: '#f87171', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#f87171' }}>{estadisticas.urgentes}</span>
            <span style={styles.statLabel}>Urgentes</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #f59e0b' }}>
            <FaClock style={{ color: '#f59e0b', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#f59e0b' }}>{estadisticas.proceso}</span>
            <span style={styles.statLabel}>En proceso</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #10b981' }}>
            <FaCheckCircle style={{ color: '#10b981', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#10b981' }}>{estadisticas.completadas}</span>
            <span style={styles.statLabel}>Completadas</span>
          </div>
          {estadisticas.vencidas > 0 && (
            <div style={{ ...styles.statCard, borderLeft: '3px solid #ef4444', animation: 'pulse 2s infinite' }}>
              <FaExclamationCircle style={{ color: '#ef4444', fontSize: '20px' }} />
              <span style={{ ...styles.statNumber, color: '#ef4444' }}>{estadisticas.vencidas}</span>
              <span style={styles.statLabel}>Vencidas</span>
            </div>
          )}
        </div>
      </header>

      {/* BARRA DE CONTROL */}
      <div style={styles.controlBar}>
        <div style={styles.controlLeft}>
          <div style={styles.searchWrapper}>
            <FaSearch style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={styles.searchInput}
            />
            {busqueda && (
              <FaTimes 
                style={{ ...styles.searchIcon, cursor: 'pointer', right: '8px' }} 
                onClick={() => setBusqueda('')}
              />
            )}
          </div>
          <button 
            onClick={() => setExpandirFiltros(!expandirFiltros)}
            style={styles.filterToggle}
          >
            <FaFilter /> Filtros {expandirFiltros ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
          </button>
        </div>
        <SortSelector sortOption={sortOption} onSortChange={setSortOption} />
      </div>

      {/* FILTROS EXPANDIBLES */}
      {expandirFiltros && (
        <div style={styles.filtrosExpandidos}>
          <span style={styles.filtroLabel}>Prioridad:</span>
          {['TODAS', 'ALTA', 'MEDIA', 'BAJA'].map(p => (
            <button
              key={p}
              onClick={() => setFiltroPrioridad(p)}
              style={{
                ...styles.filtroChip,
                background: filtroPrioridad === p ? (priorityConfig[p]?.bg || '#6366f120') : 'transparent',
                color: filtroPrioridad === p ? (priorityConfig[p]?.color || '#6366f1') : '#94a3b8',
                borderColor: filtroPrioridad === p ? (priorityConfig[p]?.color || '#6366f1') : '#334155'
              }}
            >
              {p === 'TODAS' ? 'Todas' : p}
            </button>
          ))}
          <button onClick={() => { setBusqueda(''); setFiltroPrioridad('TODAS'); }} style={styles.clearFilters}>
            Limpiar filtros
          </button>
        </div>
      )}

      {/* TABS */}
      <StatusTabs 
        tabActual={tabActual} 
        onTabChange={setTabActual}
        conteoNuevas={estadisticas.nuevas}
        conteoProceso={estadisticas.proceso}
        conteoCompletado={estadisticas.completadas}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        dragOverTab={dragOverTab}
      />

      {/* ACCIONES RÁPIDAS */}
      {tabActual === 'NUEVAS' && tareasOrdenadas.length > 0 && (
        <div style={styles.quickActions}>
          <button onClick={moverTodasAProceso} style={styles.quickActionBtn}>
            <FaArrowRight /> Iniciar todas las tareas
          </button>
        </div>
      )}

      {/* CONTENEDOR DE TAREAS - VISTA LISTA SIEMPRE */}
      <div style={styles.listContainer}>
        {tareasOrdenadas.length === 0 ? (
          <EmptyState tab={tabActual} busqueda={busqueda} />
        ) : (
          tareasOrdenadas.map((tarea, idx) => (
            <TaskCard
              key={tarea.id}
              tarea={tarea}
              tabActual={tabActual}
              onActualizarEstado={actualizarEstado}
              isLoading={tareaActualizando === tarea.id}
              index={idx}
              onClick={() => setTareaSeleccionada(tarea)}
              vistaModo="list"
              onDragStart={handleDragStart}
              onEliminarTarea={handleEliminarTarea}
            />
          ))
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {tareaSeleccionada && (
        <ModalDetalle
          tarea={tareaSeleccionada}
          onClose={() => setTareaSeleccionada(null)}
          documentos={documentosTarea}
          cargandoDocumentos={cargandoDocumentos}
          onDescargar={descargarDocumento}
          onVerUbicacion={verUbicacion}
          onActualizarEstado={actualizarEstado}
          tabActual={tabActual}
          tareaActualizando={tareaActualizando}
        />
      )}
    </div>
  );
};

MisTareas.propTypes = {
  usuario: PropTypes.shape({
    email: PropTypes.string.isRequired,
    nombre: PropTypes.string.isRequired
  }).isRequired,
  setVistaActiva: PropTypes.func,
};

// ==================== MODAL DETALLE MEJORADO ====================
const ModalDetalle = ({ tarea, onClose, documentos, cargandoDocumentos, onDescargar, onVerUbicacion, onActualizarEstado, tabActual, tareaActualizando }) => {
  const priority = tarea.prioridad?.toUpperCase() || 'DEFAULT';
  const priorityStyle = priorityConfig[priority] || priorityConfig.DEFAULT;
  const dias = calcularDiasRestantes(tarea.fechaEntrega);
  const estaVencida = dias !== null && dias < 0;
  const estaCerca = dias !== null && dias >= 0 && dias <= 3;

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <div style={modalStyles.headerLeft}>
            <span style={{ ...modalStyles.priorityBadge, background: priorityStyle.bg, color: priorityStyle.color }}>
              {priorityStyle.icon} {priorityStyle.label}
            </span>
            <h2 style={modalStyles.title}>{tarea.titulo}</h2>
          </div>
          <FaTimes style={modalStyles.closeBtn} onClick={onClose} />
        </div>

        <div style={modalStyles.body}>
          {/* DESCRIPCIÓN */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>📝 Descripción</h4>
            <p style={modalStyles.descripcion}>{tarea.descripcion || "Sin descripción detallada."}</p>
          </div>

          {/* METADATOS */}
          <div style={modalStyles.metaGrid}>
            <div style={modalStyles.metaItem}>
              <FaCalendarDay style={{ color: '#94a3b8' }} />
              <div>
                <span style={modalStyles.metaLabel}>Fecha de entrega</span>
                <span style={{
                  ...modalStyles.metaValue,
                  color: estaVencida ? '#ef4444' : estaCerca ? '#f59e0b' : '#e2e8f0'
                  
                }}>
                  {formatearFechaLarga(tarea.fechaEntrega)}
                  {dias !== null && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: estaVencida ? 'rgba(239,68,68,0.2)' : estaCerca ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                      color: estaVencida ? '#ef4444' : estaCerca ? '#f59e0b' : '#10b981'
                    }}>
                      {dias < 0 ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? '¡Hoy!' : `${dias}d restantes`}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div style={modalStyles.metaItem}>
              <FaLayerGroup style={{ color: '#94a3b8' }} />
              <div>
                <span style={modalStyles.metaLabel}>Estado</span>
                <span style={modalStyles.metaValue}>{tarea.estado}</span>
              </div>
            </div>
            <div style={modalStyles.metaItem}>
              <FaUser style={{ color: '#94a3b8' }} />
              <div>
                <span style={modalStyles.metaLabel}>Responsables</span>
                <span style={modalStyles.metaValue}>
                  {tarea.responsables?.map((r, i) => 
                    typeof r === 'string' ? r.split('@')[0] : r.nombre || r.email?.split('@')[0]
                  ).join(', ') || 'Sin asignar'}
                </span>
              </div>
            </div>
          </div>

          {/* DOCUMENTOS */}
          <div style={modalStyles.section}>
            <h4 style={modalStyles.sectionTitle}>
              <FaPaperclip style={{ color: '#818cf8' }} /> Documentos adjuntos
            </h4>
            {cargandoDocumentos ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#818cf8', fontSize: '24px' }} />
              </div>
            ) : documentos.length > 0 ? (
              <div style={modalStyles.documentosList}>
                {documentos.map(doc => (
                  <div key={doc.id} style={modalStyles.documentoItem}>
                    <FaPaperclip color="#818cf8" style={{ flexShrink: 0 }} />
                    <span style={modalStyles.documentoNombre}>{doc.nombre}</span>
                    <div style={modalStyles.documentoAcciones}>
                      <button onClick={() => onDescargar(doc.ruta)} title="Descargar" style={modalStyles.btnAccion}>
                        <FaDownload />
                      </button>
                      <button onClick={() => onVerUbicacion(doc.ruta)} title="Ver ubicación" style={modalStyles.btnAccion}>
                        <FaFolderOpen />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={modalStyles.emptyDocs}>Sin documentos adjuntos</p>
            )}
          </div>
        </div>

        {/* FOOTER CON ACCIONES */}
        <div style={modalStyles.footer}>
          {tabActual === 'NUEVAS' && (
            <button 
              onClick={() => onActualizarEstado(tarea.id, 'EN PROCESO')}
              disabled={tareaActualizando === tarea.id}
              style={modalStyles.actionBtn}
            >
              {tareaActualizando === tarea.id ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaArrowRight />}
              Iniciar tarea
            </button>
          )}
          {tabActual === 'PROCESO' && (
            <button 
              onClick={() => onActualizarEstado(tarea.id, 'COMPLETADO')}
              disabled={tareaActualizando === tarea.id}
              style={{ ...modalStyles.actionBtn, background: '#10b981' }}
            >
              {tareaActualizando === tarea.id ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaCheckCircle />}
              Marcar como completada
            </button>
          )}
          <button onClick={onClose} style={modalStyles.cancelBtn}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// ==================== SUBCOMPONENTES ====================
const StatusTabs = ({ tabActual, onTabChange, conteoNuevas, conteoProceso, conteoCompletado, onDrop, onDragOver, onDragLeave, dragOverTab }) => {
  const tabs = [
    { id: 'NUEVAS', label: 'Por hacer', icon: <FaRegQuestionCircle />, color: '#f87171', count: conteoNuevas },
    { id: 'PROCESO', label: 'En progreso', icon: <FaRegClock />, color: '#6366f1', count: conteoProceso },
    { id: 'COMPLETADO', label: 'Completadas', icon: <FaRegCheckCircle />, color: '#10b981', count: conteoCompletado }
  ];

  return (
    <nav style={styles.tabBar}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          onDragOver={(e) => onDragOver(e, tab.id)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, tab.id)}
          aria-pressed={tabActual === tab.id}
          style={{
            ...styles.tab,
            color: tabActual === tab.id ? '#fff' : '#94a3b8',
            background: tabActual === tab.id 
              ? `linear-gradient(135deg, ${tab.color}30, ${tab.color}10)` 
              : 'transparent',
            borderColor: tabActual === tab.id ? tab.color : 'transparent',
            boxShadow: dragOverTab === tab.id ? `0 0 30px ${tab.color}40, inset 0 0 20px ${tab.color}20` : 'none',
            transform: dragOverTab === tab.id ? 'scale(1.03)' : 'scale(1)'
          }}
        >
          <span style={{ color: tabActual === tab.id ? tab.color : '#64748b' }}>{tab.icon}</span>
          <span style={styles.tabLabel}>{tab.label}</span>
          {tab.count > 0 && (
            <span style={{ 
              ...styles.tabCount, 
              background: tabActual === tab.id ? tab.color : '#334155',
              color: '#fff'
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

StatusTabs.propTypes = {
  tabActual: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  conteoNuevas: PropTypes.number,
  conteoProceso: PropTypes.number,
  conteoCompletado: PropTypes.number,
  onDrop: PropTypes.func,
  onDragOver: PropTypes.func,
  onDragLeave: PropTypes.func,
  dragOverTab: PropTypes.string
};

const SortSelector = ({ sortOption, onSortChange }) => {
  const options = [
    { value: 'prioridad_alta', label: '⚠️ Urgente primero' },
    { value: 'fecha_cercana', label: '📅 Más cercano' },
    { value: 'fecha_lejana', label: '📅 Más lejano' },
    { value: 'titulo_asc', label: '🔤 A → Z' },
    { value: 'titulo_desc', label: '🔤 Z → A' }
  ];

  return (
    <div style={styles.sortContainer}>
      <select 
        value={sortOption} 
        onChange={(e) => onSortChange(e.target.value)}
        style={styles.sortSelect}
        aria-label="Ordenar tareas"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

SortSelector.propTypes = {
  sortOption: PropTypes.string.isRequired,
  onSortChange: PropTypes.func.isRequired
};

const TaskCard = ({ tarea, tabActual, onActualizarEstado, isLoading, index, onClick, vistaModo, onDragStart, onEliminarTarea }) => {
  const priority = tarea.prioridad?.toUpperCase() || 'DEFAULT';
  const priorityStyle = priorityConfig[priority] || priorityConfig.DEFAULT;
  const fechaFormateada = formatearFecha(tarea.fechaEntrega);
  const dias = calcularDiasRestantes(tarea.fechaEntrega);
  const estaVencida = dias !== null && dias < 0;
  const estaCerca = dias !== null && dias >= 0 && dias <= 3;

  const handleAction = (e) => {
    e.stopPropagation();
    if (tabActual === 'NUEVAS') onActualizarEstado(tarea.id, 'EN PROCESO');
  };

  const handleCompletar = (e) => {
    e.stopPropagation();
    onActualizarEstado(tarea.id, 'COMPLETADO');
  };

  // Siempre es lista
  return (
    <div 
      onClick={onClick}
      draggable
      onDragStart={(e) => onDragStart(e, tarea)}
      className="task-card"
      style={{
        ...styles.cardLista,
        animation: `fadeInUp ${0.3 + index * 0.06}s ease-out forwards`,
        borderLeft: `4px solid ${priorityStyle.color}`,
        background: `linear-gradient(90deg, ${priorityStyle.color}08, #1e293b)`
      }}
    >
      <div style={styles.cardListaContent}>
        <h3 style={styles.taskTitle}>
          <span style={{ 
            ...styles.listPriorityDot, 
            background: priorityStyle.color,
            boxShadow: priorityStyle.glow
          }} />
          {tarea.titulo}
        </h3>
        <p style={styles.taskDesc} title={tarea.descripcion}>
          {tarea.descripcion || "Sin descripción de actividad."}
        </p>
      </div>

      <div style={styles.listMeta}>
        <span style={{ ...styles.listDateTag, color: estaVencida ? '#ef4444' : '#94a3b8' }}>
          <FaCalendarDay size={12} /> {fechaFormateada}
        </span>
        <span style={{ 
          ...styles.urgentBadge, 
          background: priorityStyle.bg, 
          color: priorityStyle.color,
          fontSize: '10px'
        }}>
          {priorityStyle.label}
        </span>
      </div>

      <div style={styles.responsablesBox}>
        {tarea.responsables?.slice(0, 3).map((resp, idx) => {
          const nombre = typeof resp === 'string' 
            ? resp.split('@')[0].toUpperCase() 
            : (resp.nombre || resp.email?.split('@')[0] || 'Usuario').toUpperCase();
          const inicial = nombre.charAt(0);
          return (
            <span key={idx} style={styles.miniUser} title={nombre}>
              <span style={styles.avatarCircle}>{inicial}</span>
              {nombre}
            </span>
          );
        })}
        {tarea.responsables?.length > 3 && (
          <span style={styles.miniUser}>+{tarea.responsables.length - 3}</span>
        )}
      </div>

      <div style={styles.actions}>
        {tabActual === 'NUEVAS' && (
          <button 
            onClick={handleAction} 
            disabled={isLoading}
            className="btn-action"
            style={{ ...styles.btn, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            aria-label="Iniciar tarea"
          >
            {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaArrowRight size={14} />}
            {isLoading ? 'Iniciando...' : 'Iniciar'}
          </button>
        )}
        {tabActual === 'PROCESO' && (
          <button 
            onClick={handleCompletar} 
            disabled={isLoading}
            className="btn-action"
            style={{ ...styles.btn, background: 'linear-gradient(135deg, #10b981, #059669)' }}
            aria-label="Completar tarea"
          >
            {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaCheckCircle size={14} />}
            {isLoading ? 'Completando...' : 'Completar'}
          </button>
        )}
        {tabActual === 'COMPLETADO' && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onEliminarTarea(tarea.id);
            }}
            style={{ ...styles.btn, background: '#ef4444' }}
            aria-label="Eliminar tarea"
          >
            <FaTrashAlt size={14} /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
};

TaskCard.propTypes = {
  tarea: PropTypes.object.isRequired,
  tabActual: PropTypes.string.isRequired,
  onActualizarEstado: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClick: PropTypes.func,
  index: PropTypes.number,
  vistaModo: PropTypes.string,
  onEliminarTarea: PropTypes.func.isRequired,
  onDragStart: PropTypes.func
};

const EmptyState = ({ tab, busqueda }) => {
  const config = {
    NUEVAS: { icon: <FaRegQuestionCircle size={56} />, title: 'Sin tareas pendientes', desc: 'No tienes tareas asignadas en este momento. ¡Disfruta del descanso!', color: '#f87171' },
    PROCESO: { icon: <FaRegClock size={56} />, title: 'Sin tareas en progreso', desc: 'No estás trabajando en ninguna tarea. Activa alguna pendiente.', color: '#6366f1' },
    COMPLETADO: { icon: <FaRegCheckCircle size={56} />, title: 'Sin tareas completadas', desc: 'Aún no has finalizado ninguna tarea. ¡Sigue adelante!', color: '#10b981' }
  };
  const c = config[tab] || config.NUEVAS;

  return (
    <div style={styles.noData}>
      <div style={{ ...styles.noDataIcon, color: c.color, opacity: 0.3 }}>{c.icon}</div>
      <p style={styles.noDataTitle}>
        {busqueda ? 'Sin resultados' : c.title}
      </p>
      <p style={styles.noDataDesc}>
        {busqueda ? `No se encontraron tareas que coincidan con "${busqueda}"` : c.desc}
      </p>
    </div>
  );
};

EmptyState.propTypes = {
  tab: PropTypes.string.isRequired,
  busqueda: PropTypes.string
};

const SkeletonLoader = () => (
  <div style={styles.skeletonContainer}>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} style={{ ...styles.skeletonCard, height: '100px', width: '100%' }}>
        <div style={{ ...styles.skeletonLine, width: '60%', height: '20px' }} />
        <div style={{ ...styles.skeletonLine, width: '80%', marginTop: '12px' }} />
        <div style={{ ...styles.skeletonLine, width: '40%', marginTop: '12px' }} />
      </div>
    ))}
  </div>
);

// ==================== ESTILOS (se mantienen igual, solo se conservan los usados en lista) ====================
const styles = {
  container: { 
    padding: '24px', 
    maxWidth: '1400px', 
    margin: '0 auto',
    minHeight: '100vh'
  },
  header: { marginBottom: '24px' },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  refreshButton: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center'
  },
  closeButton: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#f8fafc',
    padding: '10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: '#818cf8',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    marginBottom: '8px',
    letterSpacing: '1.5px',
    textTransform: 'uppercase'
  },
  title: { 
    fontSize: '2.4rem', 
    fontWeight: '900', 
    margin: 0, 
    color: '#f1f5f9', 
    letterSpacing: '-1px',
    lineHeight: '1.1'
  },
  titleAccent: {
    background: 'linear-gradient(135deg, #818cf8, #6366f1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: { color: '#64748b', fontSize: '1rem', marginTop: '4px', marginBottom: 0 },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    flexWrap: 'wrap'
  },
  statCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    border: '1px solid #1e293b',
    minWidth: '90px',
    flex: '1 1 auto'
  },
  statNumber: { fontSize: '1.8rem', fontWeight: '900', color: '#f1f5f9' },
  statLabel: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' },
  controlBar: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  controlLeft: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flex: '1 1 auto',
    maxWidth: '500px'
  },
  searchWrapper: {
    position: 'relative',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748b',
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '16px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s',
    boxSizing: 'border-box'
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  filtrosExpandidos: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: '#1e293b',
    borderRadius: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    border: '1px solid #334155'
  },
  filtroLabel: { color: '#94a3b8', fontSize: '13px', fontWeight: '600' },
  filtroChip: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #334155',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    transition: 'all 0.2s'
  },
  clearFilters: {
    marginLeft: 'auto',
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  },
  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155',
    overflow: 'hidden'
  },
  sortSelect: {
    background: '#0f172a',
    border: 'none',
    color: '#f1f5f9',
    fontSize: '13px',
    fontWeight: '600',
    padding: '10px 14px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '180px'
  },
  tabBar: { 
    display: 'flex', 
    gap: '8px', 
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tab: {
    background: '#1e293b',
    border: '2px solid transparent',
    padding: '14px 24px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRadius: '18px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative'
  },
  tabLabel: { display: 'inline' },
  tabCount: {
    fontSize: '13px',
    fontWeight: '800',
    minWidth: '26px',
    height: '26px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px'
  },
  quickActions: {
    marginBottom: '16px',
    display: 'flex',
    gap: '8px'
  },
  quickActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid #6366f140',
    borderRadius: '12px',
    color: '#818cf8',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'all 0.2s'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  cardLista: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0,
    cursor: 'pointer',
    flexWrap: 'wrap'
  },
  cardListaContent: {
    flex: 1,
    minWidth: '200px'
  },
  listPriorityDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px'
  },
  listMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0
  },
  listDateTag: {
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontWeight: '600'
  },
  urgentBadge: { 
    padding: '5px 12px', 
    borderRadius: '10px', 
    fontSize: '11px', 
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  taskTitle: { 
    fontSize: '1.2rem', 
    fontWeight: '800', 
    margin: '0 0 10px 0', 
    color: '#f1f5f9', 
    lineHeight: '1.3',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  taskDesc: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: '0 0 18px 0',
    lineHeight: '1.5',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  responsablesBox: { 
    display: 'flex', 
    gap: '6px', 
    flexWrap: 'wrap', 
    marginBottom: '18px',
    alignItems: 'center'
  },
  miniUser: {
    fontSize: '11px',
    color: '#e2e8f0',
    background: '#334155',
    padding: '5px 10px',
    borderRadius: '10px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'default'
  },
  avatarCircle: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '800',
    color: '#fff'
  },
  actions: { marginTop: 'auto' },
  btn: {
    width: '100%',
    padding: '13px',
    borderRadius: '14px',
    color: '#fff',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  noData: {
    gridColumn: '1/-1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#475569',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '24px',
    border: '2px dashed #1e293b'
  },
  noDataIcon: { marginBottom: '16px' },
  noDataTitle: { fontSize: '20px', fontWeight: '700', color: '#94a3b8', margin: '0 0 8px 0' },
  noDataDesc: { fontSize: '14px', color: '#64748b', margin: 0 },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    maxWidth: '500px',
    margin: '0 auto',
    color: '#f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  errorIconWrapper: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorTitle: { fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#f1f5f9' },
  errorMessage: { color: '#94a3b8', margin: 0, fontSize: '0.95rem' },
  retryButton: {
    marginTop: '8px',
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '700',
    fontSize: '15px',
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '24px'
  },
  skeletonCard: {
    background: '#1e293b',
    borderRadius: '16px',
    padding: '18px 20px',
    animation: 'skeletonPulse 1.5s infinite'
  },
  skeletonLine: {
    background: '#334155',
    borderRadius: '8px',
    height: '16px',
    marginBottom: '8px'
  }
};

// ==================== ESTILOS MODAL (se mantienen) ====================
const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: '#1e293b', borderRadius: '24px', width: '100%', maxWidth: '650px',
    border: '1px solid #334155', overflow: 'hidden', maxHeight: '90vh', 
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '24px', background: '#0f172a', gap: '16px'
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '800',
    width: 'fit-content'
  },
  title: { color: '#fff', fontSize: '1.4rem', fontWeight: '800', margin: 0 },
  closeBtn: { cursor: 'pointer', color: '#94a3b8', fontSize: '20px', padding: '4px', flexShrink: 0 },
  body: { padding: '24px', overflowY: 'auto', flex: 1 },
  section: { marginBottom: '24px' },
  sectionTitle: { 
    color: '#e2e8f0', 
    fontSize: '14px', 
    fontWeight: '700', 
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  descripcion: { color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  metaItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '14px',
    background: '#0f172a',
    borderRadius: '14px'
  },
  metaLabel: { color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '4px' },
  metaValue: { color: '#e2e8f0', fontSize: '14px', fontWeight: '600', display: 'block' },
  documentosList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  documentoItem: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', background: '#0f172a', borderRadius: '12px',
    transition: 'all 0.2s'
  },
  documentoNombre: { color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  documentoAcciones: { display: 'flex', gap: '6px', flexShrink: 0 },
  btnAccion: {
    background: 'rgba(99, 102, 241, 0.15)', border: 'none', borderRadius: '10px',
    width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#818cf8', transition: 'all 0.2s', fontSize: '14px'
  },
  emptyDocs: { color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px' },
  footer: {
    display: 'flex',
    gap: '10px',
    padding: '20px 24px',
    background: '#0f172a',
    borderTop: '1px solid #1e293b',
    justifyContent: 'flex-end'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 22px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  cancelBtn: {
    padding: '12px 22px',
    background: 'transparent',
    border: '1px solid #475569',
    borderRadius: '14px',
    color: '#94a3b8',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

// ==================== ESTILOS GLOBALES ====================
const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  }
  .task-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    border-color: #6366f1;
  }
  .btn-action:hover {
    transform: scale(1.02);
    filter: brightness(1.1);
  }
  button:active {
    transform: scale(0.96);
  }
  select option {
    background: #1e293b;
    color: #f1f5f9;
    padding: 8px;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  input:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
  }
`;

export default MisTareas;