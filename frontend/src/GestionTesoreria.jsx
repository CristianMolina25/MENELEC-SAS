import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaArrowLeft, FaUpload, FaDownload, FaEdit, FaSyncAlt, FaSpinner,
  FaFileExcel, FaPlus, FaTimes, FaSave, FaTrashAlt, FaEdit as FaEditIcon,
  FaColumns, FaCompress, FaExpand, FaSearch, FaPaperclip
} from 'react-icons/fa';
import OnlyOfficeEditor from './OnlyOfficeEditor';

const API_TESORERIA = '/api/tesoreria';
const API_ARCHIVOS = '/api/archivos';

// Función auxiliar para formatear la fecha sin desplazamiento horario
const formatDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '—';
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day); // Fecha local
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$ 0';
  const amount = typeof value === 'number' ? value : parseFloat(value);
  return amount.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// ========== NUEVO ORDEN DE COLUMNAS ==========
const COLUMNAS_CONFIG = [
  { key: 'fecha', label: 'Fecha', width: '95px', tipo: 'fecha', prioritaria: true },
  { key: 'fuente', label: 'Fuente', width: '100px', prioritaria: false },
  { key: 'centroCostos', label: 'Centro Costos', width: '120px', prioritaria: false },
  { key: 'numeroContrato', label: 'N° Contrato', width: '105px', prioritaria: false },
  { key: 'terceroBeneficiario', label: 'Tercero', width: '140px', prioritaria: true },
  { key: 'numeroFactura', label: 'N° Factura', width: '100px', prioritaria: false },
  { key: 'neto', label: 'Neto (Suma)', width: '120px', tipo: 'moneda', prioritaria: true },
  { key: 'valor', label: 'Valor', width: '110px', tipo: 'moneda', prioritaria: true },
  { key: 'reteFuente', label: 'Rete Fuente', width: '105px', tipo: 'moneda', prioritaria: false },
  { key: 'reteIca', label: 'Rete ICA', width: '95px', tipo: 'moneda', prioritaria: false },
  { key: 'reteIva', label: 'Rete IVA', width: '95px', tipo: 'moneda', prioritaria: false },
  { key: 'observaciones', label: 'Observaciones', width: '140px', prioritaria: false },
  { key: 'concepto', label: 'Concepto', width: '160px', prioritaria: true },
  { key: 'responsablePago', label: 'Resp. Pago', width: '115px', prioritaria: false },
];

