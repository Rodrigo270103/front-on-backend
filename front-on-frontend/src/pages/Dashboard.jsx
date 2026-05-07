import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Users, Calendar, CheckCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Dashboard.css'

function Dashboard() {
  const [stats, setStats] = useState({
    totalPartidos: 0,
    programados: 0,
    enCurso: 0,
    finalizados: 0,
    totalJugadores: 0,
  })
  const [campeonato, setCampeonato] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const resCamp = await api.get('/campeonatos')
        if (resCamp.data.length > 0) {
          const camp = resCamp.data[0]
          setCampeonato(camp)

          const resPartidos = await api.get(`/partidos?campeonato_id=${camp.id}`)
          const partidos = resPartidos.data
          const resJugadores = await api.get(`/jugadores?campeonato_id=${camp.id}`)

          setStats({
            totalPartidos: partidos.length,
            programados: partidos.filter(p => p.estado === 'programado').length,
            enCurso: partidos.filter(p => p.estado === 'en_curso').length,
            finalizados: partidos.filter(p => p.estado === 'finalizado').length,
            totalJugadores: resJugadores.data.length,
          })
        }
      } catch (err) {
        console.error(err)
      }
    }
    cargarDatos()
  }, [])

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        {campeonato && (
          <div className="campeonato-header">
            <h2>{campeonato.nombre}</h2>
            <span className={`estado-badge ${campeonato.estado}`}>
              {campeonato.estado.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card azul">
            <div className="stat-icon"><Calendar size={28} /></div>
            <div className="stat-info">
              <span className="stat-num">{stats.totalPartidos}</span>
              <span className="stat-label">Total Partidos</span>
            </div>
          </div>
          <div className="stat-card naranja">
            <div className="stat-icon"><Trophy size={28} /></div>
            <div className="stat-info">
              <span className="stat-num">{stats.enCurso}</span>
              <span className="stat-label">En Curso</span>
            </div>
          </div>
          <div className="stat-card verde">
            <div className="stat-icon"><CheckCircle size={28} /></div>
            <div className="stat-info">
              <span className="stat-num">{stats.finalizados}</span>
              <span className="stat-label">Finalizados</span>
            </div>
          </div>
          <div className="stat-card gris">
            <div className="stat-icon"><Users size={28} /></div>
            <div className="stat-info">
              <span className="stat-num">{stats.totalJugadores}</span>
              <span className="stat-label">Jugadores</span>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <button onClick={() => navigate('/partidos')} className="action-btn">
            <Calendar size={20} />
            Gestionar Partidos
          </button>
          <button onClick={() => navigate('/jugadores')} className="action-btn secondary">
            <Users size={20} />
            Gestionar Jugadores
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard