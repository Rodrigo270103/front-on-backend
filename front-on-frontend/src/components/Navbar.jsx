import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, LayoutDashboard, Users, Calendar, Upload } from 'lucide-react'
import './Navbar.css'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/')
  }

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>FRONT-ON</span>
        <small>Panel Admin</small>
      </div>
      <div className="navbar-links">
        <button
          className={location.pathname === '/dashboard' ? 'active' : ''}
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </button>
        <button
          className={location.pathname === '/partidos' ? 'active' : ''}
          onClick={() => navigate('/partidos')}
        >
          <Calendar size={18} />
          Partidos
        </button>
        <button
          className={location.pathname === '/jugadores' ? 'active' : ''}
          onClick={() => navigate('/jugadores')}
        >
          <Users size={18} />
          Jugadores
        </button>
        <button
          className={location.pathname === '/importar' ? 'active' : ''}
          onClick={() => navigate('/importar')}
        >
          <Upload size={18} />
          Importar
        </button>
      </div>
      <div className="navbar-user">
        <span>{usuario.nombre}</span>
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  )
}

export default Navbar