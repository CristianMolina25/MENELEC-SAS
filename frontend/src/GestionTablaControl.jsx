import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FaFileExcel, FaUpload, FaDownload, FaEdit, FaSyncAlt, FaSpinner, 
  FaSearch, FaBuilding, FaDollarSign, FaClipboardList, FaEye, 
  FaCalendarAlt, FaFileAlt, FaArrowLeft, FaChartLine, FaFileContract, FaBell  
} from 'react-icons/fa';
import OnlyOfficeEditor from './OnlyOfficeEditor';

const parseDateLocal = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') return null;

  // 1. Limpiar: eliminar paréntesis, texto "a.m./p.m.", horas, etc.
  let cleaned = fechaStr.replace(/\(.*?\)/g, '')   // quita ( ... )
                         .replace(/\d{1,2}:\d{2}(:\d{2})?.*$/i, '') // quita hora
                         .replace(/[aApP][mM]\.?/g, '') // quita a.m./p.m.
                         .trim();

  // 2. Intentar detectar separador
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
  if (!fecha || isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffTime = fecha - hoy;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
// Formatea una fecha ISO (YYYY-MM-DD) a dd/mm/aaaa sin desplazamiento horario
const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '—';
  // Si es ISO (YYYY-MM-DD)
  if (fechaStr.includes('-')) {
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  }
  // Si es DD/MM/YYYY
  if (fechaStr.includes('/')) {
    return fechaStr; // ya está en formato legible
  }
  return fechaStr;
};

// Obtiene el color según los días restantes
const getUrgenciaColor = (dias) => {
  if (dias === null) return '#64748b';
  if (dias <= 3) return '#ef4444'; // Rojo: urgente
  if (dias <= 7) return '#f59e0b'; // Naranja: pronto
  if (dias <= 15) return '#eab308'; // Amarillo: cercano
  if (dias <= 30) return '#3b82f6'; // Azul: en el mes
  return '#10b981'; // Verde: tranquilo
};

const API_BASE = '/api/archivos';

