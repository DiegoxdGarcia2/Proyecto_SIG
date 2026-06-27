import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../App';

export default function Navbar() {
  const { username, companyId, theme, toggleTheme, sidebarCollapsed, toggleSidebar, role } = useContext(AuthContext);
  const location = useLocation();
  const isLight = theme === 'light';

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Panel de Monitoreo en Vivo';
      case '/kindergartens': return 'Gestión de Áreas Educativas';
      case '/tutors': return 'Gestión de Tutores';
      case '/children': return 'Niños y Dispositivos de Hardware';
      case '/logs': return 'Historial de Anomalías';
      default: return 'SIG Monitoreo Infantil';
    }
  };

  return (
    <header className="glass-panel" style={{ height: '70px', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      
      {/* Sección Izquierda: Botón de Colapso + Título de Página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleSidebar} 
          className="btn btn-secondary" 
          style={{ padding: '0.5rem', borderRadius: '8px', width: '38px', height: '38px', justifyContent: 'center' }}
          title={sidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
            {sidebarCollapsed ? (
              // Icono de flechas hacia afuera o menú hamburguesa
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
            ) : (
              // Menú hamburguesa tradicional
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>

        <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </h1>
      </div>
      
      {/* Sección Derecha: Modo Claro/Oscuro + Perfil Administrador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Botón de Modo Claro / Oscuro */}
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary" 
          style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', justifyContent: 'center' }}
          title={isLight ? "Cambiar a Modo Oscuro" : "Cambiar a Modo Claro"}
        >
          {isLight ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M3 12h2.25m13.5 0H21M5.757 5.757l1.591 1.591m9.193 9.193l1.591 1.591M12 18.75a6.75 6.75 0 110-13.5 6.75 6.75 0 010 13.5z" />
            </svg>
          )}
        </button>

        {/* Perfil del Administrador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
              {username}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
              Empresa: {companyId.toUpperCase()}
            </span>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-secondary), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--bg-primary)' }}>
            {username ? username.charAt(0).toUpperCase() : 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
