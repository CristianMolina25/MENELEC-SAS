import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaUserPlus, FaUsers, FaTools, FaCheckCircle,
  FaTrashAlt, FaUserShield, FaEnvelope, FaIdCard,
  FaEdit, FaBuilding, FaSearch, FaTimes, FaSyncAlt,
  FaUserCog, FaCrown, FaUser, FaLayerGroup,
  FaExclamationTriangle, FaLock, FaUnlock,
  FaChevronRight, FaFilter, FaUserCheck,
  FaShieldAlt, FaKey, FaClipboardList
} from 'react-icons/fa';

// ==================== CONSTANTES ====================
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/usuarios`
  : `${window.location.protocol}//${window.location.hostname}:8080/api/usuarios`;

const ROL_CONFIG = {
  ADMIN: {
    label: 'Administrador',
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.15)',
    icon: <FaCrown size={12} />,
    borderColor: '#4338ca'
  },
  USER: {
    label: 'Usuario',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    icon: <FaUser size={12} />,
    borderColor: '#334155'
  }
};

// ==================== COMPONENTE PRINCIPAL ====================
const AdminPanel = () => {
  // Estados principales
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({
    id: null, nombre: '', email: '', password: '', rol: '', area: ''
  });
  const [areas, setAreas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [expandirFiltros, setExpandirFiltros] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Estados para cambio de contraseña del panel
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Estado para modal de confirmación de eliminación
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  // ========== CARGAR DATOS ==========
  const cargarAreas = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('/api/archivos/departamentos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAreas(res.data || []);
    } catch (error) {
      console.error("Error cargando áreas", error);
    }
  };

  const cargarUsuarios = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_BASE_URL}/listar`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsuarios(res.data);
    } catch (error) {
      console.error("Error cargando usuarios", error);
      toast.error('No se pudieron cargar los usuarios', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarAreas();
  }, []);

  // ========== ESTADÍSTICAS ==========
  const estadisticas = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter(u => u.rol === 'ADMIN').length;
    const users = total - admins;
    const areasUnicas = [...new Set(usuarios.map(u => u.area).filter(Boolean))].length;
    const sinArea = usuarios.filter(u => !u.area).length;
    return { total, admins, users, areasUnicas, sinArea };
  }, [usuarios]);

  // ========== FILTRADO ==========
  const usuariosFiltrados = useMemo(() => {
    let filtrados = [...usuarios];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(u =>
        (u.nombre || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }

    if (filtroRol !== 'TODOS') {
      filtrados = filtrados.filter(u => u.rol === filtroRol);
    }

    if (filtroArea !== 'TODAS') {
      filtrados = filtrados.filter(u => u.area === filtroArea);
    }

    return filtrados;
  }, [usuarios, busqueda, filtroRol, filtroArea]);

  // ========== MANEJADORES ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.email || (!form.id && !form.password) || !form.rol) {
      toast.error('Complete todos los campos requeridos', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
      return;
    }

    setEnviando(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_BASE_URL}/registro`, form, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      toast.success(
        form.id ? 'Funcionario actualizado correctamente' : 'Funcionario registrado con éxito',
        {
          icon: form.id ? '✏️' : '🎉',
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        }
      );

      resetForm();
      cargarUsuarios();
    } catch (err) {
      const mensaje = err.response?.data || "Error de validación o permisos.";
      toast.error(typeof mensaje === 'string' ? mensaje : 'Error al procesar solicitud', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } finally {
      setEnviando(false);
    }
  };

  const changePasswordHandler = () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Ingrese la contraseña actual');
      return;
    }
    if (!newPassword) {
      setPasswordError('Ingrese la nueva contraseña');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    const stored = localStorage.getItem('admin_panel_password');
    const currentValid = stored || 'admin123';
    if (currentPassword !== currentValid) {
      setPasswordError('Contraseña actual incorrecta');
      return;
    }

    localStorage.setItem('admin_panel_password', newPassword);
    toast.success('Contraseña del panel actualizada', {
      icon: '🔐',
      style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
    });
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const prepararEdicion = (u) => {
    setForm({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      area: u.area || ''
    });
    document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetForm = () => {
    setForm({ id: null, nombre: '', email: '', password: '', rol: '', area: '' });
  };

  const confirmarEliminacion = (user) => {
    setUsuarioAEliminar(user);
  };

  const eliminarUsuario = async () => {
    if (!usuarioAEliminar) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_BASE_URL}/eliminar/${usuarioAEliminar.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(`Acceso revocado a ${usuarioAEliminar.nombre}`, {
        icon: '🗑️',
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
      cargarUsuarios();
    } catch (err) {
      toast.error('Error al eliminar usuario', {
        style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
      });
    } finally {
      setUsuarioAEliminar(null);
    }
  };

  // ========== INYECTAR ESTILOS GLOBALES ==========
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = globalStyles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // ========== RENDER ==========
  if (cargando) {
    return <SkeletonLoader />;
  }

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.badge}>
              <FaShieldAlt size={12} /> ADMINISTRACIÓN DE USUARIOS
            </div>
            <h1 style={styles.title}>
              Panel de <span style={styles.titleAccent}>Control</span>
            </h1>
            <p style={styles.subtitle}>Gestión de accesos y permisos del sistema</p>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => setShowChangePassword(true)}
              style={styles.btnSecondary}
              title="Cambiar contraseña de acceso al panel"
            >
              <FaKey /> Cambiar contraseña de acceso al panel
            </button>
            <button onClick={cargarUsuarios} style={styles.refreshButton} title="Actualizar">
              <FaSyncAlt />
            </button>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <FaUsers style={{ color: '#818cf8', fontSize: '20px' }} />
            <span style={styles.statNumber}>{estadisticas.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #fbbf24' }}>
            <FaCrown style={{ color: '#fbbf24', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#fbbf24' }}>{estadisticas.admins}</span>
            <span style={styles.statLabel}>Admins</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #94a3b8' }}>
            <FaUser style={{ color: '#94a3b8', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#94a3b8' }}>{estadisticas.users}</span>
            <span style={styles.statLabel}>Usuarios</span>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '3px solid #10b981' }}>
            <FaBuilding style={{ color: '#10b981', fontSize: '20px' }} />
            <span style={{ ...styles.statNumber, color: '#10b981' }}>{estadisticas.areasUnicas}</span>
            <span style={styles.statLabel}>Áreas</span>
          </div>
          {estadisticas.sinArea > 0 && (
            <div style={{ ...styles.statCard, borderLeft: '3px solid #f59e0b' }}>
              <FaExclamationTriangle style={{ color: '#f59e0b', fontSize: '20px' }} />
              <span style={{ ...styles.statNumber, color: '#f59e0b' }}>{estadisticas.sinArea}</span>
              <span style={styles.statLabel}>Sin área</span>
            </div>
          )}
        </div>
      </header>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div style={styles.controlBar}>
        <div style={styles.searchWrapper}>
          <FaSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
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
          <FaFilter /> Filtros {expandirFiltros ? '▲' : '▼'}
        </button>
      </div>

      {/* FILTROS EXPANDIBLES */}
      {expandirFiltros && (
        <div style={styles.filtrosExpandidos}>
          <div style={styles.filtroGrupo}>
            <span style={styles.filtroLabel}>Rol:</span>
            {['TODOS', 'ADMIN', 'USER'].map(rol => (
              <button
                key={rol}
                onClick={() => setFiltroRol(rol)}
                style={{
                  ...styles.filtroChip,
                  background: filtroRol === rol ? (ROL_CONFIG[rol]?.bg || '#6366f120') : 'transparent',
                  color: filtroRol === rol ? (ROL_CONFIG[rol]?.color || '#f1f5f9') : '#94a3b8',
                  borderColor: filtroRol === rol ? (ROL_CONFIG[rol]?.color || '#6366f1') : '#334155'
                }}
              >
                {rol === 'TODOS' ? 'Todos' : ROL_CONFIG[rol]?.label || rol}
              </button>
            ))}
          </div>
          <div style={styles.filtroGrupo}>
            <span style={styles.filtroLabel}>Área:</span>
            <button
              onClick={() => setFiltroArea('TODAS')}
              style={{
                ...styles.filtroChip,
                background: filtroArea === 'TODAS' ? 'rgba(99,102,241,0.1)' : 'transparent',
                color: filtroArea === 'TODAS' ? '#818cf8' : '#94a3b8',
                borderColor: filtroArea === 'TODAS' ? '#6366f1' : '#334155'
              }}
            >
              Todas
            </button>
            {areas.map(area => (
              <button
                key={area}
                onClick={() => setFiltroArea(area)}
                style={{
                  ...styles.filtroChip,
                  background: filtroArea === area ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: filtroArea === area ? '#10b981' : '#94a3b8',
                  borderColor: filtroArea === area ? '#10b981' : '#334155'
                }}
              >
                {area}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setBusqueda(''); setFiltroRol('TODOS'); setFiltroArea('TODAS'); }}
            style={styles.clearFilters}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={styles.mainGrid}>
        {/* FORMULARIO */}
        <section className="form-section" style={styles.colForm}>
          <div style={styles.glassCard}>
            <h3 style={styles.cardTitle}>
              {form.id ? (
                <><FaEdit style={{ color: '#facc15' }} /> Editar Funcionario</>
              ) : (
                <><FaUserPlus style={{ color: '#818cf8' }} /> Nuevo Registro</>
              )}
            </h3>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}><FaIdCard /> Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej: María García López"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  style={styles.darkInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}><FaEnvelope /> Correo Corporativo</label>
                <input
                  type="email"
                  placeholder="usuario@menelec.sas"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={styles.darkInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}><FaLock /> {form.id ? 'Nueva Contraseña (opcional)' : 'Contraseña Temporal'}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!form.id}
                  style={styles.darkInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}><FaUserShield /> Nivel de Acceso</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  required
                  style={styles.darkSelect}
                >
                  <option value="">Seleccione rol...</option>
                  <option value="ADMIN">🔑 ADMINISTRADOR</option>
                  <option value="USER">👤 USUARIO ESTÁNDAR</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}><FaBuilding /> Área / Departamento</label>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  style={styles.darkSelect}
                >
                  <option value="">Sin área asignada</option>
                  {areas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <small style={styles.helpText}>
                  El área determina los documentos que debe aprobar este usuario.
                </small>
              </div>

              <button
                type="submit"
                disabled={enviando}
                style={{
                  ...styles.btnSubmit,
                  background: form.id
                    ? 'linear-gradient(135deg, #facc15, #eab308)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: form.id ? '#000' : '#fff',
                  opacity: enviando ? 0.7 : 1
                }}
              >
                {enviando ? (
                  <><FaSyncAlt style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
                ) : form.id ? (
                  <><FaEdit /> Guardar Cambios</>
                ) : (
                  <><FaUserPlus /> Registrar Funcionario</>
                )}
              </button>

              {form.id && (
                <button type="button" onClick={resetForm} style={styles.btnReset}>
                  <FaTimes /> Cancelar Edición
                </button>
              )}
            </form>
          </div>
        </section>

        {/* TABLA DE USUARIOS */}
        <section style={styles.colTable}>
          <div style={styles.glassCard}>
            <div style={styles.tableHeader}>
              <h3 style={styles.cardTitle}>
                <FaUsers style={{ color: '#818cf8' }} /> Listado de Personal
              </h3>
              <span style={styles.tableCounter}>
                {usuariosFiltrados.length} de {usuarios.length} usuarios
              </span>
            </div>

            {usuariosFiltrados.length === 0 ? (
              <div style={styles.emptyState}>
                <FaUserCog size={48} style={{ opacity: 0.3 }} />
                <p style={styles.emptyTitle}>Sin resultados</p>
                <p style={styles.emptyDesc}>
                  {busqueda ? `No hay usuarios que coincidan con "${busqueda}"` : 'No hay usuarios registrados aún'}
                </p>
              </div>
            ) : (
              <div style={styles.tableScroll}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={styles.th}>Nombre</th>
                      <th style={styles.th}>Correo</th>
                      <th style={styles.th}>Rol</th>
                      <th style={styles.th}>Área</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u, idx) => (
                      <tr
                        key={u.id}
                        style={{
                          ...styles.tbodyRow,
                          animation: `fadeInUp 0.3s ${idx * 0.04}s ease-out forwards`,
                          opacity: 0
                        }}
                      >
                        <td style={styles.tdPrimary}>
                          <div style={styles.userCell}>
                            <div style={styles.avatarCircle}>
                              {(u.nombre || '?')[0].toUpperCase()}
                            </div>
                            {u.nombre}
                          </div>
                        </td>
                        <td style={styles.tdSecondary}>{u.email}</td>
                        <td>
                          <span style={{
                            ...styles.badgeRol,
                            backgroundColor: ROL_CONFIG[u.rol]?.bg || ROL_CONFIG.USER.bg,
                            color: ROL_CONFIG[u.rol]?.color || ROL_CONFIG.USER.color,
                            borderColor: ROL_CONFIG[u.rol]?.borderColor || ROL_CONFIG.USER.borderColor
                          }}>
                            {ROL_CONFIG[u.rol]?.icon} {ROL_CONFIG[u.rol]?.label || u.rol}
                          </span>
                        </td>
                        <td style={styles.tdSecondary}>
                          {u.area ? (
                            <span style={styles.areaBadge}>
                              <FaBuilding size={10} /> {u.area}
                            </span>
                          ) : (
                            <span style={styles.sinAreaBadge}>Sin asignar</span>
                          )}
                        </td>
                        <td style={styles.tdActions}>
                          <button
                            onClick={() => prepararEdicion(u)}
                            style={styles.btnEdit}
                            title="Editar usuario"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => confirmarEliminacion(u)}
                            style={styles.btnDelete}
                            title="Eliminar usuario"
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      {showChangePassword && (
        <div style={modalStyles.overlay} onClick={() => setShowChangePassword(false)}>
          <div style={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <div style={modalStyles.modalHeader}>
              <FaKey style={{ color: '#facc15' }} />
              <h3>Cambiar contraseña del panel</h3>
              <FaTimes style={modalStyles.closeBtn} onClick={() => setShowChangePassword(false)} />
            </div>

            <div style={modalStyles.modalBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                  style={styles.darkInput}
                  autoFocus
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  style={styles.darkInput}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  style={styles.darkInput}
                />
              </div>

              {passwordError && (
                <div style={styles.errorBanner}>
                  <FaExclamationTriangle /> {passwordError}
                </div>
              )}
            </div>

            <div style={modalStyles.modalFooter}>
              <button onClick={() => setShowChangePassword(false)} style={styles.btnGhost}>
                Cancelar
              </button>
              <button
                onClick={changePasswordHandler}
                style={{
                  ...styles.btnSubmitSmall,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff'
                }}
              >
                Actualizar contraseña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINACIÓN */}
      {usuarioAEliminar && (
        <div style={modalStyles.overlay} onClick={() => setUsuarioAEliminar(null)}>
          <div style={modalStyles.modalSmall} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <FaExclamationTriangle size={40} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ color: '#f1f5f9', textAlign: 'center', margin: '0 0 8px 0' }}>
              ¿Revocar acceso?
            </h3>
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: '0 0 20px 0', fontSize: '14px' }}>
              Se eliminará permanentemente a <strong style={{ color: '#f1f5f9' }}>{usuarioAEliminar.nombre}</strong> del sistema.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setUsuarioAEliminar(null)} style={styles.btnGhost}>
                Cancelar
              </button>
              <button
                onClick={eliminarUsuario}
                style={{
                  ...styles.btnSubmitSmall,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff'
                }}
              >
                <FaTrashAlt /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== SKELETON LOADER ====================
const SkeletonLoader = () => (
  <div style={styles.container}>
    <div style={styles.header}>
      <div style={{ ...styles.skeletonLine, width: '200px', height: '24px' }} />
      <div style={{ ...styles.skeletonLine, width: '150px', height: '16px', marginTop: '8px' }} />
    </div>
    <div style={styles.mainGrid}>
      <div style={{ ...styles.glassCard, minHeight: '400px' }}>
        <div style={{ ...styles.skeletonLine, width: '60%', height: '20px', marginBottom: '20px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '44px', marginBottom: '16px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '44px', marginBottom: '16px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '44px', marginBottom: '16px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '44px' }} />
      </div>
      <div style={{ ...styles.glassCard, minHeight: '400px' }}>
        <div style={{ ...styles.skeletonLine, width: '40%', height: '20px', marginBottom: '20px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '40px', marginBottom: '8px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '40px', marginBottom: '8px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '40px', marginBottom: '8px' }} />
        <div style={{ ...styles.skeletonLine, width: '100%', height: '40px' }} />
      </div>
    </div>
  </div>
);

// ==================== ESTILOS ====================
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
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: '#818cf8',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '800',
    marginBottom: '8px',
    letterSpacing: '1.5px',
    border: '1px solid rgba(99, 102, 241, 0.2)'
  },
  title: {
    fontSize: '2.4rem',
    fontWeight: '900',
    margin: '0',
    color: '#f1f5f9',
    letterSpacing: '-1px',
    lineHeight: '1.1'
  },
  titleAccent: {
    background: 'linear-gradient(135deg, #818cf8, #6366f1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: { color: '#64748b', fontSize: '1rem', margin: '4px 0 0 0' },
  btnSecondary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: '12px',
    color: '#f1f5f9',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  refreshButton: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
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
  statLabel: { fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  controlBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 300px',
    maxWidth: '500px'
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
    padding: '12px 16px 12px 42px',
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
    whiteSpace: 'nowrap'
  },
  filtrosExpandidos: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '16px',
    background: '#1e293b',
    borderRadius: '16px',
    marginBottom: '20px',
    border: '1px solid #334155',
    alignItems: 'center'
  },
  filtroGrupo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  filtroLabel: { color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  filtroChip: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #334155',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    transition: 'all 0.2s',
    background: 'transparent',
    color: '#94a3b8'
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
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '380px 1fr',
    gap: '24px',
    alignItems: 'start'
  },
  glassCard: {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(10px)',
    padding: '24px',
    borderRadius: '20px',
    border: '1px solid #334155',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#f1f5f9',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  darkInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s, box-shadow 0.3s'
  },
  darkSelect: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#f1f5f9',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  helpText: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px'
  },
  btnSubmit: {
    border: 'none',
    padding: '14px',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  },
  btnSubmitSmall: {
    border: 'none',
    padding: '10px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnReset: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    padding: '10px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  btnGhost: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    padding: '10px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: '600'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px'
  },
  tableCounter: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '600',
    background: '#0f172a',
    padding: '6px 12px',
    borderRadius: '8px'
  },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '700px' },
  theadRow: { borderBottom: '2px solid #334155' },
  th: {
    textAlign: 'left',
    color: '#64748b',
    fontSize: '11px',
    textTransform: 'uppercase',
    padding: '12px 12px',
    fontWeight: '800',
    letterSpacing: '0.5px'
  },
  tbodyRow: {
    borderBottom: '1px solid #1e293b',
    transition: 'background 0.2s'
  },
  tdPrimary: {
    padding: '14px 12px',
    fontWeight: '700',
    color: '#f1f5f9',
    fontSize: '14px'
  },
  tdSecondary: {
    color: '#94a3b8',
    fontSize: '13px',
    padding: '14px 12px'
  },
  tdActions: {
    textAlign: 'right',
    padding: '14px 12px',
    whiteSpace: 'nowrap'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatarCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '800',
    color: '#fff',
    flexShrink: 0
  },
  badgeRol: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '800',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  },
  areaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
    color: '#34d399',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid rgba(16, 185, 129, 0.2)'
  },
  sinAreaBadge: {
    padding: '4px 10px',
    background: 'rgba(245, 158, 11, 0.1)',
    borderRadius: '8px',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: '600',
    border: '1px solid rgba(245, 158, 11, 0.2)'
  },
  btnEdit: {
    background: '#334155',
    border: 'none',
    color: '#f1f5f9',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s'
  },
  btnDelete: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    padding: '8px',
    cursor: 'pointer',
    marginLeft: '6px',
    borderRadius: '10px',
    transition: 'all 0.2s',
    fontSize: '14px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  },
  emptyTitle: { fontSize: '18px', fontWeight: '700', color: '#94a3b8', margin: '12px 0 4px' },
  emptyDesc: { fontSize: '14px', color: '#64748b', margin: 0 },
  skeletonLine: {
    background: '#334155',
    borderRadius: '8px',
    animation: 'skeletonPulse 1.5s infinite'
  }
};

// ==================== ESTILOS MODALES ====================
const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modal: {
    background: '#1e293b',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid #334155',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  },
  modalSmall: {
    background: '#1e293b',
    borderRadius: '20px',
    padding: '24px',
    width: '100%',
    maxWidth: '380px',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 24px',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '16px',
    fontWeight: '700',
    borderBottom: '1px solid #1e293b'
  },
  closeBtn: {
    marginLeft: 'auto',
    cursor: 'pointer',
    color: '#94a3b8',
    fontSize: '18px'
  },
  modalBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '16px 24px',
    borderTop: '1px solid #1e293b'
  }
};

// ==================== ESTILOS GLOBALES ====================
const globalStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
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
  tr:hover td {
    background: rgba(99, 102, 241, 0.03);
  }
  input:focus, select:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }
  button:hover {
    transform: scale(0.97);
  }
  select option {
    background: #1e293b;
    color: #f1f5f9;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }
  *::-webkit-scrollbar { width: 6px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  @media (max-width: 900px) {
    ${'' /* Se podría añadir responsividad si se desea */}
  }
`;

export default AdminPanel;