import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaArrowLeft, FaUpload, FaDownload, FaTrashAlt, FaSyncAlt,
  FaSpinner, FaPlus, FaSave, FaFileAlt, FaBell, FaCalendarAlt, FaSearch
} from 'react-icons/fa';

const API_SOPORTE = '/api/soporte-documental';

// ========== FUNCIONES AUXILIARES ==========
const parseDateLocal = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  if (fechaStr instanceof Date) return fechaStr;
  let cleaned = fechaStr.replace(/\(.*?\)/g, '')
    .replace(/\d{1,2}:\d{2}(:\d{2})?.*$/i, '')
    .replace(/[aApP][mM]\.?/g, '')
    .trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  let separador = '/';
  if (cleaned.includes('-')) separador = '-';
  if (!cleaned.includes(separador) && cleaned.includes('.')) separador = '.';
  const partes = cleaned.split(separador);
  if (partes.length !== 3) return null;
  let dia, mes, año;
  if (partes[0].length === 4) {
    año = parseInt(partes[0]);
    mes = parseInt(partes[1]);
    dia = parseInt(partes[2]);
  } else {
    dia = parseInt(partes[0]);
    mes = parseInt(partes[1]);
    año = parseInt(partes[2]);
  }
  if (isNaN(dia) || isNaN(mes) || isNaN(año)) return null;
  return new Date(año, mes - 1, dia);
};

