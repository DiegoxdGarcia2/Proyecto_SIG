import React, { useEffect, useState, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import { AuthContext } from '../App';

// Recentrar mapa dinámicamente
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.setView(coords[0], 14);
    }
  }, [coords, map]);
  return null;
}

export default function Dashboard() {
  const { token, companyId, theme, role, kindergartenId, classroomId, username } = useContext(AuthContext);
  const [kindergartens, setKindergartens] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [children, setChildren] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [tutorLogs, setTutorLogs] = useState([]);
  const socketRef = useRef(null);

  const isTutor = role === 'tutor';

  // 1. Cargar Kínders, Aulas, Niños y Logs iniciales
  useEffect(() => {
    const fetchData = async () => {
      const savedToken = token || localStorage.getItem('admin_token');
      if (!savedToken) return;

      try {
        // Asegurar que las cabeceras de Axios tengan el token al refrescar con F5
        const config = {
          headers: { Authorization: `Bearer ${savedToken}` }
        };

        const [kRes, clRes] = await Promise.all([
          axios.get('/kindergartens', config),
          axios.get('/classrooms', config)
        ]);
        setKindergartens(kRes.data);
        setClassrooms(clRes.data);
        
        // Cargar niños (filtrados automáticamente en backend)
        const childUrl = isTutor ? '/tutor/children' : '/children';
        const cRes = await axios.get(childUrl, config);
        const initialChildren = {};
        cRes.data.forEach(c => {
          if (c.device_id) {
            initialChildren[c.device_id] = c;
          }
        });
        setChildren(initialChildren);

        // Si es tutor, cargar logs históricos
        if (isTutor) {
          const lRes = await axios.get('/tutor/logs', config);
          setTutorLogs(lRes.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, [isTutor, token]);

  // 2. Auto-seleccionar el primer hijo si es tutor y no hay selección
  const childrenList = Object.values(children);
  useEffect(() => {
    if (isTutor && childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList, isTutor, selectedChildId]);

  // 3. Configurar WebSocket para tiempo real
  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsBase = isLocal ? 'ws://localhost:8000' : 'wss://backend-6161081745.us-central1.run.app';
    const wsUrl = isTutor
      ? `${wsBase}/api/v1/ws/tutor/${username}`
      : `${wsBase}/api/v1/ws/admin/${companyId}${role === 'director' ? `?kindergarten_id=${kindergartenId}` : ''}${role === 'teacher' ? `?classroom_id=${classroomId}` : ''}`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket recibido en Dashboard:", data);

        // Aceptar actualizaciones de ubicación directas (LOCATION_UPDATE)
        // y alertas del backend (ALERT o INFO con el evento GEOFENCE_EXIT o GEOFENCE_ENTER)
        const isLocationEvent = data.event === 'LOCATION_UPDATE';
        const isAlertOrInfo = data.type === 'ALERT' || data.type === 'INFO';

        if (isLocationEvent || isAlertOrInfo) {
          // Buscar al niño por device_id en el diccionario
          // Si el mensaje viene del backend como alerta, la estructura tiene data.child_id
          setChildren(prev => {
            let targetDeviceId = data.device_id;
            
            // Si el WS mandó child_id en vez de device_id, buscamos el dispositivo correspondiente
            if (!targetDeviceId && data.child_id) {
              const matched = Object.values(prev).find(c => c.id === data.child_id || c._id === data.child_id);
              if (matched) targetDeviceId = matched.device_id;
            }

            if (!targetDeviceId || !prev[targetDeviceId]) return prev;
            
            const child = prev[targetDeviceId];
            const newLocation = data.location || child.current_location;
            const newStatus = data.type === 'ALERT' ? 'ALARM' : (data.type === 'INFO' ? 'SAFE' : (data.status || child.status));

            return {
              ...prev,
              [targetDeviceId]: {
                ...child,
                status: newStatus,
                last_updated: data.timestamp || new Date().toISOString(),
                current_location: newLocation
              }
            };
          });

          // Si es alerta de salida (ALERT) o evento de alarma
          if (data.type === 'ALERT' || data.status === 'ALARM') {
            const childName = data.child_name || "Estudiante";
            const newAlert = {
              id: Date.now(),
              childName: childName,
              timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
              message: data.message || `¡El estudiante '${childName}' ha cruzado el perímetro de seguridad!`
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 10));

            if (isTutor) {
              axios.get('/tutor/logs').then(res => setTutorLogs(res.data)).catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Error al procesar mensaje de WebSocket en Dashboard:", err);
      }
    };

    ws.onclose = () => console.log('WebSocket de monitoreo cerrado.');
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [companyId, isTutor, username, role, kindergartenId, classroomId]);

  // Icono interactivo Leaflet
  const createDivIcon = (name, status) => {
    const isAlarm = status === 'ALARM';
    return L.divIcon({
      className: 'custom-gps-marker',
      html: `
        <div class="gps-marker-container ${isAlarm ? 'alarm' : 'safe'}">
          <div class="gps-marker-pulse"></div>
          <div class="gps-marker-dot"></div>
          <div class="gps-marker-label">${name}</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  // Obtener puntos centrales para el mapa
  const getMapCenter = () => {
    if (isTutor && selectedChildId) {
      const activeChild = childrenList.find(c => c.id === selectedChildId);
      const loc = activeChild?.current_location || activeChild?.location;
      if (loc && loc.coordinates) {
        return [[loc.coordinates[1], loc.coordinates[0]]];
      }
    }
    if (kindergartens.length > 0) {
      return kindergartens[0].geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
    }
    return [[-17.7833, -63.1821]]; // Santa Cruz de la Sierra
  };

  const selectedChild = childrenList.find(c => c.id === selectedChildId);
  const activeChildrenList = childrenList.filter(c => c.current_location || c.last_updated);

  // Helper para nombres de kínder y aula
  const getKinderName = (child) => {
    const k = kindergartens.find(x => x.id === child.kindergarten_id);
    return k ? k.name : 'No Asignado';
  };

  const getClassName = (child) => {
    const c = classrooms.find(x => x.id === child.classroom_id);
    return c ? c.name : 'Ninguno';
  };

  // --- RENDER PORTAL TUTOR (MÓVIL RESPONSIVE - SPLIT LAYOUT) ---
  if (isTutor) {
    return (
      <div className="tutor-layout animate-fade-in">
        <style>{`
          .tutor-layout {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 1.5rem;
            height: calc(100vh - 70px);
            overflow: hidden;
            padding: 1.5rem;
            box-sizing: border-box;
            background: var(--bg-primary);
          }
          .tutor-student-card {
            padding: 1rem;
            border-radius: 12px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            position: relative;
          }
          .tutor-student-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--card-shadow);
            border-color: var(--accent-primary);
          }
          .tutor-student-card.active {
            border-color: var(--accent-secondary);
            background: linear-gradient(135deg, rgba(0, 242, 254, 0.08), rgba(127, 0, 255, 0.08));
            box-shadow: 0 0 15px rgba(0, 242, 254, 0.15);
          }
          .status-dot-pulse {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
          }
          .status-dot-pulse.safe {
            background-color: var(--success);
            box-shadow: 0 0 8px var(--success);
          }
          .status-dot-pulse.alarm {
            background-color: var(--danger);
            box-shadow: 0 0 10px var(--danger);
            animation: statusPulse 1s infinite alternate;
          }
          @keyframes statusPulse {
            from { transform: scale(1); opacity: 1; }
            to { transform: scale(1.3); opacity: 0.6; }
          }
          .gps-marker-container {
            position: relative;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .gps-marker-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            z-index: 2;
          }
          .gps-marker-container.safe .gps-marker-dot {
            background-color: var(--success);
            box-shadow: 0 0 10px var(--success);
          }
          .gps-marker-container.alarm .gps-marker-dot {
            background-color: var(--danger);
            box-shadow: 0 0 10px var(--danger);
          }
          .gps-marker-pulse {
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            z-index: 1;
            animation: markerPulse 1.5s infinite ease-out;
          }
          .gps-marker-container.safe .gps-marker-pulse {
            background: rgba(16, 185, 129, 0.4);
          }
          .gps-marker-container.alarm .gps-marker-pulse {
            background: rgba(239, 68, 68, 0.4);
            animation: markerPulse 1s infinite ease-out;
          }
          @keyframes markerPulse {
            0% { transform: scale(0.5); opacity: 1; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .gps-marker-label {
            position: absolute;
            top: -22px;
            background: rgba(10, 14, 26, 0.85);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: nowrap;
            border: 1px solid var(--glass-border);
            font-weight: 500;
          }
          @media (max-width: 768px) {
            .tutor-layout {
              grid-template-columns: 1fr;
              grid-template-rows: 380px 1fr;
              overflow-y: auto;
              height: auto;
              padding: 1rem;
              gap: 1rem;
            }
          }
        `}</style>

        {/* Mapa Móvil */}
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
          <MapContainer 
            center={getMapCenter()[0]} 
            zoom={15} 
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              key={theme}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={theme === 'light' 
                ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
            />
            <MapRecenter coords={getMapCenter()} />

            {/* Perímetros Escolares */}
            {kindergartens.map(k => {
              const positions = k.geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
              return (
                <Polygon 
                  key={k.id} 
                  positions={positions} 
                  pathOptions={{ color: 'var(--accent-primary)', fillColor: 'var(--accent-secondary)', fillOpacity: 0.1, weight: 2 }}
                />
              );
            })}

            {/* Marcadores de todos los estudiantes a cargo */}
            {childrenList.map(c => {
              const loc = c.current_location || c.location;
              if (!loc || !loc.coordinates) return null;
              return (
                <Marker 
                  key={c.id} 
                  position={[loc.coordinates[1], loc.coordinates[0]]}
                  icon={createDivIcon(c.name, c.status)}
                >
                  <Popup>
                    <div style={{ color: '#0a0e1a' }}>
                      <strong>{c.name}</strong><br/>
                      Estado: {c.status === 'ALARM' ? 'Fuera de Límites' : 'Seguro'}<br/>
                      GPS: {c.device_id}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Panel Lateral de Control del Tutor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
          
          {/* Tarjeta de Lista de Estudiantes a Cargo */}
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A3.318 3.318 0 0111.75 22.5a3.318 3.318 0 01-3.25-3.263v-.11m0-11.584a9.337 9.337 0 00-.075 4.098c.075.76.241 1.488.486 2.165m-2.906-2.165a4.125 4.125 0 00-7.533 2.493 9.337 9.337 0 004.121.952c.883 0 1.728-.121 2.525-.347m-2.525-4.103a9.38 9.38 0 012.625-.372 9.337 9.337 0 014.121.952m-2.625-2.625c-.24-.24-.5-.45-.78-.633m0 0l-1.32-1.32a.75.75 0 00-1.06 0L5.3 4.7m6.7 4.3a9.338 9.338 0 00-2.625-3.033" />
              </svg>
              Estudiantes a Cargo
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
              {childrenList.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.9rem' }}>
                  No tienes estudiantes vinculados a tu cuenta de tutor.
                </div>
              ) : (
                childrenList.map(c => {
                  const isAlarm = c.status === 'ALARM';
                  const isSelected = selectedChildId === c.id;
                  const kName = getKinderName(c);
                  const clName = getClassName(c);
                  
                  return (
                    <div 
                      key={c.id} 
                      className={`tutor-student-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedChildId(c.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {c.name}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: '600' }}>
                          <span className={`status-dot-pulse ${isAlarm ? 'alarm' : 'safe'}`}></span>
                          {isAlarm ? '¡ALERTA!' : 'SEGURO'}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span><strong>Kínder:</strong> {kName}</span>
                        <span><strong>Aula:</strong> {clName}</span>
                        <span><strong>Edad:</strong> {c.age} años</span>
                        <span><strong>GPS:</strong> {c.device_id || 'Sin dispositivo'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Historial de Anomalías Exclusivo */}
          {selectedChild && (
            <div className="glass-panel" style={{ padding: '1.25rem', height: '240px', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Alertas: {selectedChild.name}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1 }}>
                {tutorLogs.filter(l => l.device_id === selectedChild.device_id).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No se han reportado alertas para este estudiante.
                  </div>
                ) : (
                  tutorLogs.filter(l => l.device_id === selectedChild.device_id).map(log => (
                    <div 
                      key={log.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '0.65rem 0.85rem', 
                        background: 'rgba(239,68,68,0.06)', 
                        borderColor: 'rgba(239,68,68,0.2)', 
                        borderRadius: '10px', 
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.2rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--danger)' }}>Salió de límites seguros</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER PERSONAL EDUCATIVO (ADMIN, DIRECTOR, PROFESOR) ---
  return (
    <div className="page-container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', height: 'calc(100vh - 70px)', overflow: 'hidden', padding: '1.5rem' }}>
      <style>{`
        .gps-marker-container {
          position: relative;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gps-marker-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          z-index: 2;
        }
        .gps-marker-container.safe .gps-marker-dot {
          background-color: var(--success);
          box-shadow: 0 0 10px var(--success);
        }
        .gps-marker-container.alarm .gps-marker-dot {
          background-color: var(--danger);
          box-shadow: 0 0 10px var(--danger);
        }
        .gps-marker-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          z-index: 1;
          animation: markerPulse 1.5s infinite ease-out;
        }
        .gps-marker-container.safe .gps-marker-pulse {
          background: rgba(16, 185, 129, 0.4);
        }
        .gps-marker-container.alarm .gps-marker-pulse {
          background: rgba(239, 68, 68, 0.4);
          animation: markerPulse 1s infinite ease-out;
        }
        @keyframes markerPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .gps-marker-label {
          position: absolute;
          top: -22px;
          background: rgba(10, 14, 26, 0.85);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          white-space: nowrap;
          border: 1px solid var(--glass-border);
          font-weight: 500;
        }
      `}</style>

      {/* Mapa */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <MapContainer 
          center={getMapCenter()[0]} 
          zoom={14} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={theme === 'light' 
              ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
          />
          <MapRecenter coords={getMapCenter()} />

          {/* Polígonos de Kínder */}
          {kindergartens.map(k => {
            const positions = k.geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
            return (
              <Polygon 
                key={k.id} 
                positions={positions} 
                pathOptions={{ color: 'var(--accent-primary)', fillColor: 'var(--accent-secondary)', fillOpacity: 0.15, weight: 2 }}
              >
                <Popup>
                  <strong>{k.name}</strong><br/>
                  Área segura de la unidad educativa.
                </Popup>
              </Polygon>
            );
          })}

          {/* Marcadores de Niños Activos */}
          {activeChildrenList.map(c => {
            const loc = c.current_location || c.location;
            if (!loc || !loc.coordinates) return null;
            return (
              <Marker 
                key={c.id} 
                position={[loc.coordinates[1], loc.coordinates[0]]}
                icon={createDivIcon(c.name, c.status)}
              >
                <Popup>
                  <div style={{ color: '#0a0e1a' }}>
                    <strong style={{ fontSize: '1rem' }}>{c.name}</strong><br/>
                    Estatus: <span style={{ fontWeight: 'bold', color: c.status === 'ALARM' ? 'var(--danger)' : 'var(--success)' }}>{c.status}</span><br/>
                    Edad: {c.age} años<br/>
                    Dispositivo: {c.device_id || 'N/A'}<br/>
                    Última actualización: {c.last_updated ? new Date(c.last_updated).toLocaleTimeString() : 'N/A'}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Panel Lateral de Estado y Alertas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
        
        {/* Panel de Alertas en Tiempo Real */}
        <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)', animation: 'pulseAlarm 1s infinite' }}></span>
            Alertas de Perímetro
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontSize: '0.9rem' }}>
                Sin alertas activas de perímetro.
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="glass-panel" style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{alert.childName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{alert.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estatus de Estudiantes */}
        <div className="glass-panel" style={{ padding: '1.25rem', height: '240px', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-secondary)' }}>
            {role === 'teacher' ? 'Alumnos de mi Aula' : 'Niños Monitoreados'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', flex: 1 }}>
            {activeChildrenList.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0', fontSize: '0.85rem' }}>
                No hay dispositivos transmitiendo.
              </div>
            ) : (
              activeChildrenList.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{c.name}</span>
                  <span className={`badge ${c.status === 'ALARM' ? 'badge-alarm' : 'badge-safe'}`} style={{ fontSize: '0.7rem' }}>
                    {c.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
