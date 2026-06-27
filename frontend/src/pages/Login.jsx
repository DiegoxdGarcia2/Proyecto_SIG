import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';

export default function Login() {
  const { login, theme, toggleTheme } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Mostrar/Ocultar contraseña
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        // Registro de nueva empresa
        await axios.post('/auth/register', { username, password, company_id: companyId });
        setIsRegister(false);
        setError('Registro exitoso. Por favor inicia sesión.');
      } else {
        // Inicio de sesión unificado
        const res = await axios.post('/auth/login', { username, password });
        
        // Decodificar el token JWT manualmente en el frontend
        const tokenParts = res.data.access_token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        
        login(
          res.data.access_token, 
          payload.company_id, 
          payload.sub, 
          payload.role, 
          payload.kindergarten_id || null,
          payload.classroom_id || null
        );
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error inesperado. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
      
      {/* Botón flotante para Modo Oscuro/Claro */}
      <button 
        onClick={toggleTheme} 
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          padding: '0.75rem',
          borderRadius: '50%',
          cursor: 'pointer',
          boxShadow: 'var(--card-shadow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 100
        }}
        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      >
        {theme === 'dark' ? (
          // Icono Sol
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          // Icono Luna
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '2rem', background: 'linear-gradient(to right, #00f2fe, #7f00ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'bold' }}>
            SIG PREESCOLAR
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isRegister 
              ? 'Registra tu empresa en la plataforma SaaS' 
              : 'Ingresa tus credenciales de acceso unificado'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: error.includes('exitoso') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${error.includes('exitoso') ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '8px', color: error.includes('exitoso') ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isRegister && (
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID de la Empresa / Tenant</label>
              <input
                type="text"
                className="form-control"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="ej. guarderia-santa-cruz"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Identificador (Usuario / ID de Tutor)
            </label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. director, tutor_mama_123..."
              required
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                title={showPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
              >
                {showPassword ? (
                  // Icono Ojo Tachado (Ocultar)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Icono Ojo Abierto (Mostrar)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Procesando...' : isRegister ? 'Registrar Empresa' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>
            {isRegister ? '¿Ya tienes una cuenta?' : '¿Nueva empresa?'} &nbsp;
            <button
              onClick={() => { setError(''); setIsRegister(!isRegister); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {isRegister ? 'Inicia Sesión' : 'Regístrate aquí'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
