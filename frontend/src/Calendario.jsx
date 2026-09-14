import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  FaCalendarAlt, FaChevronLeft, FaChevronRight,
  FaClock, FaTimes, FaTrashAlt, FaPlusCircle,
  FaRegCalendarCheck, FaExclamationTriangle, FaFilter, FaEdit, FaGoogle,
  FaTimesCircle, FaCheckCircle, FaArrowRight, FaLayerGroup, FaChevronDown, FaChevronUp,
  FaPaperclip, FaUser, FaDownload, FaSpinner, FaClipboardList
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMediaQuery } from 'react-responsive'; // o tu hook casero

const API_URL = `${window.location.protocol}//${window.location.hostname}:8080/api/tareas`;
const API_ARCHIVOS = `${window.location.protocol}//${window.location.hostname}:8080/api/archivos`;
const CALENDAR_PUBLIC_LINK = "https://calendar.google.com/calendar/u/0/r?cid=b96fb5fe5e8a03ab0818502463c971f33b1dfef88f3d69e4b7d800bc87036962@group.calendar.google.com";

// Paleta de colores actualizada
const colors = {
  bgPrimary: '#0a0f2a',
  bgCard: 'rgba(30, 41, 59, 0.65)',
  bgCardHover: 'rgba(51, 65, 85, 0.5)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  accentPurple: '#c084fc',
  accentBlue: '#818cf8',
  accentIndigo: '#6366f1',
  priority: {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
  },
  glassBorder: 'rgba(99, 102, 241, 0.2)',
};

// Mapeo de estados
const estadoMapping = {
  'NUEVAS': ['', 'NULL', 'PENDIENTE', 'NUEVA', 'ASIGNADA'],
  'PROCESO': ['EN PROCESO', 'PROCESO', 'EN_PROCESO'],
  'COMPLETADO': ['COMPLETADO', 'FINALIZADO']
};

const normalizarEstado = (estadoRaw) => {
  const upperEstado = (estadoRaw || "").toString().toUpperCase().trim();
  for (const [canonico, variantes] of Object.entries(estadoMapping)) {
    if (variantes.includes(upperEstado)) return canonico;
  }
  return 'NUEVAS';
};

