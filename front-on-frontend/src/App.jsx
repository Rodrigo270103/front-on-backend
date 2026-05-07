import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Partidos from './pages/Partidos'
import Jugadores from './pages/Jugadores'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/" />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/partidos" element={<PrivateRoute><Partidos /></PrivateRoute>} />
      <Route path="/jugadores" element={<PrivateRoute><Jugadores /></PrivateRoute>} />
    </Routes>
  )
}

export default App