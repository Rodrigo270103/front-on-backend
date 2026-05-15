import { useState, useEffect } from 'react'
import { Calendar, MapPin, Hash } from 'lucide-react'
import NavbarJugador from '../components/NavbarJugador'
import api from '../api/axios'
import './MisPartidos.css'

function MisPartidos() {
  const [partidos, setPartidos] = useState([])
  const [loading, setLoading] = useState(true)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    api.get('/partidos/mis-partidos')
      .then(res => setPartidos(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const renderSets = (sets) => {
    if (!sets) return null
    try {
      const arr = typeof sets === 'string' ? JSON.parse(sets) : sets
      return arr.map((s, i) => (
        <span key={i} className="set-badge">
          {s.j1}-{s.j2}
        </span>
      ))
    } catch {
      return null
    }
  }

  return (
    <div className="mp-wrapper">
      <NavbarJugador />
      <div className="mp-container">
        <h1 className="mp-title">Mis Partidos</h1>

        {loading && <p className="mp-loading">Cargando...</p>}

        {!loading && partidos.length === 0 && (
          <div className="mp-empty">
            <Calendar size={40} />
            <p>No tienes partidos asignados a&uacute;n.</p>
          </div>
        )}

        <div className="mp-lista">
          {partidos.map(partido => {
            const esJugador1 = partido.jugador1_id === usuario.jugador_id
            const rival = esJugador1
              ? (partido.jugador2_nombre || 'Por definir')
              : (partido.jugador1_nombre || 'Por definir')
            const gane = partido.ganador_id === usuario.jugador_id

            return (
              <div key={partido.id} className={`mp-card ${partido.estado}`}>
                <div className="mp-card-header">
                  <span className="mp-ronda">{partido.ronda}</span>
                  <span className={`estado-badge ${partido.estado}`}>
                    {partido.estado.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="mp-vs">
                  <span className="mp-yo">{usuario.nombre}</span>
                  <span className="mp-vs-label">VS</span>
                  <span className="mp-rival">{rival}</span>
                </div>

                {partido.estado === 'finalizado' && (
                  <div className={`mp-resultado ${gane ? 'gane' : 'perdi'}`}>
                    {gane ? 'Victoria' : 'Derrota'}
                    <span className="mp-sets">{renderSets(partido.sets)}</span>
                  </div>
                )}

                <div className="mp-detalles">
                  {partido.fecha && (
                    <div className="mp-detalle-item">
                      <Calendar size={13} />
                      <span>{partido.fecha}{partido.hora ? ` · ${partido.hora}` : ''}</span>
                    </div>
                  )}
                  {partido.sede && (
                    <div className="mp-detalle-item">
                      <MapPin size={13} />
                      <span>{partido.sede}{partido.cancha ? ` · Cancha ${partido.cancha}` : ''}</span>
                    </div>
                  )}
                  {partido.nro_partido && (
                    <div className="mp-detalle-item">
                      <Hash size={13} />
                      <span>Partido #{partido.nro_partido}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mp-bottom-spacer" />
    </div>
  )
}

export default MisPartidos
