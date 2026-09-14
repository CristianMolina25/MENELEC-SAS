import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaFileExcel, FaUpload, FaDownload, FaEdit, FaSyncAlt, 
  FaSpinner, FaTimes, FaSearch, FaBuilding, FaDollarSign, 
  FaClipboardList, FaEye, FaCalendarAlt, FaFileAlt, FaArrowLeft,
  FaBell
} from 'react-icons/fa';
import OnlyOfficeEditor from './OnlyOfficeEditor';

const API_BASE = '/api/archivos';

// ========== UTILIDADES PARA FECHAS (como en GestionTablaControl) ==========
const parseDateLocal = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  let cleaned = fechaStr.replace(/\(.*?\)/g, '')
    .replace(/\d{1,2}:\d{2}(:\d{2})?.*$/i, '')
    .replace(/[aApP][mM]\.?/g, '')
    .trim();
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
  if (dias === null) return '#64748b';
  if (dias <= 3) return '#ef4444';
  if (dias <= 7) return '#f59e0b';
  if (dias <= 15) return '#eab308';
  return '#10b981';
};

const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '—';
  if (fechaStr.includes('-')) {
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }
  if (fechaStr.includes('/')) return fechaStr;
  return fechaStr;
};
// ========== FIN UTILIDADES ==========

