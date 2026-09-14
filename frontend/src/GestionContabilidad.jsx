import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaFolder, FaFolderOpen, FaFileAlt, FaUpload, FaDownload,
  FaEdit, FaTrash, FaPlus, FaArrowLeft, FaFileArchive,
  FaSpinner, FaChevronRight, FaPen, FaEllipsisV,
  FaTh, FaList, FaCalendarAlt, FaMagic, FaCheckCircle,
  FaCloudUploadAlt, FaFilePdf, FaFileWord, FaFileExcel,
  FaFileImage, FaFile, FaTimes
} from 'react-icons/fa';
import OnlyOfficeEditor from './OnlyOfficeEditor';

const API_BASE = '/api/contabilidad/v2';
const API_ARCHIVOS = '/api/archivos';

// ======================= ESTILOS (modernos) =======================
const styles = {
  container: {
    background: 'transparent',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    color: '#e2e8f0'
  },
  glassCard: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    borderRadius: '14px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.04)',
    backdropFilter: 'none',
    boxShadow: '0 4px 14px rgba(2,6,23,0.4)',
    transition: 'all 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '20px 28px',
    marginBottom: '28px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '999px',
    padding: '8px 16px',
    color: '#cbd5e1',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: '0.2s',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#e6eef8',
    margin: 0,
    background: 'none',
    WebkitBackgroundClip: 'unset',
    WebkitTextFillColor: 'unset',
  },
  badge: {
    background: 'rgba(99, 102, 241, 0.15)',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '0.8rem',
    color: '#a5b4fc',
    fontWeight: '500',
  },
  actionsBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '999px',
    padding: '10px',
    cursor: 'pointer',
    transition: '0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#cbd5e6',
    fontSize: '14px',
  },
  primaryBtn: {
    background: 'linear-gradient(90deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 24px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: '0.2s',
    boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
  },
  successBtn: {
    background: 'linear-gradient(105deg, #2f855a, #38a169)',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 24px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dangerBtn: {
    background: 'linear-gradient(105deg, #c53030, #e53e3e)',
    border: 'none',
    borderRadius: '999px',
    padding: '10px 24px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '24px',
    marginTop: '24px',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '24px',
  },
  yearCard: {
    background: 'linear-gradient(180deg, rgba(2,6,23,0.6), rgba(2,6,23,0.45))',
    borderRadius: '14px',
    padding: '28px 16px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'all 0.25s',
    boxShadow: '0 4px 14px rgba(2,6,23,0.4)',
  },
  fileCardGrid: {
    background: 'linear-gradient(180deg, rgba(2,6,23,0.6), rgba(2,6,23,0.45))',
    borderRadius: '14px',
    padding: '20px 12px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.04)',
    transition: '0.2s',
    position: 'relative',
    boxShadow: '0 4px 14px rgba(2,6,23,0.4)',
  },
  fileListItem: {
    background: 'linear-gradient(180deg, rgba(2,6,23,0.6), rgba(2,6,23,0.45))',
    borderRadius: '14px',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  inputGlass: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '999px',
    padding: '10px 16px',
    color: '#e2e8f0',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    transition: '0.2s',
  },
  dropzone: {
    border: '2px dashed rgba(99,102,241,0.4)',
    borderRadius: '14px',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    background: 'rgba(99,102,241,0.05)',
    transition: '0.2s',
    marginBottom: '24px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#0f172a',
    borderRadius: '32px',
    padding: '28px',
    width: '90%',
    maxWidth: '500px',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
    padding: '12px 0',
  },
  recordatorioBox: {
    background: 'linear-gradient(95deg, rgba(99,102,241,0.1), rgba(79,70,229,0.05))',
    borderLeft: '4px solid #818cf8',
    borderRadius: '12px',
    padding: '14px 20px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#cbd5e6',
  },
  actionButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    fontSize: '10px',
    color: '#94a3b8',
    transition: '0.2s',
    padding: '4px 6px',
    borderRadius: '6px',
  },
  actionButtonIcon: {
    fontSize: '18px',
  },
  actionButtonText: {
    fontSize: '10px',
    lineHeight: 1.2,
  },
};

