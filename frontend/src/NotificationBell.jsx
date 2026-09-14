import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaBell, FaCheckCircle, FaClock, FaTimes, FaCalendarAlt, FaUser, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useMediaQuery } from 'react-responsive';

const NotificationBell = ({ usuario, setVistaActiva }) => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [animacion, setAnimacion] = useState(false);
  const ultimoIdConocidoRef = useRef(null);
  const dropdownRef = useRef(null);
  const channelRef = useRef(null);
  const audioRef = useRef(null);

  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 1;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const reproducirSonido = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log('Audio no pudo reproducirse:', e));
      }
    } catch (error) {
      console.warn('Error reproduciendo sonido:', error);
    }
  };

  const formatearFechaRelativa = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diffDias = Math.floor((fecha - hoy) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return `⚠️ Vencida hace ${Math.abs(diffDias)} días`;
    if (diffDias === 0) return '🔴 Vence hoy';
    if (diffDias === 1) return '🟡 Vence mañana';
    if (diffDias <= 3) return `🟢 Vence en ${diffDias} días`;
    return `📅 ${fecha.toLocaleDateString()}`;
  };

  const getPrioridadColor = (prioridad) => {
    const prioridadUpper = prioridad?.toUpperCase() || 'MEDIA';
    if (prioridadUpper === 'ALTA') return '#ef4444';
    if (prioridadUpper === 'MEDIA') return '#f59e0b';
    return '#10b981';
  };

  const cargarTareasDesdeAPI = async () => {
    if (!usuario?.email) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await axios.get(`${window.location.protocol}//${window.location.hostname}:8080/api/tareas/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const misTareas = res.data.filter(tarea =>
        tarea.responsables?.some(r => {
          const email = typeof r === 'string' ? r : r.email;
          return email?.toLowerCase() === usuario.email.toLowerCase();
        })
      );
      const idsActuales = misTareas.map(t => t.id);
      const ultimoIds = ultimoIdConocidoRef.current;

      if (ultimoIds !== null) {
        const nuevas = misTareas.filter(t => !ultimoIds.includes(t.id));
        if (nuevas.length > 0) {
          setNotificaciones(prev => {
            const nuevasFiltradas = nuevas.filter(n => !prev.some(p => p.id === n.id));
            if (nuevasFiltradas.length) {
              setAnimacion(true);
              setTimeout(() => setAnimacion(false), 1000);
              toast.success(`📬 ${nuevasFiltradas.length} nueva(s) tarea(s) asignada(s)`);
              reproducirSonido();
            }
            return [...nuevasFiltradas, ...prev];
          });
        }
      }
      ultimoIdConocidoRef.current = idsActuales;
    } catch (err) {
      console.error('Error cargando tareas para notificaciones:', err);
    }
  };

  // Polling cada 1 segundo
  useEffect(() => {
    if (!usuario) return;
    cargarTareasDesdeAPI();
    const interval = setInterval(cargarTareasDesdeAPI, 10000);
    return () => clearInterval(interval);
  }, [usuario]);

  // Escuchar BroadcastChannel
  useEffect(() => {
    if (!usuario) return;
    channelRef.current = new BroadcastChannel('tarea_nueva');
    const handleMessage = (event) => {
      if (event.data.type === 'NUEVA_TAREA') {
        const nuevaTarea = event.data.tarea;
        const esResponsable = nuevaTarea.responsables?.some(r => {
          const email = typeof r === 'string' ? r : r.email;
          return email?.toLowerCase() === usuario.email.toLowerCase();
        });
        if (esResponsable) {
          setNotificaciones(prev => {
            if (prev.some(n => n.id === nuevaTarea.id)) return prev;
            if (ultimoIdConocidoRef.current && !ultimoIdConocidoRef.current.includes(nuevaTarea.id)) {
              ultimoIdConocidoRef.current = [...ultimoIdConocidoRef.current, nuevaTarea.id];
            }
            setAnimacion(true);
            setTimeout(() => setAnimacion(false), 1000);
            toast.success(`📬 Nueva tarea: ${nuevaTarea.titulo}`);
            reproducirSonido();
            return [nuevaTarea, ...prev];
          });
        }
      }
    };
    channelRef.current.addEventListener('message', handleMessage);
    return () => {
      channelRef.current.removeEventListener('message', handleMessage);
      channelRef.current.close();
    };
  }, [usuario]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const marcarComoLeida = (id) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
  };

  const marcarTodasLeidas = () => {
    setNotificaciones([]);
    toast.success('Todas las notificaciones han sido limpiadas');
  };

  const handleNotificacionClick = (tarea) => {
    marcarComoLeida(tarea.id);
    setMostrarDropdown(false);
    if (setVistaActiva) setVistaActiva('misTareas');
  };

  const notificacionesNoLeidas = notificaciones.length;

  // Estilos responsivos (calculados con isMobile)
  const dropdownWidth = isMobile ? '95vw' : '380px';
  const dropdownRight = isMobile ? '50%' : 0;
  const dropdownTransform = isMobile ? 'translateX(50%)' : 'none';

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={{
          ...styles.bellButton,
          animation: animacion ? 'ring 0.5s ease-in-out' : 'none',
        }}
        onClick={() => setMostrarDropdown(!mostrarDropdown)}
        aria-label="Notificaciones"
      >
        <FaBell size={isMobile ? 20 : 18} />
        {notificacionesNoLeidas > 0 && (
          <span style={styles.badge}>{notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas}</span>
        )}
      </button>

      {mostrarDropdown && (
        <div style={{
          ...styles.dropdown,
          width: dropdownWidth,
          right: dropdownRight,
          transform: dropdownTransform,
          maxWidth: isMobile ? '95vw' : '380px',
        }}>
          <div style={styles.dropdownHeader}>
            <div style={styles.dropdownTitle}>
              <FaBell size={14} />
              <span>Notificaciones</span>
            </div>
            {notificacionesNoLeidas > 0 && (
              <button onClick={marcarTodasLeidas} style={styles.clearBtn}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          
          <div style={styles.dropdownContent}>
            {notificaciones.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🔔</div>
                <p style={styles.emptyTitle}>¡Sin notificaciones!</p>
                <p style={styles.emptyText}>No tienes tareas nuevas pendientes.</p>
              </div>
            ) : (
              notificaciones.map((tarea, idx) => (
                <div
                  key={tarea.id}
                  style={{
                    ...styles.notificationItem,
                    animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                    borderLeft: `3px solid ${getPrioridadColor(tarea.prioridad)}`,
                  }}
                  onClick={() => handleNotificacionClick(tarea)}
                >
                  <div style={styles.notifIcon}>
                    {tarea.prioridad?.toUpperCase() === 'ALTA' ? (
                      <FaExclamationTriangle size={16} color="#ef4444" />
                    ) : (
                      <FaClock size={16} color="#f59e0b" />
                    )}
                  </div>
                  <div style={styles.notifContent}>
                    <div style={styles.notifHeader}>
                      <strong style={styles.notifTitle}>{tarea.titulo}</strong>
                      <span style={{ ...styles.priorityBadge, color: getPrioridadColor(tarea.prioridad), background: `${getPrioridadColor(tarea.prioridad)}20` }}>
                        {tarea.prioridad || 'Media'}
                      </span>
                    </div>
                    <div style={styles.notifMeta}>
                      <span style={styles.metaItem}>
                        <FaCalendarAlt size={10} />
                        {formatearFechaRelativa(tarea.fechaEntrega)}
                      </span>
                      <span style={styles.metaItem}>
                        <FaUser size={10} />
                        {tarea.responsables?.length || 1} responsable(s)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      marcarComoLeida(tarea.id);
                    }}
                    style={styles.closeBtn}
                    title="Marcar como leída"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          {notificaciones.length > 0 && (
            <div style={styles.dropdownFooter}>
              <button onClick={marcarTodasLeidas} style={styles.footerBtn}>
                Limpiar todas
              </button>
            </div>
          )}
        </div>
      )}
      
      <style>{`
        @keyframes ring {
          0% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        /* Hover real usando CSS global */
        .notification-bell-btn:hover {
          background: #1e293b !important;
          border-color: #6366f1 !important;
        }
        .notification-clear-btn:hover {
          background: rgba(99, 102, 241, 0.1) !important;
        }
        .notification-item:hover {
          background: #1e293b !important;
        }
        .notification-close-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          color: #f87171 !important;
        }
        .notification-footer-btn:hover {
          color: #f87171 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: { position: 'relative' },
  bellButton: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid #334155',
    borderRadius: '40px',
    padding: '8px 14px',
    color: '#e2e8f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    position: 'relative',
    // Se aplica la clase CSS en lugar de inline hover
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '20px',
    padding: '2px 6px',
    minWidth: '18px',
    textAlign: 'center',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    background: '#0f172a',
    backdropFilter: 'blur(16px)',
    border: '1px solid #334155',
    borderRadius: '20px',
    boxShadow: '0 20px 35px -10px rgba(0,0,0,0.5)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #1e293b',
    background: '#0f172a',
  },
  dropdownTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#fff',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#818cf8',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '20px',
    transition: 'all 0.2s',
  },
  dropdownContent: {
    maxHeight: '380px',
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: 0,
  },
  emptyText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid #1e293b',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'rgba(15, 23, 42, 0.5)',
    opacity: 0,
  },
  notifIcon: {
    background: 'rgba(245, 158, 11, 0.1)',
    padding: '10px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
  },
  notifContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  notifTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  notifMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: '#64748b',
  },
  closeBtn: {
    background: 'rgba(100, 100, 100, 0.1)',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    width: '26px',
    height: '26px',
  },
  dropdownFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #1e293b',
    textAlign: 'center',
    background: '#0f172a',
  },
  footerBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: '20px',
    transition: 'all 0.2s',
  },
};

export default NotificationBell;