import React, { useState, useEffect, useRef } from 'react';

const PasswordPrompt = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [shake, setShake] = useState(false);
  const [hover, setHover] = useState({ cancel: false, verify: false });
  const styleInjected = useRef(false);

  // Inyecta la animación shake una sola vez en el DOM
  useEffect(() => {
    if (!styleInjected.current) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
      `;
      document.head.appendChild(style);
      styleInjected.current = true;
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Animación de entrada (fade + scale)
  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const handleVerify = () => {
    const stored = localStorage.getItem('admin_panel_password');
    const defaultPass = 'admin123';
    const validPassword = stored || defaultPass;

    if (password === validPassword) {
      if (!stored) localStorage.setItem('admin_panel_password', defaultPass);
      onSuccess();
    } else {
      setError('Contraseña incorrecta');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={styles.overlay}>
      <div
        style={{
          ...styles.modal,
          transform: visible ? 'scale(1)' : 'scale(0.9)',
          opacity: visible ? 1 : 0,
          animation: shake ? 'shake 0.4s ease' : 'none',
        }}
      >
        {/* Icono de candado */}
        <div style={styles.iconContainer}>
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#lockGradient)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <defs>
              <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="#0f172a" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" fill="#38bdf8" stroke="none" />
          </svg>
        </div>

        <h3 style={styles.title}>Acceso restringido</h3>
        <p style={styles.subtitle}>
          Ingresa la contraseña del panel de administración
        </p>

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          autoFocus
          style={{
            ...styles.input,
            borderColor: error ? '#f87171' : '#475569',
            boxShadow: error
              ? '0 0 0 3px rgba(248, 113, 113, 0.35)'
              : '0 0 0 0px transparent',
          }}
        />

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.buttonGroup}>
          <button
            onClick={onCancel}
            style={{
              ...styles.button,
              ...styles.cancelButton,
              transform: hover.cancel ? 'translateY(-1px)' : 'none',
              boxShadow: hover.cancel
                ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                : '0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={() => setHover((h) => ({ ...h, cancel: true }))}
            onMouseLeave={() => setHover((h) => ({ ...h, cancel: false }))}
          >
            Cancelar
          </button>
          <button
            onClick={handleVerify}
            style={{
              ...styles.button,
              ...styles.verifyButton,
              transform: hover.verify ? 'translateY(-1px)' : 'none',
              boxShadow: hover.verify
                ? '0 4px 14px rgba(56, 189, 248, 0.5)'
                : '0 2px 6px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={() => setHover((h) => ({ ...h, verify: true }))}
            onMouseLeave={() => setHover((h) => ({ ...h, verify: false }))}
          >
            Verificar
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '24px',
    padding: '36px 32px',
    width: '360px',
    maxWidth: '90vw',
    textAlign: 'center',
    color: '#f1f5f9',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  },
  iconContainer: {
    marginBottom: '16px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.2px',
    color: '#e2e8f0',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1.5px solid #475569',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    marginBottom: '8px',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    marginTop: '6px',
    textAlign: 'left',
    paddingLeft: '4px',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    flex: 1,
    padding: '12px 0',
    borderRadius: '12px',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    color: '#fff',
  },
  cancelButton: {
    background: 'rgba(71, 85, 105, 0.4)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
  },
  verifyButton: {
    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  },
};

export default PasswordPrompt;