const GestionContabilidad = ({ onBack, initialLocation  }) => {
  // Estados originales
  const [nivel, setNivel] = useState('tipos');
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [expedientes, setExpedientes] = useState([]);
  const [contenido, setContenido] = useState([]);
  const [nombreExpediente, setNombreExpediente] = useState('');
  const [nuevoAnio, setNuevoAnio] = useState('');
  const [nuevoMes, setNuevoMes] = useState('');
  const [registroContrato, setRegistroContrato] = useState('');
  const [registroFactura, setRegistroFactura] = useState('');
  const [registroCliente, setRegistroCliente] = useState('');
  const [anioActual, setAnioActual] = useState('');
  const [subcarpetaActual, setSubcarpetaActual] = useState('');
  const [rutaBreadcrumbs, setRutaBreadcrumbs] = useState([]);
  const [cargandoContenido, setCargandoContenido] = useState(false);
  const [cargandoExpedientes, setCargandoExpedientes] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [editorConfig, setEditorConfig] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [archivoARenombrar, setArchivoARenombrar] = useState(null);
  const [nuevoNombreArchivo, setNuevoNombreArchivo] = useState('');
  const [recordatorioActual, setRecordatorioActual] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoMesInicio, setAutoMesInicio] = useState(1);
  const [autoMesFin, setAutoMesFin] = useState(12);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const safeArray = (data) => (Array.isArray(data) ? data : []);

  // ======================= FUNCIONES API (sin cambios) =======================
  const cargarContenido = useCallback(async (tipo, nombre, subcarpeta = '', anio = '') => {
    setCargandoContenido(true);
    try {
      const token = localStorage.getItem('token');
      const params = { tipo, nombre };
      if (anio) params.anio = anio;
      let url = `${API_BASE}/expedientes/contenido`;
      if (subcarpeta) {
        params.subcarpeta = subcarpeta;
        url = `${API_BASE}/expedientes/subcontenido`;
      }
      const res = await axios.get(url, { params, headers: { Authorization: `Bearer ${token}` } });
      setContenido(safeArray(res.data));
    } catch (err) {
      toast.error('Error al cargar contenido');
      setContenido([]);
    } finally {
      setCargandoContenido(false);
    }
  }, []);

  useEffect(() => {
    if (initialLocation) {
      const { tipo, anio, subcarpeta } = initialLocation;
      if (tipo) setTipoSeleccionado(tipo);
      setAnioActual(anio || '');
      setNivel('expediente'); 
      if (subcarpeta) {
        setSubcarpetaActual(subcarpeta);
        const partes = subcarpeta.split('/');
        setRutaBreadcrumbs(partes);
        cargarContenido(tipo, '', subcarpeta, anio);
      } else if (anio) {
        cargarContenido(tipo, '', '', anio);
      }
    }
  }, [initialLocation, cargarContenido]);

  const cargarExpedientes = useCallback(async (tipo) => {
    setCargandoExpedientes(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/expedientes?tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpedientes(safeArray(res.data));
    } catch (err) {
      toast.error('Error al cargar expedientes');
    } finally {
      setCargandoExpedientes(false);
    }
  }, []);

  const crearAnio = async () => {
    if (!nuevoAnio.trim()) return toast.error('Ingrese un año');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/expedientes/anio`, null, {
        params: { tipo: tipoSeleccionado, nombre: nombreExpediente, anio: nuevoAnio.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Año ${nuevoAnio} creado`);
      setNuevoAnio('');
      cargarContenido(tipoSeleccionado, nombreExpediente, '', '');
    } catch (err) {
      toast.error(err.response?.data || 'Error al crear año');
    }
  };

  const crearMes = async () => {
    if (!nuevoMes.trim()) return toast.error('Ingrese un mes');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/expedientes/mes`, null, {
        params: { tipo: tipoSeleccionado, nombre: nombreExpediente, anio: anioActual, mes: nuevoMes.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Mes creado');
      setNuevoMes('');
      cargarContenido(tipoSeleccionado, nombreExpediente, '', anioActual);
    } catch (err) {
      toast.error(err.response?.data || 'Error');
    }
  };

  const crearMesesAutomaticos = async () => {
    const mesesNombres = [
      "01. ENERO", "02. FEBRERO", "03. MARZO", "04. ABRIL", "05. MAYO", "06. JUNIO",
      "07. JULIO", "08. AGOSTO", "09. SEPTIEMBRE", "10. OCTUBRE", "11. NOVIEMBRE", "12. DICIEMBRE"
    ];
    const inicio = Math.max(1, autoMesInicio);
    const fin = Math.min(12, autoMesFin);
    if (inicio > fin) return toast.error('Rango inválido');
    const aCrear = mesesNombres.slice(inicio - 1, fin);
    let creados = 0;
    const token = localStorage.getItem('token');
    for (let mes of aCrear) {
      try {
        await axios.post(`${API_BASE}/expedientes/mes`, null, {
          params: { tipo: tipoSeleccionado, nombre: nombreExpediente, anio: anioActual, mes },
          headers: { Authorization: `Bearer ${token}` }
        });
        creados++;
      } catch (e) { /* ignore si ya existe */ }
    }
    toast.success(`${creados} meses creados automáticamente`);
    setShowAutoModal(false);
    cargarContenido(tipoSeleccionado, nombreExpediente, '', anioActual);
  };

  const crearRegistro = async () => {
    const factura = registroFactura.trim();
    const contrato = registroContrato.trim();
    const cliente = registroCliente.trim();

    if (tipoSeleccionado === 'FACTURA_COMPRA' && !contrato && !factura) {
      return toast.error('Ingrese número de contrato o factura');
    }
    if (tipoSeleccionado === 'FACTURA_VENTA' && !factura && !contrato) {
      return toast.error('Ingrese número de factura o contrato');
    }

    try {
      const token = localStorage.getItem('token');
      const body = { contrato, factura, cliente };
      const res = await axios.post(`${API_BASE}/expedientes/registro`, body, {
        params: { tipo: tipoSeleccionado, nombre: nombreExpediente, anio: anioActual, mes: subcarpetaActual },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.recordatorio) setRecordatorioActual(res.data.recordatorio);
      toast.success('Registro creado');
      setRegistroContrato('');
      setRegistroFactura('');
      setRegistroCliente('');
      cargarContenido(tipoSeleccionado, nombreExpediente, subcarpetaActual, anioActual);
    } catch (err) {
      toast.error(err.response?.data || 'Error al crear registro');
    }
  };

  const subirArchivo = async (file) => {
    if (!file) return;
    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipoSeleccionado);
    formData.append('nombre', nombreExpediente);
    if (anioActual) formData.append('anio', anioActual);
    if (subcarpetaActual) formData.append('subcarpeta', subcarpetaActual);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/expedientes/subir`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${file.name} subido`);
      cargarContenido(tipoSeleccionado, nombreExpediente, subcarpetaActual, anioActual);
    } catch (err) {
      toast.error('Error al subir');
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarArchivo = async (e, ruta) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm('¿Eliminar archivo?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.request({
        method: 'DELETE',
        url: `${API_BASE}/archivo`,
        params: { ruta },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Archivo eliminado');
      cargarContenido(tipoSeleccionado, nombreExpediente, subcarpetaActual, anioActual);
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const getNombreCarpetaPreview = () => {
    const factura = registroFactura.trim();
    const contrato = registroContrato.trim();
    const cliente = registroCliente.trim();

    if (!factura && !contrato && !cliente) return '';

    let partes = [];
    if (tipoSeleccionado === 'FACTURA_COMPRA') {
      partes = [contrato, factura, cliente];
    } else {
      partes = [factura, contrato, cliente];
    }
    const nombre = partes.filter(p => p).join('-');
    return nombre.replace(/[\\/:*?"<>|]/g, '_');
  };

  const eliminarCarpeta = async (e, ruta) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!window.confirm('¿Eliminar carpeta permanentemente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/expedientes/carpeta`, {
        params: { ruta },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Carpeta eliminada');
      cargarContenido(tipoSeleccionado, nombreExpediente, subcarpetaActual, anioActual);
    } catch (err) {
      console.error('Error al eliminar carpeta:', err);
      toast.error('Error al eliminar carpeta');
    }
  };

  const renombrarArchivo = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let expedienteNombre = nombreExpediente;
    if (!expedienteNombre && anioActual && rutaBreadcrumbs.length === 0) {
      console.warn("nombreExpediente vacío, usando valor por defecto");
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.request({
        method: 'PUT',
        url: `${API_BASE}/expedientes/renombrar`,
        params: {
          tipo: tipoSeleccionado,
          nombre: expedienteNombre || '',
          ruta: archivoARenombrar.ruta,
          nuevoNombre: nuevoNombreArchivo.trim(),
          subcarpeta: subcarpetaActual || undefined
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Elemento renombrado');
      setShowRenameModal(false);
      setArchivoARenombrar(null);
      setNuevoNombreArchivo('');
      cargarContenido(tipoSeleccionado, expedienteNombre, subcarpetaActual, anioActual);
    } catch (err) {
      console.error('Error al renombrar:', err);
      if (err.response) {
        const mensaje = err.response.data || 'Error al renombrar';
        toast.error(typeof mensaje === 'string' ? mensaje : 'Error al renombrar');
      } else {
        toast.error('Error de red al renombrar');
      }
    }
  };

  const descargarZip = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {
        tipo: tipoSeleccionado,
        nombre: nombreExpediente
      };
      if (anioActual) params.anio = anioActual;
      if (subcarpetaActual) params.subcarpeta = subcarpetaActual;

      const response = await axios.get(`${API_BASE}/expedientes/descargar-zip`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.status === 204) {
        toast.error('No hay archivos para descargar');
        return;
      }

      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const text = await response.data.text();
        const errorJson = JSON.parse(text);
        toast.error(errorJson.message || 'Error al generar ZIP');
        return;
      }

      let fileName = 'contenido.zip';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) fileName = match[1];
      } else {
        const folderName = subcarpetaActual || anioActual || 'expediente';
        fileName = `${folderName}.zip`;
      }

      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch (err) {
      console.error('Error al descargar ZIP:', err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        toast.error(`Error: ${text.substring(0, 100)}`);
      } else {
        toast.error('No se pudo descargar el ZIP');
      }
    }
  };

  const editarArchivo = async (ruta) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Editando archivo con OnlyOffice:', ruta);
      const res = await axios.get(`${API_ARCHIVOS}/onlyoffice/config`, { 
        params: { ruta }, 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (!res.data?.document || !res.data?.editorConfig) {
        toast.error('Configuración de editor inválida');
        console.error('Config inválida:', res.data);
        return;
      }
      console.log('✅ Config obtenida:', res.data);
      setEditorConfig(res.data);
    } catch (err) {
      console.error('Error al abrir editor:', err);
      toast.error(`Error al abrir editor: ${err.message}`);
    }
  };

  // ======================= Navegación mejorada =======================
  const irAExpedientes = (tipo) => {
    setTipoSeleccionado(tipo);
    setNombreExpediente('');
    setAnioActual('');
    setSubcarpetaActual('');
    setRutaBreadcrumbs([]);
    cargarContenido(tipo, '', '', '');
    setNivel('expediente');
  };

  const abrirAnio = (anio) => {
    setAnioActual(anio);
    setSubcarpetaActual('');
    setRutaBreadcrumbs([]);
    setRecordatorioActual('');
    cargarContenido(tipoSeleccionado, nombreExpediente, '', anio);
  };

  const abrirSubcarpeta = (nombreSub) => {
    const nuevaRuta = subcarpetaActual ? `${subcarpetaActual}/${nombreSub}` : nombreSub;
    setSubcarpetaActual(nuevaRuta);
    setRutaBreadcrumbs([...rutaBreadcrumbs, nombreSub]);
    cargarContenido(tipoSeleccionado, nombreExpediente, nuevaRuta, anioActual);
  };

  const volverNivel = (index) => {
    if (index === -1) {
      setSubcarpetaActual('');
      setRutaBreadcrumbs([]);
      cargarContenido(tipoSeleccionado, nombreExpediente, '', anioActual);
    } else {
      const nueva = rutaBreadcrumbs.slice(0, index + 1).join('/');
      setSubcarpetaActual(nueva);
      setRutaBreadcrumbs(rutaBreadcrumbs.slice(0, index + 1));
      cargarContenido(tipoSeleccionado, nombreExpediente, nueva, anioActual);
    }
  };

  const volverUnNivel = () => {
    if (subcarpetaActual) {
      const partes = subcarpetaActual.split('/');
      if (partes.length === 1) {
        setSubcarpetaActual('');
        setRutaBreadcrumbs([]);
        cargarContenido(tipoSeleccionado, nombreExpediente, '', anioActual);
      } else {
        const nuevaRuta = partes.slice(0, -1).join('/');
        const nuevosBreadcrumbs = rutaBreadcrumbs.slice(0, -1);
        setSubcarpetaActual(nuevaRuta);
        setRutaBreadcrumbs(nuevosBreadcrumbs);
        cargarContenido(tipoSeleccionado, nombreExpediente, nuevaRuta, anioActual);
      }
      return;
    }

    if (anioActual) {
      setAnioActual('');
      setSubcarpetaActual('');
      setRutaBreadcrumbs([]);
      cargarContenido(tipoSeleccionado, nombreExpediente, '', '');
      return;
    }

    setNivel('tipos');
    setTipoSeleccionado(null);
    setNombreExpediente('');
    setAnioActual('');
    setSubcarpetaActual('');
    setRutaBreadcrumbs([]);
    setContenido([]);
  };

  const getVolverTexto = () => {
    if (subcarpetaActual) return 'Volver a meses';
    if (anioActual) return 'Volver a años';
    return 'Volver a tipos';
  };

  const getIconoArchivo = (nombre) => {
    const ext = nombre.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FaFilePdf size={28} color="#e53e3e" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord size={28} color="#3182ce" />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel size={28} color="#38a169" />;
    if (['jpg', 'png', 'gif'].includes(ext)) return <FaFileImage size={28} color="#ecc94b" />;
    return <FaFileAlt size={28} color="#a0aec0" />;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (dropZoneRef.current) dropZoneRef.current.style.borderColor = '#5ee0da';
  };
  const handleDragLeave = () => {
    if (dropZoneRef.current) dropZoneRef.current.style.borderColor = 'rgba(56, 178, 172, 0.5)';
  };
  const handleDrop = (e) => {
    e.preventDefault();
    handleDragLeave();
    const file = e.dataTransfer.files[0];
    if (file) subirArchivo(file);
  };

  if (editorConfig) return <OnlyOfficeEditor config={editorConfig} onBack={() => setEditorConfig(null)} />;

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1a2a3a', color: '#fff' } }} />

      {/* Header */}
      <div style={{ ...styles.glassCard, ...styles.header }}>
        <div style={styles.headerLeft}>
        {onBack && (
          <button 
            onClick={nivel === 'tipos' ? onBack : volverUnNivel}
            style={styles.backBtn} 
            title={nivel === 'tipos' ? 'Volver al Dashboard' : getVolverTexto()}
          >
            <FaArrowLeft /> {nivel === 'tipos' ? 'Volver al Dashboard' : getVolverTexto()}
          </button>
        )}
          <h1 style={styles.title}>
            {tipoSeleccionado?.replace('_', ' ') || 'Contabilidad'}
          </h1>
          {nombreExpediente && <span style={styles.badge}>{nombreExpediente}</span>}
          {anioActual && <span style={styles.badge}>{anioActual}</span>}
        </div>
        <div style={styles.actionsBar}>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} style={styles.iconBtn}>
            {viewMode === 'grid' ? <FaList /> : <FaTh />}
          </button>
        </div>
      </div>

      {/* Contenido Principal */}
      {nivel === 'tipos' ? (
        <div style={styles.gridContainer}>
          <div style={styles.yearCard} onClick={() => irAExpedientes('FACTURA_COMPRA')}>
            <FaFileAlt size={48} color="#5ee0da" />
            <h3 style={{ color: 'white', marginTop: 16 }}>Facturas de Compra</h3>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Proveedores, gastos, impuestos</p>
          </div>
          <div style={styles.yearCard} onClick={() => irAExpedientes('FACTURA_VENTA')}>
            <FaFileAlt size={48} color="#f6ad55" />
            <h3 style={{ color: 'white', marginTop: 16 }}>Facturas de Venta</h3>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Clientes, ingresos, documentación</p>
          </div>
        </div>
      ) : (
        <>
          {!anioActual ? (
            // Vista de años
            <>
              <div style={{ ...styles.glassCard, padding: '20px', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input type="text" placeholder="Nuevo año (2026)" value={nuevoAnio} onChange={e => setNuevoAnio(e.target.value)} style={styles.inputGlass} />
                  <button onClick={crearAnio} style={styles.primaryBtn}><FaPlus /> Crear año</button>
                </div>
              </div>
              {cargandoContenido ? (
                <div style={{ textAlign: 'center', padding: 60 }}><FaSpinner className="spin" size={40} color="#5ee0da" /></div>
              ) : (
                <div style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
                  {contenido.map(item => (
                    <div key={item.nombre} style={viewMode === 'grid' ? styles.yearCard : styles.fileListItem} onClick={() => abrirAnio(item.nombre)}>
                      <FaCalendarAlt size={32} color="#5ee0da" />
                      <span style={{ fontWeight: 600, fontSize: 18, color: '#e2e8f0' }}>{item.nombre}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // Dentro de un año (meses y archivos)
            <div style={{ ...styles.glassCard, padding: '24px' }}>
              {/* Breadcrumb */}
              <div style={styles.breadcrumb}>
                <button onClick={() => volverNivel(-1)} style={{ background: 'none', border: 'none', color: '#5ee0da' }}>{anioActual}</button>
                {rutaBreadcrumbs.map((nom, idx) => (
                  <React.Fragment key={idx}>
                    <FaChevronRight size={10} color="#5ee0da" />
                    <button onClick={() => volverNivel(idx)} style={{ background: 'none', border: 'none', color: '#cbd5e6' }}>{nom}</button>
                  </React.Fragment>
                ))}
              </div>

              {/* Zona Drag & Drop */}
              <div ref={dropZoneRef} style={styles.dropzone} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <FaCloudUploadAlt size={40} color="#5ee0da" />
                <p style={{ marginTop: 8 }}>Arrastra o haz clic para subir archivos</p>
                <input ref={fileInputRef} type="file" hidden onChange={e => e.target.files && subirArchivo(e.target.files[0])} />
              </div>

              {/* Acciones rápidas */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <button onClick={descargarZip} style={styles.iconBtn}><FaDownload /> ZIP</button>
                {!subcarpetaActual && (
                  <button onClick={() => setShowAutoModal(true)} style={styles.iconBtn}><FaMagic /> Auto-meses</button>
                )}
                {!subcarpetaActual && (
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    <input type="text" placeholder="Mes (ej. 05. MAYO)" value={nuevoMes} onChange={e => setNuevoMes(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                    <button onClick={crearMes} style={styles.primaryBtn}><FaPlus /></button>
                  </div>
                )}
                {subcarpetaActual && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {tipoSeleccionado === 'FACTURA_VENTA' ? (
                        <>
                          <input type="text" placeholder="Factura *" value={registroFactura} onChange={e => setRegistroFactura(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                          <input type="text" placeholder="Contrato" value={registroContrato} onChange={e => setRegistroContrato(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                        </>
                      ) : (
                        <>
                          <input type="text" placeholder="Contrato *" value={registroContrato} onChange={e => setRegistroContrato(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                          <input type="text" placeholder="Factura" value={registroFactura} onChange={e => setRegistroFactura(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                        </>
                      )}
                      <input type="text" placeholder="Cliente / Proveedor" value={registroCliente} onChange={e => setRegistroCliente(e.target.value)} style={{ ...styles.inputGlass, flex: 1 }} />
                      <button onClick={crearRegistro} style={styles.successBtn}><FaCheckCircle /> Crear registro</button>
                    </div>
                    {getNombreCarpetaPreview() && (
                      <div style={{ fontSize: '12px', color: '#5ee0da', marginTop: '-8px' }}>
                        📁 Se creará la carpeta: <strong>{getNombreCarpetaPreview()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {recordatorioActual && (
                <div style={styles.recordatorioBox}>
                  <FaMagic /> {recordatorioActual}
                </div>
              )}

              {/* Contenido (carpetas y archivos) con botones con nombre */}
              {cargandoContenido ? (
                <div style={{ textAlign: 'center', padding: 40 }}><FaSpinner className="spin" size={36} /></div>
              ) : contenido.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>Vacío. Sube archivos o crea meses</div>
              ) : viewMode === 'grid' ? (
                <div style={styles.gridContainer}>
                  {contenido.map(item => (
                    <div key={item.nombre} style={styles.fileCardGrid} onClick={() => item.esCarpeta && abrirSubcarpeta(item.nombre)}>
                      {item.esCarpeta ? <FaFolderOpen size={44} color="#5ee0da" /> : getIconoArchivo(item.nombre)}
                      <div style={{ fontWeight: 500, marginTop: 12, wordBreak: 'break-word', fontSize: 13 }}>{item.nombre}</div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                        {/* Botón Renombrar */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setArchivoARenombrar(item); setNuevoNombreArchivo(item.nombre); setShowRenameModal(true); }} 
                          style={styles.actionButton}
                          type="button"
                          title="Renombrar"
                        >
                          <FaPen style={styles.actionButtonIcon} color="#ecc94b" />
                          <span style={styles.actionButtonText}>Renombrar</span>
                        </button>
                        
                        {/* Botón Eliminar */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); item.esCarpeta ? eliminarCarpeta(e, item.ruta) : eliminarArchivo(e, item.ruta); }} 
                          style={styles.actionButton}
                          type="button"
                          title="Eliminar"
                        >
                          <FaTrash style={styles.actionButtonIcon} color="#f56565" />
                          <span style={styles.actionButtonText}>Eliminar</span>
                        </button>
                        
                        {/* Botón Editar (solo para archivos) */}
                        {!item.esCarpeta && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); editarArchivo(item.ruta); }} 
                            style={styles.actionButton}
                            type="button"
                            title="Editar con OnlyOffice"
                          >
                            <FaEdit style={styles.actionButtonIcon} color="#5ee0da" />
                            <span style={styles.actionButtonText}>Editar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.listContainer}>
                  {contenido.map(item => (
                    <div key={item.nombre} style={styles.fileListItem} onClick={() => item.esCarpeta && abrirSubcarpeta(item.nombre)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.esCarpeta ? <FaFolder size={24} color="#5ee0da" /> : getIconoArchivo(item.nombre)}
                        <span>{item.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={(e) => { e.stopPropagation(); setArchivoARenombrar(item); setNuevoNombreArchivo(item.nombre); setShowRenameModal(true); }} style={styles.actionButton}>
                          <FaPen color="#ecc94b" />
                          <span style={styles.actionButtonText}>Renombrar</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); item.esCarpeta ? eliminarCarpeta(e, item.ruta) : eliminarArchivo(e, item.ruta); }} style={styles.actionButton}>
                          <FaTrash color="#f56565" />
                          <span style={styles.actionButtonText}>Eliminar</span>
                        </button>
                        {!item.esCarpeta && (
                          <button onClick={(e) => { e.stopPropagation(); editarArchivo(item.ruta); }} style={styles.actionButton}>
                            <FaEdit color="#5ee0da" />
                            <span style={styles.actionButtonText}>Editar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modales (Auto-meses y Renombrar) */}
      {showAutoModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAutoModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white', marginBottom: 20 }}>Creación automática de meses</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div><label>Desde mes (1-12)</label><input type="number" min="1" max="12" value={autoMesInicio} onChange={e => setAutoMesInicio(Number(e.target.value))} style={styles.inputGlass} /></div>
              <div><label>Hasta mes</label><input type="number" min="1" max="12" value={autoMesFin} onChange={e => setAutoMesFin(Number(e.target.value))} style={styles.inputGlass} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAutoModal(false)} style={styles.iconBtn}>Cancelar</button>
              <button onClick={crearMesesAutomaticos} style={styles.primaryBtn}>Generar meses</button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRenameModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'white' }}>Renombrar</h3>
            <input type="text" value={nuevoNombreArchivo} onChange={e => setNuevoNombreArchivo(e.target.value)} style={{ ...styles.inputGlass, margin: '20px 0' }} autoFocus />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRenameModal(false)} style={styles.iconBtn}>Cancelar</button>
              <button onClick={renombrarArchivo} style={styles.primaryBtn}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button { cursor: pointer; transition: 0.2s; }
        button:hover { opacity: 0.8; transform: scale(1.02); }
        .action-button:hover { background: rgba(255,255,255,0.05); border-radius: 6px; }
      `}</style>
    </div>
  );
};

export default GestionContabilidad;