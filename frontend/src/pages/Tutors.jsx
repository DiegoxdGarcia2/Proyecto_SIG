import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Tutors() {
  const [tutors, setTutors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form states
  const [tutorId, setTutorId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const fetchTutors = async () => {
    try {
      const res = await axios.get('/tutors');
      setTutors(res.data);
    } catch (err) {
      console.error('Error listing tutors:', err);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setTutorId('');
    setName('');
    setEmail('');
    setPhone('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditId(t.id);
    setTutorId(t.tutor_id);
    setName(t.name);
    setEmail(t.email);
    setPhone(t.phone);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        // Actualizar tutor
        await axios.put(`/tutors/${editId}`, { name, email, phone });
      } else {
        // Crear nuevo tutor
        await axios.post('/tutors', { tutor_id: tutorId, name, email, phone });
      }
      setShowModal(false);
      fetchTutors();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el tutor.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este tutor?')) return;
    try {
      await axios.delete(`/tutors/${id}`);
      fetchTutors();
    } catch (err) {
      console.error('Error deleting tutor:', err);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-secondary)' }}>Tutores Registrados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gestiona los contactos de los responsables de los niños.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Registrar Tutor
        </button>
      </div>

      <div className="glass-panel table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Cédula / ID</th>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Teléfono</th>
              <th>Token FCM</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tutors.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay tutores registrados para esta empresa.
                </td>
              </tr>
            ) : (
              tutors.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: '500', color: 'var(--accent-primary)' }}>{t.tutor_id}</td>
                  <td>{t.name}</td>
                  <td>{t.email}</td>
                  <td>{t.phone}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.fcm_token ? 'Registrado ✓' : 'Pendiente ✗'}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleOpenEdit(t)} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="btn btn-danger" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de CRUD */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
                {editId ? 'Editar Tutor' : 'Registrar Nuevo Tutor'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>

            {error && <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{error}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID Único / Cédula</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={tutorId} 
                  onChange={(e) => setTutorId(e.target.value)} 
                  disabled={!!editId}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nombre Completo</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Teléfono de Contacto</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
