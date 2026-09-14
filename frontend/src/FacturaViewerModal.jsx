// FacturaViewerModal.jsx
import React from 'react';
import { FaTimes, FaFileInvoiceDollar, FaCalculator } from 'react-icons/fa';

const FacturaViewerModal = ({ isOpen, onClose, invoiceData }) => {
  if (!isOpen || !invoiceData) return null;

  const { items = [], subtotal, iva, total, totalLetras, numeroFactura, fechaFactura, cliente, nit, cufe } = invoiceData;

  // Formateador de moneda
  const formatMoney = (val) => {
    if (val == null || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(val);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Cabecera */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <FaFileInvoiceDollar style={{ color: '#f59e0b', fontSize: '24px', flexShrink: 0 }} />
            <h3 style={headerTitle}>
              Factura {numeroFactura} – {fechaFactura}
            </h3>
          </div>
          <button onClick={onClose} style={closeBtn}><FaTimes /></button>
        </div>

        {/* Cuerpo con tabla */}
        <div style={bodyStyle}>
          {/* Metadatos resumidos (opcional) */}
          <div style={metaRow}>
            <span><strong>Cliente:</strong> {cliente}</span>
            <span><strong>NIT:</strong> {nit}</span>
          </div>

          {/* Tabla de ítems */}
          <div style={tableWrapper}>
            <table style={tableStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={{ ...thStyle, width: '40%', textAlign: 'left' }}>Descripción</th>
                  <th style={thStyle}>Tarifa %</th>
                  <th style={thStyle}>Cant.</th>
                  <th style={thStyle}>V. Unitario</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>V. Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={tbodyRow}>
                    <td style={{ ...tdStyle, textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }} title={item.descripcion}>
                      {item.descripcion}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.tarifa}%</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.cantidad}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMoney(item.valorUnitario)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{formatMoney(item.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div style={totalsContainer}>
            <div style={totalRow}><span>Subtotal:</span><span>{formatMoney(subtotal)}</span></div>
            <div style={totalRow}><span>IVA:</span><span>{formatMoney(iva)}</span></div>
            <div style={{ ...totalRow, fontWeight: '800', fontSize: '16px', borderTop: '1px solid #334155', paddingTop: '10px' }}>
              <span>Total:</span><span>{formatMoney(total)}</span>
            </div>
            {totalLetras && (
              <div style={totalLetrasStyle}>
                <FaCalculator size={12} style={{ marginRight: '6px', color: '#f59e0b' }} />
                {totalLetras}
              </div>
            )}
          </div>

          {/* CUFE (si existe) */}
          {cufe && (
            <div style={cufeBox}>
              <span style={{ fontWeight: '600', marginRight: '8px', color: '#64748b' }}>CUFE:</span>
              <span style={{ wordBreak: 'break-all', fontSize: '11px', color: '#94a3b8' }}>{cufe}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== ESTILOS ==========
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000
};

const modalStyle = {
  background: '#1e293b', borderRadius: '28px', width: '95%', maxWidth: '1100px',
  maxHeight: '88vh', overflow: 'hidden', border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px black', display: 'flex', flexDirection: 'column'
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '18px 24px', borderBottom: '1px solid #334155', background: '#0f172a'
};

const headerTitle = {
  margin: 0, color: '#f1f5f9', fontSize: '18px', fontWeight: 700,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
};

const closeBtn = {
  background: 'none', border: 'none', color: '#94a3b8',
  cursor: 'pointer', fontSize: '20px', flexShrink: 0
};

const bodyStyle = {
  padding: '20px', overflowY: 'auto', flex: 1, minHeight: 0
};

const metaRow = {
  display: 'flex', gap: '24px', marginBottom: '16px', color: '#94a3b8',
  fontSize: '13px', flexWrap: 'wrap'
};

const tableWrapper = {
  overflowX: 'auto',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.06)',
  marginBottom: '20px'
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', minWidth: '650px'
};

const theadRow = {
  background: '#0f172a'
};

const thStyle = {
  padding: '12px 16px',
  fontSize: '12px',
  color: '#64748b',
  fontWeight: 600,
  textTransform: 'uppercase',
  borderBottom: '1px solid #334155',
  whiteSpace: 'nowrap',
  textAlign: 'center'
};

const tbodyRow = {
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  transition: '0.2s'
};

const tdStyle = {
  padding: '10px 16px',
  fontSize: '13px',
  color: '#e2e8f0',
  textAlign: 'center',
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const totalsContainer = {
  background: '#0f172a',
  borderRadius: '14px',
  padding: '16px 20px',
  marginBottom: '20px'
};

const totalRow = {
  display: 'flex', justifyContent: 'space-between',
  padding: '6px 0', color: '#cbd5e1', fontSize: '14px'
};

const totalLetrasStyle = {
  marginTop: '12px',
  fontSize: '13px',
  color: '#94a3b8',
  fontStyle: 'italic',
  display: 'flex',
  alignItems: 'flex-start'
};

const cufeBox = {
  background: 'rgba(0,0,0,0.2)',
  borderRadius: '10px',
  padding: '10px 14px',
  wordBreak: 'break-all',
  fontSize: '12px',
  color: '#64748b',
  display: 'flex',
  alignItems: 'baseline'
};

export default FacturaViewerModal;