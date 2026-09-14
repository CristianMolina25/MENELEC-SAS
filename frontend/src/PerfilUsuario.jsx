import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaSave,
  FaKey,
  FaSpinner,
  FaEdit,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
} from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';

function PerfilUsuario({ usuarioLogueado, setUsuarioLogueado }) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modoPassword, setModoPassword] = useState(false);
  const [perfilEditando, setPerfilEditando] = useState(false);

  useEffect(() => {
    if (usuarioLogueado) {
      setNombre(usuarioLogueado.nombre || '');
      setEmail(usuarioLogueado.email || '');
    }
  }, [usuarioLogueado]);

  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre no puede estar vacío', {
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
      });
      return;
    }
    setCargando(true);
    try {
      const res = await axios.put('/api/usuarios/actualizar-perfil', {
        nombre: nombre.trim(),
        email: email.trim(),
      });
      toast.success(res.data.mensaje || 'Perfil actualizado', {
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #10b981' },
      });
      setUsuarioLogueado((prev) => ({
        ...prev,
        nombre: nombre.trim(),
        email: email.trim(),
      }));
      // Actualizar localStorage
      const usuarioStorage = JSON.parse(localStorage.getItem('usuario') || '{}');
      usuarioStorage.nombre = nombre.trim();
      usuarioStorage.email = email.trim();
      localStorage.setItem('usuario', JSON.stringify(usuarioStorage));
      setPerfilEditando(false);
    } catch (err) {
      toast.error(err.response?.data || 'Error al actualizar perfil', {
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #ef4444' },
      });
    } finally {
      setCargando(false);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCargando(true);
    try {
      const res = await axios.put('/api/usuarios/cambiar-password', {
        oldPassword,
        newPassword,
      });
      toast.success(res.data.mensaje || 'Contraseña actualizada', {
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #10b981' },
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setModoPassword(false);
    } catch (err) {
      toast.error(err.response?.data || 'Error al cambiar contraseña', {
        style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #ef4444' },
      });
    } finally {
      setCargando(false);
    }
  };

  const cancelarEdicion = () => {
    setPerfilEditando(false);
    if (usuarioLogueado) {
      setNombre(usuarioLogueado.nombre || '');
      setEmail(usuarioLogueado.email || '');
    }
  };

  // Estilos condicionales para móvil
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: isMobile ? 'auto' : '80vh',
      padding: isMobile ? '16px' : '20px',
    },
    card: {
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(16px)',
      borderRadius: '32px',
      padding: isMobile ? '24px' : '40px',
      maxWidth: '700px',
      width: '100%',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(99, 102, 241, 0.05)',
    },
    profileHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'center' : 'center',
      marginBottom: '30px',
      flexWrap: 'wrap',
      gap: '16px',
      flexDirection: isMobile ? 'column' : 'row',
    },
    avatarWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexDirection: isMobile ? 'column' : 'row',
      width: '100%',
      textAlign: isMobile ? 'center' : 'left',
    },
    avatar: {
      width: isMobile ? '70px' : '80px',
      height: isMobile ? '70px' : '80px',
      borderRadius: '24px',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(124, 58, 237, 0.2))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid rgba(99, 102, 241, 0.3)',
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
    },
    userInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      alignItems: isMobile ? 'center' : 'flex-start',
    },
    userName: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: '800',
      color: '#f1f5f9',
      margin: 0,
    },
    userEmail: {
      fontSize: isMobile ? '12px' : '14px',
      color: '#94a3b8',
      fontFamily: "'JetBrains Mono', monospace",
    },
    roleBadge: {
      marginTop: '4px',
      background: 'rgba(99, 102, 241, 0.15)',
      padding: '3px 12px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      color: '#a5b4fc',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      width: 'fit-content',
    },
    editButton: {
      background: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '14px',
      padding: isMobile ? '10px' : '12px',
      color: '#a5b4fc',
      cursor: 'pointer',
      fontSize: '18px',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isMobile ? '44px' : 'auto',
      height: '44px',
    },
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: '700',
      color: '#e2e8f0',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    infoDisplay: {
      display: isMobile ? 'flex' : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
      gap: '8px 16px',
      alignItems: 'baseline',
      flexDirection: 'column',
    },
    infoLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#64748b',
    },
    infoValue: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#f1f5f9',
      padding: '8px 12px',
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: '10px',
      border: '1px solid #1e293b',
      width: '100%',
      boxSizing: 'border-box',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#94a3b8',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    input: {
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '14px',
      padding: isMobile ? '14px 16px' : '12px 16px',
      color: '#f1f5f9',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      fontFamily: "'Inter', sans-serif",
      width: '100%',
      boxSizing: 'border-box',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      flexDirection: isMobile ? 'column' : 'row',
      marginTop: '8px',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      border: 'none',
      borderRadius: '16px',
      padding: isMobile ? '14px 20px' : '12px 24px',
      color: '#fff',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
      width: isMobile ? '100%' : 'auto',
      minHeight: '44px',
    },
    btnSecondary: {
      background: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '16px',
      padding: isMobile ? '14px 20px' : '12px 24px',
      color: '#a5b4fc',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      width: isMobile ? '100%' : 'auto',
      minHeight: '44px',
    },
    divider: {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, #334155, transparent)',
      margin: '30px 0',
    },
  };

  return (
    <div style={styles.container}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
        }}
      />
      <div style={styles.card}>
        {/* Cabecera del perfil */}
        <div style={styles.profileHeader}>
          <div style={styles.avatarWrapper}>
            <div style={styles.avatar}>
              <FaUser size={isMobile ? 32 : 40} color="#818cf8" />
            </div>
            <div style={styles.userInfo}>
              <h2 style={styles.userName}>{usuarioLogueado?.nombre || 'Usuario'}</h2>
              <span style={styles.userEmail}>{usuarioLogueado?.email}</span>
              <div style={styles.roleBadge}>
                {usuarioLogueado?.rol === 'ADMIN' ? 'Administrador' : 'Usuario'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPerfilEditando(!perfilEditando)}
            style={styles.editButton}
            title="Editar perfil"
          >
            <FaEdit />
          </button>
        </div>

        {/* Formulario de información personal */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FaUser /> Información personal
          </h3>
          {!perfilEditando ? (
            <div style={styles.infoDisplay}>
              <p style={styles.infoLabel}>Nombre completo</p>
              <p style={styles.infoValue}>{usuarioLogueado?.nombre || '—'}</p>
              <p style={styles.infoLabel}>Correo electrónico</p>
              <p style={styles.infoValue}>{usuarioLogueado?.email || '—'}</p>
            </div>
          ) : (
            <form onSubmit={handleActualizarPerfil} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <FaUser /> Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  style={styles.input}
                  placeholder="Tu nombre"
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <FaEnvelope /> Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  placeholder="correo@menelec.com"
                  required
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  style={styles.btnSecondary}
                >
                  <FaTimesCircle /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  style={styles.btnPrimary}
                >
                  {cargando ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
                  Guardar cambios
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={styles.divider} />

        {/* Sección de cambio de contraseña */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FaShieldAlt /> Seguridad
          </h3>
          {!modoPassword ? (
            <button
              onClick={() => setModoPassword(true)}
              style={styles.btnSecondary}
              className="password-toggle-btn"
            >
              <FaKey /> Cambiar contraseña
            </button>
          ) : (
            <form
              onSubmit={handleCambiarPassword}
              style={styles.form}
            >
              <div style={styles.inputGroup}>
                <label style={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={styles.input}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setModoPassword(false)}
                  style={styles.btnSecondary}
                >
                  <FaTimesCircle /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  style={styles.btnPrimary}
                >
                  {cargando ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaLock />}
                  Actualizar contraseña
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Inyectar animaciones y estilos globales */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .password-toggle-btn {
          width: 100%;
          margin-top: 10px;
        }
        .password-toggle-btn:hover {
          background: rgba(99, 102, 241, 0.3) !important;
        }
        input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default PerfilUsuario;