// src/GestionDocumental.jsx
import React, { useState } from 'react';
import { FaBuilding, FaFileInvoice, FaTasks, FaUsers } from 'react-icons/fa';

function GestionDocumental() {
  // Datos mock de áreas (como en la imagen)
  const [areas] = useState([
    { 
      nombre: 'Contabilidad', descripcion: 'Área financiera y contable', responsable: 'Ana López', email: 'analopez@sistema.com', telefono: '+57 300 123 4567',
      analitica: 3245, analisisPorc: 26, publico: 6, privado: 4, almacenamiento: 18, acciones: '68.3 GB', porcentajeUso: 27,
      miembros: 4, fechaCreacion: '12/01/2023'
    },
    { nombre: 'Jurídica', descripcion: 'Área legal y contratos', responsable: 'Juan Pérez', email: 'juanperez@sistema.com', analitica: 2987, analisisPorc: 24, publico: 4, privado: 3, almacenamiento: 15, acciones: '54.7 GB', porcentajeUso: 21 },
    { nombre: 'Administrativa', descripcion: 'Gestión administrativa', responsable: 'María González', email: 'mariagonzalez@sistema.com', analitica: 2310, analisisPorc: 19, publico: 5, privado: 2, almacenamiento: 12, acciones: '41.2 GB', porcentajeUso: 16 },
    { nombre: 'Compras', descripcion: 'Adquisiciones y compras', responsable: 'Carlos Ramírez', email: 'carlosramirez@sistema.com', analitica: 1856, analisisPorc: 15, publico: 3, privado: 2, almacenamiento: 9, acciones: '38.6 GB', porcentajeUso: 15 },
    { nombre: 'Financiera', descripcion: 'Planeación financiera', responsable: 'Pedro Martínez', email: 'pedromartinez@sistema.com', analitica: 1289, analisisPorc: 10, publico: 1, privado: 8, almacenamiento: 1, acciones: '28.4 GB', porcentajeUso: 11 },
    { nombre: 'Recursos Humanos', descripcion: 'Gestión de talento humano', responsable: 'Laura Torres', email: 'lauratorres@sistema.com', analitica: 456, analisisPorc: 4, publico: 1, privado: 1, almacenamiento: 4, acciones: '12.6 GB', porcentajeUso: 5 },
    { nombre: 'Mercadeo', descripcion: 'Marketing y comunicaciones', responsable: 'Diego Sánchez', email: 'diegosanchez@sistema.com', analitica: 215, analisisPorc: 2, publico: 0, privado: 2, almacenamiento: 0, acciones: '8.7 GB', porcentajeUso: 3 },
    { nombre: 'Tecnología', descripcion: 'Soporte y tecnología', responsable: 'Fernando Ruiz', email: 'fernandoruiz@sistema.com', analitica: 100, analisisPorc: 1, publico: 0, privado: 3, almacenamiento: 0, acciones: '3.9 GB', porcentajeUso: 2 }
  ]);

  const [selectedArea, setSelectedArea] = useState(areas[0]);

  const documentosPorTipo = [
    { tipo: 'Facturas', cantidad: 1245, porcentaje: 38 },
    { tipo: 'Reportes', cantidad: 856, porcentaje: 26 },
    { tipo: 'Contratos', cantidad: 643, porcentaje: 20 },
    { tipo: 'Estados Financieros', cantidad: 341, porcentaje: 10 },
    { tipo: 'Otros', cantidad: 160, porcentaje: 6 }
  ];

  const actividadReciente = [
    { accion: 'Se subió una nueva factura', archivo: 'Factura_ABC_2456.pdf', fecha: 'Hoy, 10:30 AM' },
    { accion: 'Tarea completada', archivo: 'Revisión de estados financieros', fecha: 'Ayer, 4:15 PM' },
    { accion: 'Documento editado en ONLYOFFICE', archivo: 'Informe_Mensual_Abril.docx', fecha: 'Ayer, 11:20 AM' }
  ];

  const totalAreas = areas.length;
  const totalDocumentos = areas.reduce((acc, a) => acc + a.analitica, 0);
  const tareasPendientes = 128;
  const responsables = areas.filter(a => a.responsable).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gestión Documental</h1>
        <p style={styles.subtitle}>Sistema Automatizado</p>
      </div>

      {/* Tarjetas */}
      <div style={styles.metricsGrid}>
        <MetricCard title="Total de Áreas" value={totalAreas} subtitle="Áreas registradas" icon={<FaBuilding />} color="#818cf8" />
        <MetricCard title="Documentos" value={totalDocumentos} subtitle="En todas las áreas" icon={<FaFileInvoice />} color="#34d399" />
        <MetricCard title="Tareas Pendientes" value={tareasPendientes} subtitle="Asignadas a áreas" icon={<FaTasks />} color="#fbbf24" />
        <MetricCard title="Responsables" value={responsables} subtitle="Usuarios responsables" icon={<FaUsers />} color="#f472b6" />
      </div>

      {/* Tabla de áreas */}
      <div style={styles.areasSection}>
        <h2>Áreas</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr><th>Área</th><th>Analítica</th><th>Análisis</th><th>Público</th><th>Privado</th><th>Almacenamiento</th><th>Acciones</th><th>Uso</th><th></th></tr>
            </thead>
            <tbody>
              {areas.map(area => (
                <tr key={area.nombre} style={styles.tableRow} onClick={() => setSelectedArea(area)}>
                  <td><strong>{area.nombre}</strong><br /><span style={styles.areaDesc}>{area.descripcion}</span></td>
                  <td>{area.analitica.toLocaleString()}</td>
                  <td>{area.analisisPorc}% del total</td>
                  <td>{area.publico}</td><td>{area.privado}</td><td>{area.almacenamiento}</td><td>{area.acciones}</td>
                  <td>
                    <div style={styles.progressSmall}><div style={{ width: `${area.porcentajeUso}%`, background: '#4f46e5', height: '6px', borderRadius: '3px' }}></div></div>
                    <span style={{ fontSize: '11px' }}>{area.porcentajeUso}% utilizado</span>
                   </td>
                  <td><button style={styles.detailBtn}>Ver detalles</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fila inferior */}
      <div style={styles.bottomGrid}>
        <div style={styles.detailCard}>
          <h3>Detalle del área</h3>
          {selectedArea && (
            <div>
              <h4>{selectedArea.nombre}</h4>
              <p>{selectedArea.descripcion}</p>
              <p><strong>Responsables:</strong> {selectedArea.responsable}</p>
              <p><strong>Correo:</strong> {selectedArea.email}</p>
              {selectedArea.telefono && <p><strong>Teléfono:</strong> {selectedArea.telefono}</p>}
              <p><strong>Miembros:</strong> {selectedArea.miembros || 4} usuarios</p>
              <p><strong>Fecha de creación:</strong> {selectedArea.fechaCreacion || '12/01/2023'}</p>
            </div>
          )}
        </div>

        <div style={styles.chartCard}>
          <h3>Documentos por tipo</h3>
          {documentosPorTipo.map(doc => (
            <div key={doc.tipo} style={styles.chartItem}>
              <span>{doc.tipo}</span>
              <div style={styles.chartBarBg}><div style={{ width: `${doc.porcentaje}%`, background: '#4f46e5', height: '8px', borderRadius: '4px' }}></div></div>
              <span>{doc.cantidad.toLocaleString()} ({doc.porcentaje}%)</span>
            </div>
          ))}
        </div>

        <div style={styles.activityCard}>
          <h3>Actividad reciente</h3>
          {actividadReciente.map((act, idx) => (
            <div key={idx} style={styles.activityItem}>
              <div><strong>{act.accion}</strong></div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>{act.archivo}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{act.fecha}</div>
            </div>
          ))}
          <button style={styles.viewAllBtn}>Ver toda la actividad</button>
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ title, value, subtitle, icon, color }) => (
  <div style={styles.metricCard}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>{title}</span>
      <span style={{ color, fontSize: '20px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '12px' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '12px', color: '#64748b' }}>{subtitle}</div>}
  </div>
);

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto' },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: '600', margin: 0 },
  subtitle: { color: '#94a3b8', marginTop: '4px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' },
  metricCard: { background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' },
  areasSection: { background: 'rgba(30, 41, 59, 0.4)', borderRadius: '24px', padding: '24px', marginBottom: '32px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableRow: { borderBottom: '1px solid #1e293b', cursor: 'pointer', transition: '0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } },
  areaDesc: { fontSize: '12px', color: '#94a3b8' },
  progressSmall: { backgroundColor: '#1e293b', borderRadius: '4px', width: '80px', marginBottom: '4px' },
  detailBtn: { background: 'transparent', border: '1px solid #4f46e5', borderRadius: '20px', padding: '4px 12px', color: '#a78bfa', cursor: 'pointer' },
  bottomGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '20px' },
  detailCard: { background: 'rgba(30, 41, 59, 0.5)', borderRadius: '20px', padding: '20px' },
  chartCard: { background: 'rgba(30, 41, 59, 0.5)', borderRadius: '20px', padding: '20px' },
  chartItem: { marginBottom: '12px' },
  chartBarBg: { background: '#1e293b', borderRadius: '8px', height: '8px', margin: '6px 0', width: '100%' },
  activityCard: { background: 'rgba(30, 41, 59, 0.5)', borderRadius: '20px', padding: '20px' },
  activityItem: { borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '12px' },
  viewAllBtn: { background: 'transparent', border: '1px solid #334155', borderRadius: '30px', padding: '8px 16px', color: '#cbd5e1', cursor: 'pointer', marginTop: '16px', width: '100%' }
};

export default GestionDocumental;