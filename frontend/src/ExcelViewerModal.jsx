// ExcelViewerModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FaTimes, FaTable, FaSpinner, FaSearch, FaFileExcel, FaDownload, FaEye, FaCalendarAlt, FaDollarSign, FaClipboardList, FaBuilding, FaFilter, FaRedoAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ExcelViewerModal = ({ isOpen, onClose, metadataId, fileName }) => {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [indexando, setIndexando] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const cargarServicios = async () => {
    if (!metadataId) return;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/archivos/servicios-postventa?metadataId=${metadataId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServicios(res.data);
    } catch (error) {
      toast.error('Error al cargar los servicios');
    } finally {
      setCargando(false);
    }
  };

  const indexarExcel = async () => {
    if (!metadataId) return;
    setIndexando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/archivos/indexar-excel?metadataId=${metadataId}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Se indexaron ${res.data.indexados} registros`);
      cargarServicios();
    } catch (error) {
      toast.error('Error al indexar el Excel');
    } finally {
      setIndexando(false);
    }
  };

  useEffect(() => {
    if (isOpen && metadataId) {
      cargarServicios();
      setBusquedaLocal('');
      setFiltroEstado('TODOS');
    }
  }, [isOpen, metadataId]);

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
        s.detalleServicio?.toLowerCase().includes(term)
      );
    }
    return resultado;
  }, [servicios, filtroEstado, busquedaLocal]);

  const totalServicios = servicios.length;
  const costoTotal = servicios.reduce((acc, s) => acc + (s.costo || 0), 0);
  const contratosUnicos = new Set(servicios.map(s => s.numeroContrato)).size;
  const serviciosAbiertos = servicios.filter(s => (s.estado || 'ABIERTO') === 'ABIERTO').length;

  if (!isOpen) return null;

  const badgeEstado = (estado) => {
    const est = estado || 'ABIERTO';
    switch (est) {
      case 'CERRADO': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', icon: '🔒' };
      case 'NO NECESITO': return { bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8', icon: '⏭️' };
      default: return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', icon: '✅' };
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <FaFileExcel style={{ color: '#10b981', fontSize: '24px', flexShrink: 0 }} />
            <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</h3>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', padding: '2px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
              {servicios.length} reg.
            </span>
          </div>
          <button onClick={onClose} style={closeBtn}><FaTimes /></button>
        </div>

        {/* Contenido */}
        <div style={bodyStyle}>
          {!cargando && servicios.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <FaTable size={64} style={{ opacity: 0.3, color: '#64748b', marginBottom: '20px' }} />
              <h4 style={{ color: '#e2e8f0', margin: '0 0 10px 0' }}>No hay servicios indexados</h4>
              <p style={{ color: '#64748b', margin: '0 0 20px 0' }}>Este archivo Excel aún no ha sido procesado.</p>
              <button 
                onClick={indexarExcel} 
                disabled={indexando}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '30px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                  transition: '0.2s'
                }}
              >
                {indexando ? <><FaSpinner className="spin" /> Indexando...</> : <><FaRedoAlt /> Indexar ahora</>}
              </button>
            </div>
          )}

          {cargando && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
              <FaSpinner className="spin" size={32} /> Cargando servicios...
            </div>
          )}

          {!cargando && servicios.length > 0 && (
            <>
              {/* Métricas rápidas */}
              <div style={metricsGrid}>
                <div style={metricCard}>
                  <div style={metricIconWrapper('#6366f1')}><FaClipboardList size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={metricValue}>{totalServicios}</div>
                    <div style={metricLabel}>Servicios</div>
                  </div>
                </div>
                <div style={metricCard}>
                  <div style={metricIconWrapper('#10b981')}><FaDollarSign size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={metricValue}>${costoTotal.toLocaleString()}</div>
                    <div style={metricLabel}>Costo total</div>
                  </div>
                </div>
                <div style={metricCard}>
                  <div style={metricIconWrapper('#f59e0b')}><FaBuilding size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={metricValue}>{contratosUnicos}</div>
                    <div style={metricLabel}>Contratos</div>
                  </div>
                </div>
                <div style={metricCard}>
                  <div style={metricIconWrapper('#3b82f6')}><FaEye size={18} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={metricValue}>{serviciosAbiertos}</div>
                    <div style={metricLabel}>Abiertos</div>
                  </div>
                </div>
              </div>

              {/* Filtros y búsqueda */}
              <div style={filterBar}>
                <div style={searchBox}>
                  <FaSearch color="#64748b" style={{ flexShrink: 0 }} />
                  <input 
                    placeholder="Buscar..." 
                    value={busquedaLocal}
                    onChange={e => setBusquedaLocal(e.target.value)}
                    style={searchInput}
                  />
                </div>
                <select 
                  value={filtroEstado} 
                  onChange={e => setFiltroEstado(e.target.value)}
                  style={selectFiltro}
                >
                  <option value="TODOS">Todos</option>
                  <option value="ABIERTO">✅ Abierto</option>
                  <option value="CERRADO">🔒 Cerrado</option>
                  <option value="NO NECESITO">⏭️ No necesito</option>
                </select>
              </div>

              {/* Grid de servicios */}
              <div style={gridServicios}>
                {serviciosFiltrados.map((s, idx) => {
                  const est = badgeEstado(s.estado);
                  return (
                    <div key={s.id} className="servicio-card" style={servicioCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', minWidth: 0 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.numeroContrato}>
                            {s.numeroContrato}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.equipo}>
                            {s.equipo}
                          </div>
                        </div>
                        <span style={{ background: est.bg, color: est.color, padding: '2px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                          <span>{est.icon}</span> {s.estado || 'ABIERTO'}
                        </span>
                      </div>
                      <div style={detalleGrid}>
                        <div style={detalleItem}>
                          <span style={detalleLabel}>📝 Detalle</span>
                          <span style={detalleValue} title={s.detalleServicio}>{s.detalleServicio}</span>
                        </div>
                        <div style={detalleItem}>
                          <span style={detalleLabel}>💰 Costo</span>
                          <span style={{ ...detalleValue, color: '#10b981', fontWeight: 600 }}>${s.costo?.toLocaleString()}</span>
                        </div>
                        <div style={detalleItem}>
                          <span style={detalleLabel}>📅 Solicitud</span>
                          <span style={detalleValue}>{s.fechaSolicitud}</span>
                        </div>
                        <div style={detalleItem}>
                          <span style={detalleLabel}>🛡️ Garantía</span>
                          <span style={{ ...detalleValue, color: s.vigenciaGarantia < new Date().toISOString().split('T')[0] ? '#f87171' : '#cbd5e1' }}>
                            {s.vigenciaGarantia}
                            {s.vigenciaGarantia < new Date().toISOString().split('T')[0] && ' ⚠️'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {serviciosFiltrados.length === 0 && servicios.length > 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No se encontraron servicios con esos filtros.</div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .servicio-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.4); border-color: rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
};

// Estilos
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
};
const modalStyle = {
  background: '#1e293b', borderRadius: '28px', width: '92%', maxWidth: '1100px',
  maxHeight: '88vh', overflow: 'hidden', border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px black', display: 'flex', flexDirection: 'column'
};
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '18px 24px', borderBottom: '1px solid #334155', background: '#0f172a',
  minWidth: 0
};
const closeBtn = { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px', flexShrink: 0 };
const bodyStyle = { padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0 };

const metricsGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px'
};
const metricCard = {
  background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', padding: '16px',
  display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.05)',
  overflow: 'hidden', minWidth: 0
};
const metricIconWrapper = (color) => ({
  width: '40px', height: '40px', borderRadius: '12px', background: `${color}20`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: color, flexShrink: 0
});
const metricValue = { fontSize: '20px', fontWeight: 800, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metricLabel = { fontSize: '12px', color: '#64748b' };

const filterBar = {
  display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap'
};
const searchBox = {
  display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '12px',
  padding: '8px 14px', border: '1px solid #334155', flex: 1, minWidth: '180px'
};
const searchInput = {
  border: 'none', background: 'none', outline: 'none', color: '#f1f5f9',
  fontSize: '13px', marginLeft: '8px', width: '100%', minWidth: 0
};
const selectFiltro = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
  padding: '8px 14px', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer',
  minWidth: '120px'
};

const gridServicios = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px'
};
const servicioCardStyle = {
  background: 'rgba(15, 23, 42, 0.8)', borderRadius: '18px', padding: '16px',
  border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.2s ease',
  overflow: 'hidden', minWidth: 0
};
const detalleGrid = {
  display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '12px',
  overflow: 'hidden'
};
const detalleItem = {
  display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, overflow: 'hidden'
};
const detalleLabel = {
  fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase'
};
const detalleValue = {
  fontSize: '13px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
};

export default ExcelViewerModal;