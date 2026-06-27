import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';

export default function Children() {
  const { role, kindergartenId: userKindergartenId } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [kindergartens, setKindergartens] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [tutorIds, setTutorIds] = useState([]);
  const [kindergartenId, setKindergartenId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [error, setError] = useState('');

  const isDirector = role === 'director';

  const fetchData = async () => {
    try {
      const cRes = await axios.get('/children');
      setChildren(cRes.data);

      const tRes = await axios.get('/tutors');
      setTutors(tRes.data);

      const kRes = await axios.get('/kindergartens');
      setKindergartens(kRes.data);

      const clRes = await axios.get('/classrooms');
      setClassrooms(clRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setAge('');
    setDeviceId('');
    setTutorIds([]);
    setKindergartenId(isDirector ? userKindergartenId : '');
    setClassroomId('');
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditId(c.id);
    setName(c.name);
    setAge(c.age);
    setDeviceId(c.device_id || '');
    setTutorIds(c.tutor_ids || []);
    setKindergartenId(isDirector ? userKindergartenId : (c.kindergarten_id || ''));
    setClassroomId(c.classroom_id || '');
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (tutorIds.length === 0) {
      setError('Debe seleccionar al menos un tutor responsable.');
      return;
    }
    const payload = {
      name,
      age: Number(age),
      device_id: deviceId || null,
      tutor_ids: tutorIds,
      kindergarten_id: isDirector ? userKindergartenId : (kindergartenId || null),
      classroom_id: classroomId || null
    };

    try {
      if (editId) {
        await axios.put(`/children/${editId}`, payload);
      } else {
        await axios.post('/children', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar el estudiante.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar a este estudiante preescolar?')) return;
    try {
      await axios.delete(`/children/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting child:', err);
    }
  };

  const getTutorNames = (ids) => {
    if (!ids || ids.length === 0) return 'Sin Asignar';
    return ids.map(id => {
      const tutor = tutors.find(t => t.tutor_id === id);
      return tutor ? tutor.name : id;
    }).join(', ');
  };

  const getKinderName = (id) => {
    const kinder = kindergartens.find(k => k.id === id);
    return kinder ? kinder.name : 'No Asignado';
  };

  const getClassroomName = (id) => {
    const cl = classrooms.find(c => c.id === id);
    return cl ? cl.name : 'Sin Aula';
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--accent-secondary)' }}>Niños Preescolares</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Vincula estudiantes, asigna tutores, aulas y dispositivos de hardware GPS.</p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          + Registrar Estudiante
        </button>
      </div>

      {/* Listado Principal en Tabla */}
      <div className="glass-panel" style={{ marginTop: '1.5rem', overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Edad (Años)</th>
              <th>Guardería / Kínder</th>
              <th>Aula / Curso</th>
              <th>Tutores Responsables</th>
              <th>ID Hardware GPS</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {children.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No se han registrado estudiantes aún.
                </td>
              </tr>
            ) : (
              children.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '600' }}>{c.name}</td>
                  <td>{c.age} años</td>
                  <td style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>
                    {getKinderName(c.kindergarten_id)}
                  </td>
                  <td style={{ color: 'var(--accent-secondary)', fontWeight: '500' }}>
                    {getClassroomName(c.classroom_id)}
                  </td>
                  <td>{getTutorNames(c.tutor_ids)}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {c.device_id || 'Sin Dispositivo'}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'SAFE' ? 'badge-success' : 'badge-danger'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleOpenEdit(c)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Asignar / Editar
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear / Editar */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--accent-primary)' }}>
              {editId ? 'Editar Perfil y Asignaciones' : 'Registrar Nuevo Estudiante'}
            </h3>

            {error && <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</div>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nombre Completo del Niño</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="ej. Juanito Pérez"
                  required 
                />
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Edad (Años)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={age} 
                  onChange={(e) => setAge(e.target.value)} 
                  min="1" 
                  max="7"
                  required 
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asignar Kínder / Establecimiento</label>
                <select 
                  className="form-control"
                  value={kindergartenId}
                  onChange={(e) => setKindergartenId(e.target.value)}
                  disabled={isDirector}
                >
                  {isDirector ? (
                    kindergartens.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="">Selecciona un Establecimiento...</option>
                      {kindergartens.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asignar Aula / Curso</label>
                <select 
                  className="form-control"
                  value={classroomId}
                  onChange={(e) => setClassroomId(e.target.value)}
                >
                  <option value="">Selecciona un Aula...</option>
                  {classrooms.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tutores Responsables (Adulto Responsable)</label>
                <div className="glass-panel animate-fade-in" style={{ maxHeight: '110px', overflowY: 'auto', padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)' }}>
                  {tutors.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={tutorIds.includes(t.tutor_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTutorIds(prev => [...prev, t.tutor_id]);
                          } else {
                            setTutorIds(prev => prev.filter(id => id !== t.tutor_id));
                          }
                        }}
                      />
                      {t.name} ({t.tutor_id})
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID de Hardware GPS</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={deviceId} 
                  onChange={(e) => setDeviceId(e.target.value)} 
                  placeholder="ej. HW-GPS-0098" 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editId ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
