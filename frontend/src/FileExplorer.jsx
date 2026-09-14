import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import Dashboard from './Dashboard';
import ExcelViewerModal from './ExcelViewerModal';
import toast, { Toaster } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { API_BASE_URL } from './config';
import { 
  FaFilePdf, FaFileWord, FaFileExcel, FaDownload, 
  FaEdit, FaFolder, FaArrowLeft, FaUpload, 
  FaSearch, FaEllipsisV, FaRegFileAlt, FaFolderOpen,
  FaPlus, FaTrash, FaExchangeAlt, FaTimes, FaFilter, FaCalendarAlt,
  FaBuilding, FaTag, FaUser, FaCheckCircle, FaHourglassHalf, FaBan,FaTable,
  FaSpinner, FaFileAlt,  FaFileContract, FaAlignLeft, FaFileInvoiceDollar
} from 'react-icons/fa';
import OnlyOfficeEditor from './OnlyOfficeEditor';
import FacturaViewerModal from './FacturaViewerModal';

// ========== COMPONENTE MODAL DE SUBIDA AVANZADA ==========
const UploadModal = ({ isOpen, onClose, rutaActual, onUploadComplete, customModulos, customTiposDocumento, onAddModulo, onAddTipoDocumento }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewedFile, setPreviewedFile] = useState(null);
  const [metadata, setMetadata] = useState({
    modulo: '',
    tipoDocumento: '',
    numeroReferencia: '',
    cliente: '',
    contratoOC: '',
    fechaDocumento: new Date().toISOString().slice(0, 10),
    descripcion: ''
  });
  const modulosDisponibles = [...customModulos];
  const tiposDisponibles = [...customTiposDocumento];

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
      error: null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/zip': ['.zip']
    }
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (files.length > 0 && !previewedFile && !previewing) {
      const primerArchivo = files[0].file;
      previsualizarArchivo(primerArchivo);
    }
  }, [files]);

  const handleMetadataChange = (e) => {
    setMetadata({ ...metadata, [e.target.name]: e.target.value });
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo');
      return;
    }
    setUploading(true);

    const uploadPromises = files.map(async (fileItem, index) => {
      const formData = new FormData();
      formData.append('file', fileItem.file);
      formData.append('ruta', rutaActual);
      Object.keys(metadata).forEach(key => formData.append(key, metadata[key]));

      try {
        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'uploading' } : f));

        const res = await axios.post('/api/archivos/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, progress: percentCompleted } : f));
          }
        });

        if (res.data.rutaSugerida && res.data.rutaSugerida !== res.data.rutaOriginal) {
          toast((t) => (
            <div>
              <p>El sistema sugiere mover <strong>{fileItem.name}</strong> a {res.data.rutaSugerida}</p>
              <button onClick={async () => {
                await axios.post('/api/archivos/confirmar-movimiento', null, {
                  params: { metadataId: res.data.metadataId, rutaDestino: res.data.rutaSugerida }
                });
                toast.success('Movido correctamente');
                toast.dismiss(t.id);
              }} style={{ marginRight: '8px' }}>Aceptar</button>
              <button onClick={() => toast.dismiss(t.id)}>Ignorar</button>
            </div>
          ), { duration: 5000 });
        }

        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'completed', progress: 100 } : f));
        return { index, success: true };
      } catch (err) {
        let errorMsg = err.message;
        
        // Detectar errores específicos
        if (err.response?.status === 409) {
          // Archivo bloqueado
          const errorData = err.response.data;
          errorMsg = `${errorData.error || 'Archivo en uso'} - ${errorData.sugerencia || 'Ciérralo e intenta de nuevo'}`;
        } else if (err.response?.status === 403) {
          errorMsg = 'Acceso denegado - Verifica tu sesión';
        } else if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.response?.data?.message) {
          errorMsg = err.response.data.message;
        }
        
        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'error', error: errorMsg } : f));
        return { index, success: false, error: errorMsg };
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const succeeded = results.filter(r => r.value?.success).length;
    const failed = results.filter(r => r.value?.success === false).length;

    setUploading(false);

    if (failed === 0 && succeeded > 0) {
      toast.success(`${succeeded} archivo(s) subidos correctamente`);
      onUploadComplete();
      setTimeout(onClose, 1500);
    } else if (succeeded > 0) {
      toast.success(`${succeeded} subidos, ${failed} fallaron`);
      onUploadComplete();
    } else {
      toast.error('Ningún archivo pudo subirse');
    }
  };

  if (!isOpen) return null;

  const previsualizarArchivo = async (file) => {
    setPreviewing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/archivos/previsualizar', formData);
      const data = res.data;
      if (!data.error) {
        setMetadata(prev => ({
          ...prev,
          numeroReferencia: data.numero_factura || data.numero || prev.numeroReferencia,
          cliente: data.proveedor || prev.cliente,
          fechaDocumento: data.fecha ? data.fecha.split('T')[0] : prev.fechaDocumento,
          tipoDocumento: data.tipoDetectado === 'FACTURA' ? 'Factura' : prev.tipoDocumento,
        }));
        toast.success('Datos detectados automáticamente. Revísalos antes de subir.', { duration: 4000 });
        setPreviewedFile(file.name);
        console.log("Datos recibidos del backend:", data);
      } else {
        toast.warning(data.error);
      }
    } catch (err) {
      toast.error('Error al detectar datos del archivo');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3>Subir archivo</h3>
          <button onClick={onClose} style={modalStyles.closeBtn}><FaTimes /></button>
        </div>

        <div style={modalStyles.body}>
          <div {...getRootProps()} style={modalStyles.dropzone}>
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Suelta los archivos aquí...</p>
            ) : (
              <>
                <FaUpload size={32} color="#818cf8" />
                <p>Arrastra y suelta tus archivos aquí</p>
                <p style={{ fontSize: '12px', color: '#64748b' }}>o haz clic para buscar en tu equipo</p>
                <small>Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, ZIP | Máx 50MB por archivo</small>
              </>
            )}
          </div>

          <div style={modalStyles.metadataGrid}>
            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaBuilding style={modalStyles.fieldIcon} /> Módulo
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  name="modulo"
                  value={metadata.modulo}
                  onChange={handleMetadataChange}
                  style={{ ...modalStyles.fieldSelect, flex: 1 }}
                >
                  <option value="">Seleccionar</option>
                  {modulosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = prompt('Ingrese el nombre del nuevo módulo:');
                    if (nuevo && nuevo.trim()) {
                      onAddModulo(nuevo.trim());
                      setMetadata(prev => ({ ...prev, modulo: nuevo.trim() }));
                    }
                  }}
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Añadir módulo"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaTag style={modalStyles.fieldIcon} /> Tipo de documento
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  name="tipoDocumento"
                  value={metadata.tipoDocumento}
                  onChange={handleMetadataChange}
                  style={{ ...modalStyles.fieldSelect, flex: 1 }}
                >
                  <option value="">Seleccionar</option>
                  {tiposDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const nuevo = prompt('Ingrese el nuevo tipo de documento:');
                    if (nuevo && nuevo.trim()) {
                      onAddTipoDocumento(nuevo.trim());
                      setMetadata(prev => ({ ...prev, tipoDocumento: nuevo.trim() }));
                    }
                  }}
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Añadir tipo de documento"
                >
                  <FaPlus />
                </button>
              </div>
            </div>

            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaFileAlt style={modalStyles.fieldIcon} /> Número / Referencia
              </label>
              <input
                type="text"
                name="numeroReferencia"
                value={metadata.numeroReferencia}
                onChange={handleMetadataChange}
                placeholder="Ej: FE 550"
                style={modalStyles.fieldInput}
              />
            </div>

            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaUser style={modalStyles.fieldIcon} /> Cliente
              </label>
              <input
                type="text"
                name="cliente"
                value={metadata.cliente}
                onChange={handleMetadataChange}
                placeholder="Municipio de Medellín"
                style={modalStyles.fieldInput}
              />
            </div>

            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaFileContract style={modalStyles.fieldIcon} /> Contrato / OC
              </label>
              <input
                type="text"
                name="contratoOC"
                value={metadata.contratoOC}
                onChange={handleMetadataChange}
                placeholder="4600105468 DE 2025"
                style={modalStyles.fieldInput}
              />
            </div>

            <div style={modalStyles.fieldGroup}>
              <label style={modalStyles.fieldLabel}>
                <FaCalendarAlt style={modalStyles.fieldIcon} /> Fecha del documento
              </label>
              <input
                type="date"
                name="fechaDocumento"
                value={metadata.fechaDocumento}
                onChange={handleMetadataChange}
                style={modalStyles.fieldInput}
              />
            </div>

          </div>

          {files.length > 0 && (
            <div style={modalStyles.fileList}>
              <h4>Archivos a subir ({files.length})</h4>
              {files.map((file, idx) => (
                <div key={idx} style={modalStyles.fileItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <FaFileAlt color="#818cf8" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{file.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      {file.status === 'uploading' && (
                        <div style={modalStyles.progressBar}>
                          <div style={{ ...modalStyles.progressFill, width: `${file.progress}%` }}></div>
                        </div>
                      )}
                      {file.status === 'completed' && <span style={{ color: '#10b981' }}>Completado ✔</span>}
                      {file.status === 'error' && <span style={{ color: '#f87171' }}>Error: {file.error}</span>}
                    </div>
                  </div>
                  {file.status === 'pending' && !uploading && (
                    <button onClick={() => removeFile(idx)} style={modalStyles.removeBtn}><FaTrash /></button>
                  )}
                  {file.status === 'uploading' && <FaSpinner className="spin" />}
                  {file.status === 'completed' && <FaCheckCircle color="#10b981" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={modalStyles.footer}>
          <button onClick={onClose} style={modalStyles.cancelBtn} disabled={uploading}>Cancelar</button>
          <button onClick={uploadFiles} style={modalStyles.uploadBtn} disabled={uploading || files.length === 0}>
            {uploading ? 'Subiendo...' : 'Subir archivos'}
          </button>
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    background: '#1e293b',
    borderRadius: '28px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px -12px black',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
    background: '#0f172a',
    borderTopLeftRadius: '28px',
    borderTopRightRadius: '28px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '20px',
  },
  body: {
    padding: '24px',
  },
  dropzone: {
    border: '2px dashed #4f46e5',
    borderRadius: '20px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'rgba(79, 70, 229, 0.05)',
    marginBottom: '28px',
    transition: '0.2s',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '28px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#cbd5e1',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    letterSpacing: '0.3px',
  },
  fieldIcon: {
    fontSize: '12px',
    color: '#818cf8',
  },
  fieldInput: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    fontFamily: 'inherit',
  },
  fieldSelect: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  fieldTextarea: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  fileList: {
    marginTop: '20px',
    borderTop: '1px solid #334155',
    paddingTop: '20px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0f172a',
    padding: '12px',
    borderRadius: '16px',
    marginBottom: '8px',
  },
  progressBar: {
    height: '4px',
    background: '#334155',
    borderRadius: '2px',
    marginTop: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#4f46e5',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #334155',
    background: '#0f172a',
    borderBottomLeftRadius: '28px',
    borderBottomRightRadius: '28px',
  },
  cancelBtn: {
    background: '#334155',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '40px',
    color: '#fff',
    cursor: 'pointer',
  },
  uploadBtn: {
    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    border: 'none',
    padding: '10px 28px',
    borderRadius: '40px',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// ========== COMPONENTE PRINCIPAL FILEEXPLORER ==========
function FileExplorer({ setArchivoParaEditar }) {
  // ========== ESTADOS PRINCIPALES ==========
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [rutaActual, setRutaActual] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [editorConfig, setEditorConfig] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalExcel, setModalExcel] = useState({ open: false, metadataId: null, fileName: '' });
  const [facturaModal, setFacturaModal] = useState({ open: false, ruta: '' });
  const [facturaData, setFacturaData] = useState(null);
  const [cargandoFactura, setCargandoFactura] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filtros, setFiltros] = useState({
    area: '',
    anio: '',
    extension: '',       
    proveedor: '',
    fechaModDesde: '',    
    fechaModHasta: '',    
    busquedaAvanzada: '',
    modulo: '',
    tipoDocumento: '',    
    numeroReferencia: '',
    cliente: '',
    contratoOC: '',
    fechaDocumentoDesde: '',
    fechaDocumentoHasta: '',
    descripcion: ''
  });

  const [opcionesAreas, setOpcionesAreas] = useState([]);
  const [opcionesTipos, setOpcionesTipos] = useState(['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'ZIP', 'Otros']);
  
  const [modal, setModal] = useState({ visible: false, tipo: '', mensaje: '', callback: null, valorInicial: '' });
  const [inputModal, setInputModal] = useState('');

  const [customModulos, setCustomModulos] = useState(() => {
    try {
      const saved = localStorage.getItem('customModulos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('customModulos', JSON.stringify(customModulos));
  }, [customModulos]);

  const [customTiposDocumento, setCustomTiposDocumento] = useState(() => {
    try {
      const saved = localStorage.getItem('customTiposDocumento');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (facturaModal.open && facturaModal.ruta) {
      setCargandoFactura(true);
      axios.get('/api/archivos/extraer-factura', { params: { ruta: facturaModal.ruta } })
        .then(res => {
          setFacturaData(res.data);
          setCargandoFactura(false);
        })
        .catch(() => {
          toast.error('No se pudo extraer la factura');
          setFacturaModal({ open: false, ruta: '' });
          setCargandoFactura(false);
        });
    }
  }, [facturaModal.open, facturaModal.ruta]);
  useEffect(() => {
    localStorage.setItem('customTiposDocumento', JSON.stringify(customTiposDocumento));
  }, [customTiposDocumento]);

  const opcionesModulo = useMemo(() => {
    const modulos = new Set(archivos.filter(a => !a.esCarpeta && a.modulo).map(a => a.modulo));
    customModulos.forEach(m => modulos.add(m));
    return ['', ...Array.from(modulos).sort()];
  }, [archivos, customModulos]);

  const opcionesTipoDocumento = useMemo(() => {
    const tipos = new Set(archivos.filter(a => !a.esCarpeta && a.tipoDocumento).map(a => a.tipoDocumento));
    customTiposDocumento.forEach(t => tipos.add(t));
    return ['', ...Array.from(tipos).sort()];
  }, [archivos, customTiposDocumento]);

  const opcionesExtension = useMemo(() => {
    const exts = new Set(archivos.filter(a => !a.esCarpeta && a.extension).map(a => a.extension.toUpperCase()));
    return ['', ...Array.from(exts).sort()];
  }, [archivos]);

  // ========== RESPONSIVE ==========
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ========== CARGA DE DATOS ==========
  const cargarDepartamentos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await axios.get('/api/archivos/departamentos');
      const depts = res.data.map(n => ({ 
        nombre: n, esCarpeta: true, extension: null, ultimaModificacion: "---", ruta: n
      }));
      setArchivos(depts);
      setOpcionesAreas(res.data);
    } catch (err) {
      toast.error("Error al cargar departamentos.");
      setArchivos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarContenidoCarpeta = useCallback(async (ruta) => {
    setCargando(true);
    try {
      const res = await axios.get(`/api/archivos/listar`, { params: { ruta } });
      setArchivos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Error al cargar el contenido");
      setArchivos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (rutaActual !== "") {
      cargarContenidoCarpeta(rutaActual);
    } else {
      setArchivos([]);
    }
  }, [rutaActual, cargarContenidoCarpeta]);

  // ========== FUNCIONES DE ARCHIVOS (con stopPropagation) ==========
  const eliminarElemento = async (e, item) => {
    e.stopPropagation();
    const tipo = item.esCarpeta ? "la carpeta" : "el archivo";
    mostrarConfirmacion(`¿Eliminar ${tipo} "${item.nombre}"?`, async () => {
      try {
        setCargando(true);
        const path = construirRuta(item);
        await axios.delete(`/api/archivos/eliminar`, { params: { ruta: path } });
        if (rutaActual === "") cargarDepartamentos();
        else cargarContenidoCarpeta(rutaActual);
        setMenuAbierto(null);
      } catch (err) {
        toast.error("Error al eliminar");
      } finally {
        setCargando(false);
      }
    });
  };

  const renombrarElemento = async (e, item) => {
    e.stopPropagation();
    mostrarPrompt("Nuevo nombre:", item.nombre, async (nuevoNombre) => {
      if (!nuevoNombre || nuevoNombre === item.nombre) return;
      try {
        const path = construirRuta(item);
        await axios.put(`/api/archivos/renombrar`, null, {
          params: { rutaAntigua: path, nombreNuevo: nuevoNombre.trim() }
        });
        if (rutaActual === "") cargarDepartamentos();
        else cargarContenidoCarpeta(rutaActual);
      } catch (err) {
        toast.error("Error al renombrar");
      }
      setMenuAbierto(null);
    });
  };

  const descargarElemento = (e, item) => {
    e.stopPropagation();
    const path = construirRuta(item);
    const link = document.createElement('a');
    link.href = `/api/archivos/descargar?ruta=${encodeURIComponent(path)}`;
    link.download = item.nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMenuAbierto(null);
  };

  const crearNuevaCarpeta = async () => {
    mostrarPrompt("Nombre de la nueva carpeta:", "", async (nombre) => {
      if (!nombre) return;
      try {
        await axios.post('/api/archivos/crear-carpeta', { categoria: rutaActual, nombre });
        cargarContenidoCarpeta(rutaActual);
      } catch (err) {
        toast.error("Error al crear la carpeta");
      }
    });
  };

const abrirEditor = async (e, item) => {
  e.stopPropagation();
  const path = construirRuta(item);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_BASE_URL}/api/archivos/onlyoffice/config`, {
      params: { ruta: path , token: token},
      headers: { Authorization: `Bearer ${token}` }  // 👈 AÑADIR ESTO
    });
    
    if (!res.data) {
      console.error('Respuesta vacía del servidor');
      toast.error("El servidor no retornó configuración válida");
      return;
    }
    
    if (!res.data.document) {
      console.error('Campo document faltante:', res.data);
      toast.error("El archivo no se puede editar (configuración inválida)");
      return;
    }
    
    if (!res.data.editorConfig) {
      console.error('Campo editorConfig faltante:', res.data);
      toast.error("Configuración del editor incompleta");
      return;
    }
    
    console.log('✅ Configuración OnlyOffice obtenida:', res.data);
    setEditorConfig(res.data);
  } catch (err) {
    console.error('Error al abrir OnlyOffice:', err);
    const mensaje = err.response?.data?.message || err.message || 'Error desconocido';
    toast.error(`Error al abrir el editor: ${mensaje}`);
  }
};

  const construirRuta = (item) => {
    if (item.ruta) return item.ruta.replace(/\\/g, '/');
    if (rutaActual === "") return item.nombre;
    return `${rutaActual}/${item.nombre}`.replace(/\\/g, '/');
  };

  const entrarACarpeta = (nombre) => {
    setRutaActual(rutaActual === "" ? nombre : `${rutaActual}/${nombre}`);
    setBusqueda("");
  };

  const volverAtras = () => {
    const partes = rutaActual.split('/');
    partes.pop();
    setRutaActual(partes.join('/'));
  };

  // ========== MODALES ==========
  const mostrarConfirmacion = (mensaje, callback) => {
    setModal({ visible: true, tipo: 'confirm', mensaje, callback, valorInicial: '' });
  };

  const mostrarPrompt = (mensaje, valorInicial, callback) => {
    setInputModal(valorInicial);
    setModal({ visible: true, tipo: 'prompt', mensaje, callback, valorInicial });
  };

  const cerrarModal = () => {
    setModal({ visible: false, tipo: '', mensaje: '', callback: null, valorInicial: '' });
    setInputModal('');
  };

  const aceptarModal = () => {
    if (modal.tipo === 'confirm') {
      modal.callback();
    } else if (modal.tipo === 'prompt') {
      modal.callback(inputModal);
    }
    cerrarModal();
  };

  // ========== ICONOS Y FORMATO ==========
  const getIcon = (ext, esCarpeta) => {
    const s = { fontSize: isMobile ? '20px' : '22px' };
    if (esCarpeta) return <FaFolder style={{...s, color: '#fbbf24'}} />;
    const e = ext?.toLowerCase();
    if (e === 'pdf') return <FaFilePdf style={{...s, color: '#f87171'}} />;
    if (['doc', 'docx'].includes(e)) return <FaFileWord style={{...s, color: '#3b82f6'}} />;
    if (['xls', 'xlsx'].includes(e)) return <FaFileExcel style={{...s, color: '#10b981'}} />;
    if (['ppt', 'pptx'].includes(e)) return <FaRegFileAlt style={{...s, color: '#f59e0b'}} />;
    return <FaRegFileAlt style={{...s, color: '#94a3b8'}} />;
  };

  const formatearFechaLocal = (fechaInput) => {
    if (!fechaInput || fechaInput === "---") return "---";
    let fecha;
    if (typeof fechaInput === 'number') {
      fecha = new Date(fechaInput);
    } else if (typeof fechaInput === 'string') {
      fecha = new Date(fechaInput);
      if (isNaN(fecha.getTime())) return fechaInput;
    } else {
      return fechaInput;
    }
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const archivosFiltrados = useMemo(() => {
    let resultado = [...archivos];

    if (filtros.modulo) {
      resultado = resultado.filter(f => !f.esCarpeta && f.modulo === filtros.modulo);
    }
    if (filtros.tipoDocumento) {
      resultado = resultado.filter(f => !f.esCarpeta && f.tipoDocumento === filtros.tipoDocumento);
    }
    if (filtros.numeroReferencia) {
      const term = filtros.numeroReferencia.toLowerCase();
      resultado = resultado.filter(f => !f.esCarpeta && f.numeroReferencia?.toLowerCase().includes(term));
    }
    if (filtros.cliente) {
      const term = filtros.cliente.toLowerCase();
      resultado = resultado.filter(f => !f.esCarpeta && f.cliente?.toLowerCase().includes(term));
    }
    if (filtros.contratoOC) {
      const term = filtros.contratoOC.toLowerCase();
      resultado = resultado.filter(f => !f.esCarpeta && f.contratoOC?.toLowerCase().includes(term));
    }
    if (filtros.fechaDocumentoDesde) {
      const desde = new Date(filtros.fechaDocumentoDesde);
      desde.setHours(0,0,0);
      resultado = resultado.filter(f => !f.esCarpeta && f.fechaDocumento && new Date(f.fechaDocumento) >= desde);
    }
    if (filtros.fechaDocumentoHasta) {
      const hasta = new Date(filtros.fechaDocumentoHasta);
      hasta.setHours(23,59,59);
      resultado = resultado.filter(f => !f.esCarpeta && f.fechaDocumento && new Date(f.fechaDocumento) <= hasta);
    }
    if (filtros.descripcion) {
      const term = filtros.descripcion.toLowerCase();
      resultado = resultado.filter(f => !f.esCarpeta && f.descripcion?.toLowerCase().includes(term));
    }

    if (filtros.extension) {
      resultado = resultado.filter(f => !f.esCarpeta && f.extension?.toUpperCase() === filtros.extension);
    }

    if (filtros.anio) {
      resultado = resultado.filter(f => {
        if (f.esCarpeta || !f.ultimaModificacion || f.ultimaModificacion === "---") return false;
        return new Date(f.ultimaModificacion).getFullYear() === parseInt(filtros.anio);
      });
    }
    if (filtros.fechaModDesde) {
      const desde = new Date(filtros.fechaModDesde);
      desde.setHours(0,0,0);
      resultado = resultado.filter(f => {
        if (f.esCarpeta || !f.ultimaModificacion) return false;
        return new Date(f.ultimaModificacion) >= desde;
      });
    }
    if (filtros.fechaModHasta) {
      const hasta = new Date(filtros.fechaModHasta);
      hasta.setHours(23,59,59);
      resultado = resultado.filter(f => {
        if (f.esCarpeta || !f.ultimaModificacion) return false;
        return new Date(f.ultimaModificacion) <= hasta;
      });
    }
    if (filtros.proveedor) {
      const term = filtros.proveedor.toLowerCase();
      resultado = resultado.filter(f => f.nombre?.toLowerCase().includes(term));
    }
    if (filtros.busquedaAvanzada) {
      const term = filtros.busquedaAvanzada.toLowerCase();
      resultado = resultado.filter(f => f.nombre?.toLowerCase().includes(term));
    }
    if (busqueda.trim()) {
      resultado = resultado.filter(f => f.nombre?.toLowerCase().includes(busqueda.toLowerCase()));
    }

    resultado.sort((a, b) => {
      if (a.esCarpeta === b.esCarpeta) return a.nombre.localeCompare(b.nombre);
      return a.esCarpeta ? -1 : 1;
    });
    return resultado;
  }, [archivos, filtros, busqueda]);

  const listaAMostrar = archivosFiltrados;

  const limpiarFiltros = () => {
    setFiltros({
      area: '', anio: '', extension: '', proveedor: '',
      fechaModDesde: '', fechaModHasta: '', busquedaAvanzada: '',
      modulo: '', tipoDocumento: '', numeroReferencia: '', cliente: '',
      contratoOC: '', fechaDocumentoDesde: '', fechaDocumentoHasta: '', descripcion: ''
    });
    setBusqueda('');
    toast.success('Filtros limpiados');
  };

  const abrirEditorDesdeRuta = async (ruta) => {
    try {
      const res = await axios.get('/api/archivos/onlyoffice/config', { params: { ruta } });
      setEditorConfig(res.data);
    } catch (err) {
      toast.error("Error al abrir el editor");
    }
  };

  // ========== MENÚ CONTEXTUAL (CORREGIDO) ==========
  const renderActionsMenu = (item, index) => {
    const menuKey = item.ruta || item.nombre;

    const openMenu = (e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 180;
      let left = rect.right - menuWidth + window.scrollX;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setMenuPosition({
        top: rect.bottom + window.scrollY + 5,
        left: left,
      });
      setMenuAbierto(menuKey);
    };

    const closeMenu = () => setMenuAbierto(null);

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button style={styles.actionIcon} onClick={openMenu}>
          <FaEllipsisV />
        </button>
        {menuAbierto === menuKey &&
          ReactDOM.createPortal(
            <div
              style={{
                ...styles.dropdown,
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 100000,
              }}
            >
              {!item.esCarpeta && (
                <div
                  style={styles.dropItem}
                  onClick={(e) => {
                    abrirEditor(e, item);
                    closeMenu();
                  }}
                >
                  <FaEdit size={12} /> Editar
                </div>
              )}
              <div
                style={styles.dropItem}
                onClick={(e) => {
                  renombrarElemento(e, item);
                  closeMenu();
                }}
              >
                <FaExchangeAlt size={12} /> Renombrar
              </div>
              {!item.esCarpeta && (
                <div
                  style={styles.dropItem}
                  onClick={(e) => {
                    descargarElemento(e, item);
                    closeMenu();
                  }}
                >
                  <FaDownload size={12} /> Descargar
                </div>
              )}
              <div
                style={{ ...styles.dropItem, color: '#f87171' }}
                onClick={(e) => {
                  eliminarElemento(e, item);
                  closeMenu();
                }}
              >
                <FaTrash size={12} /> Eliminar
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  };

  // ========== RENDER ==========
if (editorConfig) {
  return <OnlyOfficeEditor config={editorConfig} onBack={() => { 
    setEditorConfig(null);
    // Recargar la carpeta actual para reflejar cambios
    if (rutaActual === "") cargarDepartamentos();
    else cargarContenidoCarpeta(rutaActual);
  }} />;
}

  if (rutaActual === "") {
    return (
      <Dashboard 
        onSelectArea={(nombreArea) => setRutaActual(nombreArea)}
        onOpenEditor={(ruta) => {
          abrirEditorDesdeRuta(ruta);
        }}
      />
    );
  }

  return (
    <div style={styles.container} onClick={() => setMenuAbierto(null)}>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <div style={{...styles.contentWrapper, padding: isMobile ? '15px' : '40px 80px'}}>
        
        {/* Botón atrás */}
        <div style={styles.topNav}>
          <button onClick={volverAtras} style={styles.btnBack} disabled={!rutaActual && !busqueda}>
            <FaArrowLeft size={12} /> {rutaActual === "" ? "Dashboard" : "Atrás"}
          </button>
        </div>

        {/* Barra de herramientas */}
        <div style={{...styles.explorerBar, flexDirection: isMobile ? 'column' : 'row'}}>
          <div style={styles.pathInfo}>
            <div style={styles.iconCircle}><FaFolderOpen size={20} color="#818cf8" /></div>
            <div style={styles.breadcrumb}>
              <span style={styles.rootText}>Archivos</span>
              {rutaActual && <span style={styles.separator}>/</span>}
              <span style={styles.currentPathText}>{rutaActual.split('/').pop() || 'Raíz'}</span>
            </div>
          </div>

          <div style={{...styles.headerActions, width: isMobile ? '100%' : 'auto'}}>
            <div style={styles.searchContainer}>
              <FaSearch color="#64748b" size={14} />
              <input type="text" placeholder="Buscar archivos..." style={styles.searchInput} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            
            {rutaActual !== "" && (
              <div style={styles.actionButtons}>
                <button onClick={crearNuevaCarpeta} style={styles.btnSecondary} title="Nueva Carpeta">
                  <FaPlus />
                </button>
                <button onClick={() => setShowUploadModal(true)} style={styles.btnPrimary}>
                  <FaUpload /> <span style={{marginLeft: '8px'}}>Subir archivos</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botón filtros mejorado */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={styles.btnFiltros}>
            <FaFilter style={{ marginRight: '8px' }} />
            {mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        {/* Panel de filtros rediseñado */}
        {mostrarFiltros && (
          <div className="filtros-panel" style={styles.panelFiltros}>
            <div style={styles.filtrosHeader}>
              <div style={styles.filtrosTitleWrapper}>
                <FaFilter style={styles.filtrosIcon} />
                <h3 style={styles.filtrosTitle}>Filtros avanzados</h3>
                <span style={styles.activeFiltersBadge}>
                  {Object.values(filtros).filter(v => v && v !== '').length} activo(s)
                </span>
              </div>
              <span style={styles.filtrosBadge}>
                Busca tus documentos por caracteristicas, fechas y tipo
              </span>
            </div>

            <details open style={styles.filterSection}>
              <summary style={styles.sectionSummary}>
                <FaTag style={styles.sectionIcon} /> Caracteristicas del documento
              </summary>
              <div style={styles.filtrosGrid}>
                <div style={styles.filtroGrupo}>
                  <label><FaBuilding style={styles.labelIcon} /> Módulo</label>
                  <select value={filtros.modulo} onChange={e => setFiltros({...filtros, modulo: e.target.value})}>
                    <option value="">Todos los módulos</option>
                    {opcionesModulo.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                  </select>
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaTag style={styles.labelIcon} /> Tipo Documento</label>
                  <select value={filtros.tipoDocumento} onChange={e => setFiltros({...filtros, tipoDocumento: e.target.value})}>
                    <option value="">Todos los tipos</option>
                    {opcionesTipoDocumento.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaFileAlt style={styles.labelIcon} /> Número/Referencia</label>
                  <input type="text" placeholder="Ej: FE-2025-001" value={filtros.numeroReferencia} onChange={e => setFiltros({...filtros, numeroReferencia: e.target.value})} />
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaUser style={styles.labelIcon} /> Cliente</label>
                  <input type="text" placeholder="Nombre del cliente" value={filtros.cliente} onChange={e => setFiltros({...filtros, cliente: e.target.value})} />
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaFileContract style={styles.labelIcon} /> Contrato / OC</label>
                  <input type="text" placeholder="Número de contrato" value={filtros.contratoOC} onChange={e => setFiltros({...filtros, contratoOC: e.target.value})} />
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaCalendarAlt style={styles.labelIcon} /> Fecha del documento</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="date" value={filtros.fechaDocumentoDesde} onChange={e => setFiltros({...filtros, fechaDocumentoDesde: e.target.value})} placeholder="Desde" />
                    <input type="date" value={filtros.fechaDocumentoHasta} onChange={e => setFiltros({...filtros, fechaDocumentoHasta: e.target.value})} placeholder="Hasta" />
                  </div>
                </div>
              </div>
            </details>

            <details style={styles.filterSection}>
              <summary style={styles.sectionSummary}>
                <FaRegFileAlt style={styles.sectionIcon} /> Tipo de Documento
              </summary>
              <div style={styles.filtrosGrid}>
                <div style={styles.filtroGrupo}>
                  <select value={filtros.extension} onChange={e => setFiltros({...filtros, extension: e.target.value})}>
                    <option value="">Cualquier tipo</option>
                    {opcionesExtension.map(ext => <option key={ext} value={ext}>{ext}</option>)}
                  </select>
                </div>
              </div>
            </details>

            <details style={styles.filterSection}>
              <summary style={styles.sectionSummary}>
                <FaCalendarAlt style={styles.sectionIcon} /> Fechas de modificación
              </summary>
              <div style={styles.filtrosGrid}>
                <div style={styles.filtroGrupo}>
                  <label><FaCalendarAlt style={styles.labelIcon} /> Año</label>
                  <input type="number" placeholder="2025" value={filtros.anio} onChange={e => setFiltros({...filtros, anio: e.target.value})} />
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaCalendarAlt style={styles.labelIcon} /> Desde</label>
                  <input type="date" value={filtros.fechaModDesde} onChange={e => setFiltros({...filtros, fechaModDesde: e.target.value})} />
                </div>

                <div style={styles.filtroGrupo}>
                  <label><FaCalendarAlt style={styles.labelIcon} /> Hasta</label>
                  <input type="date" value={filtros.fechaModHasta} onChange={e => setFiltros({...filtros, fechaModHasta: e.target.value})} />
                </div>
              </div>
            </details>

            <div style={styles.filtrosAcciones}>
              <button onClick={limpiarFiltros} style={styles.btnLimpiar}>
                <FaTrash size={12} style={{ marginRight: '6px' }} /> Limpiar todo
              </button>
            </div>
          </div>
        )}

        {listaAMostrar.length !== archivos.length && (
          <div style={{ 
            textAlign: 'right', 
            color: '#64748b', 
            fontSize: '13px', 
            marginBottom: '8px',
            paddingRight: '4px'
          }}>
            Mostrando {listaAMostrar.length} de {archivos.length} elementos
          </div>
        )}
                      
        {/* Lista de archivos */}
        <div style={isMobile ? styles.mobileList : styles.glassWrapper}>
          {cargando && <div style={styles.loader}>Cargando...</div>}
          {!cargando && listaAMostrar.length === 0 && <div style={styles.emptyState}>No hay archivos o carpetas</div>}
          {/* ========== VISTA ESCRITORIO (TABLA REORGANIZADA) ========== */}
          {!isMobile && !cargando && listaAMostrar.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Clasificación</th>
                  <th style={styles.th}>Referencia</th>
                  <th style={styles.th}>Cliente / Contrato</th>
                  <th style={styles.th}>Fechas</th>
                  <th style={{...styles.th, textAlign: 'right'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaAMostrar.map((item) => {
                  const uniqueKey = item.ruta || `${item.nombre}_${item.ultimaModificacion}`;
                  const esCarpeta = item.esCarpeta;
                  return (
                    <tr key={uniqueKey} style={styles.tr} className="file-row">
                      <td style={{ ...styles.td, ...styles.tdName }}>
                        <div style={styles.fileNameContainer} onClick={() => esCarpeta && entrarACarpeta(item.nombre)}>
                          <div style={styles.fileIconWrapper}>{getIcon(item.extension, esCarpeta)}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={styles.itemName} title={item.nombre}>{item.nombre}</span>
                            {!esCarpeta && <span style={styles.typeChip}>{item.extension?.toUpperCase()}</span>}
                            {esCarpeta && <span style={styles.typeChipFolder}>Carpeta</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...styles.td, maxWidth: '180px' }}>
                        {esCarpeta ? <span style={styles.mutedText}>—</span> : (
                          <div style={styles.badgeGroup}>
                            {item.modulo && <span style={styles.badgeModulo} title={item.modulo}><FaBuilding size={10} style={{marginRight: 4}} /> {item.modulo}</span>}
                            {item.tipoDocumento && <span style={styles.badgeTipoDoc} title={item.tipoDocumento}><FaTag size={10} style={{marginRight: 4}} /> {item.tipoDocumento}</span>}
                            {!item.modulo && !item.tipoDocumento && <span style={styles.mutedText}>—</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.td, maxWidth: '140px' }} title={item.numeroReferencia}>
                        {esCarpeta ? <span style={styles.mutedText}>—</span> : <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{item.numeroReferencia || <span style={styles.mutedText}>—</span>}</span>}
                      </td>
                      <td style={{ ...styles.td, maxWidth: '200px' }}>
                        {esCarpeta ? <span style={styles.mutedText}>—</span> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            {item.cliente ? <span style={styles.clientName} title={item.cliente}><FaUser size={10} style={{marginRight: 4, flexShrink: 0}} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.cliente}</span></span> : <span style={styles.mutedText}>—</span>}
                            {item.contratoOC && <span style={styles.contractName} title={item.contratoOC}><FaFileContract size={10} style={{marginRight: 4, flexShrink: 0}} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.contratoOC}</span></span>}
                          </div>
                        )}
                      </td>
                      <td style={styles.tdDate}>
                        {esCarpeta ? <span style={styles.mutedText}>—</span> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={styles.dateLine}>📅 {item.fechaDocumento ? new Date(item.fechaDocumento).toLocaleDateString('es-CO') : '—'}</span>
                            <span style={styles.dateLineMod}>🕒 {formatearFechaLocal(item.ultimaModificacion)}</span>
                          </div>
                        )}
                      </td>
                      <td style={styles.tdActions}>
                        {!esCarpeta && item.extension?.toLowerCase() === 'xlsx' && (
                          <button
                            onClick={() => setModalExcel({ open: true, metadataId: item.metadataId, fileName: item.nombre })}
                            style={{ background: '#10b981', border: 'none', borderRadius: '6px', color: '#fff', padding: '4px 8px', fontSize: '11px', marginRight: '8px', cursor: 'pointer' }}
                          ><FaTable size={10} style={{ marginRight: '4px' }} /> Filas</button>
                        )}
                        {!esCarpeta && item.extension?.toLowerCase() === 'pdf' && (
                          <button
                            onClick={() => setFacturaModal({ open: true, ruta: construirRuta(item) })}
                            style={{ background: '#f59e0b', border: 'none', borderRadius: '6px', color: '#fff', padding: '4px 8px', fontSize: '11px', marginRight: '8px', cursor: 'pointer' }}
                          ><FaFileInvoiceDollar size={10} style={{ marginRight: '4px' }} /> Factura</button>
                        )}
                        {renderActionsMenu(item, uniqueKey)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {isMobile && !cargando && listaAMostrar.map((item) => {
            const uniqueKey = item.ruta || `${item.nombre}_${item.ultimaModificacion}`;
            const esCarpeta = item.esCarpeta;
            return (
              <div key={uniqueKey} style={styles.mobileCard}>
                <div style={styles.mobileCardMain} onClick={() => esCarpeta && entrarACarpeta(item.nombre)}>
                  {getIcon(item.extension, esCarpeta)}
                  <div style={{display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1}}>
                    <span style={styles.itemNameMobile}>{item.nombre}</span>
                    {!esCarpeta && (
                      <>
                        <span style={styles.itemMetaMobile}>{item.modulo && `📁 ${item.modulo}`} {item.tipoDocumento && ` · 📄 ${item.tipoDocumento}`}</span>
                        {item.numeroReferencia && <span style={styles.itemMetaMobile}>🔢 {item.numeroReferencia}</span>}
                        {item.descripcion && <span style={styles.itemMetaMobile}>📝 {item.descripcion}</span>}
                        <span style={styles.itemMetaMobile}>{item.cliente && `👤 ${item.cliente}`} {item.contratoOC && ` · 📑 ${item.contratoOC}`}</span>
                        <span style={styles.itemMetaMobile}>{item.fechaDocumento && `📅 ${new Date(item.fechaDocumento).toLocaleDateString('es-CO')}`}</span>
                        <span style={styles.itemMetaMobile}>Modificado: {formatearFechaLocal(item.ultimaModificacion)}</span>
                      </>
                    )}
                    {esCarpeta && <span style={styles.itemMetaMobile}>{formatearFechaLocal(item.ultimaModificacion)}</span>}
                  </div>
                </div>
                {renderActionsMenu(item, uniqueKey)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal personalizado (confirmaciones, renombrar, etc.) */}
      {modal.visible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>{modal.tipo === 'confirm' ? 'Confirmar' : modal.tipo === 'prompt' ? 'Ingrese un nombre' : 'Mover documento'}</h3>
              <button onClick={cerrarModal} style={styles.modalClose}><FaTimes /></button>
            </div>
            <div style={styles.modalBody}>
              {modal.tipo === 'prompt' && <input type="text" value={inputModal} onChange={(e) => setInputModal(e.target.value)} style={styles.modalInput} autoFocus />}
              {modal.tipo === 'confirm' && <p>{modal.mensaje}</p>}
              {modal.tipo === 'confirmMove' && <p style={{ whiteSpace: 'pre-wrap' }}>{modal.mensaje}</p>}
            </div>
            <div style={styles.modalFooter}>
              {modal.tipo === 'prompt' && (
                <>
                  <button onClick={cerrarModal} style={styles.modalBtnCancel}>Cancelar</button>
                  <button onClick={aceptarModal} style={styles.modalBtnAccept}>Aceptar</button>
                </>
              )}
              {modal.tipo === 'confirm' && (
                <>
                  <button onClick={cerrarModal} style={styles.modalBtnCancel}>Cancelar</button>
                  <button onClick={aceptarModal} style={styles.modalBtnAccept}>Aceptar</button>
                </>
              )}
              {modal.tipo === 'confirmMove' && (
                <>
                  <button onClick={modal.onCancel} style={{...styles.modalBtnCancel, background: '#334155', color: '#cbd5e1', border: '1px solid #475569'}}>No, dejar</button>
                  <button onClick={modal.onConfirm} style={{...styles.modalBtnAccept, background: '#10b981', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'}}>Sí, mover</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de subida avanzada */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          rutaActual={rutaActual}
          onUploadComplete={() => cargarContenidoCarpeta(rutaActual)}
          customModulos={customModulos}
          customTiposDocumento={customTiposDocumento}
          onAddModulo={(nuevo) => setCustomModulos(prev => [...prev, nuevo])}
          onAddTipoDocumento={(nuevo) => setCustomTiposDocumento(prev => [...prev, nuevo])}
        />
      )}

      {modalExcel.open && (
        <ExcelViewerModal
          isOpen={modalExcel.open}
          onClose={() => setModalExcel({ open: false })}
          metadataId={modalExcel.metadataId}
          fileName={modalExcel.fileName}
        />
      )}
      
      {facturaModal.open && (
        <FacturaViewerModal
          isOpen={facturaModal.open}
          onClose={() => setFacturaModal({ open: false, ruta: '' })}
          invoiceData={facturaData}
          loading={cargandoFactura}
        />
      )}

      <style>{`
        .file-row:hover { background: rgba(255, 255, 255, 0.03) !important; transform: translateX(4px); transition: all 0.2s ease; }
        button:active { transform: scale(0.95); }
        .filtros-panel { animation: slideDown 0.3s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        input:focus, select:focus { outline: none; border-color: #4f46e5 !important; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2); }
        .btn-back:hover { background: #334155; color: #f1f5f9; }
        .btn-filtros:hover { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .btn-limpiar:hover { background: #334155; color: #f1f5f9; border-color: #818cf8; transform: translateY(-1px); }
        .btn-buscar:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(79,70,229,0.5); background: linear-gradient(135deg, #6366f1, #818cf8); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(79,70,229,0.5); }
        .btn-secondary:hover { background: #334155; border-color: #4f46e5; }
        .drop-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .action-icon:hover { background: #334155; color: #fff; }
        .file-row:hover .item-name { color: #a5b4fc; }
        .modal-close:hover { color: #fff; }
        .modal-btn-cancel:hover { background: #475569; }
        .modal-btn-accept:hover { background: #6366f1; }
        .filtro-grupo input:focus, .filtro-grupo select:focus, .filtro-grupo-full input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2); outline: none; }
        .filtro-grupo input:hover, .filtro-grupo select:hover, .filtro-grupo-full input:hover { border-color: #4f46e5; }
      `}</style>
    </div>
  );
}

// ========== ESTILOS DEL EXPLORADOR ==========
const styles = {
  container: {},
  contentWrapper: { maxWidth: '1400px', margin: '0 auto' },
  topNav: { marginBottom: '24px' },
  btnBack: { background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(8px)', border: '1px solid #334155', color: '#94a3b8', padding: '8px 18px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', transition: '0.3s' },
  explorerBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px', flexWrap: 'wrap' },
  btnFiltros: { background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #4f46e5', padding: '8px 20px', borderRadius: '40px', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s', boxShadow: '0 2px 8px rgba(79,70,229,0.2)' },
  panelFiltros: { background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '32px', padding: '28px', marginBottom: '32px', border: '1px solid rgba(79, 70, 229, 0.4)', boxShadow: '0 25px 40px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(79, 70, 229, 0.1) inset' },
  filtrosHeader: { marginBottom: '28px', borderBottom: '1px solid rgba(79, 70, 229, 0.3)', paddingBottom: '16px' },
  filtrosTitleWrapper: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' },
  filtrosIcon: { color: '#818cf8', fontSize: '22px' },
  filtrosTitle: { color: '#f1f5f9', fontSize: '20px', margin: 0, fontWeight: '600', letterSpacing: '-0.3px' },
  activeFiltersBadge: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', padding: '4px 12px', borderRadius: '40px', fontSize: '11px', fontWeight: '600', color: '#fff', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)' },
  filtrosBadge: { color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  filtrosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px', marginBottom: '28px' },
  filtroGrupo: { display: 'flex', flexDirection: 'column', gap: '10px' },
  filtroGrupoFull: { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px' },
  labelIcon: { marginRight: '4px', fontSize: '12px', color: '#818cf8' },
  filtrosAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px' },
  btnLimpiar: { background: 'rgba(51, 65, 85, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid #475569', padding: '10px 24px', borderRadius: '40px', color: '#cbd5e1', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', transition: '0.2s' },
  btnBuscar: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', padding: '10px 32px', borderRadius: '40px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)', transition: '0.2s' },
  pathInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
  iconCircle: { width: '52px', height: '52px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '10px' },
  rootText: { color: '#64748b', fontWeight: '500', fontSize: '18px' },
  separator: { color: '#334155', fontSize: '18px' },
  currentPathText: { color: '#f1f5f9', fontWeight: '600', fontSize: '18px' },
  headerActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  searchContainer: { display: 'flex', alignItems: 'center', background: '#1e293b', padding: '0 16px', borderRadius: '40px', border: '1px solid #334155', flex: 1, minWidth: '240px', transition: '0.2s' },
  searchInput: { border: 'none', background: 'none', padding: '12px 8px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%' },
  actionButtons: { display: 'flex', gap: '10px' },
  glassWrapper: { background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '4px', overflowX: 'auto', overflowY: 'visible', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  th: { padding: '16px 16px', color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' },
  tr: { transition: '0.2s', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', overflow: 'visible' },
  td: { padding: '14px 16px', color: '#e2e8f0', fontSize: '14px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tdName: { padding: '14px 16px', maxWidth: '280px', minWidth: '180px' },
  tdType: { padding: '14px 20px' },
  tdDate: { padding: '14px 20px', color: '#64748b', fontSize: '13px' },
  fileNameContainer: { display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' },
  fileIconWrapper: { width: '32px', display: 'flex', justifyContent: 'center' },
  itemName: { color: '#e2e8f0', fontWeight: '500', fontSize: '14px', transition: '0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px', display: 'inline-block' },
  typeBadge: { background: 'rgba(51, 65, 85, 0.6)', padding: '4px 12px', borderRadius: '30px', fontSize: '11px', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)' },
  filterSection: { border: '1px solid rgba(79, 70, 229, 0.15)', borderRadius: '20px', padding: '12px 20px', marginBottom: '16px', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', transition: '0.3s' },
  sectionSummary: { outline: 'none', cursor: 'pointer', fontWeight: 600, color: '#cbd5e1', fontSize: '15px', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid transparent', transition: '0.2s' },
  sectionIcon: { color: '#818cf8', fontSize: '16px' },
  btnPrimary: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '40px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)', transition: '0.2s' },
  dropdownMobile: { position: 'absolute', right: '0', top: '45px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '180px', zIndex: 9999, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)', padding: '8px', backdropFilter: 'blur(12px)' },
  tdActions: { padding: '14px 20px', position: 'relative', overflow: 'visible', textAlign: 'right' },
  btnSecondary: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', width: '42px', height: '42px', borderRadius: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
  dropdown: { position: 'absolute', right: '0', top: 'calc(100% + 5px)', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '180px', zIndex: 9999, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)', padding: '8px', backdropFilter: 'blur(12px)' },
  dropItem: { padding: '10px 14px', fontSize: '13px', borderRadius: '10px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.15s' },
  mobileCard: { background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '24px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' },
  mobileCardMain: { display: 'flex', gap: '14px', alignItems: 'center', flex: 1, cursor: 'pointer', minWidth: 0 },
  itemNameMobile: { color: '#f1f5f9', fontWeight: '500', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemMetaMobile: { color: '#64748b', fontSize: '11px', marginTop: '4px' },
  actionIcon: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '30px', transition: '0.2s' },
  typeChip: { fontSize: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 10px', borderRadius: '20px', marginTop: '4px', display: 'inline-block', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' },
  typeChipFolder: { fontSize: '10px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '2px 10px', borderRadius: '20px', marginTop: '4px', display: 'inline-block', fontWeight: 600, letterSpacing: '0.5px' },
  badgeGroup: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  badgeModulo: { background: 'rgba(79, 70, 229, 0.2)', color: '#c7d2fe', padding: '3px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' },
  badgeTipoDoc: { background: 'rgba(168, 85, 247, 0.2)', color: '#e9d5ff', padding: '3px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' },
  clientName: { fontSize: '13px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' },
  contractName: { fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' },
  dateLine: { fontSize: '12px', color: '#cbd5e1' },
  dateLineMod: { fontSize: '11px', color: '#64748b' },
  mutedText: { color: '#475569', fontSize: '13px' },
  loader: { textAlign: 'center', padding: '60px', color: '#94a3b8' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#64748b' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modal: { background: '#1e293b', borderRadius: '28px', width: '90%', maxWidth: '450px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px black', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #334155', background: '#0f172a' },
  modalClose: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' },
  modalBody: { padding: '24px', color: '#e2e8f0' },
  modalInput: { width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', color: '#fff', marginTop: '12px', fontSize: '14px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #334155', background: '#0f172a' },
  modalBtnCancel: { background: '#334155', border: 'none', padding: '10px 20px', borderRadius: '40px', color: '#fff', cursor: 'pointer', fontWeight: '500', transition: '0.2s' },
  modalBtnAccept: { background: '#4f46e5', border: 'none', padding: '10px 24px', borderRadius: '40px', color: '#fff', cursor: 'pointer', fontWeight: '600', transition: '0.2s' },
};

export default FileExplorer;