import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Partidos from './pages/Partidos'
import Jugadores from './pages/Jugadores'
import JugadorDashboard from './pages/JugadorDashboard'
import MisPartidos from './pages/MisPartidos'
import Perfil from './pages/Perfil'
import Bracket from './pages/Bracket'

function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')
  } catch {
    return null
  }
}

function PrivateRoute({ children, rol }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/" />
  if (rol) {
    const usuario = getUsuario()
    if (!usuario || (rol !== 'any' && usuario.rol !== rol)) {
      return <Navigate to="/" />
    }
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Rutas admin */}
      <Route path="/dashboard" element={<PrivateRoute rol="admin"><Dashboard /></PrivateRoute>} />
      <Route path="/partidos" element={<PrivateRoute rol="admin"><Partidos /></PrivateRoute>} />
      <Route path="/jugadores" element={<PrivateRoute rol="admin"><Jugadores /></PrivateRoute>} />

      {/* Rutas jugador */}
      <Route path="/jugador" element={<PrivateRoute rol="jugador"><JugadorDashboard /></PrivateRoute>} />
      <Route path="/mis-partidos" element={<PrivateRoute rol="jugador"><MisPartidos /></PrivateRoute>} />
      <Route path="/perfil" element={<PrivateRoute rol="jugador"><Perfil /></PrivateRoute>} />

      {/* Bracket: cualquier rol autenticado */}
      <Route path="/bracket" element={<PrivateRoute rol="any"><Bracket /></PrivateRoute>} />
    </Routes>
  )
}

export default App
