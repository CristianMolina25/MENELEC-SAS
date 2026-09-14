import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import {
  FaTasks, FaGoogle, FaCalendarAlt, FaExclamationTriangle,
  FaUserAlt, FaParagraph, FaTimes, FaPlusCircle, FaRocket, FaClock, FaPaperclip,
  FaSpinner, FaCheckCircle, FaInfoCircle, FaTrashAlt, FaCloudUploadAlt,
  FaClipboardList, FaLayerGroup, FaEdit
} from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';

const CrearTarea = ({ setVistaActiva }) => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tarea, setTarea] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    fechaEntrega: '',
    horaEntrega: '09:00',
    responsables: [],
    archivos: []
  });

  const [tareasCreadas, setTareasCreadas] = useState([]);
  const [cargandoTareas, setCargandoTareas] = useState(false);
  const [editandoTareaId, setEditandoTareaId] = useState(null);

  const API_BASE = "http://10.187.227.59:8080/api";
  const token = localStorage.getItem('token');
  const tareaChannelRef = useRef(null);

  // Obtener email del usuario desde el token JWT
  const obtenerEmailUsuario = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub; // asumiendo que el subject es el email
    } catch (error) {
      console.error("Error decodificando token:", error);
      return null;
    }
  };

  const emailUsuario = obtenerEmailUsuario();

  // Función para cargar tareas creadas por el usuario actual
  const cargarTareasCreadas = async () => {
    setCargandoTareas(true);
    try {
      const res = await axios.get(`${API_BASE}/tareas/listar-todas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tareasActivas = res.data.filter(t => {
        const estado = (t.estado || "").toString().toUpperCase().trim();
        return estado !== "COMPLETADO" && estado !== "FINALIZADO";
      });
      setTareasCreadas(tareasActivas);
    } catch (err) {
      console.error("Error cargando tareas creadas:", err);
    } finally {
      setCargandoTareas(false);
    }
  };

  useEffect(() => {
    tareaChannelRef.current = new BroadcastChannel('tarea_nueva');
    return () => tareaChannelRef.current?.close();
  }, []);

  // Cargar usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      setCargandoUsuarios(true);
      setErrorUsuarios(null);
      try {
        const res = await axios.get(`${API_BASE}/usuarios/listar`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsuarios(res.data);
      } catch (err) {
        console.error("Error cargando personal:", err);
        setErrorUsuarios('No se pudo cargar la lista de usuarios.');
      } finally {
        setCargandoUsuarios(false);
      }
    };
    fetchUsers();
  }, [token]);

  // Cargar tareas creadas al montar
  useEffect(() => {
    if (emailUsuario) {
      cargarTareasCreadas();
    }
  }, [emailUsuario]);

  const handleSelectResponsable = (email) => {
    if (!email) return;
    setTarea(prev => ({
      ...prev,
      responsables: prev.responsables.includes(email)
        ? prev.responsables.filter(e => e !== email)
        : [...prev.responsables, email]
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      toast.error('El tamaño total de los archivos no debe superar 50 MB');
      return;
    }
    setTarea(prev => ({ ...prev, archivos: files }));
  };

  const removeFile = (index) => {
    setTarea(prev => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index)
    }));
  };

  const clearForm = () => {
    setTarea({
      titulo: '',
      descripcion: '',
      prioridad: 'MEDIA',
      fechaEntrega: '',
      horaEntrega: '09:00',
      responsables: [],
      archivos: []
    });
    setEditandoTareaId(null);
    toast.success('Formulario limpiado');
  };

  const editarTarea = (tareaEdit) => {
    const fechaCompleta = tareaEdit.fechaEntrega || '';
    const [fecha, hora] = fechaCompleta.includes('T') ? fechaCompleta.split('T') : [fechaCompleta, '09:00'];
    setTarea({
      id: tareaEdit.id,
      titulo: tareaEdit.titulo || '',
      descripcion: tareaEdit.descripcion || '',
      prioridad: tareaEdit.prioridad || 'MEDIA',
      fechaEntrega: fecha || '',
      horaEntrega: hora ? hora.substring(0,5) : '09:00',
      responsables: tareaEdit.responsables || [],
      archivos: []
    });
    setEditandoTareaId(tareaEdit.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tarea.responsables.length === 0) {
      toast.error("Debes seleccionar al menos un responsable.");
      return;
    }

    setLoading(true);
    try {
      const fechaCompleta = `${tarea.fechaEntrega}T${tarea.horaEntrega}:00`;
      const tareaParaEnviar = {
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        prioridad: tarea.prioridad,
        fechaEntrega: fechaCompleta,
        responsables: tarea.responsables
      };

      if (editandoTareaId) {
        await axios.put(`${API_BASE}/tareas/actualizar/${editandoTareaId}`, tareaParaEnviar, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("✅ Tarea actualizada correctamente");
      } else {
        const response = await axios.post(
          `${API_BASE}/tareas/crear-con-sincronizacion`,
          tareaParaEnviar,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const tareaCreada = response.data;
        const tareaId = tareaCreada.id;

        if (tarea.archivos.length > 0) {
          const promesasSubida = tarea.archivos.map(async (archivo) => {
            const formData = new FormData();
            formData.append('file', archivo);
            formData.append('ruta', '');
            formData.append('tareaId', tareaId);
            await axios.post(`${API_BASE}/archivos/upload`, formData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            });
          });
          await Promise.all(promesasSubida);
          toast.success(`✅ Tarea creada con ${tarea.archivos.length} archivo(s)`);
        } else {
          toast.success("✅ Tarea creada correctamente");
        }

        if (tareaChannelRef.current) {
          tareaChannelRef.current.postMessage({
            type: 'NUEVA_TAREA',
            tarea: tareaCreada && tareaCreada.id ? tareaCreada : {
              id: Date.now(),
              titulo: tarea.titulo,
              descripcion: tarea.descripcion,
              prioridad: tarea.prioridad,
              fechaEntrega: fechaCompleta,
              responsables: tarea.responsables,
              estado: 'NUEVA'
            }
          });
        }
      }

      clearForm();
      await cargarTareasCreadas();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.status === 401
        ? "Sesión expirada. Inicia sesión nuevamente."
        : "Error al procesar la tarea. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Estilos responsivos combinados
  const styles = useMemo(() => ({
    container: {
      padding: isMobile ? '16px' : '32px',
      maxWidth: '1300px',
      margin: '0 auto',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      minHeight: '100vh',
      color: '#f1f5f9'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
      flexWrap: 'wrap',
      gap: '20px'
    },
    headerLeft: {},
    headerActions: {
      display: 'flex',
      gap: '10px'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(99, 102, 241, 0.15)',
      color: '#a5b4fc',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      marginBottom: '12px',
      border: '1px solid rgba(99, 102, 241, 0.2)'
    },
    title: {
      fontSize: isMobile ? '1.8rem' : '2.4rem',
      fontWeight: '900',
      margin: 0,
      color: '#f8fafc',
      lineHeight: '1.1',
      letterSpacing: '-1px',
      fontFamily: "'Outfit', 'Syne', sans-serif"
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '0.95rem',
      marginTop: '6px'
    },
    clearBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: isMobile ? '10px 14px' : '10px 18px',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      color: '#f87171',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backdropFilter: 'blur(8px)',
      fontSize: isMobile ? '12px' : '13px'
    },
    backBtn: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? '40px' : '42px',
      height: isMobile ? '40px' : '42px',
      background: 'rgba(148, 163, 184, 0.1)',
      border: '1px solid #334155',
      borderRadius: '12px',
      color: '#94a3b8',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'all 0.2s'
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
      gap: isMobile ? '24px' : '32px',
      alignItems: 'start'
    },
    formSection: { minWidth: 0 },
    card: {
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(20px)',
      borderRadius: '28px',
      padding: isMobile ? '20px' : '32px',
      border: '1px solid rgba(99, 102, 241, 0.15)',
      boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '22px'
    },
    fullWidth: { gridColumn: '1 / -1' },
    halfWidth: {},
    label: {
      fontSize: '0.75rem',
      fontWeight: '800',
      color: '#818cf8',
      letterSpacing: '1px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textTransform: 'uppercase'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '28px',
      flexDirection: isMobile ? 'column' : 'row'
    },
    cancelBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '14px 20px',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '16px',
      color: '#f87171',
      fontWeight: '700',
      fontSize: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    },
    input: {
      width: '100%',
      padding: '13px 16px',
      background: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid #334155',
      borderRadius: '14px',
      color: '#f1f5f9',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif"
    },
    textarea: {
      width: '100%',
      padding: '16px',
      background: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid #334155',
      borderRadius: '14px',
      color: '#f1f5f9',
      fontSize: '14px',
      height: '140px',
      resize: 'none',
      outline: 'none',
      lineHeight: '1.6',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      transition: 'all 0.3s'
    },
    selectWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    selectIcon: {
      position: 'absolute',
      right: '16px',
      color: '#6366f1',
      pointerEvents: 'none'
    },
    badgeContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '10px',
      minHeight: '32px',
      maxHeight: '120px',
      overflowY: 'auto',
      padding: '2px'
    },
    badge: {
      background: 'rgba(99, 102, 241, 0.2)',
      color: '#c7d2fe',
      padding: '6px 14px',
      borderRadius: '10px',
      fontSize: '12px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      animation: 'fadeInUp 0.3s ease-out',
      backdropFilter: 'blur(4px)'
    },
    fileUploadArea: {
      border: '2px dashed #475569',
      borderRadius: '16px',
      padding: isMobile ? '20px' : '28px',
      textAlign: 'center',
      background: 'rgba(15, 23, 42, 0.7)',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginTop: '6px'
    },
    fileLabel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer'
    },
    fileLabelText: {
      fontSize: isMobile ? '13px' : '15px',
      color: '#cbd5e1',
      fontWeight: '500'
    },
    fileHint: {
      fontSize: '11px',
      color: '#64748b'
    },
    fileList: {
      listStyle: 'none',
      padding: 0,
      margin: '10px 0 0 0'
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 14px',
      background: '#0f172a',
      borderRadius: '12px',
      marginBottom: '6px',
      fontSize: '13px',
      color: '#e2e8f0',
      border: '1px solid #1e293b'
    },
    syncInfo: {
      marginTop: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      backgroundColor: 'rgba(66, 133, 244, 0.06)',
      borderRadius: '18px',
      border: '1px solid rgba(66, 133, 244, 0.15)',
      flexDirection: isMobile ? 'column' : 'row',
      textAlign: isMobile ? 'center' : 'left'
    },
    googleBadge: {
      backgroundColor: '#4285F4',
      padding: '12px',
      borderRadius: '16px',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(66,133,244,0.3)'
    },
    submitBtn: {
      padding: '14px 20px',
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '16px',
      fontWeight: '800',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      letterSpacing: '0.5px',
      transition: 'all 0.3s',
      boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
      cursor: 'pointer',
      width: '100%'
    },
    tareasSection: {
      position: isMobile ? 'static' : 'sticky',
      top: '32px'
    },
    tareasCard: {
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(20px)',
      borderRadius: '28px',
      padding: isMobile ? '20px' : '24px',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
    },
    previewTitle: {
      fontSize: '13px',
      fontWeight: '700',
      color: '#a5b4fc',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      letterSpacing: '1px',
      textTransform: 'uppercase'
    },
    tareasListContainer: {
      maxHeight: isMobile ? '40vh' : '70vh',
      overflowY: 'auto',
      marginTop: '8px'
    },
    emptyTareas: {
      textAlign: 'center',
      padding: '24px 16px'
    },
    tareaItemCard: {
      background: 'rgba(30, 41, 59, 0.4)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      transition: 'all 0.2s',
      cursor: 'default'
    },
    tareaItemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px'
    },
    tareaItemTitulo: {
      fontWeight: '700',
      color: '#f1f5f9',
      fontSize: '15px',
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    priorityBadge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '700',
      whiteSpace: 'nowrap'
    },
    tareaItemMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '10px',
      flexWrap: 'wrap'
    },
    editarTareaBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 14px',
      background: 'rgba(99, 102, 241, 0.15)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '10px',
      color: '#a5b4fc',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: '100%',
      justifyContent: 'center'
    }
  }), [isMobile]);

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" toastOptions={{ 
        duration: 3000,
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
      }} />

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.statusBadge}>
            <FaLayerGroup size={12} /> SPRINT PLANNER
          </div>
          <h1 style={styles.title}>Crear una nueva tarea</h1>
          <p style={styles.subtitle}>Asigna tareas sincronizadas con los empleados</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={clearForm} style={styles.clearBtn} title="Limpiar formulario">
            <FaTrashAlt /> Limpiar
          </button>
          <button onClick={() => setVistaActiva ? setVistaActiva('eventos') : window.history.back()} style={styles.backBtn} title="Volver">
            <FaTimes />
          </button>
        </div>
      </header>

      <div style={styles.mainGrid}>
        <div style={styles.formSection}>
          <form onSubmit={handleSubmit} style={styles.card}>
            <div style={styles.formGrid}>
              <div style={styles.fullWidth}>
                <label style={styles.label}><FaTasks /> Título de la tarea</label>
                <input
                  value={tarea.titulo}
                  onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })}
                  style={styles.input}
                  placeholder="Ej: Integración de API OnlyOffice"
                  required
                  className="input-modern"
                />
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}><FaCalendarAlt /> Fecha límite</label>
                <input
                  type="date"
                  value={tarea.fechaEntrega}
                  onChange={(e) => setTarea({ ...tarea, fechaEntrega: e.target.value })}
                  style={{ ...styles.input, colorScheme: 'dark' }}
                  required
                  className="input-modern"
                />
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}><FaClock /> Hora límite (24h)</label>
                <input
                  type="time"
                  value={tarea.horaEntrega}
                  onChange={(e) => setTarea({ ...tarea, horaEntrega: e.target.value })}
                  style={{ ...styles.input, colorScheme: 'dark' }}
                  required
                  className="input-modern"
                />
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}><FaExclamationTriangle /> Prioridad</label>
                <select
                  value={tarea.prioridad}
                  onChange={(e) => setTarea({ ...tarea, prioridad: e.target.value })}
                  style={styles.input}
                  className="input-modern"
                >
                  <option value="ALTA">🔴 Alta</option>
                  <option value="MEDIA">🟡 Media</option>
                  <option value="BAJA">🟢 Baja</option>
                </select>
              </div>

              <div style={styles.halfWidth}>
                <label style={styles.label}><FaUserAlt /> Responsables</label>
                <div style={styles.selectWrapper}>
                  <select
                    value=""
                    onChange={(e) => handleSelectResponsable(e.target.value)}
                    style={styles.input}
                    className="input-modern"
                  >
                    <option value="" disabled>
                      {cargandoUsuarios ? 'Cargando...' : errorUsuarios ? 'Error al cargar' : 'Seleccionar integrante'}
                    </option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.email} disabled={tarea.responsables.includes(u.email)}>
                        {u.nombre} ({u.email})
                      </option>
                    ))}
                  </select>
                  {cargandoUsuarios && <FaSpinner style={styles.selectIcon} className="spin" />}
                  {!cargandoUsuarios && !errorUsuarios && <FaPlusCircle style={styles.selectIcon} />}
                </div>
                <div style={styles.badgeContainer}>
                  {tarea.responsables.length === 0 && (
                    <span style={{ color: '#64748b', fontSize: '12px' }}>Ningún responsable asignado</span>
                  )}
                  {tarea.responsables.map(email => (
                    <span key={email} style={styles.badge} className="badge-anim">
                      {email.split('@')[0]}
                      <FaTimes
                        style={{ cursor: 'pointer', marginLeft: '8px' }}
                        onClick={() => handleSelectResponsable(email)}
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.fullWidth}>
                <label style={styles.label}><FaParagraph /> Descripción</label>
                <textarea
                  value={tarea.descripcion}
                  onChange={(e) => setTarea({ ...tarea, descripcion: e.target.value })}
                  style={styles.textarea}
                  placeholder="Describe los pasos, requisitos o detalles importantes..."
                  className="input-modern"
                />
              </div>

              {!editandoTareaId && (
                <div style={styles.fullWidth}>
                  <label style={styles.label}><FaPaperclip /> Archivos adjuntos (máx. 50 MB)</label>
                  <div style={styles.fileUploadArea}>
                    <input
                      type="file"
                      multiple
                      id="file-input"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.txt"
                    />
                    <label htmlFor="file-input" style={styles.fileLabel}>
                      <FaCloudUploadAlt size={32} color="#818cf8" />
                      <span style={styles.fileLabelText}>
                        {tarea.archivos.length === 0 ? 'Arrastra archivos o haz clic para seleccionar' : `${tarea.archivos.length} archivo(s) seleccionado(s)`}
                      </span>
                      <span style={styles.fileHint}>PDF, Word, Excel, imágenes (máx. 10 MB c/u)</span>
                    </label>
                  </div>
                  {tarea.archivos.length > 0 && (
                    <ul style={styles.fileList}>
                      {tarea.archivos.map((file, i) => (
                        <li key={i} style={styles.fileItem}>
                          <FaPaperclip style={{ color: '#818cf8', marginRight: '8px' }} />
                          <span style={{ flex: 1 }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                          <FaTimes
                            style={{ cursor: 'pointer', color: '#f87171' }}
                            onClick={() => removeFile(i)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div style={styles.syncInfo}>
              <div style={styles.googleBadge}><FaGoogle size={20} /></div>
              <div>
                <h4 style={{ margin: 0, color: '#f1f5f9', fontWeight: '700' }}>Cloud Sync Active</h4>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px', lineHeight: '1.4' }}>
                  Se notificará y agendará automáticamente a <b>{tarea.responsables.length}</b> responsable(s)
                </p>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              {editandoTareaId && (
                <button type="button" onClick={clearForm} style={styles.cancelBtn}>
                  <FaTimes /> Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-launch"
                style={{
                  ...styles.submitBtn,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <><FaSpinner className="spin" /> {editandoTareaId ? 'Actualizando...' : 'Asignando...'}</>
                ) : (
                  <>{editandoTareaId ? <FaEdit /> : <FaRocket />} {editandoTareaId ? 'Actualizar Tarea' : 'Asignar Tarea'}</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* LISTA DE TAREAS CREADAS */}
        <div style={styles.tareasSection}>
          <div style={styles.tareasCard}>
            <h3 style={styles.previewTitle}><FaClipboardList /> Tareas que he asignado</h3>
            <div style={styles.tareasListContainer}>
              {cargandoTareas ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <FaSpinner className="spin" /> Cargando tareas...
                </div>
              ) : tareasCreadas.length === 0 ? (
                <div style={styles.emptyTareas}>
                  <FaInfoCircle style={{ color: '#818cf8', marginBottom: '8px', fontSize: '24px' }} />
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>No has asignado ninguna tarea todavía.</p>
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Las tareas que crees aparecerán aquí.</p>
                </div>
              ) : (
                tareasCreadas.map((tareaItem) => (
                  <div key={tareaItem.id} style={styles.tareaItemCard}>
                    <div style={styles.tareaItemHeader}>
                      <span style={styles.tareaItemTitulo}>{tareaItem.titulo}</span>
                      <span style={{
                        ...styles.priorityBadge,
                        background: tareaItem.prioridad === 'ALTA' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: tareaItem.prioridad === 'ALTA' ? '#f87171' : '#fbbf24'
                      }}>
                        {tareaItem.prioridad}
                      </span>
                    </div>
                    <div style={styles.tareaItemMeta}>
                      <FaCalendarAlt size={10} color="#64748b" />
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                        {tareaItem.fechaEntrega ? new Date(tareaItem.fechaEntrega).toLocaleDateString('es-CO') : 'Sin fecha'}
                      </span>
                      <span style={{ margin: '0 8px', color: '#334155' }}>|</span>
                      <FaUserAlt size={10} color="#64748b" />
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                        {tareaItem.responsables ? tareaItem.responsables.map(r => typeof r === 'string' ? r.split('@')[0] : r.email?.split('@')[0]).join(', ') : 'Ninguno'}
                      </span>
                    </div>
                    <button onClick={() => editarTarea(tareaItem)} style={styles.editarTareaBtn}>
                      <FaEdit size={12} /> Editar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        .input-modern:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25) !important;
          background: #0f172a !important;
        }
        .btn-launch:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(79, 70, 229, 0.5);
          filter: brightness(1.1);
        }
        .btn-launch:active { transform: translateY(0); }
        .badge-anim { animation: fadeInUp 0.3s ease-out; }
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
        .input-modern:hover { border-color: #475569; }
        .file-upload-area:hover {
          border-color: #6366f1;
          background: rgba(15, 23, 42, 0.9);
        }
      `}</style>
    </div>
  );
};

export default CrearTarea;