const estadoConfig = {
  'NUEVAS': { label: 'Por hacer', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  'PROCESO': { label: 'En proceso', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  'COMPLETADO': { label: 'Completada', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
};

const priorityConfig = {
  ALTA: { color: colors.priority.high, label: 'Alta' },
  MEDIA: { color: colors.priority.medium, label: 'Media' },
  BAJA: { color: colors.priority.low, label: 'Baja' }
};

const getPriorityInfo = (prioridad) => {
  const key = prioridad?.toUpperCase() || 'BAJA';
  return priorityConfig[key] || priorityConfig.BAJA;
};

// Badges
const PriorityBadge = ({ prioridad, size = 'small' }) => {
  const info = getPriorityInfo(prioridad);
  const fontSize = size === 'small' ? '10px' : '12px';
  const padding = size === 'small' ? '2px 8px' : '4px 12px';
  return (
    <span style={{
      background: info.color,
      padding,
      borderRadius: '20px',
      fontSize,
      fontWeight: 700,
      color: '#fff',
      display: 'inline-block',
      lineHeight: 1.4,
      boxShadow: `0 0 10px ${info.color}40`,
    }}>
      {info.label}
    </span>
  );
};

const EstadoBadge = ({ estado, size = 'small' }) => {
  const estadoNormalizado = normalizarEstado(estado);
  const config = estadoConfig[estadoNormalizado] || estadoConfig['NUEVAS'];
  const fontSize = size === 'small' ? '10px' : '12px';
  const padding = size === 'small' ? '2px 8px' : '4px 12px';
  return (
    <span style={{
      background: config.bg,
      color: config.color,
      padding,
      borderRadius: '20px',
      fontSize,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      lineHeight: 1.4,
      border: `1px solid ${config.color}30`,
    }}>
      {config.label}
    </span>
  );
};

const Calendario = ({ setVistaActiva }) => {
  const isMobile = useMediaQuery({ maxWidth: 768 }); // Unificado con App
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [vistaCalendario, setVistaCalendario] = useState('mes');
  const [tareaActualizando, setTareaActualizando] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [documentosTareaSeleccionada, setDocumentosTareaSeleccionada] = useState([]);
  const [cargandoDocumentosSeleccionada, setCargandoDocumentosSeleccionada] = useState(false);
  const [fechaDiaView, setFechaDiaView] = useState(new Date());
  const [emailToNombre, setEmailToNombre] = useState({});
  const [documentosMap, setDocumentosMap] = useState({});
  const [tareasDelDiaSeleccionadas, setTareasDelDiaSeleccionadas] = useState([]);
  const [modalDiaAbierto, setModalDiaAbierto] = useState(false);
  const [dayNumSeleccionado, setDayNumSeleccionado] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [tareaEditando, setTareaEditando] = useState(null);

  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:8080/api/usuarios/listar`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const mapa = {};
        res.data.forEach(user => {
          if (user.email && user.nombre) {
            mapa[user.email] = user.nombre;
          }
        });
        setEmailToNombre(mapa);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    fetchUsers();
  }, []);

  const getNombreResponsable = (tarea) => {
    if (!tarea) return 'Sin asignar';
    if (Array.isArray(tarea.responsables) && tarea.responsables.length > 0) {
      const nombres = tarea.responsables.map(item => {
        const email = typeof item === 'string' ? item : item.email;
        if (email && emailToNombre[email]) return emailToNombre[email];
        if (email) return email.split('@')[0];
        return item;
      });
      return nombres.join(', ');
    }
    return 'Sin asignar';
  };

  useEffect(() => {
    cargarTareas();
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowLeft': handleNavegacion(-1); break;
        case 'ArrowRight': handleNavegacion(1); break;
        case 't': case 'T': goToToday(); break;
        case 'm': case 'M': setVistaCalendario('mes'); break;
        case 's': case 'S': setVistaCalendario('semana'); break;
        case 'd': case 'D': setVistaCalendario('dia'); break;
        case 'a': case 'A': setVistaCalendario('agenda'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (vistaCalendario === 'semana') {
      setWeekStart(startOfWeek(fechaCalendario, { weekStartsOn: 1 }));
    }
  }, [vistaCalendario, fechaCalendario]);

  const cambiarSemana = (incremento) => {
    const newStart = addDays(weekStart, incremento * 7);
    setWeekStart(newStart);
    setFechaCalendario(newStart);
  };

  const tareasFiltradas = useMemo(() => {
    return tareas.filter(t => {
      if (filtroPrioridad && t.prioridad?.toUpperCase() !== filtroPrioridad) return false;
      return true;
    });
  }, [tareas, filtroPrioridad]);

  // ========== MEMO PARA LAS TRES SECCIONES ==========
  const { tareasHoy, proximasTareas, tareasCompletadasPasadas } = useMemo(() => {
    const hoy = new Date();
    const hoyStr = format(hoy, 'yyyy-MM-dd');
    const activas = tareasFiltradas;

    const extraerFecha = (fechaStr) => {
      if (!fechaStr) return null;
      return fechaStr.split('T')[0];
    };

    const tareasDeHoy = activas.filter(t => {
      const fechaSolo = extraerFecha(t.fechaEntrega);
      return fechaSolo === hoyStr;
    });

    const tareasFuturas = activas.filter(t => {
      const fechaSolo = extraerFecha(t.fechaEntrega);
      const estado = (t.estado || "").toUpperCase().trim();
      return fechaSolo && fechaSolo > hoyStr && estado !== "COMPLETADO" && estado !== "FINALIZADO";
    }).sort((a, b) => {
      return (a.fechaEntrega || '').localeCompare(b.fechaEntrega || '');
    }).slice(0, 8);

    const tareasCompletadasOVencidas = activas.filter(t => {
      const fechaSolo = extraerFecha(t.fechaEntrega);
      const estado = (t.estado || "").toUpperCase().trim();
      const esCompletada = estado === "COMPLETADO" || estado === "FINALIZADO";
      const esVencida = fechaSolo && fechaSolo < hoyStr && !esCompletada;
      return esCompletada || esVencida;
    }).sort((a, b) => {
      return (b.fechaEntrega || '').localeCompare(a.fechaEntrega || '');
    }).slice(0, 10);

    return {
      tareasHoy: tareasDeHoy,
      proximasTareas: tareasFuturas,
      tareasCompletadasPasadas: tareasCompletadasOVencidas
    };
  }, [tareasFiltradas]);

  // ========== FUNCIONES ==========
  const cargarTareas = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_URL}/listar-todas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTareas(res.data);
      cargarDocumentosMap(res.data);
    } catch (err) {
      console.error("Error cargando agenda:", err);
      toast.error("Error al cargar las tareas");
    } finally {
      setLoading(false);
    }
  };

  const cargarDocumentosMap = async (tareasList) => {
    const token = localStorage.getItem('token');
    const nuevosMap = {};
    await Promise.allSettled(tareasList.map(async (tarea) => {
      if (!tarea?.id) return;
      try {
        const res = await axios.get(`${API_ARCHIVOS}/por-tarea?tareaId=${tarea.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        nuevosMap[tarea.id] = Array.isArray(res.data) && res.data.length > 0;
      } catch (err) {
        nuevosMap[tarea.id] = false;
      }
    }));
    setDocumentosMap(nuevosMap);
  };

  const cargarDocumentosDeTarea = async (tareaId) => {
    setCargandoDocumentosSeleccionada(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_ARCHIVOS}/por-tarea?tareaId=${tareaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocumentosTareaSeleccionada(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error cargando documentos de tarea:', err);
      setDocumentosTareaSeleccionada([]);
    } finally {
      setCargandoDocumentosSeleccionada(false);
    }
  };

  const actualizarEstadoTarea = async (id, nuevoEstado) => {
    if (!id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
      return;
    }

    const tareaAnterior = tareas.find(t => t.id === id);
    if (!tareaAnterior) return;

    setTareaActualizando(id);
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
    if (tareaSeleccionada?.id === id) {
      setTareaSeleccionada(prev => prev ? { ...prev, estado: nuevoEstado } : prev);
    }

    try {
      await axios.patch(`${API_URL}/${id}/estado`, { estado: nuevoEstado }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const emoji = nuevoEstado === 'COMPLETADO' ? '🎉' : '🚀';
      toast.success(`${emoji} Estado actualizado`, {
        icon: emoji,
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } catch (err) {
      console.error('Error actualizando estado:', err);
      setTareas(prev => prev.map(t => t.id === id ? tareaAnterior : t));
      if (tareaSeleccionada?.id === id) setTareaSeleccionada(tareaAnterior);
      toast.error('No se pudo actualizar el estado. Intenta de nuevo.', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } finally {
      setTareaActualizando(null);
    }
  };

  const confirmarEliminar = (tarea) => {
    setTareaSeleccionada(tarea);
    setShowConfirmDelete(true);
  };

  useEffect(() => {
    if (tareaSeleccionada && modalAbierto) {
      cargarDocumentosDeTarea(tareaSeleccionada.id);
    } else {
      setDocumentosTareaSeleccionada([]);
    }
  }, [tareaSeleccionada, modalAbierto]);

  const descargarDocumento = (ruta) => {
    if (!ruta) return;
    window.open(`${API_ARCHIVOS}/download?ruta=${encodeURIComponent(ruta)}`, '_blank');
  };

  const eliminarTarea = async () => {
    const id = tareaSeleccionada.id;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/eliminar/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      setModalAbierto(false);
      setShowConfirmDelete(false);
      cargarTareas();
      toast.success("✅ Tarea eliminada correctamente");
    } catch (err) {
      console.error("Error al eliminar:", err.response || err);
      toast.error("Error al eliminar la tarea");
    }
  };

// Abrir modal de edición
const handleEditTarea = (tarea) => {
  setTareaEditando(tarea);
  setEditModalOpen(true);
};

// Actualizar tarea
const handleUpdateTarea = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');
  try {
    const payload = {
      titulo: tareaEditando.titulo,
      descripcion: tareaEditando.descripcion,
      fechaEntrega: tareaEditando.fechaEntrega,
      prioridad: tareaEditando.prioridad,
      estado: tareaEditando.estado,
      responsables: tareaEditando.responsables || [],
    };
    await axios.put(`${API_URL}/actualizar/${tareaEditando.id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success("✅ Tarea actualizada correctamente");
    setEditModalOpen(false);
    cargarTareas(); // Recargar lista completa
  } catch (err) {
    console.error("Error al actualizar:", err);
    toast.error("Error al actualizar la tarea");
  }
};

  const handleNavegacion = (incremento) => {
    if (vistaCalendario === 'mes') {
      const nuevaFecha = new Date(fechaCalendario);
      nuevaFecha.setMonth(nuevaFecha.getMonth() + incremento);
      setFechaCalendario(nuevaFecha);
    } else if (vistaCalendario === 'semana') {
      cambiarSemana(incremento);
    } else if (vistaCalendario === 'dia') {
      const newDate = new Date(fechaDiaView);
      newDate.setDate(newDate.getDate() + incremento);
      setFechaDiaView(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setFechaCalendario(today);
    setFechaDiaView(today);
    if (vistaCalendario === 'semana') {
      setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    }
    toast("Has vuelto al día de hoy", { icon: '🗓️' });
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const fecha = parseISO(fechaStr);
      if (isNaN(fecha.getTime())) return 'Sin fecha';
      return format(fecha, 'dd/MM/yyyy', { locale: es });
    } catch {
      return 'Sin fecha';
    }
  };

  const formatearFechaConHora = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const fecha = parseISO(fechaStr);
      if (isNaN(fecha.getTime())) return 'Sin fecha';
      return format(fecha, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return 'Sin fecha';
    }
  };

  // VISTA MES
  const year = fechaCalendario.getFullYear();
  const month = fechaCalendario.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const tareasDelDiaView = useMemo(() => {
    return tareasFiltradas.filter(t => {
      const fechaTarea = t.fechaEntrega;
      return fechaTarea && isSameDay(parseISO(fechaTarea), fechaDiaView);
    });
  }, [tareasFiltradas, fechaDiaView]);

  if (loading) {
    return (
      <div style={{ ...styles.container, padding: isMobile ? '16px' : styles.container.padding }}>
        <div style={styles.header}>
          <h1 style={styles.mainTitle}><FaRegCalendarCheck /> Agenda Estratégica</h1>
        </div>
        <div style={styles.skeletonGrid}>
          {Array(6).fill().map((_, i) => <div key={i} style={styles.skeletonCard} />)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...styles.container, padding: isMobile ? '16px' : styles.container.padding }}>
      <Toaster position="bottom-right" toastOptions={{
        duration: 3000,
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
      }} />

      <div style={styles.header}>
        <div>
          <div style={styles.statusBadge}>
            <FaLayerGroup size={12} /> AGENDA
          </div>
          <h1 style={styles.mainTitle}>
            <FaRegCalendarCheck style={{ color: colors.accentBlue }} /> Agenda Estratégica
          </h1>
          <p style={styles.subtitle}>Seguimiento de las tareas y entregas clave</p>
        </div>
        <div style={styles.headerActions}> 
          <button type="button" onClick={() => setVistaActiva?.('tareas')} style={styles.createTaskButton}>
            <FaPlusCircle size={14} /> Crear tarea
          </button>
          <button type="button" onClick={() => setVistaActiva?.('misTareas')} style={styles.misTareasButton}>
            <FaClipboardList size={14} /> Mis tareas
          </button>
        </div>
      </div>
      <div style={styles.filtersBar}>
        <FaFilter style={{ color: colors.textSecondary }} />
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} style={styles.filterSelect}>
          <option value="">Todas las prioridades</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>
        <button style={styles.clearFiltersBtn} onClick={() => { setFiltroPrioridad(''); }}>
          Limpiar
        </button>
      </div>

      <div style={{ ...styles.mainGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px' }}>
        {/* Columna del calendario */}
        <div style={styles.calendarColumn}>
          <div style={styles.calendarHeader}>
            <div>
              <h2 style={styles.hoyTexto}>Hoy</h2>
              <div style={styles.monthNavigator}>
                <button onClick={() => handleNavegacion(-1)} style={styles.navButton}><FaChevronLeft /></button>
                <span style={styles.monthYear}>
                  {vistaCalendario === 'mes' && format(fechaCalendario, 'MMMM yyyy', { locale: es }).toUpperCase()}
                  {vistaCalendario === 'semana' && `${format(weekDays[0], 'd MMM', { locale: es })} - ${format(weekDays[6], 'd MMM yyyy', { locale: es })}`}
                  {vistaCalendario === 'dia' && format(fechaDiaView, "EEEE d 'de' MMMM yyyy", { locale: es }).toUpperCase()}
                  {vistaCalendario === 'agenda' && "TODAS LAS TAREAS"}
                </span>
                <button onClick={() => handleNavegacion(1)} style={styles.navButton}><FaChevronRight /></button>
                <button onClick={goToToday} style={styles.todayButton}>Hoy</button>
              </div>
            </div>
            <div style={styles.viewTabs}>
              <button style={{ ...styles.tabButton, ...(vistaCalendario === 'mes' && styles.tabActive) }} onClick={() => setVistaCalendario('mes')}>Mes</button>
              <button style={{ ...styles.tabButton, ...(vistaCalendario === 'semana' && styles.tabActive) }} onClick={() => setVistaCalendario('semana')}>Semana</button>
              <button style={{ ...styles.tabButton, ...(vistaCalendario === 'dia' && styles.tabActive) }} onClick={() => setVistaCalendario('dia')}>Día</button>
              <button style={{ ...styles.tabButton, ...(vistaCalendario === 'agenda' && styles.tabActive) }} onClick={() => setVistaCalendario('agenda')}>Agenda</button>
            </div>
          </div>
          <div style={styles.calendarCard}>
            {/* VISTA MES */}
            {vistaCalendario === 'mes' && (
              <div style={styles.monthGrid}>
                {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(dia => (
                  <div key={dia} style={styles.weekdayHeader}>{dia}</div>
                ))}
                {Array(offset).fill().map((_, i) => <div key={`empty-${i}`} style={styles.emptyCell} />)}
                {Array(daysInMonth).fill().map((_, i) => {
                  const dayNum = i + 1;
                  const fechaStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                  const tareasDelDia = tareasFiltradas.filter(t => (t.fechaEntrega || '').startsWith(fechaStr));
                  const totalTareas = tareasDelDia.length;
                  const esHoy = isSameDay(new Date(), new Date(year, month, dayNum));
                  
                  const prioridadOrden = { 'ALTA': 0, 'MEDIA': 1, 'BAJA': 2 };
                  const tareasOrdenadas = [...tareasDelDia].sort((a, b) => {
                    const ordenA = prioridadOrden[a.prioridad?.toUpperCase()] ?? 2;
                    const ordenB = prioridadOrden[b.prioridad?.toUpperCase()] ?? 2;
                    if (ordenA !== ordenB) return ordenA - ordenB;
                    return (a.fechaEntrega || '').localeCompare(b.fechaEntrega || '');
                  });
                  
                  const abrirModalDia = () => {
                    if (totalTareas === 0) return;
                    setTareasDelDiaSeleccionadas(tareasOrdenadas);
                    setDayNumSeleccionado(dayNum);
                    setModalDiaAbierto(true);
                  };
                  
                  return (
                    <div 
                      key={dayNum} 
                      style={{
                        ...styles.dayCell,
                        background: esHoy ? 'rgba(129, 140, 248, 0.15)' : colors.bgCard,
                        border: esHoy ? `1px solid ${colors.accentIndigo}` : '1px solid transparent',
                        cursor: totalTareas > 0 ? 'pointer' : 'default',
                      }}
                      onClick={abrirModalDia}
                    >
                      <span style={{ ...styles.dayNumber, color: esHoy ? '#fff' : colors.textSecondary }}>
                        {dayNum}
                      </span>
                      {totalTareas > 0 ? (
                        <div style={styles.taskCountBadge}>
                          <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                          <span style={{ fontWeight: 600 }}>{totalTareas}</span>
                          <span style={{ fontSize: '10px', marginLeft: '2px' }}>tarea{totalTareas !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <div style={styles.noTasksBadge}>Sin tareas</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VISTA SEMANA */}
            {vistaCalendario === 'semana' && (
              <div style={{ ...styles.weekGridWrapper, overflowX: isMobile ? 'auto' : 'visible' }}>
                <div style={{ ...styles.weekGrid, minWidth: isMobile ? '700px' : '100%' }}>
                  {weekDays.map((day, idx) => {
                    const fechaStr = format(day, 'yyyy-MM-dd');
                    const tareasDelDia = tareasFiltradas.filter(t => (t.fechaEntrega || '').startsWith(fechaStr));
                    const esHoy = isSameDay(day, new Date());
                    const nombreDia = format(day, 'EEEEEE', { locale: es }).toUpperCase();
                    return (
                      <div key={idx} style={{
                        ...styles.weekColumn,
                        background: esHoy ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                      }}>
                        <div style={styles.weekDayHeader}>
                          <span style={styles.weekDayName}>{nombreDia}</span>
                          <span style={{ ...styles.weekDayNumber, color: esHoy ? colors.accentBlue : colors.textSecondary }}>{format(day, 'd')}</span>
                        </div>
                        <div style={styles.weekTasks}>
                          {tareasDelDia.length === 0 ? <div style={styles.weekEmpty}>Sin tareas</div> : tareasDelDia.map(t => (
                            <div key={t.id} style={{
                              ...styles.weekTaskCard,
                              borderLeftColor: getPriorityInfo(t.prioridad).color
                            }} onClick={() => { setTareaSeleccionada(t); setModalAbierto(true); }}>
                                <div style={styles.weekTaskTitle}>
                                  {t.titulo}
                                  {documentosMap[t.id] && <FaPaperclip style={{ marginLeft: 6, color: '#818cf8', fontSize: 10 }} />}
                                </div>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                <EstadoBadge estado={t.estado} size="small" />
                                <PriorityBadge prioridad={t.prioridad} size="small" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VISTA DÍA */}
            {vistaCalendario === 'dia' && (
              <div style={styles.dayView}>
                <div style={styles.dayHeader}>
                  <button onClick={() => handleNavegacion(-1)} style={styles.navButton}><FaChevronLeft /></button>
                  <span style={styles.dayTitle}>{format(fechaDiaView, "EEEE d 'de' MMMM yyyy", { locale: es })}</span>
                  <button onClick={() => handleNavegacion(1)} style={styles.navButton}><FaChevronRight /></button>
                </div>
                <div style={styles.dayTasks}>
                  {tareasDelDiaView.length === 0 ? (
                    <div style={styles.emptyMessage}>No hay tareas para este día</div>
                  ) : (
                    tareasDelDiaView.map(t => (
                      <div key={t.id} style={styles.dayTaskCard} onClick={() => { setTareaSeleccionada(t); setModalAbierto(true); }}>
                        <div style={styles.dayTaskHeader}>
                          <span style={styles.dayTaskTitle}>
                            {t.titulo}
                            {documentosMap[t.id] && <FaPaperclip style={{ marginLeft: 8, color: '#818cf8', fontSize: 14 }} />}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <EstadoBadge estado={t.estado} size="small" />
                            <PriorityBadge prioridad={t.prioridad} size="small" />
                          </div>
                        </div>
                        <div style={styles.dayTaskMeta}>
                          <FaClock size={12} /> {formatearFechaConHora(t.fechaEntrega)} • {getNombreResponsable(t)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* VISTA AGENDA */}
            {vistaCalendario === 'agenda' && (
              <div style={styles.agendaView}>
                {tareasFiltradas.length === 0 ? <p style={styles.emptyMessage}>No hay tareas activas</p> :
                  [...tareasFiltradas].sort((a,b) => (a.fechaEntrega || '').localeCompare(b.fechaEntrega || '')).map(t => (
                    <div key={t.id} style={styles.eventItem} onClick={() => { setTareaSeleccionada(t); setModalAbierto(true); }}>
                      <div style={{ ...styles.eventColorBar, backgroundColor: getPriorityInfo(t.prioridad).color }} />
                      <div style={styles.eventContent}>
                        <div style={styles.eventTitle}>
                          {t.titulo}
                          {documentosMap[t.id] && <FaPaperclip style={{ marginLeft: 6, color: '#818cf8', fontSize: 12 }} />}
                        </div>
                        <div style={styles.eventMeta}>
                          <span><FaClock size={10} /> {formatearFechaConHora(t.fechaEntrega)}</span>
                          <EstadoBadge estado={t.estado} size="small" />
                          <PriorityBadge prioridad={t.prioridad} size="small" />
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: siempre visible. En escritorio a la derecha, en móvil debajo */}
        <div style={styles.sidebar}>
          <SidebarContent
            documentosMap={documentosMap}
            tareasHoy={tareasHoy}
            proximasTareas={proximasTareas}
            tareasCompletadasPasadas={tareasCompletadasPasadas}
            onTareaClick={(t) => { setTareaSeleccionada(t); setModalAbierto(true); }}
            onEliminarClick={confirmarEliminar}
            onEditTarea = {handleEditTarea}
            getNombreResponsable={getNombreResponsable}
            formatearFecha={formatearFecha}
          />
        </div>

      </div>

      {/* MODAL DE DETALLE TAREA */}
{modalAbierto && tareaSeleccionada && (() => {
  const prioridadInfo = getPriorityInfo(tareaSeleccionada.prioridad);
  const prioridadIcono = tareaSeleccionada.prioridad === 'ALTA' 
    ? <FaExclamationTriangle /> : tareaSeleccionada.prioridad === 'MEDIA' 
    ? <FaClock /> : <FaCheckCircle />;
  const fechaEntrega = tareaSeleccionada.fechaEntrega 
    ? parseISO(tareaSeleccionada.fechaEntrega) : null;
  const diasRestantes = fechaEntrega 
    ? Math.ceil((fechaEntrega - new Date()) / (1000 * 60 * 60 * 24)) 
    : null;
  const estaVencida = diasRestantes !== null && diasRestantes < 0;
  const estaCerca = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 2;

  return (
    <div style={styles.modalOverlay} onClick={() => setModalAbierto(false)}>
      <div style={{ ...styles.modalContainer, maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: prioridadInfo.color + '20',
              color: prioridadInfo.color,
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              width: 'fit-content',
              border: `1px solid ${prioridadInfo.color}40`,
            }}>
              {prioridadIcono} {prioridadInfo.label}
            </span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f1f5f9', lineHeight: 1.3 }}>
              {tareaSeleccionada.titulo}
            </h2>
          </div>
          <FaTimes onClick={() => setModalAbierto(false)} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '20px' }} />
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Descripción */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#a5b4fc', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>
              📝 Descripción
            </h4>
            <p style={{ color: '#cbd5e6', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              {tareaSeleccionada.descripcion || 'Sin descripción detallada.'}
            </p>
          </div>

          {/* Metadatos en grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <FaClock style={{ color: '#818cf8', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                  Fecha de entrega
                </span>
                <span style={{
                  color: estaVencida ? '#f87171' : estaCerca ? '#fbbf24' : '#e2e8f0',
                  fontWeight: '600',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {formatearFechaConHora(tareaSeleccionada.fechaEntrega)}
                  {diasRestantes !== null && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: estaVencida ? 'rgba(239,68,68,0.2)' : estaCerca ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                      color: estaVencida ? '#f87171' : estaCerca ? '#fbbf24' : '#34d399',
                      fontWeight: '700',
                    }}>
                      {diasRestantes < 0 ? `Vencido (${Math.abs(diasRestantes)}d)` : diasRestantes === 0 ? '¡Hoy!' : `${diasRestantes}d`}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <FaLayerGroup style={{ color: '#818cf8', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                  Estado
                </span>
                <EstadoBadge estado={tareaSeleccionada.estado} size="small" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <FaUser style={{ color: '#818cf8', marginTop: '4px', flexShrink: 0 }} />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>
                  Responsables
                </span>
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }}>
                  {getNombreResponsable(tareaSeleccionada)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#a5b4fc', fontSize: '13px', fontWeight: '700', letterSpacing: '0.5px' }}>
              📎 Documentos adjuntos
            </h4>
            {cargandoDocumentosSeleccionada ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <FaSpinner style={{ animation: 'spin 1s linear infinite', color: '#818cf8', fontSize: '24px' }} />
              </div>
            ) : documentosTareaSeleccionada.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {documentosTareaSeleccionada.map(doc => (
                  <div key={doc.id || doc.ruta} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '18px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                  }}>
                    <FaPaperclip color="#818cf8" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500', flex: 1, wordBreak: 'break-word' }}>
                      {doc.nombre || doc.ruta || 'Documento'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => descargarDocumento(doc.ruta)} title="Descargar" style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: '999px',
                        padding: '10px',
                        color: '#cbd5e6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <FaDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
                Sin documentos adjuntos
              </p>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => setModalAbierto(false)}
            style={{
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              borderRadius: '40px',
              padding: '10px 20px',
              color: '#cbd5e6',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Cerrar
          </button>
          <button
            onClick={() => { setModalAbierto(false); handleEditTarea(tareaSeleccionada); }}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              borderRadius: '40px',
              padding: '10px 20px',
              color: 'white',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <FaEdit /> Editar tarea
          </button>
          <button
            onClick={() => confirmarEliminar(tareaSeleccionada)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '40px',
              padding: '10px 20px',
              color: '#fca5a5',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <FaTrashAlt /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
})()}

      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      {showConfirmDelete && tareaSeleccionada && (
        <div style={styles.modalOverlay} onClick={() => setShowConfirmDelete(false)}>
          <div style={{ ...styles.modalContainer, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span>Confirmar eliminación</span>
              <FaTimes onClick={() => setShowConfirmDelete(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={styles.modalBody}>
              <p>¿Estás seguro de que quieres eliminar la tarea <strong>"{tareaSeleccionada.titulo}"</strong>? Esta acción no se puede deshacer.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button style={{ ...styles.deleteButton, background: 'rgba(100,100,100,0.3)', color: '#ccc' }} onClick={() => setShowConfirmDelete(false)}>
                  <FaTimesCircle /> Cancelar
                </button>
                <button style={{ ...styles.deleteButton, background: '#ef4444', color: 'white' }} onClick={eliminarTarea}>
                  <FaCheckCircle /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* MODAL DE TAREAS DEL DÍA - VERSIÓN OPTIMIZADA */}
{modalDiaAbierto && (
  <div style={styles.modalOverlay} onClick={() => setModalDiaAbierto(false)}>
    <div style={{
      background: '#0f172a',
      borderRadius: '32px',
      width: '90%',
      maxWidth: '850px',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    }} onClick={e => e.stopPropagation()}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '18px 24px',
        background: '#1e293b',
        color: '#cbd5e6',
        fontSize: '14px',
        fontWeight: '600',
        borderTopLeftRadius: '32px',
        borderTopRightRadius: '32px',
      }}>
        <span>📅 Tareas del día</span>
        <FaTimes onClick={() => setModalDiaAbierto(false)} style={{ cursor: 'pointer' }} />
      </div>
      
      {/* Body */}
      <div style={{ padding: '24px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#a5b4fc', fontSize: '20px', fontWeight: 'bold' }}>
          {format(new Date(year, month, dayNumSeleccionado), "EEEE d 'de' MMMM", { locale: es })}
        </h3>
        
        {tareasDelDiaSeleccionadas.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No hay tareas para este día.</p>
        ) : (
          <div style={{
            overflowY: 'auto',
            paddingRight: '8px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {tareasDelDiaSeleccionadas.map((t, idx) => (
              <div 
                key={t.id} 
                style={{ 
                  display: 'flex', 
                  background: 'rgba(30, 41, 59, 0.9)', 
                  borderRadius: '20px', 
                  border: '1px solid #334155', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s' 
                }}
                // ✅ SOLO ESTA LÍNEA ES NUEVA: abre el detalle al hacer clic en la tarjeta
                onClick={() => {
                  setModalDiaAbierto(false);
                  setTareaSeleccionada(t);
                  setModalAbierto(true);
                }}
              >
                <div style={{ width: '6px', background: getPriorityInfo(t.prioridad).color, borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }} />
                <div style={{ flex: 1, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#4f46e5', color: 'white', borderRadius: '30px', width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', wordBreak: 'break-word' }}>
                        {t.titulo}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <PriorityBadge prioridad={t.prioridad} size="small" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditTarea(t); }}
                        style={{ background: 'rgba(79,70,229,0.2)', border: 'none', borderRadius: '30px', padding: '6px 12px', cursor: 'pointer', color: '#a5b4fc', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Editar"
                      >
                        <FaEdit size={12} /> Editar
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    <span><FaClock size={11} /> {formatearFechaConHora(t.fechaEntrega)}</span>
                    <EstadoBadge estado={t.estado} size="small" />
                    <span>👤 {getNombreResponsable(t)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                    {normalizarEstado(t.estado) === 'NUEVAS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          actualizarEstadoTarea(t.id, 'EN PROCESO');
                        }}
                        style={styles.stateActionButton}
                        disabled={tareaActualizando === t.id}
                      >
                        {tareaActualizando === t.id ? (
                          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <><FaArrowRight size={12} /> Iniciar</>
                        )}
                      </button>
                    )}
                    {normalizarEstado(t.estado) !== 'COMPLETADO' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          actualizarEstadoTarea(t.id, 'COMPLETADO');
                        }}
                        style={styles.stateActionSecondaryButton}
                        disabled={tareaActualizando === t.id}
                      >
                        {tareaActualizando === t.id ? (
                          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <><FaCheckCircle size={12} /> Completar</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
)}

{/* MODAL DE EDICIÓN DE TAREA */}
{editModalOpen && tareaEditando && (
  <div style={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
    <div style={{ ...styles.modalContainer, maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
      
      {/* Encabezado mejorado */}
      <div style={{
        ...styles.modalHeader,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
        padding: '20px 24px',
      }}>
        <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '6px', borderRadius: '12px' }}>
            <FaEdit size={18} color="#818cf8" />
          </span>
          Editar tarea
        </span>
        <FaTimes onClick={() => setEditModalOpen(false)} style={{ cursor: 'pointer', fontSize: '18px', opacity: 0.7 }} />
      </div>

      <form onSubmit={handleUpdateTarea} style={{ padding: '28px 24px' }}>
        {/* ===== Layout en grid ===== */}
        <div style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? '1fr' : styles.formGrid.gridTemplateColumns }}>
          
          {/* Título (ancho completo) */}
          <div style={styles.formFullWidth}>
            <label style={styles.formLabel}>Título *</label>
            <input
              type="text"
              value={tareaEditando.titulo || ''}
              onChange={(e) => setTareaEditando({ ...tareaEditando, titulo: e.target.value })}
              style={styles.formInput}
              placeholder="Nombre de la tarea"
              required
            />
          </div>

          {/* Fecha y Hora (mitad) */}
          <div style={styles.formHalfWidth}>
            <label style={styles.formLabel}>Fecha límite</label>
            <input
              type="date"
              value={tareaEditando.fechaEntrega ? tareaEditando.fechaEntrega.split('T')[0] : ''}
              onChange={(e) => {
                const datePart = e.target.value;
                const timePart = tareaEditando.fechaEntrega?.split('T')[1]?.slice(0,5) || '23:59';
                setTareaEditando({ ...tareaEditando, fechaEntrega: `${datePart}T${timePart}` });
              }}
              style={{ ...styles.formInput, colorScheme: 'dark' }}
              required
            />
          </div>
          <div style={styles.formHalfWidth}>
            <label style={styles.formLabel}>Hora límite</label>
            <input
              type="time"
              value={tareaEditando.fechaEntrega ? tareaEditando.fechaEntrega.split('T')[1]?.slice(0,5) : '23:59'}
              onChange={(e) => {
                const timePart = e.target.value;
                const datePart = tareaEditando.fechaEntrega?.split('T')[0] || new Date().toISOString().split('T')[0];
                setTareaEditando({ ...tareaEditando, fechaEntrega: `${datePart}T${timePart}` });
              }}
              style={{ ...styles.formInput, colorScheme: 'dark' }}
              required
            />
          </div>

          {/* Prioridad y Estado (mitad) */}
          <div style={styles.formHalfWidth}>
            <label style={styles.formLabel}>Prioridad</label>
            <select
              value={tareaEditando.prioridad || 'BAJA'}
              onChange={(e) => setTareaEditando({ ...tareaEditando, prioridad: e.target.value })}
              style={styles.formInput}
            >
              <option value="ALTA">🔴 Alta</option>
              <option value="MEDIA">🟡 Media</option>
              <option value="BAJA">🟢 Baja</option>
            </select>
          </div>
    

          {/* Responsables (ancho completo, con badges) */}
          <div style={styles.formFullWidth}>
            <label style={styles.formLabel}>Responsables</label>
            <div style={styles.formSelectWrapper}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const email = e.target.value;
                    setTareaEditando(prev => ({
                      ...prev,
                      responsables: (prev.responsables || []).includes(email)
                        ? prev.responsables.filter(r => r !== email)
                        : [...(prev.responsables || []), email]
                    }));
                  }
                }}
                style={styles.formInput}
              >
                <option value="" disabled>Agregar responsable...</option>
                {Object.entries(emailToNombre).map(([email, nombre]) => (
                  <option key={email} value={email} disabled={tareaEditando.responsables?.includes(email)}>
                    {nombre} ({email})
                  </option>
                ))}
              </select>
              <FaPlusCircle style={styles.formSelectIcon} />
            </div>
            <div style={styles.badgeContainer}>
              {(!tareaEditando.responsables || tareaEditando.responsables.length === 0) && (
                <span style={{ color: '#64748b', fontSize: '12px' }}>Ningún responsable asignado</span>
              )}
              {tareaEditando.responsables?.map(email => (
                <span key={email} style={styles.responsibleBadge}>
                  {emailToNombre[email] || email.split('@')[0]}
                  <FaTimes
                    style={{ cursor: 'pointer', marginLeft: '8px', fontSize: '10px' }}
                    onClick={() => setTareaEditando(prev => ({
                      ...prev,
                      responsables: prev.responsables.filter(r => r !== email)
                    }))}
                  />
                </span>
              ))}
            </div>
            <small style={{ color: '#94a3b8', marginTop: '6px', display: 'block' }}>
              Selecciona un integrante para asignarlo
            </small>
          </div>

          {/* Descripción (ancho completo) */}
          <div style={styles.formFullWidth}>
            <label style={styles.formLabel}>Descripción</label>
            <textarea
              value={tareaEditando.descripcion || ''}
              onChange={(e) => setTareaEditando({ ...tareaEditando, descripcion: e.target.value })}
              style={styles.formTextarea}
              placeholder="Detalles adicionales..."
            />
          </div>
        </div>

        {/* Sincronización (opcional, decorativo) */}
        <div style={styles.syncInfo}>
          <span style={{ background: 'rgba(99,102,241,0.2)', borderRadius: '12px', padding: '8px', display: 'inline-flex' }}>
            <FaGoogle size={18} color="#818cf8" />
          </span>
          <div>
            <h4 style={{ margin: 0, color: '#f1f5f9', fontWeight: '700' }}>Cloud Sync Active</h4>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
              {tareaEditando.responsables?.length || 0} responsable(s) serán notificados
            </p>
          </div>
        </div>

        {/* Botones */}
        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={() => setEditModalOpen(false)}
            style={styles.cancelButton}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={styles.submitButton}
          >
            <FaEdit style={{ marginRight: '6px' }} /> Guardar cambios
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
};

// SidebarContent con scroll automático en cada sección
const SidebarContent = ({ 
  documentosMap,  
  tareasHoy, 
  proximasTareas, 
  tareasCompletadasPasadas, 
  onTareaClick, 
  onEliminarClick, onEditTarea,
  getNombreResponsable, 
  formatearFecha
}) => {
  const [showCompletadas, setShowCompletadas] = useState(false);

  // Orden interno: prioridad ALTA → MEDIA → BAJA, luego por fecha
  const ordenarPorPrioridadYFecha = (tareas) => {
    const prioridadPeso = { 'ALTA': 0, 'MEDIA': 1, 'BAJA': 2 };
    return [...tareas].sort((a, b) => {
      const pesoA = prioridadPeso[a.prioridad?.toUpperCase()] ?? 2;
      const pesoB = prioridadPeso[b.prioridad?.toUpperCase()] ?? 2;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a.fechaEntrega || '').localeCompare(b.fechaEntrega || '');
    });
  };

  const tareasHoyOrdenadas = ordenarPorPrioridadYFecha(tareasHoy);
  const proximasOrdenadas = ordenarPorPrioridadYFecha(proximasTareas);
  const completadasOrdenadas = ordenarPorPrioridadYFecha(tareasCompletadasPasadas);

  return (
    <>

      {/* ===== VENCEN HOY ===== */}
      <div style={styles.sidebarSection}>
        <div style={styles.sectionHeader}>
          <h3 style={{ ...styles.sidebarTitle, color: '#f87171' }}>
            ⚠️ Vencen hoy <span style={styles.countBadge}>{tareasHoyOrdenadas.length}</span>
          </h3>
        </div>
        <div style={styles.scrollableSection}>
          {tareasHoyOrdenadas.length === 0 ? (
            <div style={styles.emptyCard}>Sin entregas para hoy</div>
          ) : (
            tareasHoyOrdenadas.map(t => (
              <TaskCard
                key={t.id}
                tarea={t}
                documentosMap={documentosMap}
                onTareaClick={onTareaClick}
                onEliminarClick={onEliminarClick}
                onEditTarea={onEditTarea}
                getNombreResponsable={getNombreResponsable}
                formatearFecha={formatearFecha}
              />
            ))
          )}
        </div>
      </div>
      {/* ===== PRÓXIMAS ENTREGAS ===== */}
      <div style={styles.sidebarSection}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sidebarTitle}>
            📅 Próximas entregas <span style={styles.countBadge}>{proximasOrdenadas.length}</span>
          </h3>
        </div>
        <div style={styles.scrollableSection}>
          {proximasOrdenadas.length === 0 ? (
            <div style={styles.emptyCard}>No hay entregas programadas</div>
          ) : (
            proximasOrdenadas.map(t => (
              <TaskCard
                key={t.id}
                tarea={t}
                documentosMap={documentosMap}
                onTareaClick={onTareaClick}
                onEliminarClick={onEliminarClick}
                onEditTarea={onEditTarea}
                getNombreResponsable={getNombreResponsable}
                formatearFecha={formatearFecha}
              />
            ))
          )}
        </div>
      </div>



      {/* ===== COMPLETADAS / VENCIDAS (colapsable) ===== */}
      {completadasOrdenadas.length > 0 && (
        <div style={styles.sidebarSection}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowCompletadas(!showCompletadas)}
          >
            <h3 style={styles.sidebarTitle}>
              ✅ Completadas / Vencidas <span style={styles.countBadge}>{completadasOrdenadas.length}</span>
            </h3>
            {showCompletadas ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {showCompletadas && (
            <div style={styles.scrollableSection}>
              {completadasOrdenadas.map(t => (
                <TaskCard
                  key={t.id}
                  tarea={t}
                  documentosMap={documentosMap}
                  onTareaClick={onTareaClick}
                  onEliminarClick={onEliminarClick}
                  onEditTarea={onEditTarea}
                  getNombreResponsable={getNombreResponsable}
                  formatearFecha={formatearFecha}
                  isCompletedOrExpired
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tarjeta de sincronización */}
      <div style={styles.syncCard}>
        <div style={styles.syncHeader}>
          <FaPlusCircle style={{ color: '#fbbf24' }} />
          <strong>Sincronización corporativa</strong>
        </div>
        <p style={styles.syncText}>Vincula tu calendario de Google y lleva todas tus tareas a tu móvil o escritorio.</p>
        <a href={CALENDAR_PUBLIC_LINK} target="_blank" rel="noopener noreferrer" style={styles.syncButton}>
          <FaCalendarAlt /> Añadir a Google Calendar
        </a>
      </div>
    </>
  );
};

// Componente interno de tarjeta (reutilizable)
const TaskCard = ({ tarea, documentosMap, onTareaClick, onEliminarClick, onEditTarea, getNombreResponsable, formatearFecha, isCompletedOrExpired }) => {
  const prioridadInfo = getPriorityInfo(tarea.prioridad);
  return (
    <div style={{ 
      ...styles.eventCard, 
      borderLeftColor: prioridadInfo.color,
      opacity: isCompletedOrExpired ? 0.8 : 1 
    }}>
      <div style={styles.eventCardContent}>
        <div style={styles.eventCardMain} onClick={() => onTareaClick(tarea)}>
          <div style={styles.eventCardHeader}>
            <FaExclamationTriangle size={12} color={prioridadInfo.color} />
            <span style={styles.eventCardTitle}>
              {tarea.titulo}
              {documentosMap[tarea.id] && <FaPaperclip style={{ marginLeft: 6, color: '#818cf8', fontSize: 10 }} />}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
            <EstadoBadge estado={tarea.estado} size="small" />
            <PriorityBadge prioridad={tarea.prioridad} size="small" />
          </div>
          {!isCompletedOrExpired && (
            <div style={styles.eventCardMeta}>
              {formatearFecha(tarea.fechaEntrega)}
            </div>
          )}
          <div style={styles.eventCardUser}>👤 {getNombreResponsable(tarea)}</div>
        </div>
        <button 
          style={styles.deleteButtonSmall} 
          onClick={(e) => { e.stopPropagation(); onEliminarClick(tarea); }} 
          title="Eliminar"
        >
          <FaTrashAlt size={12} />
        </button>
        <button 
          style={{ ...styles.deleteButtonSmall, background: 'rgba(79,70,229,0.2)', color: '#a5b4fc' }} 
          onClick={(e) => { e.stopPropagation(); onEditTarea(tarea); }} 
          title="Editar"
        >
          <FaEdit size={12} />
        </button>
      </div>
    </div>
  );
};
// Estilos (se mantienen igual pero con ajustes para móvil)
const styles = {
  container: {
    minHeight: '100vh',
    padding: '24px 32px',
    fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
  },
  header: {
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(99, 102, 241, 0.1)',
    color: '#818cf8',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '1.5px',
    marginBottom: '8px'
  },
  mainTitle: {
    fontSize: '28px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0,
    color: '#f1f5f9',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    marginTop: '6px',
  },
  filtersBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterSelect: {
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid #334155',
    borderRadius: '30px',
    padding: '8px 16px',
    color: '#f1f5f9',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  },
  clearFiltersBtn: {
    background: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '30px',
    padding: '6px 14px',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  mainGrid: {
    display: 'grid',
    gap: '28px',
  },
  calendarColumn: {
    background: 'transparent',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  hoyTexto: {
    fontSize: '34px',
    fontWeight: '800',
    margin: 0,
    lineHeight: 1.2,
    background: 'linear-gradient(135deg, #cbd5e1, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  monthNavigator: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  navButton: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #334155',
    borderRadius: '30px',
    padding: '8px 14px',
    cursor: 'pointer',
    color: '#cbd5e6',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  monthYear: {
    fontWeight: '600',
    fontSize: '18px',
    color: '#cbd5e6',
  },
  todayButton: {
    background: '#6366f1',
    border: 'none',
    borderRadius: '30px',
    padding: '8px 18px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
  },
  createTaskButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  misTareasButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(79, 70, 229, 0.95)',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 18px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  stateActionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  stateActionSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#cbd5e6',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '999px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '12px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  viewTabs: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(8px)',
    padding: '4px',
    borderRadius: '40px',
    border: '1px solid #334155',
  },
  tabButton: {
    background: 'transparent',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '32px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: '#4f46e5',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
  },
  calendarCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(16px)',
    borderRadius: '32px',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    overflow: 'visible',
    padding: '16px',
    boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  weekdayHeader: {
    textAlign: 'center',
    padding: '12px 4px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#a5b4fc',
  },
  emptyCell: {
    padding: '10px',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
    opacity: 0.4,
  },
  dayCell: {
    background: 'rgba(30, 41, 59, 0.65)',
    borderRadius: '16px',
    padding: '8px',
    minHeight: '80px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dayNumber: {
    fontSize: '14px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '6px',
  },
  taskCountBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(99, 102, 241, 0.2)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '12px',
    color: '#cbd5e6',
    marginTop: '8px',
    width: 'fit-content',
    backdropFilter: 'blur(4px)',
  },
  noTasksBadge: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  weekGridWrapper: {
    width: '100%',
  },
  weekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
  },
  weekColumn: {
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '20px',
    padding: '12px',
    minHeight: '350px',
  },
  weekDayHeader: {
    textAlign: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #334155',
  },
  // Reemplaza el actual formGroup (que está mal estructurado) por estos estilos individuales:
formContainer: {
  marginBottom: '20px',
},
formGrid: {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
},
formFullWidth: { gridColumn: '1 / -1' },
formHalfWidth: { gridColumn: 'span 1' },

formSelectWrapper: {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
},
formSelectIcon: {
  position: 'absolute',
  right: '14px',
  color: '#818cf8',
  pointerEvents: 'none',
},
badgeContainer: {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
},
responsibleBadge: {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(99, 102, 241, 0.15)',
  color: '#cbd5e6',
  padding: '4px 12px',
  borderRadius: '30px',
  fontSize: '12px',
  fontWeight: '500',
  border: '1px solid rgba(99, 102, 241, 0.3)',
},
syncInfo: {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '16px',
  padding: '16px',
  marginTop: '24px',
  marginBottom: '16px',
  border: '1px solid rgba(99, 102, 241, 0.15)',
},
cancelButton: {
  background: 'rgba(100, 116, 139, 0.2)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '40px',
  padding: '10px 24px',
  color: '#cbd5e6',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
},
submitButton: {
  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
  border: 'none',
  borderRadius: '40px',
  padding: '10px 24px',
  color: 'white',
  fontWeight: '700',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
  transition: 'all 0.2s',
},
formLabel: {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#cbd5e6',
  letterSpacing: '0.3px',
},
formInput: {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '16px',
  border: '1px solid #334155',
  background: 'rgba(15, 23, 42, 0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
},
formTextarea: {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '16px',
  border: '1px solid #334155',
  background: 'rgba(15, 23, 42, 0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  resize: 'vertical',
  minHeight: '100px',
  transition: 'all 0.3s',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
},
formSelect: {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '16px',
  border: '1px solid #334155',
  background: 'rgba(15, 23, 42, 0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
  appearance: 'none', // quita la flecha nativa (después la añadimos con CSS)
},
formMultiSelect: {
  width: '100%',
  minHeight: '110px',
  padding: '10px 12px',
  borderRadius: '16px',
  border: '1px solid #334155',
  background: 'rgba(15, 23, 42, 0.7)',
  backdropFilter: 'blur(8px)',
  color: '#f1f5f9',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
  overflowY: 'auto',
},
formRowContainer: {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
},
modalFooter: {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '32px',
  paddingTop: '20px',
  borderTop: '1px solid rgba(99, 102, 241, 0.15)',
},
  weekDayName: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#a5b4fc',
    display: 'block',
  },
  weekDayNumber: {
    fontSize: '18px',
    fontWeight: '700',
  },
  weekTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  weekTaskCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    borderLeft: '3px solid',
    borderRadius: '12px',
    padding: '8px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  weekTaskTitle: {
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  weekEmpty: {
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    padding: '12px',
  },
  dayView: {
    padding: '8px',
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  dayTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#c084fc',
  },
  dayTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dayTaskCard: {
    background: 'rgba(30, 41, 59, 0.65)',
    backdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '16px',
    cursor: 'pointer',
    border: '1px solid #334155',
    transition: 'all 0.2s',
  },
  dayTaskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  dayTaskTitle: {
    fontWeight: '700',
    fontSize: '16px',
    color: '#f1f5f9',
  },
  dayTaskMeta: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  agendaView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: 'auto',   
    width: '100%',
  },
  eventItem: {
    display: 'flex',
    background: 'rgba(30, 41, 59, 0.65)',
    borderRadius: '20px',
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid #334155',
    transition: 'all 0.2s',
  },
  eventColorBar: {
    width: '6px',
    flexShrink: 0,
  },
eventContent: {
  padding: '18px 20px',      // más espacio interno
  flex: 1,
},
eventTitle: {
  fontWeight: '700',
  fontSize: '16px',          // antes 14px
  marginBottom: '8px',
  color: '#f1f5f9',
},
eventMeta: {
  fontSize: '13px',          // antes 11px
  color: '#94a3b8',
  display: 'flex',
  gap: '16px',               // un poco más de espacio
  alignItems: 'center',
  flexWrap: 'wrap',
},
  emptyMessage: {
    textAlign: 'center',
    color: '#64748b',
    padding: '40px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  sidebarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#a5b4fc',
    letterSpacing: '1px',
    margin: 0,
  },
  eventCard: {
    background: 'rgba(30, 41, 59, 0.65)',
    backdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '14px 16px',
    borderLeft: '4px solid',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  // Añade estas propiedades a tu objeto styles (junto a las existentes)
sectionHeader: {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
},
countBadge: {
  background: 'rgba(99, 102, 241, 0.2)',
  borderRadius: '30px',
  padding: '2px 8px',
  fontSize: '11px',
  fontWeight: '600',
  marginLeft: '8px',
  color: '#cbd5e6',
},
verMasBtn: {
  background: 'rgba(100, 116, 139, 0.2)',
  border: 'none',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '11px',
  fontWeight: '500',
  color: '#94a3b8',
  cursor: 'pointer',
  transition: 'all 0.2s',
  ':hover': {
    background: 'rgba(129, 140, 248, 0.3)',
    color: '#f1f5f9',
  }
},
scrollableSection: {
  maxHeight: '320px',        // suficiente para ~6-7 tareas, pero con 16 obliga a scroll
  overflowY: 'auto',
  paddingRight: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  scrollbarWidth: 'thin',
  scrollbarColor: '#4b5563 #1e293b',
  '::-webkit-scrollbar': {
    width: '4px',
  },
  '::-webkit-scrollbar-track': {
    background: '#1e293b',
    borderRadius: '10px',
  },
  '::-webkit-scrollbar-thumb': {
    background: '#4b5563',
    borderRadius: '10px',
  },
},
// Ajusta eventCard para que sea más compacto (opcional)
eventCard: {
  background: 'rgba(30, 41, 59, 0.65)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',       // antes 20px
  padding: '10px 12px',       // antes 14px 16px
  borderLeft: '3px solid',    // antes 4px
  border: '1px solid rgba(99, 102, 241, 0.15)',
  cursor: 'pointer',
  transition: 'all 0.2s',
},
  eventCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  eventCardMain: {
    flex: 1,
    cursor: 'pointer',
  },
  eventCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  eventCardTitle: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#f1f5f9',
  },
  eventCardMeta: {
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  eventCardUser: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  deleteButtonSmall: {
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '30px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#f87171',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  emptyCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '20px',
    padding: '20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '13px',
    border: '1px solid #334155',
  },
  syncCard: {
    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '20px',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    marginTop: 'auto',
  },
  syncHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  // Dentro de styles (junto a los demás)
eventContentModal: {
  padding: '10px 14px',   // más compacto que el general
  flex: 1,
},
eventTitleModal: {
  fontWeight: '700',
  fontSize: '14px',       // un poco más pequeño
  color: '#f1f5f9',
},
eventMetaModal: {
  fontSize: '11px',       // metadatos más pequeños
  color: '#94a3b8',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: '4px',
},
  syncText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '18px',
    lineHeight: 1.4,
  },
  syncButton: {
    background: '#6366f1',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '40px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  formGroup: {
  marginBottom: '16px',
  label: { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#cbd5e6' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9' }
},
formRow: {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px'
},
modalContainer: {
  background: '#0f172a',
  borderRadius: '32px',
  width: '90%',
  maxWidth: '550px', // valor por defecto, pero se sobrescribe en línea
  border: '1px solid rgba(99, 102, 241, 0.3)',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column',
},
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '18px 24px',
    background: '#1e293b',
    color: '#cbd5e6',
    fontSize: '12px',
    fontWeight: '600',
  },
  modalBody: {
    padding: '28px',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 0 12px 0',
    color: '#f1f5f9',
  },
  modalDescription: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '24px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  modalMeta: {
    display: 'flex',
    gap: '20px',
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  deleteButton: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '40px',
    padding: '12px',
    width: '100%',
    color: '#f87171',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))',
    gap: '20px',
  },
  skeletonCard: {
    background: '#1e293b',
    height: '120px',
    borderRadius: '24px',
    animation: 'pulse 1.5s infinite',
  },
};

// Inyectar estilos globales con keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .calendario-container *:hover {
    transition: all 0.2s ease;
  }
  .form-select::-webkit-scrollbar {
  width: 5px;
}
.form-select::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 8px;
}
.form-select::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 8px;
}
  .day-cell:hover {
    background: rgba(51, 65, 85, 0.8) !important;
    border-color: #818cf8 !important;
  }
.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: #818cf8 !important;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2), 0 4px 6px -1px rgba(0,0,0,0.2) !important;
  background: rgba(30, 41, 59, 0.8) !important;
}
  .nav-button:hover {
    background: rgba(99, 102, 241, 0.2) !important;
    color: #fff;
  }
  .view-tab:hover {
    background: rgba(79, 70, 229, 0.3) !important;
    color: #fff;
  }
  .month-task-item:hover {
    background: rgba(51, 65, 85, 0.8) !important;
  }
  /* Mejoras táctiles en móvil */
  @media (max-width: 768px) {
    button, .nav-item, .task-item, .event-item, .day-cell {
      touch-action: manipulation;
    }
    .dayTaskCard, .weekTaskCard, .eventCard {
      cursor: pointer;
    }
  }
`;
document.head.appendChild(styleSheet);

// Al final del archivo, después del styleSheet existente, agregar:
const modalScrollStyle = document.createElement("style");
modalScrollStyle.textContent = `
  .modal-task-list::-webkit-scrollbar {
    width: 4px;
  }
  .modal-task-list::-webkit-scrollbar-track {
    background: #1e293b;
    border-radius: 10px;
  }
  .modal-task-list::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 10px;
  }
`;
document.head.appendChild(modalScrollStyle);

export default Calendario;