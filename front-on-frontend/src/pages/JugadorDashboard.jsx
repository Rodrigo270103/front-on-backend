import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Trophy, User, ChevronRight } from 'lucide-react'
import NavbarJugador from '../components/NavbarJugador'
import api from '../api/axios'
import './JugadorDashboard.css'

function JugadorDashboard() {
  const [partidos, setPartidos] = useState([])
  const [campeonato, setCampeonato] = useState(null)
  const [jugador, setJugador] = useState(null)
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resCamp, resPart] = await Promise.all([
          api.get('/campeonatos'),
          api.get('/partidos/mis-partidos'),
        ])
        if (resCamp.data.length > 0) setCampeonato(resCamp.data[0])
        setPartidos(resPart.data)

        if (usuario.jugador_id) {
          const resJug = await api.get(`/jugadores/${usuario.jugador_id}`)
          setJugador(resJug.data)
        }
      } catch (err) {
        console.error(err)
      }
    }
    cargar()
  }, [])

  const proximoPartido = partidos.find(p => p.estado !== 'finalizado' && !p.es_bye)
  const finalizados = partidos.filter(p => p.estado === 'finalizado').length

  return (
    <div className="jd-wrapper">
      <NavbarJugador />
      <div className="jd-container">

        <div className="jd-hero">
          <div className="jd-avatar">
            <User size={36} />
          </div>
          <div>
            <h1>{usuario.nombre}</h1>
            {jugador && (
              <p>{jugador.club} &middot; {jugador.categoria} &middot; {jugador.golpe_preferido}</p>
            )}
          </div>
        </div>

        {campeonato && (
          <div className="jd-torneo-card">
            <Trophy size={18} />
            <div>
              <strong>{campeonato.nombre}</strong>
              <span className={`estado-badge ${campeonato.estado}`}>
                {campeonato.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="jd-stats">
          <div className="jd-stat">
            <span className="jd-stat-num">{partidos.length}</span>
            <span className="jd-stat-label">Partidos</span>
          </div>
          <div className="jd-stat">
            <span className="jd-stat-num">{finalizados}</span>
            <span className="jd-stat-label">Jugados</span>
          </div>
          <div className="jd-stat">
            <span className="jd-stat-num">{partidos.length - finalizados}</span>
            <span className="jd-stat-label">Pendientes</span>
          </div>
        </div>

        {proximoPartido && (
          <div className="jd-section">
            <h2>Pr&oacute;ximo partido</h2>
            <div className="jd-partido-card proximo">
              <div className="jd-partido-vs">
                <span>{usuario.nombre}</span>
                <span className="vs">VS</span>
                <span>
                  {proximoPartido.jugador1_id === usuario.jugador_id
                    ? (proximoPartido.jugador2_nombre || 'Esperando rival')
                    : (proximoPartido.jugador1_nombre || 'Esperando rival')}
                </span>
              </div>
              {proximoPartido.fecha && (
                <div className="jd-partido-info">
                  <Calendar size={14} />
                  {proximoPartido.fecha} {proximoPartido.hora && `· ${proximoPartido.hora}`}
                  {proximoPartido.sede && ` · ${proximoPartido.sede}`}
                  {proximoPartido.cancha && ` · Cancha ${proximoPartido.cancha}`}
                </div>
              )}
              <span className={`estado-badge ${proximoPartido.estado}`}>
                {proximoPartido.estado.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="jd-acciones">
          <button className="jd-btn" onClick={() => navigate('/mis-partidos')}>
            <Calendar size={20} />
            Ver mis partidos
            <ChevronRight size={18} />
          </button>
          <button className="jd-btn secondary" onClick={() => navigate('/bracket')}>
            <Trophy size={20} />
            Ver bracket
            <ChevronRight size={18} />
          </button>
          <button className="jd-btn secondary" onClick={() => navigate('/perfil')}>
            <User size={20} />
            Mi perfil
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="jd-bottom-spacer" />
    </div>
  )
}

export default JugadorDashboard
