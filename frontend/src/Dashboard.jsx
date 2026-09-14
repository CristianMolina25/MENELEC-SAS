import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { useMediaQuery } from 'react-responsive';
import GestionContabilidad from './GestionContabilidad';
import GestionSoporteDocumental from './GestionSoporteDocumental';
// GestionTesoreria eliminado
import {
  FaBuilding, FaFileAlt, FaTasks, FaUsers, FaUserCircle, FaEnvelope,
  FaUpload, FaPlusCircle, FaTrashAlt, FaSearch, FaSyncAlt, FaFilter,
  FaTimes, FaEye, FaChevronRight, FaDatabase, FaFolder, FaFolderOpen,
  FaSpinner, FaExclamationCircle, FaRegFileAlt, FaUser,
  FaFileContract, FaCalendarAlt, FaTable, FaFilePdf, FaFileWord, FaFileExcel,
  FaDownload, FaEdit
} from 'react-icons/fa';
import GestionPostventa from './GestionPostventa';
import GestionTablaControl from './GestionTablaControl';

// ====================== ESTILOS ======================
const styles = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' },
  header: { marginBottom: '32px' },
  headerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' },
  headerBadge: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.15)', backdropFilter: 'blur(4px)', padding: '6px 16px', borderRadius: '40px', fontSize: '12px', fontWeight: '600', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '12px' },
  headerTitle: { fontSize: '2.2rem', fontWeight: '800', color: '#f1f5f9', margin: 0, letterSpacing: '-0.02em' },
  headerAccent: { background: 'linear-gradient(135deg, #c084fc, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  headerSubtitle: { color: '#94a3b8', fontSize: '0.95rem', marginTop: '8px' },
  headerActions: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  btnPrimary: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', padding: '10px 20px', borderRadius: '40px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' },
  btnSecondary: { background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 20px', borderRadius: '40px', color: '#10b981', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  btnDanger: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '40px', color: '#f87171', cursor: 'pointer' },
  btnRefresh: { background: '#1e293b', border: '1px solid #334155', padding: '10px 14px', borderRadius: '40px', color: '#94a3b8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' },
  metricCard: { background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', borderRadius: '28px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s, border-color 0.2s', cursor: 'default' },
  filterToggle: { display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' },
  filterBtn: { background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '30px', padding: '8px 20px', color: '#cbd5e1', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  panelFiltros: { background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)', borderRadius: '28px', padding: '24px', marginBottom: '28px', border: '1px solid rgba(99, 102, 241, 0.3)' },
  filtrosGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' },
  filtroGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  filtroLabel: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' },
  filtroInput: { background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '10px 14px', color: '#f1f5f9', fontSize: '13px', outline: 'none' },
  filtroSelect: { background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '10px 14px', color: '#f1f5f9', fontSize: '13px', outline: 'none' },
  filtrosAcciones: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  btnLimpiar: { background: 'transparent', border: '1px solid #475569', borderRadius: '30px', padding: '8px 20px', color: '#94a3b8', cursor: 'pointer' },
  btnAplicar: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '30px', padding: '8px 24px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' },
  sectionControls: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  filterAreaContainer: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '40px', padding: '6px 16px' },
  filterAreaInput: { background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '13px', outline: 'none', width: '160px' },
  sortSelect: { background: '#0f172a', border: '1px solid #334155', borderRadius: '40px', padding: '6px 16px', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' },
  areasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' },
  noResults: { textAlign: 'center', padding: '80px 20px', color: '#64748b', background: 'rgba(15,23,42,0.5)', borderRadius: '28px', border: '1px dashed #334155' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modal: { background: '#1e293b', borderRadius: '32px', width: '90%', maxWidth: '500px', border: '1px solid #334155', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', background: '#0f172a', borderBottom: '1px solid #334155' },
  modalBody: { padding: '24px' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', background: '#0f172a', borderTop: '1px solid #334155' },
  modalBtnCancel: { background: '#334155', border: 'none', padding: '10px 20px', borderRadius: '30px', color: '#fff', cursor: 'pointer' },
  modalBtnAccept: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', padding: '10px 24px', borderRadius: '30px', color: '#fff', cursor: 'pointer', fontWeight: '600' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gap: '16px' },
  verArchivoBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: '#6366f120', border: '1px solid #6366f130', padding: '8px 16px', borderRadius: '10px', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s', whiteSpace: 'nowrap' },
};

// ====================== COMPONENTES AUXILIARES ======================
const KPICard = ({ icon, label, value, subtitle, color }) => (
  <div style={styles.metricCard}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '20px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color }}>{icon}</div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f1f5f9' }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>{label}</div>
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{subtitle}</div>
      </div>
    </div>
  </div>
);

const AreaCard = React.memo(({ area, esAdmin, onSelect, onDelete, hovered, setHovered }) => (
  <div
    style={{
      background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(12px)', borderRadius: '24px', padding: '20px',
      border: `1px solid ${hovered ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.06)'}`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: hovered ? 'translateY(-4px)' : 'translateY(0)'
    }}
    onMouseEnter={() => setHovered(area.id)}
    onMouseLeave={() => setHovered(null)}
    onClick={() => onSelect(area.nombre)}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}><FaFolder size={22} /></div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>{area.nombre}</h3>
        </div>
      </div>
      {esAdmin && <button onClick={(e) => { e.stopPropagation(); onDelete(area.nombre); }} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}><FaTrashAlt size={14} /></button>}
    </div>
    <div style={{ marginTop: '16px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <FaUserCircle size={28} color="#94a3b8" />
      <div>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0' }}>{area.responsable}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{area.email || 'Sin email'}</div>
      </div>
      {area.miembros > 1 && <span style={{ marginLeft: 'auto', background: 'rgba(99, 102, 241, 0.2)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', color: '#a5b4fc' }}>+{area.miembros - 1}</span>}
    </div>

    <button style={{ width: '100%', marginTop: '20px', background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(99,102,241,0.1))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '40px', padding: '10px', color: '#a5b4fc', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onSelect(area.nombre)}><FaEye /> Ver área completa <FaChevronRight size={12} /></button>
  </div>
));

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Eliminar" }) => {
  if (!isOpen) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}><h3 style={{ margin: 0, color: '#f1f5f9' }}>{title}</h3><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FaTimes /></button></div>
        <div style={styles.modalBody}><p style={{ color: '#e2e8f0' }}>{message}</p></div>
        <div style={styles.modalFooter}><button onClick={onClose} style={styles.modalBtnCancel}>Cancelar</button><button onClick={onConfirm} style={{ ...styles.modalBtnAccept, background: '#ef4444' }}>{confirmText}</button></div>
      </div>
    </div>
  );
};

const PromptModal = ({ isOpen, onClose, onConfirm, title, placeholder, value, setValue }) => {
  if (!isOpen) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}><h3 style={{ margin: 0, color: '#f1f5f9' }}>{title}</h3><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FaTimes /></button></div>
        <div style={styles.modalBody}><input type="text" placeholder={placeholder} value={value} onChange={e => setValue(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', color: '#fff' }} autoFocus /></div>
        <div style={styles.modalFooter}><button onClick={onClose} style={styles.modalBtnCancel}>Cancelar</button><button onClick={() => { onConfirm(); onClose(); }} style={styles.modalBtnAccept}>Crear</button></div>
      </div>
    </div>
  );
};

const ModalResultadosBusqueda = ({
  mostrarModalResultados,
  setMostrarModalResultados,
  busquedaTexto,
  resultadosBusqueda,
  resultadosServicios,
  resultadosCarpetas,
  resultadosTotal,
  resultadosTablaControl = [],
  onSelectTablaControl,
  resultadosPage,
  onSelectArea,
  onSelectCarpeta,
  handleEditarDocumento,
  handleDescargarDocumento,
  getIconoTipoArchivo,
  onExportarCSV,
  onCargarMas
}) => {
  const [tabActiva, setTabActiva] = useState('documentos');
  const [cargandoMas, setCargandoMas] = useState(false);

  const extraerMetadato = (doc, campo) => {
    try {
      if (doc.metadatosJson && doc.metadatosJson !== '{}') {
        const meta = JSON.parse(doc.metadatosJson);
        return meta[campo] || '';
      }
    } catch (e) {}
    return '';
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-CO');
    } catch (e) {
      return fechaStr;
    }
  };

  const handleCargarMas = async () => {
    setCargandoMas(true);
    await onCargarMas();
    setCargandoMas(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={() => setMostrarModalResultados(false)}>
      <div style={{ ...styles.modal, maxWidth: '1000px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaSearch style={{ color: '#818cf8', fontSize: '20px' }} />
            <h3 style={{ margin: 0, color: '#f1f5f9' }}>
              Resultados de búsqueda
              {busquedaTexto && (
                <span style={{ fontWeight: 'normal', fontSize: '14px', color: '#94a3b8', marginLeft: '8px' }}>
                  "{busquedaTexto}"
                </span>
              )}
            </h3>
          </div>
          <button onClick={() => setMostrarModalResultados(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '0 20px', borderBottom: '1px solid #334155', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button onClick={() => setTabActiva('documentos')} style={{ padding: '12px 4px', background: 'none', border: 'none', color: tabActiva === 'documentos' ? '#818cf8' : '#64748b', borderBottom: tabActiva === 'documentos' ? '2px solid #818cf8' : 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Documentos ({resultadosBusqueda.length})
            </button>
            <button onClick={() => setTabActiva('servicios')} style={{ padding: '12px 4px', background: 'none', border: 'none', color: tabActiva === 'servicios' ? '#818cf8' : '#64748b', borderBottom: tabActiva === 'servicios' ? '2px solid #818cf8' : 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Servicios ({resultadosServicios.length})
            </button>
            <button onClick={() => setTabActiva('carpetas')} style={{ padding: '12px 4px', background: 'none', border: 'none', color: tabActiva === 'carpetas' ? '#818cf8' : '#64748b', borderBottom: tabActiva === 'carpetas' ? '2px solid #818cf8' : 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Carpetas Contabilidad ({resultadosCarpetas.length})</button>
            <button onClick={() => setTabActiva('tablaControl')} style={{ padding: '12px 4px', background: 'none', border: 'none', color: tabActiva === 'tablaControl' ? '#818cf8' : '#64748b', borderBottom: tabActiva === 'tablaControl' ? '2px solid #818cf8' : 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Tabla de Control ({resultadosTablaControl.length})
            </button>
          </div>

          {tabActiva === 'documentos' && resultadosBusqueda.length > 0 && (
            <button onClick={onExportarCSV} style={styles.btnSecondary}>
              📎 Exportar CSV
            </button>
          )}
        </div>

        <div style={{ ...styles.modalBody, maxHeight: '55vh', overflowY: 'auto', padding: '16px' }}>
          {tabActiva === 'documentos' && (
            resultadosBusqueda.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <FaRegFileAlt size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No se encontraron documentos que coincidan</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {resultadosBusqueda.map((doc, idx) => {
                    const modulo = extraerMetadato(doc, 'modulo') || (doc.ruta ? doc.ruta.split('/')[0] : '') || doc.tipoDocumento || '';
                    const cliente = extraerMetadato(doc, 'cliente') || '';
                    const numeroRef = extraerMetadato(doc, 'numeroReferencia') || '';
                    const contrato = extraerMetadato(doc, 'contratoOC') || '';
                    const fechaDoc = extraerMetadato(doc, 'fechaDocumento') || '';
                    const tipoDoc = doc.tipoDocumento || 'Documento';
                    return (
                      <div key={doc.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '24px', flexShrink: 0 }}>{getIconoTipoArchivo(doc.nombre)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <strong style={{ color: '#f1f5f9', fontSize: '15px' }}>{doc.nombre}</strong>
                              {tipoDoc && tipoDoc !== 'OTRO' && (
                                <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '600' }}>
                                  {tipoDoc}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FaFolderOpen size={10} />{doc.ruta}
                            </div>
                          </div>
                        </div>
                        {(modulo || numeroRef || cliente || contrato || fechaDoc) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '12px' }}>
                            {modulo && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}><FaBuilding size={11} style={{ color: '#818cf8' }} /><span style={{ color: '#64748b' }}>Módulo:</span> {modulo}</div>}
                            {numeroRef && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}><FaFileAlt size={11} style={{ color: '#818cf8' }} /><span style={{ color: '#64748b' }}>N° Ref:</span> {numeroRef}</div>}
                            {cliente && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}><FaUser size={11} style={{ color: '#818cf8' }} /><span style={{ color: '#64748b' }}>Cliente:</span> {cliente}</div>}
                            {contrato && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}><FaFileContract size={11} style={{ color: '#818cf8' }} /><span style={{ color: '#64748b' }}>Contrato/OC:</span> {contrato}</div>}
                            {fechaDoc && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px' }}><FaCalendarAlt size={11} style={{ color: '#818cf8' }} /><span style={{ color: '#64748b' }}>Fecha:</span> {formatearFecha(fechaDoc)}</div>}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => { const partes = doc.ruta.split('/'); const area = partes[0]; if (area) { onSelectArea(area); setMostrarModalResultados(false); } else { toast.error('No se pudo determinar el área'); } }} style={styles.verArchivoBtn}><FaEye /> Ver área</button>
                          {handleEditarDocumento && <button onClick={() => handleEditarDocumento(doc)} style={{ ...styles.verArchivoBtn, background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981', color: '#6ee7b7' }}><FaEdit /> Editar</button>}
                          {handleDescargarDocumento && <button onClick={() => handleDescargarDocumento(doc)} style={{ ...styles.verArchivoBtn, background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', color: '#93c5fd' }}><FaDownload /> Descargar</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón de cargar más */}
                {resultadosTotal > resultadosBusqueda.length && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button onClick={handleCargarMas} disabled={cargandoMas} style={styles.btnPrimary}>
                      {cargandoMas ? <FaSpinner className="spin" /> : 'Cargar más resultados'}
                    </button>
                  </div>
                )}
              </>
            )
          )}

          {tabActiva === 'servicios' && (
            resultadosServicios.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <FaTable size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
                <p>No se encontraron servicios que coincidan</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                {resultadosServicios.map((item, idx) => {
                  const servicio = item.servicio;
                  const documento = item.documento;
                  const getEstadoColor = () => {
                    if (servicio.estado === 'CERRADO') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', icon: '🔒' };
                    if (servicio.estado === 'NO NECESITO') return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', icon: '⏭️' };
                    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: '✅' };
                  };
                  const estadoStyle = getEstadoColor();
                  return (
                    <div key={servicio.id} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', transition: 'all 0.3s', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'; e.currentTarget.style.boxShadow = '0 12px 24px -12px rgba(0, 0, 0, 0.5)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>📋</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <strong style={{ color: '#f1f5f9', fontSize: '16px' }}>{servicio.numeroContrato}</strong>
                            <span style={{ background: estadoStyle.bg, color: estadoStyle.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span>{estadoStyle.icon}</span> {servicio.estado || 'ABIERTO'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}><FaBuilding size={10} style={{ marginRight: '4px' }} />{servicio.equipo}</span>
                            {documento && <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}><FaFileAlt size={10} style={{ marginRight: '4px' }} />{documento.nombre.length > 30 ? documento.nombre.substring(0, 30) + '...' : documento.nombre}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📝</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '10px', color: '#64748b' }}>Detalle</div><div style={{ fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={servicio.detalleServicio}>{servicio.detalleServicio}</div></div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>💰</div><div><div style={{ fontSize: '10px', color: '#64748b' }}>Costo</div><div style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>${servicio.costo?.toLocaleString()}</div></div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📅</div><div><div style={{ fontSize: '10px', color: '#64748b' }}>Fecha Solicitud</div><div style={{ fontSize: '13px', color: '#e2e8f0' }}>{servicio.fechaSolicitud}</div></div></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '28px', height: '28px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🛡️</div><div><div style={{ fontSize: '10px', color: '#64748b' }}>Vence Garantía</div><div style={{ fontSize: '13px', fontWeight: '500', color: servicio.vigenciaGarantia < new Date().toISOString().split('T')[0] ? '#f87171' : '#e2e8f0' }}>{servicio.vigenciaGarantia}{servicio.vigenciaGarantia < new Date().toISOString().split('T')[0] && <span style={{ marginLeft: '6px', fontSize: '10px' }}>⚠️ Vencida</span>}</div></div></div>
                      </div>
                      <button onClick={() => { if (documento) { const partes = documento.ruta.split('/'); const area = partes[0]; if (area) { onSelectArea(area); setMostrarModalResultados(false); } } else { toast.error('Documento padre no encontrado'); } }} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', opacity: documento ? 1 : 0.5 }} disabled={!documento}><FaEye size={14} /> Ver documento</button>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {tabActiva === 'carpetas' && (
            resultadosCarpetas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <FaFolderOpen size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No se encontraron carpetas en Contabilidad</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resultadosCarpetas.map(carpeta => (
                  <div key={carpeta.ruta} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <FaFolderOpen size={28} color="#f59e0b" />
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{carpeta.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{carpeta.ruta}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', textAlign: 'right' }}>
                      <button onClick={() => onSelectCarpeta(carpeta)} style={styles.verArchivoBtn}>
                        <FaEye /> Ver carpeta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          {tabActiva === 'tablaControl' && (
            resultadosTablaControl.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <FaTable size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>No se encontraron registros en Tabla de Control</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resultadosTablaControl.map(item => (
                  <div key={item.id} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#f1f5f9' }}>{item.numeroProceso}</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8' }}>{item.entidad}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{item.objeto?.substring(0, 100)}...</div>
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', marginTop: '8px', display: 'inline-block' }}>
                        {item.tipo}
                      </span>
                    </div>
                    <button onClick={() => onSelectTablaControl(item)} style={styles.verArchivoBtn}>
                      <FaEye /> Ver
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div style={styles.modalFooter}>
          <button onClick={() => setMostrarModalResultados(false)} style={styles.modalBtnCancel}>Cerrar</button>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {tabActiva === 'documentos' 
              ? `${resultadosBusqueda.length} de ${resultadosTotal} documentos` 
              : `${resultadosServicios.length} servicios`}
          </span>
        </div>
      </div>
    </div>
  );
};

// ====================== DASHBOARD PRINCIPAL ======================
function Dashboard({ onSelectArea, onOpenEditor }) {
  const [stats, setStats] = useState({ totalAreas: 0, totalDocumentos: 0, totalResponsables: 0 });
  const [areas, setAreas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarPostventa, setMostrarPostventa] = useState(false);
  const [mostrarTablaControl, setMostrarTablaControl] = useState(false);
  const [modalNuevaArea, setModalNuevaArea] = useState(false);
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState('');
  const [mostrarContabilidad, setMostrarContabilidad] = useState(false);
  const [areaAEliminar, setAreaAEliminar] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [resultadosServicios, setResultadosServicios] = useState([]);
  const [mostrarSoporteDocumental, setMostrarSoporteDocumental] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [resultadosPage, setResultadosPage] = useState(1);
  const [resultadosTotal, setResultadosTotal] = useState(0);
  const [mostrarModalResultados, setMostrarModalResultados] = useState(false);
  const [filtroBusquedaAreas, setFiltroBusquedaAreas] = useState('');
  const [ordenAreas, setOrdenAreas] = useState('docs_desc');
  const [resultadosTablaControl, setResultadosTablaControl] = useState([]);
  const [metadataIdTablaControl, setMetadataIdTablaControl] = useState(null);
  const [tablaControlInicial, setTablaControlInicial] = useState(null);
  const [contabilidadLocation, setContabilidadLocation] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [resultadosCarpetasConta, setResultadosCarpetasConta] = useState([]);
  const [customModulos, setCustomModulos] = useState(() => { try { return JSON.parse(localStorage.getItem('customModulos') || '[]'); } catch { return []; } });
  const [customTiposDocumento, setCustomTiposDocumento] = useState(() => { try { return JSON.parse(localStorage.getItem('customTiposDocumento') || '[]'); } catch { return []; } });
  // Estado mostrarTesoreria eliminado
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdmin = usuario.rol === 'ADMIN';
  const isMobile = useMediaQuery({ maxWidth: 768 });

  useEffect(() => { localStorage.setItem('customModulos', JSON.stringify(customModulos)); }, [customModulos]);
  useEffect(() => { localStorage.setItem('customTiposDocumento', JSON.stringify(customTiposDocumento)); }, [customTiposDocumento]);

  const navegarACarpetaContabilidad = (carpeta) => {
    setMostrarModalResultados(false);
    setContabilidadLocation({
      tipo: carpeta.tipo,
      anio: carpeta.anio,
      subcarpeta: carpeta.subcarpeta
    });
    setMostrarContabilidad(true);
  };

  const obtenerMetadataIdTablaControl = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/archivos/listar?ruta=Tabla de Control', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const excel = res.data?.find(f => !f.esCarpeta && f.nombre.endsWith('.xlsx'));
      if (excel?.metadataId) {
        setMetadataIdTablaControl(excel.metadataId);
      }
    } catch (err) {
      console.error('No se pudo obtener metadataId de Tabla de Control', err);
    }
  }, []);

  const realizarBusqueda = async (page = 1) => {
    if (!busquedaTexto.trim()) {
      toast.error('Ingrese un término de búsqueda');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const paramsDocs = { texto: busquedaTexto, page, limit: 10 };

      const [resDocs, resServicios, resConta, resTabla] = await Promise.all([
        axios.get('/api/archivos/buscar-documentos', { params: paramsDocs, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/archivos/buscar-servicios', { params: { texto: busquedaTexto }, headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/contabilidad/v2/buscar-carpetas', { params: { texto: busquedaTexto }, headers: { Authorization: `Bearer ${token}` } }),
        metadataIdTablaControl
          ? axios.get('/api/archivos/tabla-control/buscar', {
              params: { texto: busquedaTexto, metadataId: metadataIdTablaControl },
              headers: { Authorization: `Bearer ${token}` }
            })
          : Promise.resolve({ data: [] })
      ]);

      const docsData = resDocs.data.data || (Array.isArray(resDocs.data) ? resDocs.data : []);
      const total = resDocs.data.total ?? docsData.length;

      setResultadosBusqueda(docsData);
      setResultadosTotal(total);
      setResultadosServicios(Array.isArray(resServicios.data) ? resServicios.data : []);
      setResultadosCarpetasConta(resConta.data || []);
      setResultadosTablaControl(resTabla.data || []);
      setResultadosPage(page);
      setMostrarModalResultados(true);

      if (docsData.length === 0 && resServicios.data.length === 0 && resConta.data.length === 0 && resTabla.data.length === 0) {
        toast.info('Sin resultados');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error en la búsqueda');
    }
  };

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No hay sesión activa');
      setCargando(false);
      return;
    }

    const fetchSafe = async (url) => {
      try {
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    };

    const [nombresAreas, areasStats, usuarios, todasTareas] = await Promise.all([
      fetchSafe('/api/archivos/departamentos'),
      fetchSafe('/api/archivos/estadisticas-areas'),
      fetchSafe('/api/usuarios/listar'),
      fetchSafe('/api/tareas/listar'),
    ]);

    const totalResponsables = usuarios.filter(u => u.rol === 'USER').length;

    const areasPermitidas = new Set([
      'Soporte Documental',
      // 'Tesorería' eliminado
      'Contabilidad',
      'Postventa',
      'Tabla de Control'
    ]);

    let totalDocumentos = 0;
    const areasValidas = areasStats
      .filter(stat => stat && typeof stat === 'object' && areasPermitidas.has(stat.nombre))
      .map(stat => {
        totalDocumentos += stat.totalDocumentos || 0;
        const responsable = usuarios.find(u => u.area === stat.nombre)?.nombre || 'Sin asignar';
        const email = usuarios.find(u => u.area === stat.nombre)?.email || '';
        const miembros = usuarios.filter(u => u.area === stat.nombre).length;
        const utilizado = stat.totalDocumentos > 0 ? Math.min(100, Math.max(5, Math.floor(stat.totalDocumentos / 100) || 5)) : 0;
        return {
          id: stat.nombre,
          nombre: stat.nombre,
          responsable,
          email,
          miembros,
          totalDocumentos: stat.totalDocumentos || 0,
          porcentaje: 0,
          storageGB: stat.storageGB || '0 GB',
          utilizado,
          subcarpetas: Array.isArray(stat.subcarpetas) ? stat.subcarpetas : [],
        };
      });

    const areasEspeciales = [
      { nombre: 'Soporte Documental', id: 'Soporte Documental' },
      // { nombre: 'Tesorería', id: 'Tesorería' }, eliminado
      { nombre: 'Contabilidad', id: 'Contabilidad' },
      { nombre: 'Postventa', id: 'Postventa' },
      { nombre: 'Tabla de Control', id: 'Tabla de Control' }
    ];

    areasEspeciales.forEach(area => {
      if (!areasValidas.some(a => a.nombre === area.nombre)) {
        areasValidas.push({
          id: area.id,
          nombre: area.nombre,
          responsable: 'Administrador',
          email: '',
          miembros: 1,
          totalDocumentos: 0,
          porcentaje: 0,
          storageGB: '0 GB',
          utilizado: 0,
          subcarpetas: []
        });
      }
    });

    areasValidas.forEach(area => { area.porcentaje = totalDocumentos ? Math.round((area.totalDocumentos / totalDocumentos) * 100) : 0; });
    areasValidas.sort((a, b) => b.totalDocumentos - a.totalDocumentos);

    setAreas(areasValidas);
    setStats({ totalAreas: areasValidas.length, totalDocumentos, totalResponsables });
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDashboard();
    obtenerMetadataIdTablaControl();
  }, []);

  const handleEditarDocumento = (doc) => {
    if (onOpenEditor) { onOpenEditor(doc.ruta); setMostrarModalResultados(false); }
    else { toast.error('No se pudo abrir el editor.'); }
  };
  const handleDescargarDocumento = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/archivos/download', { params: { ruta: doc.ruta }, headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', doc.nombre); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      toast.success('Descarga iniciada');
    } catch { toast.error('Error al descargar'); }
  };

  const getIconoTipoArchivo = (nombre) => {
    const ext = nombre?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf color="#f87171" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord color="#6366f1" />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel color="#10b981" />;
    return <FaFileAlt color="#94a3b8" />;
  };

  const handleSelectArea = (areaNombre) => {
    if (areaNombre === 'Postventa') setMostrarPostventa(true);
    else if (areaNombre === 'Tabla de Control') setMostrarTablaControl(true);
    else if (areaNombre === 'Contabilidad') setMostrarContabilidad(true);
    // else if (areaNombre === 'Tesorería') setMostrarTesoreria(true);  // eliminado
    else if (areaNombre === 'Soporte Documental') setMostrarSoporteDocumental(true);
    else if (areaNombre === 'Inventario') onSelectArea('Inventario');
    else if (areaNombre === 'Mercado') onSelectArea('Mercado');
    else onSelectArea(areaNombre);
  };

  const crearNuevaArea = async () => {
    if (!nuevaAreaNombre.trim()) { toast.error('El nombre del área no puede estar vacío'); return; }
    try {
      await axios.post('/api/archivos/crear-carpeta', { categoria: '', nombre: nuevaAreaNombre.trim() }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success(`Área "${nuevaAreaNombre.trim()}" creada`);
      setModalNuevaArea(false); setNuevaAreaNombre(''); cargarDashboard();
    } catch { toast.error('Error al crear el área'); }
  };

  const eliminarArea = async () => {
    if (!areaAEliminar) return;
    try {
      await axios.delete('/api/archivos/eliminar', { params: { ruta: areaAEliminar }, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success(`Área "${areaAEliminar}" eliminada`);
      setAreaAEliminar(null); cargarDashboard();
    } catch { toast.error('Error al eliminar el área'); }
  };

  const limpiarHuerfanos = async () => {
    try {
      const res = await axios.delete('/api/archivos/limpiar-huerfanos', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success(`Se eliminaron ${res.data.cantidad} metadatos huérfanos`);
      cargarDashboard();
    } catch { toast.error('Error al limpiar'); }
  };

  const exportarResultadosCSV = () => {
    if (resultadosBusqueda.length === 0) return toast.error('No hay documentos para exportar');
    const headers = ['Nombre', 'Ruta', 'Módulo', 'Tipo', 'N° Referencia', 'Cliente', 'Contrato/OC', 'Fecha'];
    const rows = resultadosBusqueda.map(doc => {
      const meta = doc.metadatosJson ? JSON.parse(doc.metadatosJson) : {};
      return [
        doc.nombre,
        doc.ruta,
        meta.modulo || '',
        doc.tipoDocumento || '',
        meta.numeroReferencia || '',
        meta.cliente || '',
        meta.contratoOC || '',
        meta.fechaDocumento || ''
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'resultados_busqueda.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Exportación iniciada');
  };

  const areasFiltradas = useMemo(() => {
    const source = Array.isArray(areas) ? areas : [];
    let result = [...source];
    if (filtroBusquedaAreas.trim()) {
      const q = filtroBusquedaAreas.toLowerCase();
      result = result.filter(a => a.nombre.toLowerCase().includes(q) || a.responsable.toLowerCase().includes(q));
    }
    switch (ordenAreas) {
      case 'docs_desc': result.sort((a,b) => b.totalDocumentos - a.totalDocumentos); break;
      case 'docs_asc': result.sort((a,b) => a.totalDocumentos - b.totalDocumentos); break;
      case 'nombre_asc': result.sort((a,b) => a.nombre.localeCompare(b.nombre)); break;
      case 'nombre_desc': result.sort((a,b) => b.nombre.localeCompare(a.nombre)); break;
      default: break;
    }
    return result;
  }, [areas, filtroBusquedaAreas, ordenAreas]);

  if (mostrarPostventa) return <GestionPostventa onBack={() => setMostrarPostventa(false)} />;
  if (mostrarSoporteDocumental) {
    return <GestionSoporteDocumental onBack={() => setMostrarSoporteDocumental(false)} />;
  }

  // if (mostrarTesoreria) return <GestionTesoreria onBack={() => setMostrarTesoreria(false)} />;  // eliminado
  if (mostrarTablaControl) return (
    <GestionTablaControl
      onBack={() => {
        setMostrarTablaControl(false);
        setTablaControlInicial(null);
      }}
      initialVista={tablaControlInicial?.vista}
      initialBusqueda={tablaControlInicial?.filtro}
    />
  );
  if (mostrarContabilidad) return (
    <GestionContabilidad 
      onBack={() => setMostrarContabilidad(false)} 
      initialLocation={contabilidadLocation}
    />
  );

  if (cargando) return <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Cargando panel...</div>;
  if (error) return <div style={styles.errorContainer}><FaExclamationCircle size={48} color="#ef4444" /><h2 style={{ color: '#f1f5f9' }}>{error}</h2><button onClick={cargarDashboard} style={styles.btnPrimary}>Reintentar</button></div>;

  return (
    <div style={styles.container}>
      <Toaster position="bottom-right" />
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <div style={styles.headerBadge}><FaDatabase size={12} /> GESTOR DOCUMENTAL</div>
            <h1 style={styles.headerTitle}>Panel de Control <span style={styles.headerAccent}>{usuario.nombre?.split(' ')[0] || 'Admin'}</span></h1>
            <p style={styles.headerSubtitle}>Resumen general de todas las áreas y documentos</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={() => setShowUploadModal(true)} style={styles.btnPrimary}><FaUpload /> Subir archivo</button>
            <button onClick={() => setModalNuevaArea(true)} style={styles.btnSecondary}><FaPlusCircle /> Nueva área</button>
            <button onClick={limpiarHuerfanos} style={styles.btnDanger} title="Limpiar huérfanos">🧹</button>
            <button onClick={cargarDashboard} style={styles.btnRefresh}><FaSyncAlt /> Actualizar</button>
          </div>
        </div>
      </header>
      <div style={styles.metricsGrid}>
        <KPICard icon={<FaBuilding size={24} />} label="Áreas" value={stats.totalAreas} subtitle="Registradas" color="#818cf8" />
        <KPICard icon={<FaFileAlt size={24} />} label="Documentos" value={stats.totalDocumentos.toLocaleString()} subtitle="En todas las áreas" color="#10b981" />
        <KPICard icon={<FaUsers size={24} />} label="Responsables" value={stats.totalResponsables} subtitle="Usuarios activos" color="#ec4899" />
      </div>
      <div style={styles.filterToggle}>
        <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={styles.filterBtn}><FaFilter /> {mostrarFiltros ? 'Ocultar filtros' : 'Búsqueda avanzada'}</button>
      </div>
      {mostrarFiltros && (
        <div style={styles.panelFiltros}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaSearch style={{ color: '#818cf8' }} />
            <input
              type="text"
              value={busquedaTexto}
              onChange={e => setBusquedaTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && realizarBusqueda(1)}
              style={{ ...styles.filtroInput, flex: 1, fontSize: '15px', padding: '12px 16px' }}
              placeholder="Buscar en documentos, servicios y carpetas de Contabilidad..."
            />
            <button
              onClick={() => realizarBusqueda(1)}
              style={styles.btnAplicar}
            >
              <FaSearch style={{ marginRight: '6px' }} /> Buscar
            </button>
          </div>
          {busquedaTexto && (
            <button
              onClick={() => setBusquedaTexto('')}
              style={{ ...styles.btnLimpiar, marginTop: '12px', alignSelf: 'flex-start' }}
            >
              <FaTimes style={{ marginRight: '6px' }} /> Limpiar
            </button>
          )}
        </div>
      )}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}><FaBuilding style={{ color: '#818cf8' }} /> Áreas del sistema</h2>
        <div style={styles.sectionControls}>
          <div style={styles.filterAreaContainer}><FaFilter size={12} color="#64748b" /><input type="text" placeholder="Filtrar áreas..." value={filtroBusquedaAreas} onChange={e => setFiltroBusquedaAreas(e.target.value)} style={styles.filterAreaInput} />{filtroBusquedaAreas && <FaTimes style={{ cursor: 'pointer' }} onClick={() => setFiltroBusquedaAreas('')} />}</div>
          <select value={ordenAreas} onChange={e => setOrdenAreas(e.target.value)} style={styles.sortSelect}><option value="docs_desc">Más documentos ↑</option><option value="docs_asc">Menos documentos ↓</option><option value="nombre_asc">Nombre A-Z</option><option value="nombre_desc">Nombre Z-A</option></select>
        </div>
      </div>
      <div style={styles.areasGrid}>
        {areasFiltradas.length === 0 ? <div style={styles.noResults}>No se encontraron áreas</div> :
          areasFiltradas.map(area => area ? <AreaCard key={area.id || area.nombre} area={area} esAdmin={esAdmin} onSelect={handleSelectArea} onDelete={setAreaAEliminar} hovered={hoveredArea === area.id} setHovered={setHoveredArea} /> : null)
        }
      </div>
      <PromptModal isOpen={modalNuevaArea} onClose={() => setModalNuevaArea(false)} onConfirm={crearNuevaArea} title="Crear nueva área" placeholder="Nombre del área" value={nuevaAreaNombre} setValue={setNuevaAreaNombre} />
      <ConfirmModal isOpen={!!areaAEliminar} onClose={() => setAreaAEliminar(null)} onConfirm={eliminarArea} title="Confirmar eliminación" message={`¿Eliminar el área "${areaAEliminar}"? Se borrarán todos sus documentos.`} confirmText="Eliminar" />
      {mostrarModalResultados && (
        <ModalResultadosBusqueda
          mostrarModalResultados={mostrarModalResultados}
          setMostrarModalResultados={setMostrarModalResultados}
          busquedaTexto={busquedaTexto}
          resultadosBusqueda={resultadosBusqueda}
          resultadosServicios={resultadosServicios}
          resultadosTotal={resultadosTotal}
          resultadosPage={resultadosPage}
          onSelectArea={handleSelectArea}
          resultadosCarpetas={resultadosCarpetasConta}
          onSelectCarpeta={navegarACarpetaContabilidad}
          handleEditarDocumento={handleEditarDocumento}
          handleDescargarDocumento={handleDescargarDocumento}
          getIconoTipoArchivo={getIconoTipoArchivo}
          onExportarCSV={exportarResultadosCSV}
          onCargarMas={() => realizarBusqueda(resultadosPage + 1)}
          resultadosTablaControl={resultadosTablaControl}
          onSelectTablaControl={(item) => {
            setMostrarTablaControl(true);
            setTablaControlInicial({
              vista: item.tipo === 'EN ESTUDIO' ? 'enEstudio' : item.tipo === 'PROPUESTAS' ? 'propuestas' : 'contratos',
              filtro: busquedaTexto
            });
            setMostrarModalResultados(false);
          }}
        />
      )}
      {showUploadModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}><h3 style={{ margin: 0, color: '#f1f5f9' }}>Subir archivo a área</h3><button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><FaTimes /></button></div>
            <div style={styles.modalBody}><p style={{ color: '#e2e8f0' }}>Funcionalidad de subida disponible desde el explorador de archivos.</p><p style={{ color: '#94a3b8' }}>Selecciona un área y luego ve a "Subir archivo".</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;