import React, { useEffect, useState, useContext } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { AuthContext } from '../App';

// Componente para capturar clics en el mapa
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function Kindergartens() {
  const { theme, role, kindergartenId } = useContext(AuthContext);
  const [kindergartens, setKindergartens] = useState([]);
  const [name, setName] = useState('');
  const [buffer, setBuffer] = useState(10.0);
  const [draftVertices, setDraftVertices] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDirector = role === 'director';

  const fetchKindergartens = async () => {
    try {
      const res = await axios.get('/kindergartens');
      setKindergartens(res.data);
      
      // Si es director, pre-cargar el nombre y buffer de su unidad
      if (role === 'director' && res.data.length > 0) {
        setName(res.data[0].name);
        setBuffer(res.data[0].buffer_meters);
      }
    } catch (err) {
      console.error('Error fetching kindergartens:', err);
    }
  };

  useEffect(() => {
    fetchKindergartens();
  }, []);

  const handleMapClick = (latlng) => {
    setDraftVertices(prev => [...prev, latlng]);
  };

  const handleClearDraft = () => {
    setDraftVertices([]);
    if (!isDirector) {
      setName('');
    }
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (draftVertices.length < 3) {
      setError('Debes marcar al menos 3 puntos en el mapa para formar un polígono.');
      return;
    }

    try {
      const formattedCoordinates = draftVertices.map(v => [v[1], v[0]]);
      formattedCoordinates.push([draftVertices[0][1], draftVertices[0][0]]); // Cerrar anillo

      const payload = {
        name,
        geometry: {
          type: 'Polygon',
          coordinates: [formattedCoordinates]
        },
        buffer_meters: Number(buffer)
      };

      if (isDirector) {
        await axios.put(`/kindergartens/${kindergartenId}`, payload);
        setSuccess('Límites de la unidad educativa actualizados con éxito.');
      } else {
        await axios.post('/kindergartens', payload);
        setSuccess('Área educativa guardada con éxito.');
      }
      
      handleClearDraft();
      fetchKindergartens();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el kínder.');
    }
  };

  const handleDelete = async (id) => {
    if (isDirector) return;
    if (!window.confirm('¿Estás seguro de eliminar esta área educativa?')) return;
    try {
      await axios.delete(`/kindergartens/${id}`);
      fetchKindergartens();
      setSuccess('Área educativa eliminada.');
    } catch (err) {
      setError('No se pudo eliminar el kínder.');
    }
  };

  return (
    <div className="page-container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', height: 'calc(100vh - 70px)', overflow: 'hidden', padding: '1.5rem' }}>
      
      {/* Mapa interactivo */}
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: '10px', left: '50px', zIndex: '1000', pointerEvents: 'none' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'white', background: 'rgba(10, 14, 26, 0.85)' }}>
            📍 Haz clics en el mapa para {isDirector ? 'rediseñar los límites' : 'trazar el polígono'}. Mínimo 3 puntos.
          </div>
        </div>

        <MapContainer 
          center={[-17.7833, -63.1821]} 
          zoom={13} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            key={theme}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={theme === 'light' 
              ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
          />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Polígonos Guardados */}
          {kindergartens.map(k => {
            const positions = k.geometry.coordinates[0].map(pt => [pt[1], pt[0]]);
            return (
              <Polygon 
                key={k.id} 
                positions={positions} 
                pathOptions={{ color: 'var(--accent-secondary)', fillColor: 'var(--accent-primary)', fillOpacity: 0.1, weight: 2 }}
              >
                <Popup>
                  <strong>{k.name}</strong><br/>
                  Buffer: {k.buffer_meters}m
                </Popup>
              </Polygon>
            );
          })}

          {/* Polígono en dibujo (Borrador) */}
          {draftVertices.length > 0 && (
            <Polygon 
              positions={draftVertices} 
              pathOptions={{ color: 'var(--accent-primary)', dashArray: '5, 5', fillColor: 'var(--accent-primary)', fillOpacity: 0.2 }}
            />
          )}

          {/* Pines de los puntos del borrador */}
          {draftVertices.map((vertex, idx) => (
            <Marker key={idx} position={vertex} />
          ))}
        </MapContainer>
      </div>

      {/* Formulario y listado */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto' }}>
        
        {/* Trazador / Formulario de Registro */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)' }}>
            {isDirector ? 'Rediseñar Límites de la Unidad' : 'Trazar Nueva Área'}
          </h3>

          {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</div>}
          {success && <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{success}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nombre de la Guardería / Kínder</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="ej. Kínder Rayito de Sol" 
                disabled={isDirector}
                required 
              />
            </div>
            
            <div className="form-group">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Margen de Alerta (Metros)</label>
              <input 
                type="number" 
                className="form-control" 
                value={buffer} 
                onChange={(e) => setBuffer(e.target.value)} 
                min="5" 
                max="100" 
                required 
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Puntos marcados: <strong>{draftVertices.length}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={handleClearDraft} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                Limpiar
              </button>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                {isDirector ? 'Guardar Límites' : 'Guardar Área'}
              </button>
            </div>
          </form>
        </div>

        {/* Listado de Áreas */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-secondary)' }}>
            {isDirector ? 'Mi Unidad Educativa' : 'Áreas Registradas'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
            {kindergartens.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem 0', fontSize: '0.85rem' }}>
                No hay áreas registradas.
              </div>
            ) : (
              kindergartens.map(k => (
                <div key={k.id} className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{k.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Buffer: {k.buffer_meters} metros</span>
                  </div>
                  {!isDirector && (
                    <button onClick={() => handleDelete(k.id)} className="btn btn-danger" style={{ padding: '0.4rem', borderRadius: '6px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
