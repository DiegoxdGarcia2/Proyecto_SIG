import React, { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { useWebSocket } from '../context/WebSocketContext';

export default function Navbar() {
  const { username, companyId, theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useContext(AuthContext);
  const { notifications, markAllAsRead, clearNotifications } = useWebSocket() || { notifications: [] };
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const isLight = theme === 'light';

  const unreadCount = notifications.filter(n => !n.read).length;

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

  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      markAllAsRead?.();
    }
  };

  return (
    <header className="glass-panel" style={{ height: '70px', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'relative' }}>
      
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>

        <h1 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
          {getPageTitle()}
        </h1>
      </div>
      
      {/* Sección Derecha: Campana + Tema + Perfil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Campana de Notificaciones */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={handleToggleDropdown}
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', justifyContent: 'center', position: 'relative' }}
            title="Notificaciones de Alertas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            
            {/* Globo de Alertas No Leídas */}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: 'var(--danger)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px var(--danger)',
                animation: 'pulseAlarm 1.5s infinite'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Menú Desplegable (Dropdown) */}
          {showDropdown && (
            <div className="glass-panel" style={{
              position: 'absolute',
              top: '50px',
              right: '0px',
              width: '320px',
              maxHeight: '400px',
              zIndex: 9999, // Incrementado para quedar por encima de los mapas Leaflet
              display: 'flex',
              flexDirection: 'column',
              padding: '1rem',
              animation: 'modalFadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Alertas de Actividad</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => { clearNotifications?.(); setShowDropdown(false); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Limpiar todo
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1, maxHeight: '280px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.85rem' }}>
                    Sin notificaciones recientes.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: notif.type === 'ALERT' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                        borderLeft: `4px solid ${notif.type === 'ALERT' ? 'var(--danger)' : 'var(--success)'}`,
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: notif.type === 'ALERT' ? 'var(--danger)' : 'var(--success)' }}>
                          {notif.event === 'GEOFENCE_EXIT' ? '⚠️ Salida' : 'ℹ️ Retorno'}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