const GestionTablaControl = ({ onBack, initialVista, initialBusqueda }) => {
  
  const [vista, setVista] = useState('menu');
  const [procesos, setProcesos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [metadataId, setMetadataId] = useState(null);
  const [rutaArchivo, setRutaArchivo] = useState(null);
  const [fileName, setFileName] = useState('');
  const [editorConfig, setEditorConfig] = useState(null);
  const [excelExiste, setExcelExiste] = useState(false);
  const [propuestas, setPropuestas] = useState([]);
  const [cargandoPropuestas, setCargandoPropuestas] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [cargandoContratos, setCargandoContratos] = useState(false);

  // ========== PROPUESTAS ==========
  const cargarPropuestas = async (id) => {
    if (!id) return;
    setCargandoPropuestas(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/tabla-control/propuestas?metadataId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPropuestas(res.data);
    } catch (error) {
      toast.error('Error al cargar propuestas');
    } finally {
      setCargandoPropuestas(false);
    }
  };
  const cargarContratos = async (id) => {
      if (!id) return;
      setCargandoContratos(true);
      try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_BASE}/tabla-control/contratos?metadataId=${id}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setContratos(res.data);
      } catch (error) {
          toast.error('Error al cargar contratos');
      } finally {
          setCargandoContratos(false);
      }
  };
  const cargarProcesos = async (id) => {
    if (!id) return;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/tabla-control/en-estudio?metadataId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProcesos(res.data);
    } catch (error) {
      toast.error('Error al cargar los procesos');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };
  // ========== ARCHIVO GENERAL ==========
  const cargarArchivo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/tabla-control/archivo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.metadataId) {
        setMetadataId(res.data.metadataId);
        setRutaArchivo(res.data.ruta);
        setFileName(res.data.nombre);
        setExcelExiste(true);
        // Cargar según la vista actual
        if (vista === 'enEstudio') cargarProcesos(res.data.metadataId);
        if (vista === 'propuestas') cargarPropuestas(res.data.metadataId);
        if (vista === 'contratos') cargarContratos(res.data.metadataId);
      } else {
        setExcelExiste(false);
        setMetadataId(null);
        setProcesos([]);
        setPropuestas([]);
        setContratos([]);
      }
    } catch (error) {
      console.error('Error al cargar archivo Tabla de Control:', error);
      setExcelExiste(false);
    }
  }, [vista]);

  const subirExcel = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.xlsx')) {
      toast.error('Selecciona un archivo Excel (.xlsx)');
      return;
    }
    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ruta', 'Tabla de Control');
    formData.append('modulo', 'Tabla de Control');
    formData.append('tipoDocumento', 'Excel');
    formData.append('numeroReferencia', '');
    formData.append('cliente', '');
    formData.append('contratoOC', '');
    formData.append('fechaDocumento', new Date().toISOString().slice(0, 10));
    formData.append('descripcion', 'Tabla de Control - EN ESTUDIO');

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Excel subido correctamente');
      await cargarArchivo();
    } catch (error) {
      console.error('Error al subir/indexar:', error);
      
      // Manejo específico de errores
      if (error.response?.status === 409) {
        // Archivo bloqueado
        const errorData = error.response.data;
        toast.error(
          `⚠️ ${errorData.error || 'Archivo en uso'}\n\n${errorData.sugerencia || 'Cierra el archivo en Excel o cualquier otra aplicación'}`,
          { duration: 5000 }
        );
      } else if (error.response?.status === 403) {
        toast.error('❌ Acceso denegado. Verifica tu sesión');
      } else if (error.message === 'Network Error') {
        toast.error('❌ Error de conexión con el servidor');
      } else {
        toast.error(`Error: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setSubiendo(false);
      event.target.value = null;
    }
  };

  const descargarExcel = async () => {
    if (!rutaArchivo) return;
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
      toast.error('Error al descargar');
    }
  };

  const editarConOnlyOffice = async () => {
    if (!rutaArchivo) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/onlyoffice/config`, {
        params: { ruta: rutaArchivo },
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditorConfig(res.data);
    } catch (error) {
      toast.error('Error al abrir editor');
    }
  };

  useEffect(() => {
    cargarArchivo();
  }, [cargarArchivo]);

  // ✅ Agrega este useEffect justo aquí, antes del useEffect que carga según vista
  useEffect(() => {
    if (initialVista) setVista(initialVista);
    if (initialBusqueda) setBusquedaLocal(initialBusqueda);
  }, [initialVista, initialBusqueda]);



  // ========== RENDER ==========
  if (editorConfig) {
    return (
      <OnlyOfficeEditor
        config={editorConfig}
        onBack={() => {
          setEditorConfig(null);
          cargarArchivo(); // 🔁 Recarga los metadatos y la vista activa
        }}
      />
    );
  }

  // ---------- MENÚ PRINCIPAL ----------
  if (vista === 'menu') {
    return (
      <div style={styles.container}>
        <Toaster />
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}><FaArrowLeft /> Volver al Dashboard</button>
          <h1 style={styles.title}>Tabla de Control</h1>
          <div style={styles.buttonGroup}>
            <label style={styles.uploadBtn}>
              <FaUpload /> Subir Excel
              <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
            </label>
            {excelExiste && (
              <>
                <button onClick={descargarExcel} style={styles.downloadBtn}> <FaDownload /> Descargar</button>
                <button onClick={editarConOnlyOffice} style={styles.editBtn}> <FaEdit /> Editar</button>
              </>
            )}
            <button onClick={cargarArchivo} style={styles.refreshBtn}><FaSyncAlt /> Actualizar</button>
          </div>
        </div>
        <div style={styles.menuGrid}>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('enEstudio')}>
            <FaChartLine size={48} color="#818cf8" />
            <h3>EN ESTUDIO</h3>
            <p>Procesos en evaluación, filtros y seguimiento</p>
          </div>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('propuestas')}>
            <FaClipboardList size={48} color="#818cf8" />
            <h3>PROPUESTAS</h3>
            <p>Propuestas presentadas, estados y valores</p>
          </div>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('contratos')}>
              <FaFileContract size={48} color="#818cf8" />
              <h3>CONTRATOS</h3>
              <p>Contratos adjudicados, pagos y seguimiento</p>
          </div>
        </div>
        <style>{`
          .menu-card:hover { transform: translateY(-6px); background: linear-gradient(180deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06)); border-color: rgba(99,102,241,0.28); box-shadow: 0 8px 20px rgba(2,6,23,0.6); }
          .servicio-card:hover { transform: translateY(-6px); box-shadow: 0 10px 30px rgba(2,6,23,0.6); }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // ---------- VISTA EN ESTUDIO ----------
  if (vista === 'enEstudio') {
      // ========== FILTRAR PROCESOS DESCARTADOS ==========
      const procesosActivos = procesos.filter(p => {
          // Revisar si contiene la palabra "DESCARTADO" en las columnas clave
          const observacion = (p.observacion || '').toUpperCase();
          const cierre = (p.cierre || '').toUpperCase();
          const estado = (p.estado || '').toUpperCase();
          const objeto = (p.objeto || '').toUpperCase();
          
          // Palabras clave para identificar procesos descartados
          const palabrasDescartado = ['DESCARTADO', 'DECARTADO', 'DESCARTABLE', 'DESCARTAD'];
          
          const esDescartado = palabrasDescartado.some(palabra => 
              observacion.includes(palabra) || 
              cierre.includes(palabra) || 
              estado.includes(palabra) ||
              objeto.includes(palabra)
          );
          
          return !esDescartado;
      });
      
      const totalProcesos = procesosActivos.length;
      const presupuestoTotal = procesosActivos.reduce((sum, p) => sum + (p.presupuesto || 0), 0);
      const categoriasUnicas = new Set(procesosActivos.map(p => p.categoria)).size;
      
      const procesosFiltrados = procesosActivos.filter(p =>
          p.numeroProceso?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
          p.categoria?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
          p.objeto?.toLowerCase().includes(busquedaLocal.toLowerCase())
      );

    return (
      <div style={styles.container}>
        <Toaster />
        <div style={styles.header}>
          <button onClick={() => setVista('menu')} style={styles.backBtn}><FaArrowLeft /> Volver al menú</button>
          <h1 style={styles.title}>Procesos en Estudio</h1>
          <div style={styles.buttonGroup}>
            <label style={styles.uploadBtn}>
              <FaUpload /> Subir Excel
              <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
            </label>
            <button onClick={descargarExcel} style={styles.downloadBtn} disabled={!excelExiste}><FaDownload /> Descargar</button>
            <button onClick={editarConOnlyOffice} style={styles.editBtn} disabled={!excelExiste}><FaEdit /> Editar</button>
            <button onClick={cargarArchivo} style={styles.refreshBtn}><FaSyncAlt /> Actualizar</button>
          </div>
        </div>

        {/* Métricas */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon('#6366f1')}><FaClipboardList /></div>
            <div><div style={styles.metricValue}>{totalProcesos}</div><div style={styles.metricLabel}>Procesos</div></div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon('#10b981')}><FaDollarSign /></div>
            <div><div style={styles.metricValue}>${presupuestoTotal.toLocaleString()}</div><div style={styles.metricLabel}>Presupuesto total</div></div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricIcon('#f59e0b')}><FaBuilding /></div>
            <div><div style={styles.metricValue}>{categoriasUnicas}</div><div style={styles.metricLabel}>Categorías</div></div>
          </div>
        </div>

        {/* Búsqueda */}
        <div style={styles.filterBar}>
          <div style={styles.searchBox}>
            <FaSearch color="#64748b" />
            <input placeholder="Buscar por Nº proceso, categoría, objeto..." value={busquedaLocal} onChange={e => setBusquedaLocal(e.target.value)} style={styles.searchInput} />
          </div>
        </div>

        {/* Panel de alertas - CIERRES PRÓXIMOS */}
        {(() => {
          const proximosCierres = procesosActivos.filter(p => {
            const dias = calcularDiasRestantes(p.cierre);
            return dias !== null && dias >= 0 && dias <= 15; // próximos 15 días
          }).sort((a, b) => {
            const diasA = calcularDiasRestantes(a.cierre);
            const diasB = calcularDiasRestantes(b.cierre);
            return diasA - diasB;
          });

          if (proximosCierres.length === 0) return null;

          return (
            <div style={alertStyles.container}>
              <div style={alertStyles.header}>
                <FaBell style={{ color: '#f59e0b' }} />
                <span style={alertStyles.title}>Alertas de cierre próximos</span>
                <span style={alertStyles.badge}>{proximosCierres.length}</span>
              </div>
              <div style={alertStyles.list}>
                {proximosCierres.map(p => {
                  const dias = calcularDiasRestantes(p.cierre);
                  const color = getUrgenciaColor(dias);
                  return (
                    <div key={p.id} style={alertStyles.item}>
                      <div style={alertStyles.itemInfo}>
                        <span style={alertStyles.itemTitle}>{p.numeroProceso}</span>
                        <span style={alertStyles.itemSub}>{p.categoria}</span>
                      </div>
                      <div style={{ ...alertStyles.itemDate, color }}>
                        <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                        {p.cierre} {dias !== null && dias >= 0 && (
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
        })()}

        {cargando ? (
          <div style={styles.loader}><FaSpinner className="spin" /> Cargando...</div>
        ) : (
          <>
            {procesos.length === 0 && !excelExiste && (
              <div style={styles.emptyState}>
                <FaFileExcel size={64} style={{ opacity: 0.3 }} />
                <h3>No hay archivo Excel cargado</h3>
                <p>Sube el archivo "TABLA DE CONTROL 2026.xlsx" usando el botón "Subir Excel".</p>
              </div>
            )}
            {procesos.length === 0 && excelExiste && !cargando && (
              <div style={styles.emptyState}>
                <p>No se encontraron procesos en la hoja "EN ESTUDIO". Verifica que el Excel tenga datos.</p>
              </div>
            )}
            {procesos.length > 0 && (
              <div style={styles.tableWrapper}>
                <table style={styles.tabla}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Proceso</th>
                      <th style={styles.th}>Categoría</th>
                      <th style={styles.th}>Modalidad</th>
                      <th style={styles.th}>Objeto</th>
                      <th style={styles.th}>Presupuesto</th>
                      <th style={styles.th}>Fecha</th>
                      <th style={styles.th}>Cierre</th>
                      <th style={styles.th}>Ciudad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procesosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={styles.noResults}>No hay resultados</td>
                      </tr>
                    ) : (
                      procesosFiltrados.map(proceso => (
                        <tr key={proceso.id} style={styles.tableRow}>
                          <td style={styles.td}><span style={styles.contratoCell}>{proceso.numeroProceso}</span></td>
                          <td style={styles.td}>{proceso.categoria}</td>
                          <td style={styles.td}><span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>{proceso.modalidad}</span></td>
                          <td style={styles.td}>{proceso.objeto?.substring(0, 80)}...</td>
                          <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>${proceso.presupuesto?.toLocaleString()}</td>
                          <td style={styles.td}>{proceso.fecha ? formatearFechaLegible(proceso.fecha) : '—'}</td>
                          <td style={styles.td}>{proceso.cierre || '—'}</td>
                          <td style={styles.td}>{proceso.ciudad || '—'}</td>
                        </tr>
                      ))
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
  }

  // ---------- VISTA PROPUESTAS ----------
  if (vista === 'propuestas') {
  // Filtrar propuestas que NO tengan estado "ARCHIVO"
  const propuestasActivas = propuestas.filter(p => 
    p.estado && p.estado.toUpperCase() !== 'ARCHIVO' && p.estado.toUpperCase() !== 'ARCHIVO - PERDIDAS'
  );
  
  const totalPropuestas = propuestasActivas.length;
  const valorTotalPropuesto = propuestasActivas.reduce((sum, p) => sum + (p.propuesta || 0), 0);
  const valorTotalPresupuesto = propuestasActivas.reduce((sum, p) => sum + (p.valorPresupuesto || 0), 0);
  const estadosUnicos = new Set(propuestasActivas.map(p => p.estado)).size;

  const propuestasFiltradas = propuestasActivas.filter(p =>
    p.numeroProceso?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
    p.entidad?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
    p.objeto?.toLowerCase().includes(busquedaLocal.toLowerCase())
  );

  // Alertas de evaluación próximas
  const proximasEvaluaciones = propuestasActivas.filter(p => {
    const dias = calcularDiasRestantes(p.fechaEvaluacion);
    return dias !== null && dias >= 0 && dias <= 15;
  }).sort((a, b) => {
    const diasA = calcularDiasRestantes(a.fechaEvaluacion);
    const diasB = calcularDiasRestantes(b.fechaEvaluacion);
    return diasA - diasB;
  });

  return (
    <div style={styles.container}>
      <Toaster />
      <div style={styles.header}>
        <button onClick={() => setVista('menu')} style={styles.backBtn}><FaArrowLeft /> Volver al menú</button>
        <h1 style={styles.title}>Propuestas Presentadas</h1>
        <div style={styles.buttonGroup}>
          <label style={styles.uploadBtn}><FaUpload /> Subir Excel <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} /></label>
          <button onClick={descargarExcel} style={styles.downloadBtn} disabled={!excelExiste}><FaDownload /> Descargar</button>
          <button onClick={editarConOnlyOffice} style={styles.editBtn} disabled={!excelExiste}><FaEdit /> Editar</button>
          <button onClick={cargarArchivo} style={styles.refreshBtn}><FaSyncAlt /> Actualizar</button>
        </div>
      </div>

      {/* Alertas */}
      {proximasEvaluaciones.length > 0 && (
        <div style={alertStyles.container}>
          <div style={alertStyles.header}>
            <FaBell style={{ color: '#f59e0b' }} />
            <span style={alertStyles.title}>Alertas de evaluación próximas</span>
            <span style={alertStyles.badge}>{proximasEvaluaciones.length}</span>
          </div>
          <div style={alertStyles.list}>
            {proximasEvaluaciones.map(p => {
              const dias = calcularDiasRestantes(p.fechaEvaluacion);
              const color = getUrgenciaColor(dias);
              return (
                <div key={p.id} style={alertStyles.item}>
                  <div style={alertStyles.itemInfo}>
                    <span style={alertStyles.itemTitle}>{p.numeroProceso}</span>
                    <span style={alertStyles.itemSub}>{p.entidad}</span>
                  </div>
                  <div style={{ ...alertStyles.itemDate, color }}>
                    <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                    {formatearFechaLegible(p.fechaEvaluacion)}
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

      {/* Métricas */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#6366f1')}><FaClipboardList /></div>
          <div><div style={styles.metricValue}>{totalPropuestas}</div><div style={styles.metricLabel}>Propuestas</div></div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#10b981')}><FaDollarSign /></div>
          <div><div style={styles.metricValue}>${valorTotalPropuesto.toLocaleString()}</div><div style={styles.metricLabel}>Valor Propuesto</div></div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricIcon('#f59e0b')}><FaDollarSign /></div>
          <div><div style={styles.metricValue}>${valorTotalPresupuesto.toLocaleString()}</div><div style={styles.metricLabel}>Presupuesto Oficial</div></div>
        </div>
      </div>

      {/* Búsqueda */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <FaSearch color="#64748b" />
          <input placeholder="Buscar por Nº proceso, entidad, objeto..." value={busquedaLocal} onChange={e => setBusquedaLocal(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      {cargandoPropuestas ? (
        <div style={styles.loader}><FaSpinner className="spin" /> Cargando...</div>
      ) : (
        <>
          {propuestas.length === 0 && excelExiste && (
            <div style={styles.emptyState}>
              <p>No se encontraron propuestas en la hoja "PROPUESTAS". Verifica que el Excel tenga datos.</p>
            </div>
          )}
          {propuestas.length > 0 && (
            <div style={styles.tableWrapper}>
              <table style={styles.tabla}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Proceso</th>
                    <th style={styles.th}>Entidad</th>
                    <th style={styles.th}>Objeto</th>
                    <th style={styles.th}>Propuesta</th>
                    <th style={styles.th}>Presupuesto</th>
                    <th style={styles.th}>Cierre</th>
                    <th style={styles.th}>Evaluación</th>
                    <th style={styles.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {propuestasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={styles.noResults}>No hay resultados</td>
                    </tr>
                  ) : (
                    propuestasFiltradas.map(p => (
                      <tr key={p.id} style={styles.tableRow}>
                        <td style={styles.td}><span style={styles.contratoCell}>{p.numeroProceso}</span></td>
                        <td style={styles.td}>{p.entidad}</td>
                        <td style={styles.td}>{p.objeto?.substring(0, 60)}...</td>
                        <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>${p.propuesta?.toLocaleString()}</td>
                        <td style={styles.td}>${p.valorPresupuesto?.toLocaleString()}</td>
                        <td style={styles.td}>{p.fechaCierre ? formatearFechaLegible(p.fechaCierre) : '—'}</td>
                        <td style={styles.td}>{p.fechaEvaluacion ? formatearFechaLegible(p.fechaEvaluacion) : '—'}</td>
                        <td style={styles.td}>
                          <span style={{
                            background: p.estado === 'ACEPTADA' ? 'rgba(16,185,129,0.2)' : (p.estado === 'EVALUACION' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'),
                            color: p.estado === 'ACEPTADA' ? '#10b981' : (p.estado === 'EVALUACION' ? '#f59e0b' : '#f87171'),
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px'
                          }}>
                            {p.estado || 'SIN ESTADO'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
if (vista === 'contratos') {
    const totalContratos = contratos.length;
    const valorTotalContratos = contratos.reduce((sum, c) => sum + (c.valorContrato || 0), 0);
    const contratosFiltrados = contratos.filter(c =>
        c.numeroContrato?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
        c.entidad?.toLowerCase().includes(busquedaLocal.toLowerCase()) ||
        c.objeto?.toLowerCase().includes(busquedaLocal.toLowerCase())
    );

    return (
        <div style={styles.container}>
            <Toaster />
            <div style={styles.header}>
                <button onClick={() => setVista('menu')} style={styles.backBtn}><FaArrowLeft /> Volver al menú</button>
                <h1 style={styles.title}>Contratos Adjudicados</h1>
                <div style={styles.buttonGroup}>
                    <label style={styles.uploadBtn}><FaUpload /> Subir Excel <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} /></label>
                    <button onClick={descargarExcel} style={styles.downloadBtn} disabled={!excelExiste}><FaDownload /> Descargar</button>
                    <button onClick={editarConOnlyOffice} style={styles.editBtn} disabled={!excelExiste}><FaEdit /> Editar</button>
                    <button onClick={cargarArchivo} style={styles.refreshBtn}><FaSyncAlt /> Actualizar</button>
                </div>
            </div>

            <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                    <div style={styles.metricIcon('#6366f1')}><FaFileContract /></div>
                    <div><div style={styles.metricValue}>{totalContratos}</div><div style={styles.metricLabel}>Contratos</div></div>
                </div>
                <div style={styles.metricCard}>
                    <div style={styles.metricIcon('#10b981')}><FaDollarSign /></div>
                    <div><div style={styles.metricValue}>${valorTotalContratos.toLocaleString()}</div><div style={styles.metricLabel}>Valor Total</div></div>
                </div>
            </div>

            <div style={styles.filterBar}>
                <div style={styles.searchBox}>
                    <FaSearch color="#64748b" />
                    <input placeholder="Buscar por contrato, entidad, objeto..." value={busquedaLocal} onChange={e => setBusquedaLocal(e.target.value)} style={styles.searchInput} />
                </div>
            </div>

            {/* Panel de alertas - PLAZOS DE EJECUCIÓN PRÓXIMOS */}
            {(() => {
              const proximosPlazos = contratos.filter(c => {
                const dias = calcularDiasRestantes(c.plazoEjecucion);
                return dias !== null && dias >= 0 && dias <= 30; // contratos con más margen (30 días)
              }).sort((a, b) => {
                const diasA = calcularDiasRestantes(a.plazoEjecucion);
                const diasB = calcularDiasRestantes(b.plazoEjecucion);
                return diasA - diasB;
              });

              if (proximosPlazos.length === 0) return null;

              return (
                <div style={alertStyles.container}>
                  <div style={alertStyles.header}>
                    <FaBell style={{ color: '#f59e0b' }} />
                    <span style={alertStyles.title}>Alertas de plazo de ejecución</span>
                    <span style={alertStyles.badge}>{proximosPlazos.length}</span>
                  </div>
                  <div style={alertStyles.list}>
                    {proximosPlazos.map(c => {
                      const dias = calcularDiasRestantes(c.plazoEjecucion);
                      const color = getUrgenciaColor(dias);
                      return (
                        <div key={c.id} style={alertStyles.item}>
                          <div style={alertStyles.itemInfo}>
                            <span style={alertStyles.itemTitle}>{c.numeroContrato}</span>
                            <span style={alertStyles.itemSub}>{c.entidad}</span>
                          </div>
                          <div style={{ ...alertStyles.itemDate, color }}>
                            <FaCalendarAlt size={12} style={{ marginRight: '4px' }} />
                            {formatearFechaLegible(c.plazoEjecucion) || 'Sin plazo'}
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
            })()}

            {cargandoContratos ? (
                <div style={styles.loader}><FaSpinner className="spin" /> Cargando...</div>
            ) : (
                <>
                    {contratos.length === 0 && excelExiste && (
                        <div style={styles.emptyState}>
                            <p>No se encontraron contratos en la hoja "CONTRATOS".</p>
                        </div>
                    )}
                    {contratos.length > 0 && (
                        <div style={styles.tableWrapper}>
                            <table style={styles.tabla}>
                                <thead>
                                    <tr style={styles.tableHeader}>
                                        <th style={styles.th}>Contrato</th>
                                        <th style={styles.th}>Entidad</th>
                                        <th style={styles.th}>Objeto</th>
                                        <th style={styles.th}>Estado</th>
                                        <th style={styles.th}>Valor</th>
                                        <th style={styles.th}>Plazo</th>
                                        <th style={styles.th}>Entrega</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contratosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={styles.noResults}>No hay resultados</td>
                                        </tr>
                                    ) : (
                                        contratosFiltrados.map(c => (
                                            <tr key={c.id} style={styles.tableRow}>
                                                <td style={styles.td}><span style={styles.contratoCell}>{c.numeroContrato}</span></td>
                                                <td style={styles.td}>{c.entidad}</td>
                                                <td style={styles.td}>{c.objeto?.substring(0, 80)}...</td>
                                                <td style={styles.td}>{c.estadoContrato || '—'}</td>
                                                <td style={{ ...styles.td, color: '#10b981', fontWeight: 'bold' }}>${c.valorContrato?.toLocaleString()}</td>
                                                <td style={styles.td}>{c.plazoEjecucion ? formatearFechaLegible(c.plazoEjecucion) : '—'}</td>
                                                <td style={styles.td}>{c.fechaEntrega ? formatearFechaLegible(c.fechaEntrega) : '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
  // Fallback (no debería llegar aquí)
  return null;
};

// ========== ESTILOS MEJORADOS ==========
const styles = {
  container: { 
    background: 'transparent', // antes tenía un gradiente propio
    padding: '24px', 
    maxWidth: '1400px', 
    margin: '0 auto', 
    minHeight: '100vh', 
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', 
    color: '#e2e8f0' 
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' },
  backBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '999px', padding: '8px 16px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' },
  title: { fontSize: '1.8rem', fontWeight: '700', color: '#e6eef8', margin: 0 },
  buttonGroup: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  uploadBtn: { background: 'linear-gradient(90deg,#6366f1,#4f46e5)', padding: '10px 18px', borderRadius: '999px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 18px rgba(99,102,241,0.16)' },
  downloadBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 14px', borderRadius: '999px', color: '#cbd5e1', cursor: 'pointer' },
  editBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 14px', borderRadius: '999px', color: '#fbbf24', cursor: 'pointer' },
  refreshBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', padding: '8px 14px', borderRadius: '999px', color: '#94a3b8', cursor: 'pointer' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginTop: '40px' },
  menuCard: { background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', borderRadius: '20px', padding: '28px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s', border: '1px solid rgba(255,255,255,0.03)' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' },
  metricCard: { background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(6px)' },
  metricIcon: (color) => ({ width: '48px', height: '48px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '20px' }),
  metricValue: { fontSize: '24px', fontWeight: '700', color: '#e6eef8' },
  metricLabel: { fontSize: '12px', color: '#94a3b8' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '999px', padding: '8px 16px', border: '1px solid rgba(255,255,255,0.04)', flex: 1 },
  searchInput: { border: 'none', background: 'none', outline: 'none', color: '#e6eef8', marginLeft: '8px', width: '100%' },
  tableWrapper: { overflowX: 'auto', background: 'rgba(15,23,42,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableHeader: { background: 'rgba(30,41,59,0.6)', borderBottom: '2px solid #334155' },
  th: { padding: '16px 12px', textAlign: 'left', color: '#f1f5f9', fontWeight: '600', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' },
  tableRow: { borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s' },
  td: { padding: '14px 12px', color: '#e2e8f0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contratoCell: { fontWeight: '600', color: '#6366f1' },
  loader: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: '#94a3b8' },
  noResults: { textAlign: 'center', padding: '40px', color: '#94a3b8', gridColumn: '1 / -1' },
};
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
export default GestionTablaControl;