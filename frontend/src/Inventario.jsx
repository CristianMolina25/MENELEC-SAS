  import React, { useState, useEffect, useMemo, useCallback } from 'react';
  import PropTypes from 'prop-types';
  import axios from 'axios';

  import * as XLSX from 'xlsx';
  import toast, { Toaster } from 'react-hot-toast';
  import {
    FaBoxOpen, FaPlusCircle, FaChartBar, FaFileExport,
    FaTrashAlt, FaEdit, FaSave, FaCalendarAlt, FaIdCard, FaTag,
    FaFilter, FaTimes, FaUserTie, FaMapMarkerAlt, FaShieldAlt, FaBarcode, FaInfoCircle,
    FaPaperclip, FaCheckCircle, FaCloudUploadAlt, FaDownload, FaFolderOpen, FaPencilAlt,
    FaSearch, FaSortAmountDownAlt, FaThLarge, FaList, FaSyncAlt, FaSpinner,
    FaExclamationCircle, FaRedoAlt, FaChevronDown, FaChevronUp, FaRegQuestionCircle,
    FaTruck, FaPhone, FaEnvelope, FaDollarSign   // 👈 nuevos
  } from 'react-icons/fa';

  import { useMediaQuery } from 'react-responsive';
  import OnlyOfficeEditor from './OnlyOfficeEditor';

  const API_URL = `${window.location.protocol}//${window.location.hostname}:8080/api/inventario`;
  const Inventario = ({ onNavigateToFolder }) => {
    const isMobile = useMediaQuery({ maxWidth: 768 });

    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, productId: null });
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [archivo, setArchivo] = useState(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [editorConfig, setEditorConfig] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [vistaModo, setVistaModo] = useState(isMobile ? 'cards' : 'table');
    const [busqueda, setBusqueda] = useState('');
    const [sortOption, setSortOption] = useState('nombre_asc');
    const [filtroCategoria, setFiltroCategoria] = useState('TODAS');

    const [form, setForm] = useState({
        id: null, marca: '', nombre: '', descripcion: '', categoria: '',
        precio: 0, proveedor: '', fechaCotizacion: '',
        vendedor: '', garantia: '', serie: '', ubicacion: '',
        telefono: '', email: '',
        cantidad: 1      // 👈 nuevo
    });


    // --- AUTENTICACIÓN ---
    const getAuthHeaders = useCallback((isMultipart = false) => {
      const token = localStorage.getItem('token');
      if (isMultipart) {
        return { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
      }
      return { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
    }, []);

    // --- CARGA INICIAL ---
    const cargarInventario = useCallback(async () => {
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/listar`, getAuthHeaders());
        setProductos(res.data || []);
      } catch (err) {
        console.error("Error cargando inventario", err);
        setError(err.response?.status === 401 ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'No se pudo cargar el inventario.');
      } finally {
        setCargando(false);
      }
    }, [getAuthHeaders]);

  const marcasUnicas = useMemo(() => {
    const marcas = productos.map(p => p.marca).filter(Boolean);
    return [...new Set(marcas)].sort();
  }, [productos]);

  const categoriasDisponibles = useMemo(() => {
    const cats = productos.map(p => p.categoria).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [productos]);

  const ubicacionesUnicas = useMemo(() => {
    const ubi = productos.map(p => p.ubicacion).filter(Boolean);
    return [...new Set(ubi)].sort();
  }, [productos]);

  // --- LISTA PARA FILTROS (incluye "TODAS") ---
  const categoriasUnicas = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria).filter(Boolean));
    return ['TODAS', ...Array.from(cats).sort()];
  }, [productos]);

    useEffect(() => {
      cargarInventario();
    }, [cargarInventario]);

    // --- FILTRADO Y BÚSQUEDA ---
    const productosFiltrados = useMemo(() => {
      let lista = productos;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        lista = lista.filter(p =>
          (p.nombre || '').toLowerCase().includes(q) ||
          (p.marca || '').toLowerCase().includes(q) ||
          (p.proveedor || '').toLowerCase().includes(q) ||
          (p.serie || '').toLowerCase().includes(q)
        );
      }

      if (filtroCategoria !== 'TODAS') {
        lista = lista.filter(p => (p.categoria || '').toUpperCase() === filtroCategoria);
      }

      return lista;
    }, [productos, busqueda, filtroCategoria]);

    // --- ORDENAMIENTO ---
    const productosOrdenados = useMemo(() => {
      const lista = [...productosFiltrados];
      switch (sortOption) {
        case 'nombre_asc':
          return lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        case 'nombre_desc':
          return lista.sort((a, b) => (b.nombre || '').localeCompare(a.nombre || ''));
        case 'precio_asc':
          return lista.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
        case 'precio_desc':
          return lista.sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
        case 'fecha_asc':
          return lista.sort((a, b) => (a.fechaCotizacion || '').localeCompare(b.fechaCotizacion || ''));
        case 'fecha_desc':
          return lista.sort((a, b) => (b.fechaCotizacion || '').localeCompare(a.fechaCotizacion || ''));
        default:
          return lista;
      }
    }, [productosFiltrados, sortOption]);

    // --- ESTADÍSTICAS ---
    const stats = useMemo(() => {
      const total = productos.length;
      const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].length;
      const conDocumento = productos.filter(p => p.archivoFichaTecnica).length;
      const valorTotal = productos.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
      return { total, categorias, conDocumento, valorTotal };
    }, [productos]);
    
    // --- MANEJO DE ARCHIVO ---
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 10 MB');
        return;
      }
      setArchivo(file);
    };

    // --- SUBIR ACTUALIZAR / CREAR ---
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (archivo) {
          // Si hay archivo, siempre usamos FormData (tanto en creación como en edición)
          const formData = new FormData();
          Object.keys(form).forEach(key => {
            if (key === 'id') return; // el id no se envía, se usa en la URL
            formData.append(key, form[key] ?? '');
          });
          formData.append('file', archivo);

          let url, method;
          if (form.id) {
            // Actualizar con archivo
            url = `${API_URL}/actualizar-con-archivo/${form.id}`;
            method = 'put';
          } else {
            // Crear con archivo
            url = `${API_URL}/guardar-con-archivo`;
            method = 'post';
          }

          await axios[method](url, formData, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        } else if (form.id) {
          // Edición sin archivo: JSON normal
          await axios.put(`${API_URL}/actualizar/${form.id}`, form, getAuthHeaders());
        } else {
          // Creación sin archivo: JSON normal
          await axios.post(`${API_URL}/guardar`, form, getAuthHeaders());
        }
        toast.success(form.id ? 'Activo actualizado' : 'Activo registrado exitosamente');
        resetForm();
        cargarInventario(); // o cargarMercado() según corresponda
      } catch (err) {
        console.error("Error detallado:", err.response?.data || err.message);
        toast.error(err.response?.data?.mensaje || 'Error al procesar la solicitud');
      }
    };


    const resetForm = () => {
      setForm({
        id: null, marca: '', nombre: '', descripcion: '', categoria: '',
        precio: 0, proveedor: '', fechaCotizacion: '',
        vendedor: '', garantia: '', serie: '', ubicacion: '',
        telefono: '', email: '',
        cantidad: 1   // 👈 agregado
      });
      setArchivo(null);
    };


    // --- ELIMINAR ---
    const confirmDelete = async () => {
      setDeleteLoading(true);
      try {
        await axios.delete(`${API_URL}/eliminar/${deleteConfirm.productId}`, getAuthHeaders());
        cargarInventario();
        setDeleteConfirm({ show: false, productId: null });
        toast.success('Activo eliminado correctamente');
      } catch (err) {
        toast.error('Error al eliminar');
      } finally {
        setDeleteLoading(false);
      }
    };

    // --- EXPORTAR EXCEL ---
    const exportarAExcel = () => {
      const datos = productos.map(p => ({
        "Marca": p.marca,
        "Producto": p.nombre,
        "Descripción": p.descripcion,
        "Categoría": p.categoria,
        "Precio": p.precio,
        "Proveedor": p.proveedor,
        "Vendedor": p.vendedor,
        "Teléfono": p.telefono,
        "Cantidad": p.cantidad ?? 1,
        "Precio Total": (p.cantidad ?? 1) * Number(p.precio),
        "Email": p.email,
        "Serie": p.serie,
        "Ubicación": p.ubicacion,
        "Garantía": p.garantia,
        "Fecha Adquisición": p.fechaCotizacion
      }));
      const hoja = XLSX.utils.json_to_sheet(datos);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
      XLSX.writeFile(libro, `MENELEC_Inventario_${new Date().toLocaleDateString()}.xlsx`);
      toast.success('Exportación completada');
    };

    // --- DOCUMENTOS ---
    const descargarDocumento = async (id) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/descargar-archivo/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        let filename = `documento_${id}`;
        const disposition = response.headers['content-disposition'];
        if (disposition) {
          const match = disposition.match(/filename="(.+)"/);
          if (match) filename = match[1];
        } else if (productoSeleccionado?.archivoFichaTecnica) {
          filename = productoSeleccionado.archivoFichaTecnica.split(/[\\/]/).pop();
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Descarga iniciada');
      } catch (error) {
        console.error("Error al descargar:", error);
        toast.error("No se pudo descargar el documento");
      }
    };

    const editarDocumento = async () => {
      const nombreArchivo = productoSeleccionado?.archivoFichaTecnica;
      if (!nombreArchivo) {
        toast.error("No hay documento adjunto para editar.");
        return;
      }
      const basePath = "C:\\MENELEC_DOCUMENTOS";
      let rutaRelativa = nombreArchivo;
      if (rutaRelativa.toUpperCase().startsWith(basePath.toUpperCase())) {
        rutaRelativa = rutaRelativa.substring(basePath.length);
      }
      rutaRelativa = rutaRelativa.replace(/\\/g, '/');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/archivos/onlyoffice/config', {
          params: { ruta: rutaRelativa },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setEditorConfig(res.data);
      } catch (error) {
        console.error("Error al cargar editor:", error);
        toast.error("No se pudo abrir el editor");
      }
    };

    const verUbicacion = () => {
      const nombreArchivo = productoSeleccionado?.archivoFichaTecnica;
      if (!nombreArchivo) {
        toast.error("No se encontró la ruta del documento.");
        return;
      }
      const basePath = "C:\\MENELEC_DOCUMENTOS";
      let rutaRelativa = nombreArchivo;
      if (rutaRelativa.toUpperCase().startsWith(basePath.toUpperCase())) {
        rutaRelativa = rutaRelativa.substring(basePath.length);
      }
      rutaRelativa = rutaRelativa.replace(/\\/g, '/');
      const partes = rutaRelativa.split('/');
      partes.pop();
      const carpeta = partes.join('/') || '';
      if (onNavigateToFolder) {
        onNavigateToFolder(carpeta);
        setProductoSeleccionado(null);
      } else {
        toast(`Carpeta: ${carpeta}`, { icon: '📁' });
      }
    };
  const styles = useMemo(() => ({
      container: {
        padding: isMobile ? '16px' : '24px',
        maxWidth: '1500px',
        margin: '0 auto',
        minHeight: '100vh'
      },
      header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      },
      headerActions: {
        display: 'flex',
        gap: '8px'
      },
      vistaToggle: {
        background: '#1e293b',
        border: '1px solid #334155',
        color: '#94a3b8',
        padding: '10px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s'
      },
      refreshButton: {
        background: '#1e293b',
        border: '1px solid #334155',
        color: '#94a3b8',
        padding: '10px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: '16px'
      },
      statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        color: '#818cf8',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '800',
        marginBottom: '8px',
        letterSpacing: '1.5px'
      },
      title: {
        fontSize: isMobile ? '1.8rem' : '2.4rem',
        fontWeight: '900',
        margin: 0,
        color: '#f1f5f9',
        letterSpacing: '-1px',
        lineHeight: '1.1'
      },
      subtitle: {
        color: '#64748b',
        fontSize: isMobile ? '0.85rem' : '1rem',
        marginTop: '4px',
        marginBottom: 0
      },
      statsRow: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
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
        minWidth: isMobile ? '70px' : '90px',
        flex: '1 1 auto'
      },
      statNumber: {
        fontSize: isMobile ? '1.4rem' : '1.8rem',
        fontWeight: '900',
        color: '#f1f5f9'
      },
      statLabel: {
        fontSize: '10px',
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase'
      },
      controlBar: {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      },
      controlLeft: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flex: '1 1 auto',
        width: isMobile ? '100%' : 'auto'
      },
      controlRight: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        width: isMobile ? '100%' : 'auto',
        justifyContent: isMobile ? 'flex-start' : 'flex-end'
      },
      searchWrapper: {
        position: 'relative',
        flex: 1
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
        padding: '12px 16px 12px 40px',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '16px',
        color: '#f1f5f9',
        fontSize: '14px',
        outline: 'none',
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
      sortContainer: {
        display: 'flex',
        alignItems: 'center',
        background: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '6px 10px'
      },
      sortSelect: {
        background: 'transparent',
        border: 'none',
        color: '#f1f5f9',
        fontSize: '13px',
        fontWeight: '600',
        outline: 'none',
        cursor: 'pointer'
      },
      btnExport: {
        background: 'rgba(99, 102, 241, 0.15)',
        color: '#a5b4fc',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        padding: isMobile ? '8px 14px' : '10px 20px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s'
      },
      filtrosExpandidos: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: '#1e293b',
        borderRadius: '16px',
        marginBottom: '16px',
        flexWrap: 'wrap',
        border: '1px solid #334155'
      },
      filtroLabel: {
        color: '#94a3b8',
        fontSize: '13px',
        fontWeight: '600'
      },
      filtroChip: {
        padding: '6px 14px',
        borderRadius: '20px',
        border: '1px solid #334155',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '700',
        transition: 'all 0.2s'
      },
      clearFilters: {
        marginLeft: 'auto',
        padding: '6px 12px',
        border: 'none',
        background: 'transparent',
        color: '#ef4444',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600'
      },
      mainGrid: {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(400px, 480px) 1fr',
        gap: '24px',
        alignItems: 'start'
      },
      sidebar: {
        position: isMobile ? 'static' : 'sticky',
        top: '24px'
      },
      glassCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(16px)',
        padding: isMobile ? '20px' : '24px',
        borderRadius: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: '0 12px 32px -12px rgba(0,0,0,0.4)'
      },
      cardTitle: {
        fontSize: '12px',
        fontWeight: '700',
        color: '#a5b4fc',
        marginBottom: '24px',
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      },
      form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      },
      fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '18px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '16px',
        border: '1px solid rgba(51, 65, 85, 0.3)'
      },
      labelGroup: {
        fontSize: '10px',
        fontWeight: '800',
        color: '#818cf8',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      },
      input: {
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid #334155',
        background: 'rgba(15, 23, 42, 0.9)',
        color: '#f1f5f9',
        outline: 'none',
        fontSize: '14px',
        fontFamily: "'Inter', sans-serif",
        width: '100%',
        boxSizing: 'border-box'
      },
      miniLabel: {
        fontSize: '9px',
        color: '#94a3b8',
        marginLeft: '4px',
        marginBottom: '4px',
        display: 'block'
      },
      fileUploadContainer: {
        border: '2px dashed #475569',
        borderRadius: '16px',
        padding: isMobile ? '20px' : '28px 20px',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.7)',
        cursor: 'pointer',
        marginTop: '4px'
      },
      fileUploadIcon: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      },
      btnSave: {
        border: 'none',
        padding: '14px',
        borderRadius: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        letterSpacing: '0.5px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
        background: form.id ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: form.id ? '#000' : '#fff'
      },
      btnCancelForm: {
        background: 'none',
        border: '1px solid #475569',
        color: '#cbd5e1',
        padding: '12px',
        borderRadius: '12px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '12px',
        marginTop: '8px'
      },
      tableWrapper: {
        overflowX: 'auto',
        width: '100%'
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: isMobile ? '600px' : 'auto'
      },
      th: {
        textAlign: 'left',
        fontSize: '12px',
        color: '#94a3b8',
        paddingBottom: '18px',
        borderBottom: '2px solid #334155',
        fontWeight: '700',
        letterSpacing: '0.5px',
        cursor: 'pointer'
      },
      td: {
        padding: '18px 12px',
        fontSize: isMobile ? '13px' : '15px',
        borderBottom: '1px solid #1e293b'
      },
      trBase: {
        cursor: 'pointer',
        transition: 'background 0.2s ease'
      },
      btnActionEdit: {
        background: 'rgba(251, 191, 36, 0.15)',
        border: 'none',
        color: '#fbbf24',
        cursor: 'pointer',
        marginRight: '10px',
        fontSize: isMobile ? '14px' : '16px',
        padding: '10px',
        borderRadius: '10px'
      },
      btnActionDel: {
        background: 'rgba(248, 113, 113, 0.15)',
        border: 'none',
        color: '#f87171',
        cursor: 'pointer',
        fontSize: isMobile ? '14px' : '16px',
        padding: '10px',
        borderRadius: '10px'
      },
      cardGrid: {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      },
      productCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid #334155',
        cursor: 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      },
      cardIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'rgba(129, 140, 248, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      cardProductName: {
        margin: 0,
        color: '#f1f5f9',
        fontWeight: '700',
        fontSize: '16px',
        textAlign: 'center'
      },
      cardProductMarca: {
        color: '#94a3b8',
        fontSize: '13px'
      },
      cardFooter: {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px'
      },
      cardPrecio: {
        color: '#34d399',
        fontWeight: '800',
        fontSize: '18px'
      },
      emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#475569',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '24px',
        border: '2px dashed #1e293b'
      },
      modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      },
      fichaTecnica: {
        background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
        backdropFilter: 'blur(20px)',
        width: '90%',
        maxWidth: isMobile ? '95%' : '620px',
        borderRadius: '28px',
        padding: isMobile ? '24px' : '36px',
        position: 'relative',
        border: '1px solid rgba(129, 140, 248, 0.2)',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)'
      },
      btnCloseModal: {
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '22px'
      },
      fichaHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        marginBottom: '28px',
        borderBottom: '1px solid #334155',
        paddingBottom: '20px',
        flexWrap: 'wrap'
      },
      iconCircle: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'rgba(129, 140, 248, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      },
      badgeMark: {
        background: '#312e81',
        color: '#c7d2fe',
        padding: '4px 14px',
        borderRadius: '30px',
        fontSize: '12px',
        fontWeight: '700',
        display: 'inline-block'
      },
      fichaGrid: {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '20px'
      },
      fichaInfoItem: {
        marginBottom: '12px'
      },
      miniLabelFicha: {
        fontSize: '10px',
        color: '#a5b4fc',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px'
      },
      pDetail: {
        margin: 0,
        fontSize: isMobile ? '13px' : '15px',
        color: '#f1f5f9',
        fontWeight: '500'
      },
      descBox: {
        background: '#0f172a',
        padding: '18px',
        borderRadius: '14px',
        border: '1px solid #334155',
        fontSize: '14px',
        color: '#cbd5e1',
        lineHeight: '1.7',
        marginTop: '10px'
      },
      documentoAdjunto: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#0f172a',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginTop: '8px',
        flexWrap: 'wrap'
      },
      btnDocumentActions: {
        display: 'flex',
        gap: '8px',
        marginLeft: isMobile ? '0' : 'auto',
        marginTop: isMobile ? '8px' : '0'
      },
      btnDocAction: {
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        color: '#a5b4fc',
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '10px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      },
      fichaFooter: {
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      },
      precioGrande: {
        fontSize: isMobile ? '24px' : '30px',
        fontWeight: '800',
        color: '#34d399'
      },
      confirmOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100
      },
      confirmBox: {
        background: '#1e293b',
        padding: isMobile ? '20px' : '30px 40px',
        borderRadius: '24px',
        border: '1px solid #f87171',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        textAlign: 'center',
        width: isMobile ? '90%' : 'auto'
      },
      confirmButtons: {
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
        marginTop: '20px'
      },
      btnCancel: {
        background: '#475569',
        color: '#fff',
        border: 'none',
        padding: isMobile ? '10px 20px' : '12px 24px',
        borderRadius: '12px',
        fontWeight: '600',
        cursor: 'pointer'
      },
      btnDanger: {
        background: '#ef4444',
        color: '#fff',
        border: 'none',
        padding: isMobile ? '10px 20px' : '12px 24px',
        borderRadius: '12px',
        fontWeight: '700',
        cursor: 'pointer'
      },
      errorContainer: {
        textAlign: 'center',
        padding: '60px 20px',
        maxWidth: '500px',
        margin: '0 auto',
        color: '#f1f5f9'
      },
      retryButton: {
        marginTop: '20px',
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        cursor: 'pointer',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      },
      skeletonContainer: {
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        padding: '24px'
      },
      skeletonCard: {
        background: '#1e293b',
        borderRadius: '20px',
        padding: '24px',
        animation: 'skeletonPulse 1.5s infinite'
      },
      skeletonLine: {
        background: '#334155',
        borderRadius: '8px',
        height: '16px',
        marginBottom: '8px'
      }
    }), [isMobile, form.id]);
    // --- EDITOR ONLYOFFICE ---
    if (editorConfig) {
      return <OnlyOfficeEditor config={editorConfig} onBack={() => setEditorConfig(null)} />;
    }


    // --- LOADING / ERROR ---
    if (cargando) {
      return <SkeletonLoader vistaModo={vistaModo} isMobile={isMobile} />;
    }

    if (error) {
      return (
        <div style={styles.errorContainer}>
          <FaExclamationCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <p style={{ color: '#f1f5f9' }}>{error}</p>
          <button onClick={() => { setCargando(true); cargarInventario(); }} style={styles.retryButton}>
            <FaRedoAlt /> Reintentar
          </button>
        </div>
      );
    }

    // Estilos responsivos (se recalculan cuando cambia isMobile)
  

    return (
      <div style={styles.container}>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />

        {/* MODAL FICHA TÉCNICA */}
        {productoSeleccionado && (
          <div style={styles.modalOverlay} onClick={() => setProductoSeleccionado(null)}>
            <div style={styles.fichaTecnica} onClick={e => e.stopPropagation()}>
              <button style={styles.btnCloseModal} onClick={() => setProductoSeleccionado(null)}><FaTimes /></button>
              <div style={styles.fichaHeader}>
                <div style={styles.iconCircle}><FaBoxOpen size={30} color="#818cf8" /></div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, color: '#f1f5f9' }}>{productoSeleccionado.nombre}</h2>
                  <span style={styles.badgeMark}>{productoSeleccionado.marca || 'Genérico'}</span>
                </div>
              </div>
              <div style={styles.fichaGrid}>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaTag /> CATEGORÍA</label>
                  <p style={styles.pDetail}>{productoSeleccionado.categoria || 'Sin categoría'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaBarcode /> N/S SERIE</label>
                  <p style={styles.pDetail}>{productoSeleccionado.serie || '---'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaUserTie /> VENDEDOR</label>
                  <p style={styles.pDetail}>{productoSeleccionado.vendedor || 'No registrado'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaTruck /> PROVEEDOR</label>
                  <p style={styles.pDetail}>{productoSeleccionado.proveedor || '---'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaPhone /> TELÉFONO</label>
                  <p style={styles.pDetail}>{productoSeleccionado.telefono || '---'}</p>
                </div>

                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaMapMarkerAlt /> UBICACIÓN</label>
                  <p style={styles.pDetail}>{productoSeleccionado.ubicacion || 'No especificada'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaShieldAlt /> GARANTÍA</label>
                  <p style={styles.pDetail}>{productoSeleccionado.garantia || 'N/A'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaCalendarAlt /> FECHA ADQUISICIÓN</label>
                  <p style={styles.pDetail}>{productoSeleccionado.fechaCotizacion || 'N/A'}</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaDollarSign /> PRECIO UNITARIO</label>
                  <p style={styles.pDetail}>${Number(productoSeleccionado.precio).toLocaleString()} COP</p>
                </div>
                <div style={styles.fichaInfoItem}>
                  <label style={styles.miniLabelFicha}><FaDollarSign /> PRECIO TOTAL</label>
                  <p style={styles.pDetail}>
                    ${( (productoSeleccionado.cantidad || 1) * Number(productoSeleccionado.precio) ).toLocaleString()} COP
                  </p>
                </div>

              </div>
              <div style={{ marginTop: '25px' }}>
                <label style={styles.labelGroup}>DESCRIPCIÓN TÉCNICA</label>
                <div style={styles.descBox}>{productoSeleccionado.descripcion || 'Sin detalles adicionales.'}</div>
              </div>

              {productoSeleccionado.archivoFichaTecnica && (
                <div style={{ marginTop: '20px' }}>
                  <label style={styles.labelGroup}><FaPaperclip /> DOCUMENTO ADJUNTO</label>
                  <div style={styles.documentoAdjunto}>
                    <FaPaperclip color="#818cf8" />
                    <span style={{ color: '#e2e8f0', marginRight: '12px', fontFamily: 'monospace', fontSize: '14px' }}>
                      {productoSeleccionado.archivoFichaTecnica.split(/[\\/]/).pop()}
                    </span>
                    <div style={styles.btnDocumentActions}>
                      <button onClick={() => descargarDocumento(productoSeleccionado.id)} style={styles.btnDocAction} title="Descargar"><FaDownload /></button>
                    </div>
                  </div>
                </div>
              )}
              <div style={styles.fichaFooter}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>VALOR UNITARIO:</span>
                <span style={styles.precioGrande}>${Number(productoSeleccionado.precio).toLocaleString()} <small style={{ fontSize: '12px' }}>COP</small></span>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.statusBadge}>MENELEC INVENTARIO</div>
            <h1 style={styles.title}>Gestión de Activos</h1>
            <p style={styles.subtitle}>Administra el inventario de forma inteligente</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setVistaModo(v => v === 'table' ? 'cards' : 'table')} style={styles.vistaToggle} title={`Vista: ${vistaModo === 'table' ? 'Tarjetas' : 'Tabla'}`}>
              {vistaModo === 'table' ? <FaThLarge /> : <FaList />}
            </button>
            <button onClick={cargarInventario} style={styles.refreshButton} title="Actualizar">
              <FaSyncAlt />
            </button>
          </div>
        </header>

        {/* ESTADÍSTICAS */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}><span style={styles.statNumber}>{stats.total}</span><span style={styles.statLabel}>Activos</span></div>
          <div style={styles.statCard}><span style={styles.statNumber}>{stats.categorias}</span><span style={styles.statLabel}>Categorías</span></div>
          <div style={styles.statCard}><span style={styles.statNumber}>{stats.conDocumento}</span><span style={styles.statLabel}>Con documentos</span></div>
          <div style={styles.statCard}><span style={styles.statNumber}>${stats.valorTotal.toLocaleString()}</span><span style={styles.statLabel}>Valor total</span></div>
        </div>

        {/* BARRA DE CONTROL */}
        <div style={styles.controlBar}>
          <div style={styles.controlLeft}>
            <div style={styles.searchWrapper}>
              <FaSearch style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar por nombre, marca, proveedor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={styles.searchInput}
              />
              {busqueda && <FaTimes style={{ ...styles.searchIcon, right: '8px', cursor: 'pointer' }} onClick={() => setBusqueda('')} />}
            </div>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={styles.filterToggle}>
              <FaFilter /> Filtros {mostrarFiltros ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
            </button>
          </div>
          <div style={styles.controlRight}>
            <SortSelector sortOption={sortOption} onSortChange={setSortOption} isMobile={isMobile} />
            <button onClick={exportarAExcel} style={styles.btnExport}>
              <FaFileExport /> Exportar
            </button>
          </div>
        </div>

        {/* FILTROS EXPANDIBLES */}
        {mostrarFiltros && (
          <div style={styles.filtrosExpandidos}>
            <span style={styles.filtroLabel}>Categoría:</span>
            {categoriasUnicas.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                style={{
                  ...styles.filtroChip,
                  background: filtroCategoria === cat ? '#6366f120' : 'transparent',
                  color: filtroCategoria === cat ? '#818cf8' : '#94a3b8',
                  borderColor: filtroCategoria === cat ? '#6366f1' : '#334155'
                }}
              >
                {cat === 'TODAS' ? 'Todas' : cat}
              </button>
            ))}
            <button onClick={() => { setBusqueda(''); setFiltroCategoria('TODAS'); }} style={styles.clearFilters}>Limpiar</button>
          </div>
        )}

          {/* CONTENIDO PRINCIPAL */}
          <div style={styles.mainGrid}>
            {/* PANEL IZQUIERDO: FORMULARIO */}
            <aside style={styles.sidebar}>
              <section style={styles.glassCard}>
                <h3 style={styles.cardTitle}>{form.id ? 'EDITAR ACTIVO' : 'NUEVO REGISTRO'}</h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.labelGroup}><FaIdCard /> IDENTIFICACIÓN</label>
                    <input type="text" placeholder="Nombre del Producto" style={styles.input} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {/* MARCA con datalist */}
                      <div style={{ flex: '1 1 150px', position: 'relative' }}>
                        <input
                          list="marcasList"
                          type="text"
                          placeholder="Marca"
                          style={styles.input}
                          value={form.marca}
                          onChange={e => setForm({ ...form, marca: e.target.value })}
                        />
                        <datalist id="marcasList">
                          {marcasUnicas.map(m => <option key={m} value={m} />)}
                        </datalist>
                      </div>

                      {/* CATEGORÍA con datalist */}
                      <div style={{ flex: '1 1 150px', position: 'relative' }}>
                        <input
                          list="categoriasList"
                          type="text"
                          placeholder="Categoría"
                          style={styles.input}
                          value={form.categoria}
                          onChange={e => setForm({ ...form, categoria: e.target.value })}
                          required
                        />
                      <datalist id="categoriasList">
                        {categoriasDisponibles.map(c => <option key={c} value={c} />)}
                      </datalist>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <input type="text" placeholder="N/S Serie" style={{ ...styles.input, flex: '1 1 150px' }} value={form.serie} onChange={e => setForm({ ...form, serie: e.target.value })} />
                      <input type="text" placeholder="Proveedor" style={{ ...styles.input, flex: '1 1 150px' }} value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} />
                    </div>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelGroup}><FaUserTie /> PROVEEDOR Y CONTACTO</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <input type="text" placeholder="Nombre Vendedor" style={{ ...styles.input, flex: '1 1 160px' }} value={form.vendedor} onChange={e => setForm({ ...form, vendedor: e.target.value })} />
                      <input type="text" placeholder="Teléfono" style={{ ...styles.input, flex: '1 1 140px' }} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                    </div>
                    
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 140px' }}>
                          <label style={styles.miniLabel}>PRECIO UNITARIO</label>
                          <input type="number" style={styles.input} value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} />
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                          <label style={styles.miniLabel}>CANTIDAD</label>
                          <input type="number" style={styles.input} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} min="1" />
                        </div>
                        <div style={{ flex: '1 1 150px' }}>
                          <label style={styles.miniLabel}>FECHA COTIZ.</label>
                          <input type="date" style={styles.input} value={form.fechaCotizacion} onChange={e => setForm({ ...form, fechaCotizacion: e.target.value })} />
                        </div>

                    </div>
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.labelGroup}><FaMapMarkerAlt /> LOGÍSTICA</label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {/* UBICACIÓN con datalist */}
                      <div style={{ flex: '1 1 180px', position: 'relative' }}>
                        <input
                          list="ubicacionesList"
                          type="text"
                          placeholder="Ubicación Física"
                          style={styles.input}
                          value={form.ubicacion}
                          onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                        />
                        <datalist id="ubicacionesList">
                          {ubicacionesUnicas.map(u => <option key={u} value={u} />)}
                        </datalist>
                      </div>
                      <input type="text" placeholder="Garantía" style={{ ...styles.input, flex: '1 1 120px' }} value={form.garantia} onChange={e => setForm({ ...form, garantia: e.target.value })} />
                    </div>
                  </div>

                  <textarea placeholder="Descripción detallada..." style={{ ...styles.input, height: '80px', resize: 'none' }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />

    
                    <div style={styles.fieldGroup}>
                      <label style={styles.labelGroup}><FaPaperclip /> {form.id ? 'CAMBIAR DOCUMENTO (OPCIONAL)' : 'ADJUNTAR DOCUMENTO (OPCIONAL)'}</label>
                      <div style={styles.fileUploadContainer}>
                        <input type="file" id="file-upload" onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls" />
                        <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
                          <div style={styles.fileUploadIcon}>
                            <FaCloudUploadAlt size={36} color="#818cf8" />
                            <span style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: '500' }}>
                              {archivo ? archivo.name : 'Haz clic o arrastra un archivo aquí'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>PDF, imagen, documento (Máx. 10 MB)</span>
                          </div>
                        </label>
                      </div>
                      {archivo && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#34d399', fontSize: '13px', fontWeight: '600' }}>
                          <FaCheckCircle /> Archivo listo
                          <button type="button" onClick={() => setArchivo(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', marginLeft: 'auto', fontSize: '13px' }}>Eliminar</button>
                        </div>
                      )}
                    </div>
                  
                  <button type="submit" style={styles.btnSave}>
                    {form.id ? <><FaSave /> ACTUALIZAR</> : <><FaPlusCircle /> GUARDAR ACTIVO</>}
                  </button>
                  {form.id && <button type="button" onClick={resetForm} style={styles.btnCancelForm}>CANCELAR EDICIÓN</button>}
                </form>
              </section>
            </aside>

          {/* PANEL DERECHO: TABLA / TARJETAS */}
          <section style={styles.glassCard}>
            {productosOrdenados.length === 0 ? (
              <EmptyState busqueda={busqueda} />
            ) : vistaModo === 'table' ? (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th} onClick={() => setSortOption(sortOption === 'nombre_asc' ? 'nombre_desc' : 'nombre_asc')}>PRODUCTO {sortOption.startsWith('nombre') && (sortOption === 'nombre_asc' ? '▲' : '▼')}</th>
                      <th style={styles.th}>MARCA</th>
                      <th style={styles.th}>PROVEEDOR</th>
                      <th style={styles.th}>CANTIDAD</th>
                      <th style={styles.th} onClick={() => setSortOption(sortOption === 'precio_asc' ? 'precio_desc' : 'precio_asc')}>PRECIO {sortOption.startsWith('precio') && (sortOption === 'precio_asc' ? '▲' : '▼')}</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosOrdenados.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setProductoSeleccionado(p)}
                        onMouseEnter={() => setHoveredRow(p.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ ...styles.trBase, background: hoveredRow === p.id ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                      >
                        <td style={styles.td}>
                          <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: isMobile ? '13px' : '15px' }}>{p.nombre}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}><FaInfoCircle /> Click para ficha</div>
                        </td>
                        <td style={styles.td}>{p.marca || '---'}</td>
                        <td style={styles.td}>{p.proveedor || '---'}</td>
                        <td style={styles.td}>{p.cantidad ?? 1}</td>
                        <td style={styles.td}>${Number(p.precio).toLocaleString()}</td>
                        <td style={{ ...styles.td, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => setForm({ ...p, precio: p.precio ?? 0, id: p.id })} style={styles.btnActionEdit} title="Editar"><FaEdit /></button>
                          <button onClick={() => setDeleteConfirm({ show: true, productId: p.id })} style={styles.btnActionDel} title="Eliminar"><FaTrashAlt /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
            <div style={styles.cardGrid}>
              {productosOrdenados.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProductoSeleccionado(p)}
                  style={styles.productCard}
                  onMouseEnter={() => setHoveredRow(p.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <div style={styles.cardIcon}><FaBoxOpen size={28} color="#818cf8" /></div>
                  <h4 style={styles.cardProductName}>{p.nombre}</h4>
                  <p style={styles.cardProductMarca}>{p.marca || 'Genérico'}</p>
                  
                  {/* Línea de cantidad y precio unitario */}
                  <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, textAlign: 'center' }}>
                    Cant: {p.cantidad ?? 1} | Unit: ${Number(p.precio).toLocaleString()}
                  </p>

                  <div style={styles.cardFooter}>
                    <span style={styles.cardPrecio}>
                      Total: ${((p.cantidad ?? 1) * Number(p.precio)).toLocaleString()}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={(e) => { e.stopPropagation(); setForm({ ...p, precio: p.precio ?? 0, cantidad: p.cantidad ?? 1, id: p.id }); }} style={styles.btnActionEdit}><FaEdit size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, productId: p.id }); }} style={styles.btnActionDel}><FaTrashAlt size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>
        </div>

        {/* CONFIRMACIÓN DE ELIMINACIÓN */}
        {deleteConfirm.show && (
          <div style={styles.confirmOverlay}>
            <div style={styles.confirmBox}>
              <p style={{ marginBottom: '20px', color: '#f1f5f9', fontSize: '16px' }}>¿Eliminar permanentemente este activo?</p>
              <div style={styles.confirmButtons}>
                <button onClick={() => setDeleteConfirm({ show: false })} style={styles.btnCancel}>Cancelar</button>
                <button onClick={confirmDelete} style={styles.btnDanger}>{deleteLoading ? 'Eliminando...' : 'Eliminar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ESTILOS GLOBALES INYECTADOS */}
        <style>{globalStyles}</style>
      </div>
    );
  };

  // --- PROPTYPES ---
  Inventario.propTypes = {
    onNavigateToFolder: PropTypes.func
  };

  // --- COMPONENTES AUXILIARES ---
  const SortSelector = ({ sortOption, onSortChange, isMobile }) => {
    const options = [
      { value: 'nombre_asc', label: 'Nombre A-Z' },
      { value: 'nombre_desc', label: 'Nombre Z-A' },
      { value: 'precio_asc', label: 'Precio (Menor a mayor)' },
      { value: 'precio_desc', label: 'Precio (Mayor a menor)' },
      { value: 'fecha_asc', label: 'Fecha (Antigua a reciente)' },
      { value: 'fecha_desc', label: 'Fecha (Reciente a antigua)' }
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', padding: '6px 10px' }}>
        <FaSortAmountDownAlt style={{ color: '#94a3b8', marginRight: '6px' }} />
        <select value={sortOption} onChange={(e) => onSortChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: isMobile ? '12px' : '13px', fontWeight: '600', outline: 'none', cursor: 'pointer' }}>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    );
  };
  SortSelector.propTypes = {
    sortOption: PropTypes.string.isRequired,
    onSortChange: PropTypes.func.isRequired,
    isMobile: PropTypes.bool
  };

  const EmptyState = ({ busqueda }) => (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '24px', border: '2px dashed #1e293b' }}>
      <FaRegQuestionCircle size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
      <p style={{ fontSize: '18px', fontWeight: '600', color: '#94a3b8' }}>{busqueda ? 'Sin resultados' : 'No hay activos registrados'}</p>
      <p style={{ fontSize: '14px', color: '#64748b' }}>{busqueda ? `No se encontraron activos que coincidan con "${busqueda}"` : 'Comienza agregando un nuevo activo desde el formulario'}</p>
    </div>
  );
  EmptyState.propTypes = { busqueda: PropTypes.string };

  const SkeletonLoader = ({ vistaModo, isMobile }) => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '24px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ background: '#1e293b', borderRadius: '20px', padding: '24px', animation: 'skeletonPulse 1.5s infinite', height: vistaModo === 'cards' ? '180px' : '80px' }}>
            <div style={{ background: '#334155', borderRadius: '8px', height: '16px', marginBottom: '8px', width: '60%' }} />
            <div style={{ background: '#334155', borderRadius: '8px', height: '16px', marginBottom: '8px', width: '80%' }} />
          </div>
        ))}
      </div>
    );
  };
  SkeletonLoader.propTypes = {
    vistaModo: PropTypes.string,
    isMobile: PropTypes.bool
  };

  const globalStyles = `
    @keyframes skeletonPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      border-color: #6366f1;
    }
    button:hover { opacity: 0.9; }
    select option { background: #1e293b; color: #f1f5f9; }
    input:focus, select:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important; }
    * { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
    *::-webkit-scrollbar { width: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  `;

  export default Inventario;