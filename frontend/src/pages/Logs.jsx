import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Filtros de fecha
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/logs/anomalies', {
        params: { 
          limit, 
          skip,
          start_date: startDate || undefined,
          end_date: endDate || undefined
        }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Resetear paginación al cambiar fechas
  useEffect(() => {
    setSkip(0);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [skip, limit, startDate, endDate]);

  const handleNext = () => {
    setSkip(prev => prev + limit);
  };

  const handlePrev = () => {
    setSkip(prev => Math.max(0, prev - limit));
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        @media (max-width: 768px) {
          #logs-filter-container {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
            padding: 1rem !important;
          }
          #logs-filter-container > div {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.25rem !important;
          }
          #logs-filter-container input {
            width: 100% !important;
          }
        }
      `}</style>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-secondary)' }}>Historial de Anomalías</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Registro histórico de alertas generadas por salidas del perímetro seguro.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          Actualizar Registro
        </button>
      </div>

      {/* Controles de Filtros por Fechas */}
      <div id="logs-filter-container" className="glass-panel animate-fade-in" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Fecha Inicio:</span>
          <input 
            type="date" 
            className="form-control" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Fecha Fin:</span>
          <input 
            type="date" 
            className="form-control" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }}
          />
        </div>

        {(startDate || endDate) && (
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }} 
            className="btn"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer' }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Tabla de Resultados */}
      <div className="glass-panel table-container" style={{ borderRadius: '12px', overflow: 'hidden', overflowX: 'auto', width: '100%' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Niño Preescolar</th>
              <th>ID Hardware GPS</th>
              <th>Tutor Responsable</th>
              <th>Coordenadas GPS de Infracción</th>
              <th>Evento</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  Cargando logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No se han registrado anomalías en el rango de fechas especificado.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: '500' }}>{log.child_name || 'Desconocido'}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{log.device_id}</td>
                  <td>{log.tutor_id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {log.location?.coordinates ? `[${log.location.coordinates[1].toFixed(6)}, ${log.location.coordinates[0].toFixed(6)}]` : 'N/A'}
                  </td>
                  <td>
                    <span className="badge badge-alarm">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Mostrando desde registro: <strong>{skip + 1}</strong>
        </span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handlePrev} disabled={skip === 0} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', opacity: skip === 0 ? 0.5 : 1 }}>
            Anterior
          </button>
          <button onClick={handleNext} disabled={logs.length < limit} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', opacity: logs.length < limit ? 0.5 : 1 }}>
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
