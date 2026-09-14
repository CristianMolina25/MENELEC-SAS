import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEnvelope, FaLock, FaShieldAlt } from "react-icons/fa";

function Login({ setUsuarioLogueado }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const host = window.location.hostname;
  
  // Detectar móvil para cambiar el diseño
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const API_URL = "/api/auth/login";

  const iniciarSesion = async () => {
    const emailLimpio = email.trim().toLowerCase();
    const passLimpia = password.trim();

    if (!emailLimpio || !passLimpia) {
      alert("Por favor, complete todos los campos.");
      return;
    }

    setCargando(true);
    try {
      const response = await axios.post(API_URL, { 
        email: emailLimpio, 
        password: passLimpia 
      });

      // ✅ Éxito: guardar token y usuario
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("usuarios", JSON.stringify(response.data));
        localStorage.setItem("role", response.data.rol);

        // Inyectar token en Axios global
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        setUsuarioLogueado(response.data);
      } else {
        alert("La respuesta del servidor no contiene token");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert("Credenciales incorrectas.");
      } else {
        alert("Error de servidor. ¿El backend está encendido?");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{...loginStyles.wrapper, flexDirection: isMobile ? 'column' : 'row'}}>
      
      {/* SECCIÓN VISUAL (Ocultamos o achicamos en móvil) */}
      <div style={{
        ...loginStyles.left, 
        padding: isMobile ? '40px 20px' : '0',
        flex: isMobile ? '0.4' : '1.2'
      }}>
        <div style={loginStyles.brandContent}>
          <div style={loginStyles.logoPlaceholder}>
             <img src="/LOGO.png" alt="MENELEC" style={{...loginStyles.logoImg, width: isMobile ? '80px' : '120px'}} />
          </div>
          <h1 style={{...loginStyles.brandTitle, fontSize: isMobile ? '35px' : '50px'}}>
            MENELEC<br/><span style={{fontWeight: '800', color: '#818cf8'}}>SAS</span>
          </h1>
          {!isMobile && <div style={loginStyles.brandDivider} />}
          <p style={loginStyles.brandTagline}>SISTEMA DE AUTOMATIZACION</p>
        </div>
      </div>

      {/* SECCIÓN DE FORMULARIO */}
      <div style={{...loginStyles.right, padding: isMobile ? '20px' : '0'}}>
        <div style={{...loginStyles.formCard, width: isMobile ? '100%' : '380px'}}>
          <div style={loginStyles.formHeader}>
            <FaShieldAlt size={isMobile ? 30 : 40} color="#818cf8" style={{marginBottom: '15px'}}/>
            <h2 style={loginStyles.formTitle}>Control de Acceso</h2>
            <p style={loginStyles.formSubtitle}>Nodo: {host}</p>
          </div>
          
          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>Correo Electrónico</label>
            <div style={loginStyles.inputWrapper}>
              <FaEnvelope style={loginStyles.icon} />
              <input 
                type="email" 
                placeholder="usuario@menelec.sas" 
                style={loginStyles.input} 
                value={email}
                autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={loginStyles.inputGroup}>
            <label style={loginStyles.label}>Contraseña</label>
            <div style={loginStyles.inputWrapper}>
              <FaLock style={loginStyles.icon} />
              <input 
                type="password" 
                placeholder="••••••••" 
                style={loginStyles.input} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={iniciarSesion} 
            style={{
                ...loginStyles.button,
                opacity: cargando ? 0.7 : 1,
                cursor: cargando ? 'not-allowed' : 'pointer'
            }}
            disabled={cargando}
          >
            {cargando ? "Autenticando..." : "Ingresar"}
          </button>

          <p style={loginStyles.footerText}>
            © 2026 MENELEC SAS
          </p>
        </div>
      </div>
    </div>
  );
}

const loginStyles = {
  wrapper: { display: "flex", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Inter', sans-serif" },
  left: { background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", display: "flex", justifyContent: "center", alignItems: "center", color: "white" },
  brandContent: { textAlign: 'center' },
  logoImg: { marginBottom: '20px', transition: '0.3s' },
  brandTitle: { fontWeight: "300", letterSpacing: "10px", lineHeight: "1", margin: 0 },
  brandDivider: { width: '60px', height: '4px', backgroundColor: '#818cf8', margin: '25px auto', borderRadius: '2px' },
  brandTagline: { fontSize: '10px', letterSpacing: '4px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  right: { flex: 1, backgroundColor: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center" },
  formCard: { padding: "30px", boxSizing: 'border-box' },
  formHeader: { textAlign: 'center', marginBottom: '30px' },
  formTitle: { color: '#f1f5f9', fontSize: '24px', fontWeight: '800', margin: '0' },
  formSubtitle: { color: '#64748b', fontSize: '12px', marginTop: '5px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', color: '#94a3b8', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' },
  inputWrapper: { display: "flex", alignItems: "center", backgroundColor: "#1e293b", borderRadius: "12px", padding: "12px 15px", border: '1px solid #334155' },
  icon: { color: "#475569", marginRight: "12px" },
  // IMPORTANTE: fontSize 16px para evitar el zoom en iOS
  input: { border: "none", background: "transparent", width: "100%", fontSize: "16px", outline: "none", color: '#f1f5f9' },
  button: { width: "100%", padding: "16px", backgroundColor: "#6366f1", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700", marginTop: "10px" },
  footerText: { textAlign: 'center', color: '#334155', fontSize: '10px', marginTop: '30px' }
};

export default Login;