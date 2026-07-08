import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Contexto de Autenticación, Tema y Layout SaaS
export const AuthContext = createContext(null);

import { WebSocketProvider } from './context/WebSocketContext';

// Páginas y Componentes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Kindergartens from './pages/Kindergartens';
import Tutors from './pages/Tutors';
import Children from './pages/Children';
import Logs from './pages/Logs';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
  const [companyId, setCompanyId] = useState(localStorage.getItem('company_id') || null);
  const [username, setUsername] = useState(localStorage.getItem('admin_username') || null);
  const [role, setRole] = useState(localStorage.getItem('admin_role') || null);
  const [kindergartenId, setKindergartenId] = useState(localStorage.getItem('admin_kindergarten_id') || null);
  const [classroomId, setClassroomId] = useState(localStorage.getItem('admin_classroom_id') || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Configurar baseURL global para Axios
  axios.defaults.baseURL = 'http://localhost:8000/api/v1';

  // Aplicar tema guardado al iniciar o cambiar
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = (jwt, company, user, userRole, kId, cId) => {
    localStorage.setItem('admin_token', jwt);
    localStorage.setItem('company_id', company);
    localStorage.setItem('admin_username', user);
    localStorage.setItem('admin_role', userRole || 'admin');
    
    if (kId) {
      localStorage.setItem('admin_kindergarten_id', kId);
    } else {
      localStorage.removeItem('admin_kindergarten_id');
    }
    
    if (cId) {
      localStorage.setItem('admin_classroom_id', cId);
    } else {
      localStorage.removeItem('admin_classroom_id');
    }
    
    setToken(jwt);
    setCompanyId(company);
    setUsername(user);
    setRole(userRole || 'admin');
    setKindergartenId(kId || null);
    setClassroomId(cId || null);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setCompanyId(null);
    setUsername(null);
    setRole(null);
    setKindergartenId(null);
    setClassroomId(null);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Componente de Ruta Protegida
  const ProtectedRoute = ({ children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return (
      <div className="app-container" style={{ position: 'relative' }}>
        <Sidebar />
        <div className="main-content" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 9999 }}>
            <Navbar />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AuthContext.Provider value={{ 
      token, companyId, username, role, kindergartenId, classroomId, login, logout, 
      theme, toggleTheme, 
      sidebarCollapsed, toggleSidebar 
    }}>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route 
              path="/login" 
              element={token ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            <Route 
              path="/dashboard" 
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/kindergartens" 
              element={<ProtectedRoute><Kindergartens /></ProtectedRoute>} 
            />
            <Route 
              path="/tutors" 
              element={<ProtectedRoute><Tutors /></ProtectedRoute>} 
            />
            <Route 
              path="/children" 
              element={<ProtectedRoute><Children /></ProtectedRoute>} 
            />
            <Route 
              path="/logs" 
              element={<ProtectedRoute><Logs /></ProtectedRoute>} 
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </AuthContext.Provider>
  );
}
