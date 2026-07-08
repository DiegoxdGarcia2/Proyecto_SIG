import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';

export const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }) => {
  const { token, role, username, companyId } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]); // Historial para la campana

  useEffect(() => {
    if (!token) return;

    let wsUrl = '';
    // Dependiendo del rol, nos conectamos al endpoint adecuado
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsBase = isLocal ? 'ws://localhost:8000' : 'wss://backend-6161081745.us-central1.run.app';
    if (role === 'tutor') {
      wsUrl = `${wsBase}/api/v1/ws/tutor/${username}`;
    } else {
      wsUrl = `${wsBase}/api/v1/ws/admin/${companyId}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Conectado a WebSocket en tiempo real.');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ALERT' || data.type === 'INFO') {
          // Mostrar Toast
          addAlert(data);
          // Agregar a la bandeja de notificaciones
          addNotification(data);
        }
      } catch (err) {
        console.error('Error parseando mensaje WS:', err);
      }
    };

    ws.onclose = () => {
      console.log('Desconectado del servidor WebSocket.');
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [token, role, username, companyId]);

  const addAlert = (alertData) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { ...alertData, id }]);
    // Auto remover después de 8 segundos
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 8000);
  };

  const addNotification = (notifData) => {
    const id = Date.now();
    setNotifications(prev => [
      { ...notifData, id, read: false },
      ...prev.slice(0, 9) // Mantener solo las últimas 10
    ]);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <WebSocketContext.Provider value={{ socket, notifications, markAllAsRead, clearNotifications }}>
      {children}
      {/* Toast Container */}
      <div className="toast-container">
        {alerts.map(alert => (
          <div key={alert.id} className={`toast-notification ${alert.type === 'ALERT' ? 'toast-danger' : 'toast-info'}`}>
            <div className="toast-content">
              <strong>{alert.event === 'GEOFENCE_EXIT' ? '⚠️ ALERTA DE SALIDA' : 'ℹ️ INGRESO'}</strong>
              <p>{alert.message}</p>
              <small>{new Date(alert.timestamp).toLocaleTimeString()}</small>
            </div>
            <button className="toast-close" onClick={() => removeAlert(alert.id)}>×</button>
          </div>
        ))}
      </div>
    </WebSocketContext.Provider>
  );
};
