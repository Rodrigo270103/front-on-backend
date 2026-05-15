import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, User, Trophy, LogOut } from 'lucide-react'
import './NavbarJugador.css'

function NavbarJugador() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/')
  }

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const links = [
    { path: '/jugador', icon: Home, label: 'Inicio' },
    { path: '/mis-partidos', icon: Calendar, label: 'Mis Partidos' },
    { path: '/bracket', icon: Trophy, label: 'Bracket' },
    { path: '/perfil', icon: User, label: 'Perfil' },
  ]

  return (
    <>
      {/* Top bar (visible en desktop) */}
      <nav className="navbar-jugador-top">
        <div className="nj-brand">
          <span>FRONT-ON</span>
          <small>Jugador</small>
        </div>
        <div className="nj-links">
          {links.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              className={location.pathname === path ? 'active' : ''}
              onClick={() => navigate(path)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="nj-user">
          <span>{usuario.nombre}</span>
          <button onClick={handleLogout} className="nj-logout">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Bottom tab bar (visible en mobile) */}
      <nav className="navbar-jugador-bottom">
        {links.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            className={location.pathname === path ? 'active' : ''}
            onClick={() => navigate(path)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={handleLogout} className="nj-logout-mobile">
          <LogOut size={22} />
          <span>Salir</span>
        </button>
      </nav>
    </>
  )
}

export default NavbarJugador
