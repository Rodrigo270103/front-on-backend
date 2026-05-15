import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ChevronLeft } from 'lucide-react'
import NavbarJugador from '../components/NavbarJugador'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Bracket.css'

const RONDAS_ORDEN = ['64avos','32avos','16avos','octavos','cuartos','semifinal','final']

function Bracket() {
  const [partidos, setPartidos] = useState([])
  const [campeonato, setCampeonato] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
  const esAdmin = usuario.rol === 'admin'

  useEffect(() => {
    const cargar = async () => {
      try {
        const resCamp = await api.get('/campeonatos')
        if (!resCamp.data.length) { setLoading(false); return }
        const camp = resCamp.data[0]
        setCampeonato(camp)
        const resPart = await api.get(`/partidos?campeonato_id=${camp.id}`)
        setPartidos(resPart.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const agrupadoPorRonda = RONDAS_ORDEN.reduce((acc, ronda) => {
    const lista = partidos.filter(p => p.ronda?.toLowerCase() === ronda)
    if (lista.length > 0) acc[ronda] = lista
    return acc
  }, {})

  const rondasPresentes = RONDAS_ORDEN.filter(r => agrupadoPorRonda[r])

  const renderPartido = (p) => {
    const esPropio = p.jugador1_id === usuario.jugador_id || p.jugador2_id === usuario.jugador_id
    const gano1 = p.ganador_id && p.ganador_id === p.jugador1_id
    const gano2 = p.ganador_id && p.ganador_id === p.jugador2_id

    return (
      <div key={p.id} className={`br-partido ${esPropio ? 'propio' : ''} ${p.estado}`}>
        <div className={`br-jugador ${gano1 ? 'ganador' : ''} ${p.jugador1_id === usuario.jugador_id ? 'yo' : ''}`}>
          <span className="br-nombre">{p.jugador1_nombre || 'Por definir'}</span>
          {p.es_bye ? <span className="br-bye">BYE</span> : null}
          {gano1 && <Trophy size={12} className="br-trophy" />}
        </div>
        <div className="br-divider" />
        <div className={`br-jugador ${gano2 ? 'ganador' : ''} ${p.jugador2_id === usuario.jugador_id ? 'yo' : ''}`}>
          <span className="br-nombre">{p.jugador2_nombre || 'Por definir'}</span>
          {gano2 && <Trophy size={12} className="br-trophy" />}
        </div>
        {p.fecha && (
          <div className="br-meta">{p.fecha}{p.hora ? ` ${p.hora}` : ''}</div>
        )}
      </div>
    )
  }

  return (
    <div className="br-wrapper">
      {esAdmin ? <Navbar /> : <NavbarJugador />}

      <div className="br-header">
        {!esAdmin && (
          <button className="br-back" onClick={() => navigate('/jugador')}>
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1>Bracket</h1>
          {campeonato && <p>{campeonato.nombre}</p>}
        </div>
      </div>

      {loading && <p className="br-loading">Cargando bracket...</p>}

      {!loading && rondasPresentes.length === 0 && (
        <div className="br-empty">
          <Trophy size={48} />
          <p>El bracket no tiene partidos a&uacute;n.</p>
        </div>
      )}

      {!loading && rondasPresentes.length > 0 && (
        <div className="br-scroll-wrapper">
          <div className="br-tabla">
            {rondasPresentes.map(ronda => (
              <div key={ronda} className="br-columna">
                <div className="br-ronda-label">{ronda.toUpperCase()}</div>
                <div className="br-partidos-col">
                  {agrupadoPorRonda[ronda].map(renderPartido)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!esAdmin && <div className="br-bottom-spacer" />}
    </div>
  )
}

export default Bracket
