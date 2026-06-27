import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../App';

export default function Sidebar() {
  const { logout, companyId, sidebarCollapsed, role } = useContext(AuthContext);

  const menuItems = [
    {
      name: 'Monitoreo en Vivo',
      path: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5M15 9h4.5M15 9l6-6M9 15v4.5M9 15H4.5M9 15l-6 6m12-6v4.5M15 15h4.5M15 15l6 6" />
        </svg>
      )
    },
    {
      name: 'Áreas Educativas',
      path: '/kindergartens',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.485h.008v.008h-.008v-.008zm.006 1.77h.008v.008h-.008V15m-.006-8.25h.008v.008h-.008V6.75zm0 1.77h.008v.008h-.008v-.008zm-9-1.77h.008v.008h-.008V6.75zm0 1.77h.008v.008h-.008v-.008zM4 19.5v-15a1.5 1.5 0 011.5-1.5h13A1.5 1.5 0 0120 4.5v15a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 19.5z" />
        </svg>
      )
    },
    {
      name: 'Tutores',
      path: '/tutors',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-5.493-.904a9.29 9.29 0 002.13 2.122m-2.13-2.122a9.309 9.309 0 014.124-7.92M6 10.5a3 3 0 11-6 0 3 3 0 016 0zm11.5 3a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      name: 'Niños y Hardware',
      path: '/children',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    },
    {
      name: 'Auditoría y Alertas',
      path: '/logs',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      )
    }
  ];

  // El profesor y el tutor sólo ven Monitoreo (Dashboard) y Auditoría (Logs)
  const filteredMenuItems = menuItems.filter(item => {
    if (role === 'teacher' || role === 'tutor') {
      return item.path === '/dashboard' || item.path === '/logs';
    }
    return true;
  });

  const sidebarWidth = sidebarCollapsed ? '80px' : '260px';

  return (
    <aside 
      className="glass-panel" 
      style={{ 
        width: sidebarWidth, 
        minWidth: sidebarWidth, 
        padding: sidebarCollapsed ? '1.5rem 0.75rem' : '1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem', 
        height: '100vh', 
        borderRadius: '0px', 
        borderLeft: 'none', 
        borderTop: 'none', 
        borderBottom: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      {/* Cabecera del Sidebar */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.25rem', 
          paddingBottom: '1.5rem', 
          borderBottom: '1px solid var(--glass-border)',
          alignItems: sidebarCollapsed ? 'center' : 'flex-start'
        }}
      >
        <h2 style={{ 
          background: 'linear-gradient(to right, #00f2fe, #4facfe)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          fontWeight: '700', 
          fontSize: sidebarCollapsed ? '1.25rem' : '1.4rem',
          transition: 'font-size 0.3s'
        }}>
          {sidebarCollapsed ? 'SIG' : 'SIG Preescolar'}
        </h2>
        {!sidebarCollapsed && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {role === 'teacher' ? 'Profesor' : `Panel SaaS: ${companyId}`}
          </span>
        )}
      </div>

      {/* Menú de Navegación */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {filteredMenuItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            title={sidebarCollapsed ? item.name : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              gap: sidebarCollapsed ? '0px' : '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-primary)',
              background: isActive ? 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)' : 'transparent',
              textDecoration: 'none',
              fontWeight: isActive ? '600' : '400',
              transition: 'all 0.2s'
            })}
          >
            {item.icon}
            {!sidebarCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Botón de Cerrar Sesión */}
      <button 
        onClick={logout} 
        className="btn btn-secondary" 
        style={{ 
          width: '100%', 
          justifyContent: 'center', 
          gap: sidebarCollapsed ? '0px' : '0.5rem',
          padding: sidebarCollapsed ? '0.75rem 0.5rem' : '0.75rem 1.5rem'
        }}
        title={sidebarCollapsed ? "Cerrar Sesión" : undefined}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        {!sidebarCollapsed && <span>Cerrar Sesión</span>}
      </button>
    </aside>
  );
}
