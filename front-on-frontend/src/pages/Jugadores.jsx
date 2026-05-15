import { useState, useEffect } from 'react'
import { Edit2, User } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Jugadores.css'

function Jugadores() {
  const [jugadores, setJugadores] = useState([])
  const [campeonatoId, setCampeonatoId] = useState(null)
  const [modalJugador, setModalJugador] = useState(null)
  const [form, setForm] = useState({ club: '', golpe_preferido: '', categoria: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const resCamp = await api.get('/campeonatos')
      if (resCamp.data.length > 0) {
        const id = resCamp.data[0].id
        setCampeonatoId(id)
        const res = await api.get(`/jugadores?campeonato_id=${id}`)
        setJugadores(res.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const abrirModal = (jugador) => {
    setModalJugador(jugador)
    setForm({
      club: jugador.club || '',
      golpe_preferido: jugador.golpe_preferido || '',
      categoria: jugador.categoria || '',
    })
    setMsg('')
  }

  const cerrarModal = () => {
    setModalJugador(null)
    setMsg('')
  }

  const guardarJugador = async () => {
    setLoading(true)
    try {
      await api.put(`/jugadores/${modalJugador.id}`, form)
      setMsg('✅ Jugador actualizado')
      cargarDatos()
      setTimeout(cerrarModal, 1200)
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.error || 'Error al actualizar'))
    }
    setLoading(false)
  }

  const jugadoresFiltrados = jugadores.filter(j =>
    j.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <Navbar />
      <div className="jugadores-container">
        <div className="jugadores-header">
          <h2>Gestión de Jugadores</h2>
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="buscador"
          />
        </div>

        <div className="jugadores-tabla">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Club</th>
                <th>Golpe Preferido</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Email</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {jugadoresFiltrados.map((j, idx) => (
                <tr key={j.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="jugador-nombre">
                      <User size={16} />
                      {j.nombre_completo}
                    </div>
                  </td>
                  <td>{j.club || <span className="sin-dato">Sin club</span>}</td>
                  <td>{j.golpe_preferido || <span className="sin-dato">-</span>}</td>
                  <td>{j.categoria || <span className="sin-dato">-</span>}</td>
                  <td>
                    <span className={`badge ${j.tiene_cuenta ? 'badge-verde' : 'badge-gris'}`}>
                      {j.tiene_cuenta ? 'Registrado' : 'Sin cuenta'}
                    </span>
                  </td>
                  <td className="email-cell">
                    {j.email || <span className="sin-dato">-</span>}
                  </td>
                  <td>
                    <button
                      className="btn-icono editar"
                      onClick={() => abrirModal(j)}
                      title="Editar jugador"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalJugador && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Editar Jugador</h3>
            <p className="modal-subtitle">{modalJugador.nombre_completo}</p>
            <div className="modal-form">
              <label>Club</label>
              <input
                type="text"
                value={form.club}
                onChange={e => setForm({ ...form, club: e.target.value })}
                placeholder="Nombre del club"
              />
              <label>Golpe Preferido</label>
              <select
                value={form.golpe_preferido}
                onChange={e => setForm({ ...form, golpe_preferido: e.target.value })}
              >
                <option value="">Seleccionar...</option>
                <option value="Drive">Drive</option>
                <option value="Back">Back</option>
                <option value="Grulla">Grulla</option>
                <option value="Mistsuki">Mistsuki</option>
                <option value="3D">3D</option>
              </select>
              <label>Categoría</label>
              <input
                type="text"
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value })}
                placeholder="Categoría"
              />
            </div>
            {msg && <div className="modal-msg">{msg}</div>}
            <div className="modal-actions">
              <button onClick={cerrarModal} className="btn-cancelar">Cancelar</button>
              <button onClick={guardarJugador} disabled={loading} className="btn-guardar">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Jugadores