const calcularDiasRestantes = (fechaStr) => {
  const fecha = parseDateLocal(fechaStr);
  if (!fecha || isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTime = fecha - hoy;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getUrgenciaColor = (dias) => {
  if (dias === null) return '#94a3b8';
  if (dias < 0) return '#f87171';
  if (dias <= 3) return '#fca5a5';
  if (dias <= 7) return '#fcd34d';
  if (dias <= 15) return '#60a5fa';
  if (dias <= 30) return '#34d399';
  return '#6ee7b7';
};

const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '—';
  if (typeof fechaStr === 'string' && fechaStr.includes('-')) {
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }
  if (typeof fechaStr === 'string' && fechaStr.includes('/')) {
    return fechaStr;
  }
  return fechaStr;
};

// ========== COMPONENTE PRINCIPAL ==========
const GestionSoporteDocumental = ({ onBack }) => {
  const [vista, setVista] = useState('menu');
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [nuevoRegistro, setNuevoRegistro] = useState({
    nombreArchivo: '',
    origen: '',
    vencimiento: '',
    subcategoria: '',
    emisor: '',
    anio: ''
  });
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const categoriaActual =
    vista === 'capacidadJuridica' ? 'CAPACIDAD_JURIDICA'
    : vista === 'experiencia' ? 'EXPERIENCIA'
    : vista === 'capacidadTecnica' ? 'CAPACIDAD_TECNICA'
    : null;

  // Cargar registros
  const cargarRegistros = useCallback(async () => {
    if (!categoriaActual) return;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_SOPORTE}/${categoriaActual}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegistros(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error al cargar registros:', error);
      toast.error('Error al cargar registros');
    } finally {
      setCargando(false);
    }
  }, [categoriaActual]);

  useEffect(() => {
    if (vista !== 'menu') cargarRegistros();
  }, [vista, cargarRegistros]);

  // ===== SUBIR NUEVO DOCUMENTO =====
  const handleSubirArchivo = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      toast.error('Selecciona un archivo');
      return;
    }

    if (vista === 'capacidadJuridica' && !nuevoRegistro.nombreArchivo.trim()) {
      toast.error('El nombre del archivo es obligatorio');
      return;
    }
    if (vista !== 'capacidadJuridica' && !nuevoRegistro.subcategoria.trim()) {
      toast.error('La categoría es obligatoria');
      return;
    }

    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', archivoSeleccionado);
    formData.append('datos', JSON.stringify(nuevoRegistro));

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_SOPORTE}/${categoriaActual}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Documento agregado correctamente');
      setNuevoRegistro({ nombreArchivo: '', origen: '', vencimiento: '', subcategoria: '', emisor: '', anio: '' });
      setArchivoSeleccionado(null);
      cargarRegistros();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al subir el documento';
      toast.error(msg);
    } finally {
      setSubiendo(false);
    }
  };

  // ===== ELIMINAR =====
  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este documento permanentemente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_SOPORTE}/${categoriaActual}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Documento eliminado');
      cargarRegistros();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // ===== DESCARGAR (con nombre descriptivo + extensión) =====
  const descargarArchivo = async (rutaRelativa, nombreDescriptivo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/archivos/download', {
        params: { ruta: rutaRelativa },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const extension = rutaRelativa.split('.').pop();
      const nombreArchivo = `${nombreDescriptivo}.${extension}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Error al descargar el archivo');
    }
  };

  // ===== ACTUALIZAR / REEMPLAZAR ARCHIVO =====
  const handleActualizarArchivo = async (id, nuevoArchivo) => {
    if (!nuevoArchivo) return;
    setActualizando(true);
    const formData = new FormData();
    formData.append('file', nuevoArchivo);

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_SOPORTE}/${categoriaActual}/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Archivo actualizado. Fecha de vencimiento +1 mes');
      cargarRegistros();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar el archivo';
      toast.error(msg);
    } finally {
      setActualizando(false);
    }
  };

  // ===== FILTRO LOCAL =====
  const registrosFiltrados = registros.filter(r => {
    const search = busquedaLocal.toLowerCase();
    if (vista === 'capacidadJuridica') {
      return (
        (r.nombreArchivo?.toLowerCase().includes(search) || '') ||
        (r.origen?.toLowerCase().includes(search) || '') ||
        (r.vencimiento?.toString().includes(search) || '')
      );
    } else {
      return (
        (r.subcategoria?.toLowerCase().includes(search) || '') ||
        (r.emisor?.toLowerCase().includes(search) || '') ||
        (r.anio?.toString().includes(search) || '')
      );
    }
  });

  // ===== ALERTAS DE VENCIMIENTO (incluye vencidos hasta 30 días después) =====
  const alertas =
    vista === 'capacidadJuridica'
      ? registros
          .filter(r => {
            const dias = calcularDiasRestantes(r.vencimiento);
            return dias !== null && dias >= -30 && dias <= 30;
          })
          .sort((a, b) => {
            const dA = calcularDiasRestantes(a.vencimiento);
            const dB = calcularDiasRestantes(b.vencimiento);
            return dA - dB;
          })
      : [];

  // ========== MENÚ PRINCIPAL ==========
  if (vista === 'menu') {
    return (
      <div style={styles.container}>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9' } }} />
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}><FaArrowLeft /> Volver</button>
          <h1 style={styles.title}>Soporte Documental</h1>
          <div style={{ width: 80 }} />
        </div>
        <div style={styles.menuGrid}>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('capacidadJuridica')}>
            <div style={styles.menuIcon}><FaFileAlt size={52} color="#818cf8" /></div>
            <h3 style={styles.menuTitle}>Capacidad Jurídica</h3>
            <p style={styles.menuDesc}>Documentos legales, certificaciones y vigencia</p>
          </div>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('experiencia')}>
            <div style={styles.menuIcon}><FaFileAlt size={52} color="#34d399" /></div>
            <h3 style={styles.menuTitle}>Experiencia</h3>
            <p style={styles.menuDesc}>Contratos, actas y certificados de experiencia</p>
          </div>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('capacidadTecnica')}>
            <div style={styles.menuIcon}><FaFileAlt size={52} color="#fbbf24" /></div>
            <h3 style={styles.menuTitle}>Capacidad Técnica</h3>
            <p style={styles.menuDesc}>Equipos, certificaciones y recursos técnicos</p>
          </div>
        </div>
        <style>{`
          .menu-card {
            transition: all 0.25s ease;
          }
          .menu-card:hover {
            transform: translateY(-8px) scale(1.01);
            box-shadow: 0 20px 40px -12px rgba(0,0,0,0.6);
            border-color: rgba(99,102,241,0.4);
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ========== VISTA DE CATEGORÍA ==========
  const camposFormulario = () => {
    if (vista === 'capacidadJuridica') {
      return (
        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Nombre del archivo *"
            value={nuevoRegistro.nombreArchivo}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, nombreArchivo: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Origen"
            value={nuevoRegistro.origen}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, origen: e.target.value })}
          />
          <input
            style={styles.input}
            type="date"
            placeholder="Vencimiento"
            value={nuevoRegistro.vencimiento}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, vencimiento: e.target.value })}
          />
        </div>
      );
    } else {
      return (
        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Categoría *"
            value={nuevoRegistro.subcategoria}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, subcategoria: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Emisor"
            value={nuevoRegistro.emisor}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, emisor: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Año"
            value={nuevoRegistro.anio}
            onChange={e => setNuevoRegistro({ ...nuevoRegistro, anio: e.target.value })}
          />
        </div>
      );
    }
  };

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9' } }} />
      <div style={styles.header}>
        <button onClick={() => setVista('menu')} style={styles.backBtn}><FaArrowLeft /> Menú</button>
        <h1 style={styles.title}>
          {vista === 'capacidadJuridica' ? 'Capacidad Jurídica' : vista === 'experiencia' ? 'Experiencia' : 'Capacidad Técnica'}
        </h1>
        <div style={{ width: 80 }} />
      </div>

      {/* Alertas de vencimiento */}
      {alertas.length > 0 && (
        <div style={alertStyles.container}>
          <div style={alertStyles.header}>
            <FaBell style={{ color: '#fbbf24' }} />
            <span style={alertStyles.title}>Vencimientos próximos / vencidos</span>
            <span style={alertStyles.badge}>{alertas.length}</span>
          </div>
          <div style={alertStyles.list}>
            {alertas.map(r => {
              const dias = calcularDiasRestantes(r.vencimiento);
              const color = getUrgenciaColor(dias);
              let textoDias = '';
              if (dias !== null) {
                if (dias < 0) {
                  const absDias = Math.abs(dias);
                  textoDias = absDias === 0 ? 'Hoy' : `Vencido hace ${absDias} ${absDias === 1 ? 'día' : 'días'}`;
                } else if (dias === 0) {
                  textoDias = 'Hoy vence';
                } else if (dias === 1) {
                  textoDias = 'Mañana vence';
                } else {
                  textoDias = `${dias} días`;
                }
              }
              return (
                <div key={r.id} style={alertStyles.item}>
                  <div style={alertStyles.itemInfo}>
                    <span style={alertStyles.itemTitle}>{r.nombreArchivo}</span>
                    <span style={alertStyles.itemSub}>{r.origen}</span>
                  </div>
                  <div style={{ ...alertStyles.itemDate, color }}>
                    <FaCalendarAlt size={12} style={{ marginRight: '6px' }} />
                    {formatearFechaLegible(r.vencimiento)}
                    {dias !== null && (
                      <span style={{ fontWeight: '600', marginLeft: '8px' }}>
                        ({textoDias})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulario para agregar */}
      <div style={styles.formContainer}>
        <h3 style={styles.formTitle}><FaPlus style={{ color: '#a5b4fc' }} /> Agregar documento</h3>
        <form onSubmit={handleSubirArchivo}>
          {camposFormulario()}
          <div style={styles.formActions}>
            <label style={styles.fileInput}>
              <FaUpload /> Seleccionar archivo
              <input type="file" onChange={e => setArchivoSeleccionado(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {archivoSeleccionado && (
              <span style={styles.fileName}>
                {archivoSeleccionado.name} ({(archivoSeleccionado.size / 1024).toFixed(1)} KB)
              </span>
            )}
            <button type="submit" style={styles.submitBtn} disabled={subiendo}>
              {subiendo ? <FaSpinner className="spin" /> : <FaSave />} Guardar
            </button>
          </div>
        </form>
      </div>

      {/* Barra de búsqueda */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <FaSearch color="#64748b" size={16} />
          <input
            placeholder="Buscar por nombre, origen, categoría, emisor..."
            value={busquedaLocal}
            onChange={e => setBusquedaLocal(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Tabla de registros */}
      {cargando ? (
        <div style={styles.loader}><FaSpinner className="spin" /> Cargando...</div>
      ) : registrosFiltrados.length === 0 ? (
        <div style={styles.emptyState}>
          {busquedaLocal ? 'No hay resultados para tu búsqueda.' : 'No hay documentos en esta categoría.'}
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.tabla}>
            <thead>
              <tr style={styles.tableHeader}>
                {vista === 'capacidadJuridica' && (
                  <>
                    <th style={styles.th}>Nombre Archivo</th>
                    <th style={styles.th}>Origen</th>
                    <th style={styles.th}>Vencimiento</th>
                  </>
                )}
                {(vista === 'experiencia' || vista === 'capacidadTecnica') && (
                  <>
                    <th style={styles.th}>Categoría</th>
                    <th style={styles.th}>Emisor</th>
                    <th style={styles.th}>Año</th>
                  </>
                )}
                <th style={{ ...styles.th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map(r => {
                const dias = calcularDiasRestantes(r.vencimiento);
                const isVencido = dias !== null && dias < 0;
                return (
                  <tr key={r.id} style={{ ...styles.tableRow, background: isVencido ? 'rgba(248,113,113,0.08)' : 'transparent' }}>
                    {vista === 'capacidadJuridica' && (
                      <>
                        <td style={styles.td}>{r.nombreArchivo}</td>
                        <td style={styles.td}>{r.origen}</td>
                        <td style={{ ...styles.td, color: isVencido ? '#f87171' : '#e2e8f0' }}>
                          {formatearFechaLegible(r.vencimiento)}
                          {isVencido && <span style={styles.vencidoBadge}>VENCIDO</span>}
                        </td>
                      </>
                    )}
                    {(vista === 'experiencia' || vista === 'capacidadTecnica') && (
                      <>
                        <td style={styles.td}>{r.subcategoria}</td>
                        <td style={styles.td}>{r.emisor}</td>
                        <td style={styles.td}>{r.anio}</td>
                      </>
                    )}
                    <td style={styles.tdActions}>
                      {/* Descargar */}
                      <button
                        onClick={() => descargarArchivo(r.rutaRelativa, r.nombreArchivo)}
                        style={styles.actionBtn}
                        title="Descargar"
                      >
                        <FaDownload />
                      </button>

                      {/* Actualizar - con input oculto persistente */}
                      <button
                        type="button"
                        onClick={() => {
                          const fileInput = document.getElementById(`fileInput_${r.id}`);
                          if (fileInput) fileInput.click();
                        }}
                        style={styles.actionBtn}
                        title="Actualizar archivo"
                        disabled={actualizando}
                      >
                        {actualizando ? <FaSpinner className="spin" /> : <FaSyncAlt />}
                      </button>
                      <input
                        id={`fileInput_${r.id}`}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleActualizarArchivo(r.id, file);
                          e.target.value = ''; // Reset para permitir seleccionar el mismo archivo nuevamente
                        }}
                      />

                      {/* Eliminar */}
                      <button
                        onClick={() => handleEliminar(r.id)}
                        style={{ ...styles.actionBtn, color: '#f87171' }}
                        title="Eliminar"
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
      `}</style>
    </div>
  );
};

// ========== ESTILOS RENOVADOS ==========
const styles = {
  container: {
    padding: '28px 24px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    color: '#f1f5f9',
    backdropFilter: 'blur(2px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '32px',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '40px',
    padding: '8px 20px',
    color: '#cbd5e1',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: '28px',
    marginTop: '48px',
  },
  menuCard: {
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    padding: '32px 20px 28px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.25s ease',
  },
  menuIcon: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#f1f5f9',
    margin: '0 0 8px 0',
  },
  menuDesc: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    margin: 0,
    lineHeight: 1.5,
  },
  formContainer: {
    background: 'rgba(15,23,42,0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    padding: '20px 24px 24px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  formTitle: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  input: {
    padding: '10px 14px',
    background: 'rgba(2,6,23,0.6)',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border 0.2s, box-shadow 0.2s',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  fileInput: {
    background: 'rgba(99,102,241,0.12)',
    padding: '8px 18px',
    borderRadius: '40px',
    color: '#a5b4fc',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '500',
    border: '1px solid rgba(99,102,241,0.25)',
    transition: 'background 0.2s',
  },
  fileName: {
    fontSize: '13px',
    color: '#94a3b8',
    background: 'rgba(0,0,0,0.3)',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  submitBtn: {
    padding: '10px 28px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: '40px',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
    transition: 'all 0.2s',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15,23,42,0.5)',
    backdropFilter: 'blur(4px)',
    borderRadius: '40px',
    padding: '6px 18px',
    border: '1px solid rgba(255,255,255,0.06)',
    flex: 1,
    minWidth: '200px',
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    color: '#f1f5f9',
    marginLeft: '10px',
    width: '100%',
    fontSize: '14px',
    padding: '8px 0',
  },
  tableWrapper: {
    overflowX: 'auto',
    background: 'rgba(15,23,42,0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.04)',
    marginTop: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '600px',
  },
  tableHeader: {
    background: 'rgba(30,58,95,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  th: {
    padding: '16px 16px',
    textAlign: 'left',
    color: '#cbd5e1',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.04em',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '14px 16px',
    color: '#e2e8f0',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tdActions: {
    padding: '10px 16px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  actionBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: 'none',
    borderRadius: '30px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px 10px',
    transition: 'all 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
  },
  vencidoBadge: {
    marginLeft: '10px',
    fontSize: '10px',
    fontWeight: '700',
    color: '#f87171',
    background: 'rgba(248,113,113,0.15)',
    padding: '2px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  loader: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    fontSize: '1.1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
    background: 'rgba(15,23,42,0.4)',
    borderRadius: '20px',
    fontSize: '1rem',
  },
};

const alertStyles = {
  container: {
    background: 'rgba(15,23,42,0.5)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(251,191,36,0.2)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    background: 'rgba(251,191,36,0.08)',
    borderBottom: '1px solid rgba(251,191,36,0.1)',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1,
  },
  badge: {
    background: '#fbbf24',
    color: '#0f172a',
    padding: '2px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  list: {
    maxHeight: '220px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#f1f5f9',
  },
  itemSub: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  itemDate: {
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    fontWeight: '500',
  },
};

export default GestionSoporteDocumental;