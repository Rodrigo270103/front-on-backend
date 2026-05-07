import { useState, useEffect } from 'react'
import { Edit2, Play, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Partidos.css'

function Partidos() {
  const [partidos, setPartidos] = useState([])
  const [campeonatoId, setCampeonatoId] = useState(null)
  const [modalPartido, setModalPartido] = useState(null)
  const [modalTipo, setModalTipo] = useState('')
  const [form, setForm] = useState({})
  const [sets, setSets] = useState([{ j1: '', j2: '' }, { j1: '', j2: '' }])
  const [filtroRonda, setFiltroRonda] = useState('todas')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const RONDAS = ['todas','64avos','32avos','16avos','octavos','cuartos','semifinal','final']

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const resCamp = await api.get('/campeonatos')
      if (resCamp.data.length > 0) {
        const id = resCamp.data[0].id
        setCampeonatoId(id)
        const res = await api.get(`/partidos?campeonato_id=${id}`)
        setPartidos(res.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const abrirModal = (partido, tipo) => {
    setModalPartido(partido)
    setModalTipo(tipo)
    setMsg('')
    if (tipo === 'programacion') {
      setForm({
        fecha: partido.fecha || '',
        hora: partido.hora || '',
        sede: partido.sede || '',
        cancha: partido.cancha || '',
      })
    }
    if (tipo === 'resultado') {
      setSets([{ j1: '', j2: '' }, { j1: '', j2: '' }])
    }
  }

  const cerrarModal = () => {
    setModalPartido(null)
    setModalTipo('')
    setMsg('')
  }

  const guardarProgramacion = async () => {
    setLoading(true)
    try {
      await api.put(`/partidos/${modalPartido.id}/programacion`, form)
      setMsg('Programacion actualizada')
      cargarDatos()
      setTimeout(cerrarModal, 1200)
    } catch (err) {
      setMsg('Error al actualizar')
    }
    setLoading(false)
  }

  const cambiarEstado = async (partido, estado) => {
    try {
      await api.put(`/partidos/${partido.id}/estado`, { estado })
      cargarDatos()
    } catch (err) {
      console.error(err)
    }
  }

  const guardarResultado = async () => {
    setLoading(true)
    try {
      const setsLimpios = sets
        .filter(s => s.j1 !== '' && s.j2 !== '')
        .map(s => ({ j1: parseInt(s.j1), j2: parseInt(s.j2) }))
      await api.put(`/partidos/${modalPartido.id}/resultado`, { sets: setsLimpios })
      setMsg('Resultado registrado')
      cargarDatos()
      setTimeout(cerrarModal, 1200)
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al registrar')
    }
    setLoading(false)
  }

  const partidosFiltrados = filtroRonda === 'todas'
    ? partidos
    : partidos.filter(p => p.ronda === filtroRonda)

  const estadoColor = (estado) => {
    if (estado === 'programado') return 'badge-gris'
    if (estado === 'en_curso') return 'badge-naranja'
    if (estado === 'finalizado') return 'badge-verde'
    return ''
  }

  return (
    <div>
      <Navbar />
      <div className="partidos-container">
        <div className="partidos-header">
          <h2>Gestion de Partidos</h2>
          <div className="filtro-ronda">
            {RONDAS.map(r => (
              <button
                key={r}
                className={filtroRonda === r ? 'active' : ''}
                onClick={() => setFiltroRonda(r)}
              >
                {r === 'todas' ? 'Todas' : r}
              </button>
            ))}
          </div>
        </div>

        <div className="partidos-tabla">
          <table>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Ronda</th>
                <th>Jugador 1</th>
                <th>Jugador 2</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Sede / Cancha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {partidosFiltrados.map(p => (
                <tr key={p.id} className={p.es_bye ? 'fila-bye' : ''}>
                  <td>{p.nro_partido || '-'}</td>
                  <td><span className="ronda-tag">{p.ronda}</span></td>
                  <td>{p.jugador1_nombre || '-'}</td>
                  <td>{p.jugador2_nombre || <span className="pendiente">Por definir</span>}</td>
                  <td>{p.fecha || '-'}</td>
                  <td>{p.hora || '-'}</td>
                  <td>{p.sede ? `${p.sede} / ${p.cancha}` : '-'}</td>
                  <td>
                    <span className={`badge ${estadoColor(p.estado)}`}>
                      {p.estado.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="acciones">
                    <button
                      className="btn-icono editar"
                      title="Editar programacion"
                      onClick={() => abrirModal(p, 'programacion')}
                    >
                      <Edit2 size={15} />
                    </button>
                    {p.estado === 'programado' && !p.es_bye && (
                      <button
                        className="btn-icono iniciar"
                        title="Iniciar partido"
                        onClick={() => cambiarEstado(p, 'en_curso')}
                      >
                        <Play size={15} />
                      </button>
                    )}
                    {p.estado === 'en_curso' && (
                      <button
                        className="btn-icono resultado"
                        title="Registrar resultado"
                        onClick={() => abrirModal(p, 'resultado')}
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalPartido && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {modalTipo === 'programacion' && (
              <>
                <h3>Editar Programacion</h3>
                <p className="modal-subtitle">
                  {modalPartido.jugador1_nombre} vs {modalPartido.jugador2_nombre || 'Por definir'}
                </p>
                <div className="modal-form">
                  <label>Fecha</label>
                  <input
                    type="text"
                    value={form.fecha}
                    onChange={e => setForm({...form, fecha: e.target.value})}
                    placeholder="27/06/2025"
                  />
                  <label>Hora</label>
                  <input
                    type="text"
                    value={form.hora}
                    onChange={e => setForm({...form, hora: e.target.value})}
                    placeholder="07:00"
                  />
                  <label>Sede</label>
                  <input
                    type="text"
                    value={form.sede}
                    onChange={e => setForm({...form, sede: e.target.value})}
                    placeholder="PARQUE"
                  />
                  <label>Cancha</label>
                  <input
                    type="text"
                    value={form.cancha}
                    onChange={e => setForm({...form, cancha: e.target.value})}
                    placeholder="C-1"
                  />
                </div>
                {msg && <div className="modal-msg">{msg}</div>}
                <div className="modal-actions">
                  <button onClick={cerrarModal} className="btn-cancelar">Cancelar</button>
                  <button onClick={guardarProgramacion} disabled={loading} className="btn-guardar">
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            )}

            {modalTipo === 'resultado' && (
              <>
                <h3>Registrar Resultado</h3>
                <p className="modal-subtitle">
                  {modalPartido.jugador1_nombre} vs {modalPartido.jugador2_nombre}
                </p>
                <div className="sets-header">
                  <span>Set</span>
                  <span>{modalPartido.jugador1_nombre?.split(',')[0]}</span>
                  <span>{modalPartido.jugador2_nombre?.split(',')[0]}</span>
                </div>
                {sets.map((s, i) => (
                  <div key={i} className="set-row">
                    <span>Set {i + 1}</span>
                    <input
                      type="number"
                      min="0"
                      value={s.j1}
                      onChange={e => {
                        const n = [...sets]
                        n[i].j1 = e.target.value
                        setSets(n)
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      value={s.j2}
                      onChange={e => {
                        const n = [...sets]
                        n[i].j2 = e.target.value
                        setSets(n)
                      }}
                    />
                  </div>
                ))}
                <div className="sets-actions">
                  {sets.length < 5 && (
                    <button onClick={() => setSets([...sets, { j1: '', j2: '' }])} className="btn-add-set">
                      <ChevronDown size={15} /> Agregar set
                    </button>
                  )}
                  {sets.length > 2 && (
                    <button onClick={() => setSets(sets.slice(0, -1))} className="btn-remove-set">
                      <ChevronUp size={15} /> Quitar set
                    </button>
                  )}
                </div>
                {msg && <div className="modal-msg">{msg}</div>}
                <div className="modal-actions">
                  <button onClick={cerrarModal} className="btn-cancelar">Cancelar</button>
                  <button onClick={guardarResultado} disabled={loading} className="btn-guardar">
                    {loading ? 'Guardando...' : 'Registrar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Partidos