const GestionTesoreria = ({ onBack }) => {
  // ========== TODOS LOS HOOKS ==========
  const [vista, setVista] = useState('menu');
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [metadataId, setMetadataId] = useState(null);
  const [rutaArchivo, setRutaArchivo] = useState(null);
  const [fileName, setFileName] = useState('');
  const [editorConfig, setEditorConfig] = useState(null);
  const [excelExiste, setExcelExiste] = useState(false);

  const [columnasVisibles, setColumnasVisibles] = useState(
    COLUMNAS_CONFIG.map(c => c.key)
  );
  const [mostrarSelectorColumnas, setMostrarSelectorColumnas] = useState(false);
  const [modoCompacto, setModoCompacto] = useState(true);
  const [scrollIzquierda, setScrollIzquierda] = useState(false);
  const [scrollDerecha, setScrollDerecha] = useState(false);
  const tablaRef = useRef(null);

  const [nuevaFila, setNuevaFila] = useState({
    fecha: '', fuente: '', centroCostos: '', responsablePago: '',
    numeroContrato: '', concepto: '', terceroBeneficiario: '',
    numeroFactura: '', valor: '', reteFuente: '', reteIca: '',
    reteIva: '', observaciones: ''
  });

  const [editModal, setEditModal] = useState({ open: false, row: null });
  const [editData, setEditData] = useState({});

  // --- Estados para soportes ---
  const [soportesPorFila, setSoportesPorFila] = useState({});
  const [uploadingRowId, setUploadingRowId] = useState(null);
  const [soporteAnchor, setSoporteAnchor] = useState(null);

  // ========== CALLBACKS Y EFECTOS ==========
  const cargarDatos = useCallback(async (empresa) => {
    if (!metadataId) { setRows([]); return; }
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_TESORERIA}/datos`, {
        params: { metadataId, empresa },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(res.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
      console.error(error);
    } finally {
      setCargando(false);
    }
  }, [metadataId]);

  const cargarArchivo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_TESORERIA}/archivo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.metadataId) {
        setMetadataId(res.data.metadataId);
        setRutaArchivo(res.data.ruta);
        setFileName(res.data.nombre);
        setExcelExiste(true);
      } else {
        setExcelExiste(false);
        setMetadataId(null);
        setRows([]);
      }
    } catch (error) {
      console.error('Error al cargar archivo de tesorería:', error);
      setExcelExiste(false);
    }
  }, []);

  const cargarSoportes = useCallback(async () => {
    const map = {};
    if (!rows.length) return;
    try {
      const token = localStorage.getItem('token');
      const promises = rows.map(row =>
        axios.get(`${API_TESORERIA}/fila/${row.id}/soportes`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      );
      const results = await Promise.all(promises);
      rows.forEach((row, i) => {
        map[row.id] = results[i].data;
      });
    } catch (e) {
      console.error('Error cargando soportes', e);
    }
    setSoportesPorFila(map);
  }, [rows]);

  useEffect(() => { cargarArchivo(); }, [cargarArchivo]);

  useEffect(() => {
    if (metadataId) {
      if (vista === 'liccont') cargarDatos('MENELEC SAS');
      if (vista === 'menelec') cargarDatos('MENELEC SAS');
    }
  }, [vista, metadataId, cargarDatos]);

  useEffect(() => {
    if (rows.length > 0) cargarSoportes();
  }, [rows, cargarSoportes]);

  useEffect(() => {
    const el = tablaRef.current;
    if (!el) return;
    const handleScroll = () => {
      setScrollIzquierda(el.scrollLeft > 8);
      setScrollDerecha(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    handleScroll();
    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [rows]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (soporteAnchor) {
        const panel = document.getElementById('soporte-panel');
        const anchor = soporteAnchor.element;
        if (panel && !panel.contains(event.target) && anchor && !anchor.contains(event.target)) {
          setSoporteAnchor(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [soporteAnchor]);

  // ========== MEMOIZACIONES ==========
  const filasFiltradas = useMemo(() => {
    if (!busquedaLocal.trim()) return rows;
    const term = busquedaLocal.trim().toLowerCase();
    return rows.filter(row =>
      Object.values(row).some(val =>
        val && val.toString().toLowerCase().includes(term)
      )
    );
  }, [rows, busquedaLocal]);

  // Cálculo de totales: Neto = Valor + ReteFuente + ReteIca + ReteIva
  const totales = useMemo(() => {
    return filasFiltradas.reduce((acc, row) => {
      const valor = parseFloat(row.valor) || 0;
      const reteFuente = parseFloat(row.reteFuente) || 0;
      const reteIca = parseFloat(row.reteIca) || 0;
      const reteIva = parseFloat(row.reteIva) || 0;
      acc.valor += valor;
      acc.reteFuente += reteFuente;
      acc.reteIca += reteIca;
      acc.reteIva += reteIva;
      acc.neto += (valor + reteFuente + reteIca + reteIva); // SUMA
      return acc;
    }, { valor: 0, reteFuente: 0, reteIca: 0, reteIva: 0, neto: 0 });
  }, [filasFiltradas]);

  const columnasActivas = useMemo(() =>
    COLUMNAS_CONFIG.filter(c => columnasVisibles.includes(c.key)),
    [columnasVisibles]
  );

  // ========== FUNCIONES DE ACCIÓN ==========
  const toggleColumna = (key) => {
    setColumnasVisibles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const subirExcel = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.xlsx')) {
      toast.error('Selecciona un archivo Excel (.xlsx)');
      return;
    }
    setSubiendo(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_TESORERIA}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Excel subido correctamente');
      await cargarArchivo();
    } catch (error) {
      toast.error('Error al subir archivo');
      console.error(error);
    } finally {
      setSubiendo(false);
      event.target.value = null;
    }
  };

  const descargarExcel = async () => {
    if (!rutaArchivo) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_ARCHIVOS}/download`, {
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
      console.log('Abriendo archivo en OnlyOffice:', rutaArchivo);
      const res = await axios.get(`${API_ARCHIVOS}/onlyoffice/config`, {
        params: { ruta: rutaArchivo },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.data?.document || !res.data?.editorConfig) {
        toast.error('Configuración del editor inválida');
        console.error('Config inválida:', res.data);
        return;
      }
      
      console.log('✅ Configuración OnlyOffice obtenida:', res.data);
      setEditorConfig(res.data);
    } catch (error) {
      console.error('Error al abrir OnlyOffice:', error);
      toast.error(`Error al abrir editor: ${error.message}`);
    }
  };

  const handleAgregarFila = async () => {
    if (!nuevaFila.fecha || !nuevaFila.fuente || !nuevaFila.concepto || !nuevaFila.valor) {
      toast.error('Fecha, Fuente, Concepto y Valor son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      const empresa = 'MENELEC SAS';
      const token = localStorage.getItem('token');
      await axios.post(`${API_TESORERIA}/fila`, { metadataId, empresa, fila: nuevaFila }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fila agregada correctamente');
      setNuevaFila({ fecha: '', fuente: '', centroCostos: '', responsablePago: '', numeroContrato: '', concepto: '', terceroBeneficiario: '', numeroFactura: '', valor: '', reteFuente: '', reteIca: '', reteIva: '', observaciones: '' });
      await cargarDatos(empresa);
    } catch (error) {
      toast.error('Error al agregar la fila');
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (row) => {
    if (!window.confirm(`¿Está seguro de eliminar esta fila?\n${row.concepto} - ${row.valor}`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_TESORERIA}/fila/${row.id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Fila eliminada correctamente');
      const empresa = 'MENELEC SAS';
      await cargarDatos(empresa);
    } catch (error) {
      toast.error('Error al eliminar la fila');
      console.error(error);
    }
  };

  const handleEditar = (row) => {
    setEditData({ ...row });
    setEditModal({ open: true, row });
  };

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleGuardarEdicion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_TESORERIA}/fila/${editData.id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fila actualizada correctamente');
      setEditModal({ open: false, row: null });
      const empresa = 'MENELEC SAS';
      await cargarDatos(empresa);
    } catch (error) {
      toast.error('Error al actualizar la fila');
      console.error(error);
    }
  };

  // ========== SOPORTES ==========
  const handleSubirSoportes = async (row, files) => {
    if (!files || files.length === 0) return;
    setUploadingRowId(row.id);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_TESORERIA}/fila/${row.id}/soportes`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Soportes subidos correctamente');
      const res = await axios.get(`${API_TESORERIA}/fila/${row.id}/soportes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSoportesPorFila(prev => ({ ...prev, [row.id]: res.data }));
    } catch (error) {
      toast.error('Error al subir soportes');
      console.error(error);
    } finally {
      setUploadingRowId(null);
    }
  };

  const handleEliminarSoporte = async (soporteId, rowId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_TESORERIA}/soporte/${soporteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Soporte eliminado');
      setSoportesPorFila(prev => ({
        ...prev,
        [rowId]: prev[rowId].filter(s => s.id !== soporteId)
      }));
    } catch (error) {
      toast.error('Error al eliminar soporte');
    }
  };

  // ========== RENDER ==========
  if (editorConfig) {
    return (
      <OnlyOfficeEditor
        config={editorConfig}
        onBack={() => { setEditorConfig(null); cargarArchivo(); }}
      />
    );
  }

  if (vista === 'menu') {
    return (
      <div style={styles.container}>
        <Toaster toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}><FaArrowLeft /> Volver</button>
          <h1 style={styles.title}>Tesorería</h1>
          <div style={styles.buttonGroup}>
            <label style={styles.uploadBtn}>
              <FaUpload /> Subir Excel
              <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
            </label>
            {excelExiste && (
              <>
                <button onClick={descargarExcel} style={styles.downloadBtn}><FaDownload /> Descargar</button>
                <button onClick={editarConOnlyOffice} style={styles.editBtn}><FaEdit /> Editar</button>
              </>
            )}
            <button onClick={cargarArchivo} style={styles.refreshBtn} title="Actualizar datos"><FaSyncAlt /></button>
          </div>
        </div>
        <div style={styles.menuGrid}>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('liccont')}>
            <FaFileExcel size={48} color="#818cf8" />
            <h3>MENELEC SAS</h3>
            <p>Gestión de pagos y retenciones</p>
          </div>
          <div className="menu-card" style={styles.menuCard} onClick={() => setVista('menelec')}>
            <FaFileExcel size={48} color="#818cf8" />
            <h3>MENELEC SAS</h3>
            <p>Gestión de pagos y retenciones</p>
          </div>
        </div>
        <style>{`
          .menu-card:hover { transform: translateY(-6px); background: linear-gradient(180deg, rgba(99,102,241,0.12), rgba(99,102,241,0.06)); border-color: rgba(99,102,241,0.28); box-shadow: 0 8px 20px rgba(2,6,23,0.6); }
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const empresaActual = vista === 'liccont' ? 'MENELEC SAS' : 'MENELEC SAS';

  return (
    <div style={styles.container}>
      <Toaster toastOptions={{ style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } }} />

      <div style={styles.header}>
        <button onClick={() => setVista('menu')} style={styles.backBtn}><FaArrowLeft /> Menú</button>
        <h1 style={styles.title}>{empresaActual}</h1>
        <div style={styles.buttonGroup}>
          <label style={styles.uploadBtn}>
            <FaUpload /> Subir
            <input type="file" accept=".xlsx" onChange={subirExcel} style={{ display: 'none' }} disabled={subiendo} />
          </label>
          {excelExiste && (
            <>
              <button onClick={descargarExcel} style={styles.downloadBtn} title="Descargar Excel"><FaDownload /></button>
              <button onClick={editarConOnlyOffice} style={styles.editBtn} title="Editar con OnlyOffice"><FaEdit /></button>
            </>
          )}
          <button onClick={() => { cargarArchivo(); }} style={styles.refreshBtn} title="Actualizar"><FaSyncAlt /></button>
        </div>
      </div>

      {/* Formulario compacto */}
      <div style={styles.formContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={styles.formTitle}><FaPlus /> Nueva fila</h3>  
        </div>
        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="Fecha" type="date" value={nuevaFila.fecha} onChange={e => setNuevaFila({...nuevaFila, fecha: e.target.value})} />
          <input style={styles.input} placeholder="Fuente *" value={nuevaFila.fuente} onChange={e => setNuevaFila({...nuevaFila, fuente: e.target.value})} />
          <input style={styles.input} placeholder="Centro Costos" value={nuevaFila.centroCostos} onChange={e => setNuevaFila({...nuevaFila, centroCostos: e.target.value})} />
          <input style={styles.input} placeholder="N° Contrato" value={nuevaFila.numeroContrato} onChange={e => setNuevaFila({...nuevaFila, numeroContrato: e.target.value})} />
          <input style={styles.input} placeholder="Tercero" value={nuevaFila.terceroBeneficiario} onChange={e => setNuevaFila({...nuevaFila, terceroBeneficiario: e.target.value})} />
          <input style={styles.input} placeholder="N° Factura" value={nuevaFila.numeroFactura} onChange={e => setNuevaFila({...nuevaFila, numeroFactura: e.target.value})} />
          <input style={styles.input} placeholder="Valor *" type="number" value={nuevaFila.valor} onChange={e => setNuevaFila({...nuevaFila, valor: e.target.value})} />
          <input style={styles.input} placeholder="Rete Fuente" type="number" value={nuevaFila.reteFuente} onChange={e => setNuevaFila({...nuevaFila, reteFuente: e.target.value})} />
          <input style={styles.input} placeholder="Rete ICA" type="number" value={nuevaFila.reteIca} onChange={e => setNuevaFila({...nuevaFila, reteIca: e.target.value})} />
          <input style={styles.input} placeholder="Rete IVA" type="number" value={nuevaFila.reteIva} onChange={e => setNuevaFila({...nuevaFila, reteIva: e.target.value})} />
          <input style={{...styles.input, gridColumn: 'span 2'}} placeholder="Observaciones" value={nuevaFila.observaciones} onChange={e => setNuevaFila({...nuevaFila, observaciones: e.target.value})} />
          <input style={styles.input} placeholder="Concepto *" value={nuevaFila.concepto} onChange={e => setNuevaFila({...nuevaFila, concepto: e.target.value})} />
          <input style={styles.input} placeholder="Resp. Pago" value={nuevaFila.responsablePago} onChange={e => setNuevaFila({...nuevaFila, responsablePago: e.target.value})} />
          <button style={{...styles.submitBtn, gridColumn: 'span 1'}} onClick={handleAgregarFila} disabled={guardando}>
            {guardando ? <FaSpinner className="spin" /> : <FaSave />} Agregar
          </button>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <FaSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            style={styles.searchInput}
            placeholder="Buscar en todos los campos..."
            value={busquedaLocal}
            onChange={e => setBusquedaLocal(e.target.value)}
          />
        </div>
        <div style={styles.toolbarActions}>
          <div style={{ position: 'relative' }}>
            <button
              style={styles.toolBtn}
              onClick={() => setMostrarSelectorColumnas(!mostrarSelectorColumnas)}
              title="Mostrar / ocultar columnas"
            >
              <FaColumns /> Columnas
            </button>
            {mostrarSelectorColumnas && (
              <div style={styles.columnDropdown}>
                <div style={styles.columnDropdownHeader}>Columnas visibles</div>
                {COLUMNAS_CONFIG.map(col => (
                  <label key={col.key} style={styles.columnCheckbox}>
                    <input
                      type="checkbox"
                      checked={columnasVisibles.includes(col.key)}
                      onChange={() => toggleColumna(col.key)}
                      style={{ marginRight: '8px', accentColor: '#6366f1' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            style={styles.toolBtn}
            onClick={() => setModoCompacto(!modoCompacto)}
            title={modoCompacto ? 'Modo normal' : 'Modo compacto'}
          >
            {modoCompacto ? <FaExpand /> : <FaCompress />}
            {modoCompacto ? ' Normal' : ' Compacto'}
          </button>
          <span style={styles.rowCount}>
            {filasFiltradas.length} de {rows.length} registros
          </span>
        </div>
      </div>

      {/* Tabla de datos */}
      {cargando ? (
        <div style={styles.loader}><FaSpinner className="spin" /> Cargando datos...</div>
      ) : (
        <div style={styles.tableWrapper}>
          {rows.length === 0 && !excelExiste && (
            <div style={styles.emptyState}>
              <FaFileExcel size={64} style={{ opacity: 0.3 }} />
              <h3>No hay archivo Excel cargado</h3>
              <p>Sube el archivo TESORERIA.xlsx con la hoja MENELEC SAS.</p>
            </div>
          )}
          {rows.length === 0 && excelExiste && !cargando && (
            <div style={styles.emptyState}>
              <p>No se encontraron registros en la hoja "{empresaActual}".</p>
            </div>
          )}
          {rows.length > 0 && (
            <>
              <div style={{
                ...styles.scrollShadow,
                left: 0,
                opacity: scrollIzquierda ? 1 : 0,
                background: 'linear-gradient(to right, rgba(15,23,42,0.95), transparent)',
              }} />
              <div style={{
                ...styles.scrollShadow,
                right: 0,
                opacity: scrollDerecha ? 1 : 0,
                background: 'linear-gradient(to left, rgba(15,23,42,0.95), transparent)',
              }} />
              
              <div
                ref={tablaRef}
                style={{
                  ...styles.tableScroll,
                  padding: modoCompacto ? '0' : '0 4px',
                }}
              >
                <table style={{
                  ...styles.tabla,
                  fontSize: modoCompacto ? '11px' : '12.5px',
                }}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      {columnasActivas.map(col => (
                        <th
                          key={col.key}
                          style={{
                            ...styles.th,
                            width: col.width,
                            minWidth: col.width,
                            padding: modoCompacto ? '8px 6px' : '10px 8px',
                            ...(col.key === 'fecha' ? { position: 'sticky', left: 0, zIndex: 3, background: '#1e293b' } : {}),
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th style={{
                        ...styles.thActions,
                        padding: modoCompacto ? '8px 6px' : '10px 8px',
                        position: 'sticky',
                        right: 0,
                        zIndex: 3,
                        background: '#1e293b',
                        boxShadow: scrollDerecha ? '-6px 0 12px rgba(0,0,0,0.4)' : 'none',
                      }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasFiltradas.map((row, idx) => {
                      // Neto = Valor + ReteFuente + ReteIca + ReteIva
                      const valor = parseFloat(row.valor) || 0;
                      const reteFuente = parseFloat(row.reteFuente) || 0;
                      const reteIca = parseFloat(row.reteIca) || 0;
                      const reteIva = parseFloat(row.reteIva) || 0;
                      const neto = valor + reteFuente + reteIca + reteIva;

                      return (
                        <tr
                          key={row.id}
                          style={{
                            ...styles.tableRow,
                            background: idx % 2 === 0 ? 'rgba(30,41,59,0.3)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(30,41,59,0.3)' : 'transparent';
                          }}
                        >
                          {columnasActivas.map(col => {
                            let valorCelda;
                            let esMoneda = col.tipo === 'moneda';
                            let esFecha = col.tipo === 'fecha';
                            let texto;

                            if (col.key === 'neto') {
                              valorCelda = neto;
                              texto = formatCurrency(neto);
                            } else {
                              valorCelda = row[col.key];
                              texto = esMoneda
                                ? formatCurrency(valorCelda)
                                : esFecha
                                  ? formatDate(valorCelda)   // <-- aquí se usa la función auxiliar
                                  : (valorCelda || '—');
                            }

                            return (
                              <td
                                key={col.key}
                                style={{
                                  ...styles.td,
                                  padding: modoCompacto ? '7px 6px' : '9px 8px',
                                  textAlign: esMoneda ? 'right' : 'left',
                                  color: col.key === 'neto' ? '#a78bfa' : (col.key === 'valor' ? '#10b981' : (esMoneda ? '#cbd5e1' : '#e2e8f0')),
                                  fontWeight: col.key === 'neto' || col.key === 'valor' ? '600' : '400',
                                  fontVariantNumeric: esMoneda ? 'tabular-nums' : 'normal',
                                  ...(col.key === 'fecha' ? {
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 2,
                                    background: idx % 2 === 0 ? '#1e293b' : '#0f172a',
                                  } : {}),
                                }}
                                title={texto}
                              >
                                {texto}
                              </td>
                            );
                          })}
                          <td style={{
                            ...styles.tdActions,
                            padding: modoCompacto ? '4px 4px' : '6px 4px',
                            position: 'sticky',
                            right: 0,
                            zIndex: 2,
                            background: idx % 2 === 0 ? '#1e293b' : '#0f172a',
                            boxShadow: scrollDerecha ? '-6px 0 12px rgba(0,0,0,0.4)' : 'none',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <button
                                style={styles.actionBtnEdit}
                                onClick={() => handleEditar(row)}
                                title="Editar fila"
                              >
                                <FaEditIcon size={modoCompacto ? 13 : 14} />
                              </button>
                              <button
                                style={styles.actionBtnDelete}
                                onClick={() => handleEliminar(row)}
                                title="Eliminar fila"
                              >
                                <FaTrashAlt size={modoCompacto ? 13 : 14} />
                              </button>
                              <label
                                style={styles.attachBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (soporteAnchor?.rowId === row.id) {
                                    setSoporteAnchor(null);
                                  } else {
                                    setSoporteAnchor({ rowId: row.id, element: e.currentTarget });
                                  }
                                }}
                                title="Adjuntar soportes"
                              >
                                <FaPaperclip size={modoCompacto ? 13 : 14} />
                                {soportesPorFila[row.id]?.length > 0 && (
                                  <span style={styles.badge}>{soportesPorFila[row.id].length}</span>
                                )}
                              </label>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={styles.tableFooter}>
                      {columnasActivas.map(col => {
                        if (col.key === 'neto') return (
                          <td key={col.key} style={{ ...styles.tdFooter, fontWeight: '700', color: '#a78bfa', textAlign: 'right' }}>
                            {formatCurrency(totales.neto)}
                          </td>
                        );
                        if (col.key === 'valor') return (
                          <td key={col.key} style={{ ...styles.tdFooter, fontWeight: '700', color: '#10b981', textAlign: 'right', ...(col.key === 'fecha' ? { position: 'sticky', left: 0, zIndex: 2, background: '#0f172a' } : {}) }}>
                            {formatCurrency(totales.valor)}
                          </td>
                        );
                        if (col.key === 'reteFuente') return (
                          <td key={col.key} style={{ ...styles.tdFooter, textAlign: 'right' }}>{formatCurrency(totales.reteFuente)}</td>
                        );
                        if (col.key === 'reteIca') return (
                          <td key={col.key} style={{ ...styles.tdFooter, textAlign: 'right' }}>{formatCurrency(totales.reteIca)}</td>
                        );
                        if (col.key === 'reteIva') return (
                          <td key={col.key} style={{ ...styles.tdFooter, textAlign: 'right' }}>{formatCurrency(totales.reteIva)}</td>
                        );
                        if (col.key === 'concepto') return (
                          <td key={col.key} style={{ ...styles.tdFooter, fontWeight: '600' }}>TOTALES</td>
                        );
                        return <td key={col.key} style={styles.tdFooter}></td>;
                      })}
                      <td style={{ ...styles.tdFooter, position: 'sticky', right: 0, zIndex: 2, background: '#0f172a', boxShadow: scrollDerecha ? '-6px 0 12px rgba(0,0,0,0.4)' : 'none' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de edición */}
      {editModal.open && (
        <div style={styles.modalOverlay} onClick={() => setEditModal({ open: false, row: null })}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Editar fila</h3>
              <button style={styles.modalClose} onClick={() => setEditModal({ open: false, row: null })}><FaTimes /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGridModal}>
                <input style={styles.input} type="date" value={editData.fecha || ''} onChange={e => handleEditChange('fecha', e.target.value)} />
                <input style={styles.input} placeholder="Fuente" value={editData.fuente || ''} onChange={e => handleEditChange('fuente', e.target.value)} />
                <input style={styles.input} placeholder="Centro de Costos" value={editData.centroCostos || ''} onChange={e => handleEditChange('centroCostos', e.target.value)} />
                <input style={styles.input} placeholder="Número Contrato" value={editData.numeroContrato || ''} onChange={e => handleEditChange('numeroContrato', e.target.value)} />
                <input style={styles.input} placeholder="Tercero Beneficiario" value={editData.terceroBeneficiario || ''} onChange={e => handleEditChange('terceroBeneficiario', e.target.value)} />
                <input style={styles.input} placeholder="Número de Factura" value={editData.numeroFactura || ''} onChange={e => handleEditChange('numeroFactura', e.target.value)} />
                <input style={styles.input} placeholder="Valor" type="number" value={editData.valor || ''} onChange={e => handleEditChange('valor', e.target.value)} />
                <input style={styles.input} placeholder="Rete Fuente" type="number" value={editData.reteFuente || ''} onChange={e => handleEditChange('reteFuente', e.target.value)} />
                <input style={styles.input} placeholder="Rete ICA" type="number" value={editData.reteIca || ''} onChange={e => handleEditChange('reteIca', e.target.value)} />
                <input style={styles.input} placeholder="Rete IVA" type="number" value={editData.reteIva || ''} onChange={e => handleEditChange('reteIva', e.target.value)} />
                <input style={{...styles.input, gridColumn: 'span 2'}} placeholder="Observaciones" value={editData.observaciones || ''} onChange={e => handleEditChange('observaciones', e.target.value)} />
                <input style={styles.input} placeholder="Concepto" value={editData.concepto || ''} onChange={e => handleEditChange('concepto', e.target.value)} />
                <input style={styles.input} placeholder="Responsable del Pago" value={editData.responsablePago || ''} onChange={e => handleEditChange('responsablePago', e.target.value)} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.modalCancel} onClick={() => setEditModal({ open: false, row: null })}>Cancelar</button>
              <button style={styles.modalSave} onClick={handleGuardarEdicion}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Portal para el panel de soportes */}
      {soporteAnchor && createPortal(
        <div
          id="soporte-panel"
          style={{
            position: 'fixed',
            top: (soporteAnchor.element?.getBoundingClientRect().bottom || 0) + 4,
            right: window.innerWidth - (soporteAnchor.element?.getBoundingClientRect().left || 0) + 10,
            zIndex: 9999,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '220px',
            maxWidth: '280px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
            Soportes
          </div>
          {soportesPorFila[soporteAnchor.rowId]?.map(s => (
            <div key={s.id} style={styles.soporteItem}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', fontSize: '11px' }} title={s.nombreArchivo}>
                {s.nombreArchivo}
              </span>
              <div style={styles.soporteAcciones}>
                <a
                  href={`${API_ARCHIVOS}/download?ruta=${encodeURIComponent(s.rutaRelativa)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#818cf8', fontSize: '12px' }}
                  title="Descargar"
                >
                  <FaDownload size={12} />
                </a>
                <button
                  onClick={() => handleEliminarSoporte(s.id, soporteAnchor.rowId)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0' }}
                  title="Eliminar"
                >
                  <FaTrashAlt size={12} />
                </button>
              </div>
            </div>
          ))}
          <label style={{ display: 'block', marginTop: '6px', color: '#a5b4fc', cursor: 'pointer', fontSize: '11px' }}>
            <FaPlus size={12} /> Agregar
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const row = rows.find(r => r.id === soporteAnchor.rowId);
                if (row) {
                  handleSubirSoportes(row, e.target.files);
                }
                setSoporteAnchor(null);
              }}
              disabled={uploadingRowId === soporteAnchor.rowId}
            />
          </label>
        </div>,
        document.body
      )}
    </div>
  );
};

