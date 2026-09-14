import React from "react";
import { FaCalculator, FaBox, FaChartBar } from "react-icons/fa"; // agrégalo al inicio
import {
  FaHome,
  FaTasks,
  FaFolderOpen,
  FaUsers,
  FaSignOutAlt,
  FaChevronRight,
  FaUserCog
} from "react-icons/fa";

function Sidebar({ usuario, cerrarSesion, setVistaActiva, vistaActiva, menuAbierto, isMobile }) {
  

  const menuItems = [
    { id: "inicio", label: "Inicio", icon: <FaHome />, publico: true },
    { id: "archivos", label: "Procesos", icon: <FaFolderOpen />, publico: true },
    { id: "inventario", label: "Inventario", icon: <FaBox />, publico: true },
    { id: "mercado", label: "Mercado", icon: <FaChartBar />, publico: true },
    { id: "perfil", label: "Mi perfil", icon: <FaUserCog />, publico: true },
    { id: "admin", label: "Administración", icon: <FaUsers />, publico: false },
  ];

  // Clase para controlar la visibilidad en móvil
  const mobileClass = menuAbierto ? "sidebar-mobile-visible" : "sidebar-mobile-hidden";
  const sidebarClassName = isMobile ? mobileClass : "sidebar-desktop";
  return (
    <div className={window.innerWidth <= 768 ? mobileClass : "sidebar-desktop"}>
      <div className="sidebar-inner">
        <div className="brand-section">
          <div className="logo-circle">
            <img src="/LOGO.png" alt="MENELEC Logo" />
          </div>
          <h2 className="brand-title">
            MENELEC<span className="brand-dot">.</span>
          </h2>
        </div>

        <nav className="menu-list">
          <p className="menu-label">NAVEGACIÓN PRINCIPAL</p>
          {menuItems.map((item) => {
            if (item.publico || usuario?.rol === "ADMIN") {
              const isActive = vistaActiva === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => setVistaActiva(item.id)}
                >
                  <div className="icon-wrapper">{item.icon}</div>
                  <span className="nav-label">{item.label}</span>
                  {isActive && <FaChevronRight className="active-arrow" size={10} />}
                </button>
              );
            }
            return null;
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{usuario?.nombre?.charAt(0) || "U"}</div>
          <div>
            <div className="user-name">{usuario?.nombre || "Usuario"}</div>
            <div className="user-role">{usuario?.rol}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={cerrarSesion}>
          <FaSignOutAlt /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default Sidebar;