const GestionPostventa = ({ onBack }) => {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [indexando, setIndexando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('ABIERTO');
  const [metadataId, setMetadataId] = useState(null);
  const [rutaArchivo, setRutaArchivo] = useState(null);
  const [fileName, setFileName] = useState('');
  const [editorConfig, setEditorConfig] = useState(null);
  const [cargandoArchivo, setCargandoArchivo] = useState(true);
  const [excelExiste, setExcelExiste] = useState(false);

  // Cargar el Excel desde el servidor
  const cargarArchivoPostventa = useCallback(async () => {
    setCargandoArchivo(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/listar`, {
        params: { ruta: 'Postventa' },
        headers: { Authorization: `Bearer ${token}` }
      });
      const archivos = res.data;
      
      const excel = archivos.find(f => !f.esCarpeta && (f.nombre.endsWith('.xlsx') || f.nombre.endsWith('.xls')));
      if (excel && excel.ruta && excel.metadataId) {
        setRutaArchivo(excel.ruta);
        setFileName(excel.nombre);
        setMetadataId(excel.metadataId);
        setExcelExiste(true);
        await cargarServicios(excel.metadataId);
      } else {
        console.log('No se encontró Excel con metadataId');
        setMetadataId(null);
        setRutaArchivo(null);
        setFileName('');
        setServicios([]);
        setExcelExiste(false);
      }
    } catch (error) {
      console.error('Error al listar Postventa:', error);
      toast.error('No se pudo acceder a la carpeta Postventa');
      setExcelExiste(false);
    } finally {
      setCargandoArchivo(false);
    }
  }, []);

  const cargarServicios = async (id) => {
    if (!id) return;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/servicios-postventa?metadataId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServicios(res.data);
    } catch (error) {
      toast.error('Error al cargar los servicios');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const indexarExcel = async () => {
    if (!metadataId) {
      toast.error('No hay archivo Excel para indexar');
      return;
    }
    setIndexando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/indexar-excel?metadataId=${metadataId}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Excel indexado correctamente');
      await cargarServicios(metadataId);
    } catch (error) {
      toast.error('Error al indexar el Excel');
      console.error(error);
    } finally {
      setIndexando(false);
    }
  };

  const subirExcel = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.xlsx')) {
      toast.error('Por favor selecciona un archivo Excel (.xlsx)');
      return;
    }

    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ruta', 'Postventa');
    formData.append('modulo', 'Postventa');
    formData.append('tipoDocumento', 'Excel');
    formData.append('numeroReferencia', '');
    formData.append('cliente', '');
    formData.append('contratoOC', '');
    formData.append('fechaDocumento', new Date().toISOString().slice(0,10));
    formData.append('descripcion', 'Reporte de servicios postventa');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      const nuevoMetadataId = res.data.metadataId;
      const nuevaRuta = res.data.rutaOriginal;
      toast.success('Excel subido correctamente');
      
      setMetadataId(nuevoMetadataId);
      setRutaArchivo(nuevaRuta);
      setFileName(file.name);
      setExcelExiste(true);
      
      setIndexando(true);
      await axios.post(`${API_BASE}/indexar-excel?metadataId=${nuevoMetadataId}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIndexando(false);
      toast.success('Excel indexado correctamente');
      await cargarServicios(nuevoMetadataId);
    } catch (error) {
      console.error('Error al subir/indexar:', error);
      
      // Manejo específico de errores
      const errorMsg = error.response?.data?.error || error.message || '';
      const esArchivoEnUso = errorMsg.includes('siendo utilizado') || 
                             errorMsg.includes('access') || 
                             errorMsg.includes('bloqueado');
      
      if (error.response?.status === 409 || (error.response?.status === 500 && esArchivoEnUso)) {
        // Archivo bloqueado
        toast.error(
          `⚠️ Archivo en uso\n\n${esArchivoEnUso ? errorMsg : 'Cierra el archivo en Excel o cualquier otra aplicación antes de subirlo'}`,
          { duration: 6000 }
        );
      } else if (error.response?.status === 403) {
        toast.error('❌ Acceso denegado. Verifica tu sesión');
      } else if (error.message === 'Network Error') {
        toast.error('❌ Error de conexión con el servidor. Verifica que esté en línea');
      } else {
        toast.error(`Error al subir o indexar: ${errorMsg}`);
      }
      setIndexando(false);
    } finally {
      setSubiendo(false);
      event.target.value = null;
    }
  };

  const descargarExcel = async () => {
    if (!rutaArchivo) {
      toast.error('No hay archivo para descargar');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/download`, {
        params: { ruta: rutaArchivo },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar el archivo');
      console.error(error);
    }
  };

  const editarConOnlyOffice = async () => {
    if (!rutaArchivo) {
      toast.error('No hay archivo para editar');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/onlyoffice/config`, {
        params: { ruta: rutaArchivo },
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditorConfig(res.data);
    } catch (error) {
      toast.error('Error al abrir el editor');
      console.error(error);
    }
  };

  useEffect(() => {
    cargarArchivoPostventa();
  }, [cargarArchivoPostventa]);

  const serviciosFiltrados = useMemo(() => {
    let resultado = servicios;
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(s => (s.estado || 'ABIERTO') === filtroEstado);
    }
    if (busquedaLocal.trim()) {
      const term = busquedaLocal.toLowerCase();
      resultado = resultado.filter(s =>
        s.numeroContrato?.toLowerCase().includes(term) ||
        s.equipo?.toLowerCase().includes(term) ||
        s.detalleServicio?.toLowerCase().includes(term) ||
        (s.proveedor?.toLowerCase().includes(term))
      );
    }
    return resultado;
  }, [servicios, filtroEstado, busquedaLocal]);

  const totalServicios = servicios.length;
  const costoTotal = servicios.reduce((acc, s) => acc + (s.costo || 0), 0);
  const contratosUnicos = new Set(servicios.map(s => s.numeroContrato)).size;
  const serviciosAbiertos = servicios.filter(s => (s.estado || 'ABIERTO') === 'ABIERTO').length;

  // ========== ALERTAS DE FECHA DE ENTREGA PRÓXIMAS ==========
  const proximasEntregas = useMemo(() => {
    return servicios
      .filter(s => {
        const dias = calcularDiasRestantes(s.fechaEntrega);
        return dias !== null && dias >= 0 && dias <= 15;
      })
      .sort((a, b) => {
        const diasA = calcularDiasRestantes(a.fechaEntrega);
        const diasB = calcularDiasRestantes(b.fechaEntrega);
        return diasA - diasB;
      });
  }, [servicios]);

  if (editorConfig) {
    return <OnlyOfficeEditor config={editorConfig} onBack={() => setEditorConfig(null)} />;
  }

  const badgeEstado = (estado) => {
    const est = estado || 'ABIERTO';
    switch (est) {
      case 'CERRADO': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', icon: '🔒' };
      case 'NO NECESITO': return { bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8', icon: '⏭️' };
      default: return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', icon: '✅' };
    }
  };

  if (cargandoArchivo) {
    return <div style={styles.loader}>Cargando área Postventa...</div>;
  }

  if (!excelExiste) {
    return (
      <div style={styles.container}>
        <Toaster position="bottom-right" />
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}><FaArrowLeft /> Volver al Dashboard</button>
          <h1 style={styles.title}>Gestión de Servicios Postventa</h1>
        </div>
        <div style={styles.emptyState}>
          <FaFileExcel size={64} style={{ opacity: 0.3 }} />
          <h3>No hay archivo Excel cargado</h3>
          <p>Sube un archivo Excel con el formato de servicios postventa usando el botón "Subir Excel".</p>
          <label style={styles.uploadBtn}>
            <FaUpload /> Subir Excel
            <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
          </label>
          {subiendo && <div><FaSpinner className="spin" /> Subiendo...</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" />
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}><FaArrowLeft /> Volver al Dashboard</button>
        <h1 style={styles.title}>Gestión de Servicios Postventa</h1>
        <div style={styles.buttonGroup}>
          <label style={styles.uploadBtn}>
            <FaUpload /> Subir Excel
            <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
          </label>
          <button onClick={descargarExcel} style={styles.downloadBtn} disabled={!rutaArchivo}>
            <FaDownload /> Descargar
          </button>
          <button onClick={editarConOnlyOffice} style={styles.editBtn} disabled={!rutaArchivo}>
            <FaEdit /> Editar
          </button>
          <button onClick={cargarArchivoPostventa} style={styles.refreshBtn}>
            <FaSyncAlt /> Actualizar
          </button>
          {metadataId && servicios.length === 0 && !cargando && (
            <button onClick={indexarExcel} disabled={indexando} style={styles.indexBtn}>
              {indexando ? <FaSpinner className="spin" /> : <FaFileAlt />} Indexar
            </button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#6366f1')}><FaClipboardList /></div>
          <div><div style={styles.metricValue}>{totalServicios}</div><div style={styles.metricLabel}>Servicios</div></div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#10b981')}><FaDollarSign /></div>
          <div><div style={styles.metricValue}>${costoTotal.toLocaleString()}</div><div style={styles.metricLabel}>Costo total</div></div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#f59e0b')}><FaBuilding /></div>
          <div><div style={styles.metricValue}>{contratosUnicos}</div><div style={styles.metricLabel}>Contratos</div></div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#3b82f6')}><FaEye /></div>
          <div><div style={styles.metricValue}>{serviciosAbiertos}</div><div style={styles.metricLabel}>Abiertos</div></div>
        </div>
      </div>

      {/* Panel de alertas - FECHAS DE ENTREGA PRÓXIMAS */}
      {proximasEntregas.length > 0 && (
        <div style={alertStyles.container}>
          <div style={alertStyles.header}>
            <FaBell style={{ color: '#f59e0b' }} />
            <span style={alertStyles.title}>Alertas de fecha de entrega próximas</span>
            <span style={alertStyles.badge}>{proximasEntregas.length}</span>
          </div>
          <div style={alertStyles.list}>
            {proximasEntregas.map(s => {
              const dias = calcularDiasRestantes(s.fechaEntrega);
              const color = getUrgenciaColor(dias);
              return (
                <div key={s.id} style={alertStyles.item}>
                  <div style={alertStyles.itemInfo}>
                    <span style={alertStyles.itemTitle}>{s.numeroContrato}</span>
                    <span style={alertStyles.itemSub}>{s.equipo}</span>
                  </div>
                  <div style={{ ...alertStyles.itemDate, color }}>
                    <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                    {formatearFechaLegible(s.fechaEntrega)}
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
      )}

      {/* Filtros */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <FaSearch color="#64748b" />
          <input placeholder="Buscar por contrato, equipo o detalle..." value={busquedaLocal} onChange={e => setBusquedaLocal(e.target.value)} style={styles.searchInput} />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={styles.selectFiltro}>
          <option value="TODOS">Todos</option>
          <option value="ABIERTO">✅ Abierto</option>
          <option value="CERRADO">🔒 Cerrado</option>
          <option value="NO NECESITO">⏭️ No necesito</option>
        </select>
      </div>

      {cargando ? (
        <div style={styles.loader}><FaSpinner className="spin" /> Cargando servicios...</div>
      ) : (
        <>
          {servicios.length === 0 ? (
            <div style={styles.emptyState}>
              <p>El archivo Excel aún no ha sido indexado. Haz clic en "Indexar".</p>
              <button onClick={indexarExcel} style={styles.indexBtn}>Indexar ahora</button>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.tabla}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Número de Contrato</th>
                    <th style={styles.th}>Año</th>
                    <th style={styles.th}>Equipo</th>
                    <th style={styles.th}>Proveedor</th>
                    <th style={styles.th}>Fecha de Solicitud</th>
                    <th style={styles.th}>Detalle del Servicio</th>
                    <th style={styles.th}>Costos</th>
                    <th style={styles.th}>Vigencia de Garantía</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {serviciosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ ...styles.td, textAlign: 'center', padding: '40px' }}>
                        No hay servicios que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    serviciosFiltrados.map(servicio => {
                      const est = badgeEstado(servicio.estado);
                      return (
                        <tr key={servicio.id} style={styles.tableRow}>
                          <td style={styles.td}><span style={styles.contratoCell}>{servicio.numeroContrato}</span></td>
                          <td style={styles.td}>{servicio.anioContrato}</td>
                          <td style={styles.td}>{servicio.equipo}</td>
                          <td style={styles.td}>{servicio.proveedor || '—'}</td>   {/* Proveedor */}
                          <td style={styles.td}>{formatearFechaLegible(servicio.fechaSolicitud)}</td>
                          <td style={styles.td}>{servicio.detalleServicio}</td>
                          <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>${servicio.costo?.toLocaleString()}</td>
                          <td style={styles.td}>{formatearFechaLegible(servicio.vigenciaGarantia)}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.estadoBadge, background: est.bg, color: est.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                              {est.icon} {servicio.estado || 'ABIERTO'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ========== ESTILOS ==========
const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  backBtn: { background: 'rgba(30,41,59,0.6)', border: '1px solid #334155', borderRadius: '30px', padding: '8px 18px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  title: { fontSize: '1.8rem', fontWeight: '800', color: '#f1f5f9', margin: 0 },
  buttonGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  uploadBtn: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '10px 20px', borderRadius: '30px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  downloadBtn: { background: '#1e293b', border: '1px solid #334155', padding: '10px 20px', borderRadius: '30px', color: '#cbd5e1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  editBtn: { background: '#1e293b', border: '1px solid #334155', padding: '10px 20px', borderRadius: '30px', color: '#fbbf24', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  refreshBtn: { background: '#1e293b', border: '1px solid #334155', padding: '10px 20px', borderRadius: '30px', color: '#94a3b8', cursor: 'pointer' },
  indexBtn: { background: '#0f172a', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '30px', color: '#10b981', cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' },
  metricCard: { background: 'rgba(30,41,59,0.6)', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' },
  metricIcon: (color) => ({ width: '48px', height: '48px', borderRadius: '14px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '24px' }),
  metricValue: { fontSize: '28px', fontWeight: '800', color: '#f1f5f9' },
  metricLabel: { fontSize: '13px', color: '#64748b' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '30px', padding: '8px 16px', border: '1px solid #334155', flex: 1 },
  searchInput: { border: 'none', background: 'none', outline: 'none', color: '#f1f5f9', marginLeft: '8px', width: '100%' },
  selectFiltro: { background: '#0f172a', border: '1px solid #334155', borderRadius: '30px', padding: '8px 16px', color: '#cbd5e1' },
  tableWrapper: { overflowX: 'auto', background: 'rgba(15,23,42,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableHeader: { background: 'rgba(30,41,59,0.6)', borderBottom: '2px solid #334155' },
  th: { padding: '16px 12px', textAlign: 'left', color: '#f1f5f9', fontWeight: '600', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s' },
  td: { padding: '14px 12px', color: '#e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contratoCell: { fontWeight: '600', color: '#6366f1' },
  gridServicios: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' },
  servicioCard: { background: 'rgba(15,23,42,0.8)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  contrato: { fontSize: '18px', fontWeight: '700', color: '#f1f5f9' },
  equipo: { fontSize: '13px', color: '#94a3b8' },
  estadoBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
  detalleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  detalleLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase' },
  detalleValue: { fontSize: '14px', color: '#e2e8f0', wordBreak: 'break-word' },
  loader: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#64748b' },
  noResults: { textAlign: 'center', padding: '40px', color: '#64748b', gridColumn: '1 / -1' },
};

// ========== ESTILOS DE ALERTAS ==========
const alertStyles = {
  container: {
    background: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '16px',
    marginBottom: '20px',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    background: 'rgba(245, 158, 11, 0.1)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    flex: 1
  },
  badge: {
    background: '#f59e0b',
    color: '#0f172a',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700'
  },
  list: {
    maxHeight: '200px',
    overflowY: 'auto'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s'
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
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

export default GestionPostventa;