// ========== ESTILOS ==========
const styles = {
  container: {
    padding: '16px 20px',
    maxWidth: '100%',
    margin: '0 auto',
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '999px',
    padding: '7px 14px',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#e6eef8',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  uploadBtn: {
    background: 'linear-gradient(90deg,#6366f1,#4f46e5)',
    padding: '8px 15px',
    borderRadius: '999px',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    border: 'none',
  },
  downloadBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '7px 12px',
    borderRadius: '999px',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  editBtn: {
    background: 'transparent',
    border: '1px solid rgba(251,191,36,0.2)',
    padding: '7px 12px',
    borderRadius: '999px',
    color: '#fbbf24',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '7px 10px',
    borderRadius: '999px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    marginTop: '40px',
  },
  menuCard: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    borderRadius: '20px',
    padding: '28px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.18s, box-shadow 0.18s',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  formContainer: {
    background: 'rgba(15,23,42,0.7)',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '14px',
    border: '1px solid rgba(99,102,241,0.1)',
  },
  formTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#a5b4fc',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
    gap: '8px',
  },
  formGridModal: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  input: {
    padding: '8px 10px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '7px',
    color: '#e2e8f0',
    fontSize: '12.5px',
    outline: 'none',
    transition: 'border 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitBtn: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: '7px',
    color: '#fff',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '12px',
  },
  searchWrapper: {
    position: 'relative',
    flex: '1 1 280px',
    maxWidth: '400px',
  },
  searchInput: {
    width: '100%',
    padding: '9px 14px 9px 38px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '999px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  toolBtn: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid #334155',
    borderRadius: '999px',
    padding: '7px 13px',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '12.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  rowCount: {
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap',
    marginLeft: '4px',
  },
  columnDropdown: {
    position: 'absolute',
    top: '42px',
    right: 0,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '12px',
    zIndex: 50,
    minWidth: '200px',
    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
  },
  columnDropdownHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  columnCheckbox: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 0',
    fontSize: '12.5px',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  tableWrapper: {
    position: 'relative',
    background: 'rgba(15,23,42,0.7)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  tableScroll: {
    overflowX: 'auto',
    overflowY: 'visible',
    maxHeight: '62vh',
    scrollBehavior: 'smooth',
  },
  scrollShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40px',
    zIndex: 5,
    pointerEvents: 'none',
    transition: 'opacity 0.25s',
    borderRadius: '14px',
  },
  tabla: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: '12px',
    minWidth: '900px',
  },
  tableHeader: {
    position: 'sticky',
    top: 0,
    zIndex: 4,
    background: '#1e293b',
  },
  th: {
    padding: '10px 8px',
    textAlign: 'left',
    color: '#f1f5f9',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: '10.5px',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #334155',
    background: '#1e293b',
  },
  thActions: {
    textAlign: 'center',
    color: '#f1f5f9',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: '10.5px',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
    width: '90px',
    borderBottom: '2px solid #334155',
    background: '#1e293b',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.12s',
  },
  td: {
    padding: '9px 8px',
    color: '#e2e8f0',
    maxWidth: '180px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  tdActions: {
    textAlign: 'center',
    whiteSpace: 'nowrap',
    width: '90px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    position: 'relative',
  },
  tableFooter: {
    position: 'sticky',
    bottom: 0,
    zIndex: 4,
    background: '#0f172a',
    borderTop: '2px solid #334155',
  },
  tdFooter: {
    padding: '9px 8px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: '600',
    background: '#0f172a',
    borderTop: '2px solid #334155',
  },
  actionBtnEdit: {
    background: 'rgba(99,102,241,0.12)',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    padding: '5px 7px',
    margin: '0 2px',
    borderRadius: '5px',
    transition: 'all 0.15s',
  },
  actionBtnDelete: {
    background: 'rgba(239,68,68,0.12)',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    padding: '5px 7px',
    margin: '0 2px',
    borderRadius: '5px',
    transition: 'all 0.15s',
  },
  attachBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    position: 'relative',
    padding: '4px 6px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-8px',
    background: '#6366f1',
    color: '#fff',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soporteItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    padding: '4px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  soporteAcciones: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  loader: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#94a3b8',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modalContent: {
    background: '#1e293b',
    borderRadius: '14px',
    maxWidth: '750px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '22px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  modalTitle: {
    margin: 0,
    color: '#f1f5f9',
    fontSize: '1.15rem',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.3rem',
    cursor: 'pointer',
  },
  modalBody: {
    marginBottom: '18px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  modalCancel: {
    padding: '9px 18px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '13px',
  },
  modalSave: {
    padding: '9px 18px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  },
};

export default GestionTesoreria;