import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import './Login.css'

const CLUBS = ['Arequipa', 'Cusco', 'Lima', 'Trujillo', 'Piura', 'Ica', 'Tacna', 'Cajamarca', 'Junin', 'La Libertad']
const GOLPES = ['Drive', 'Back', 'Grulla', 'Mistsuki', '3D']

function Login() {
  const navigate = useNavigate()

  const [modo, setModo] = useState('admin')
  const [subModo, setSubModo] = useState('login')
  const [paso, setPaso] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Registro paso 1
  const [jugadoresList, setJugadoresList] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [jugadorSel, setJugadorSel] = useState(null)

  // Registro paso 2
  const [club, setClub] = useState('')
  const [golpe, setGolpe] = useState('')

  // Registro paso 3
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')

  useEffect(() => {
    if (modo === 'jugador' && subModo === 'registro') {
      api.get('/auth/jugadores-lista')
        .then(res => setJugadoresList(res.data))
        .catch(() => setError('No se pudo cargar la lista de jugadores'))
    }
  }, [modo, subModo])

  const resetRegistro = () => {
    setPaso(1)
    setBusqueda('')
    setJugadorSel(null)
    setClub('')
    setGolpe('')
    setRegEmail('')
    setRegPassword('')
    setRegConfirm('')
    setError('')
  }

  const cambiarModo = (nuevo) => {
    setModo(nuevo)
    setSubModo('login')
    setEmail('')
    setPassword('')
    setError('')
    resetRegistro()
  }

  const cambiarSubModo = (nuevo) => {
    setSubModo(nuevo)
    setError('')
    if (nuevo === 'registro') resetRegistro()
  }

  const handleLoginAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.usuario.rol !== 'admin') {
        setError('Esta cuenta no tiene permisos de administrador')
        return
      }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      navigate('/dashboard')
    } catch {
      setError('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginJugador = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.usuario.rol !== 'jugador') {
        setError('Esta cuenta no es de jugador')
        return
      }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('usuario', JSON.stringify(res.data.usuario))
      navigate('/jugador')
    } catch {
      setError('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const handleRegistro = async (e) => {
    e.preventDefault()
    if (regPassword !== regConfirm) {
      setError('Las contrasenas no coinciden')
      return
    }
    if (regPassword.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/registro', {
        jugador_id: jugadorSel.id,
        email: regEmail,
        password: regPassword,
        club,
        golpe_preferido: golpe,
      })
      const loginRes = await api.post('/auth/login', { email: regEmail, password: regPassword })
      localStorage.setItem('token', loginRes.data.token)
      localStorage.setItem('usuario', JSON.stringify(loginRes.data.usuario))
      navigate('/jugador')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const jugadoresFiltrados = jugadoresList.filter(j =>
    j.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="login-logo">
          <h1>FRONT-ON</h1>
          <p>Federaci&oacute;n de Paleta Front&oacute;n del Per&uacute;</p>
        </div>

        {/* Toggle Admin / Jugador */}
        <div className="modo-toggle">
          <button
            type="button"
            className={modo === 'admin' ? 'active' : ''}
            onClick={() => cambiarModo('admin')}
          >
            Admin
          </button>
          <button
            type="button"
            className={modo === 'jugador' ? 'active' : ''}
            onClick={() => cambiarModo('jugador')}
          >
            Jugador
          </button>
        </div>

        {/* ─────── MODO ADMIN ─────── */}
        {modo === 'admin' && (
          <form onSubmit={handleLoginAdmin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@fronton.pe"
                required
              />
            </div>
            <div className="form-group">
              <label>Contrase&ntilde;a</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                required
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {/* ─────── MODO JUGADOR ─────── */}
        {modo === 'jugador' && (
          <>
            <div className="sub-tabs">
              <button
                type="button"
                className={subModo === 'login' ? 'active' : ''}
                onClick={() => cambiarSubModo('login')}
              >
                Iniciar sesi&oacute;n
              </button>
              <button
                type="button"
                className={subModo === 'registro' ? 'active' : ''}
                onClick={() => cambiarSubModo('registro')}
              >
                Registrarme
              </button>
            </div>

            {/* ── Login jugador ── */}
            {subModo === 'login' && (
              <form onSubmit={handleLoginJugador} className="login-form">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contrase&ntilde;a</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    required
                  />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            )}

            {/* ── Registro 3 pasos ── */}
            {subModo === 'registro' && (
              <div className="registro-wrapper">
                <div className="paso-indicador">
                  <div className="paso-labels">
                    <span>Paso {paso} de 3</span>
                    <span className="paso-desc">
                      {paso === 1 && 'Selecciona tu nombre'}
                      {paso === 2 && 'Datos deportivos'}
                      {paso === 3 && 'Crea tu cuenta'}
                    </span>
                  </div>
                  <div className="paso-barra">
                    <div className="paso-fill" style={{ width: (paso / 3 * 100) + '%' }} />
                  </div>
                </div>

                {/* PASO 1: buscar jugador */}
                {paso === 1 && (
                  <div className="registro-paso">
                    <input
                      type="text"
                      className="busqueda-input"
                      placeholder="Escribe tu nombre..."
                      value={busqueda}
                      onChange={e => { setBusqueda(e.target.value); setJugadorSel(null) }}
                      autoFocus
                    />
                    <div className="jugadores-lista">
                      {busqueda.length > 0 && jugadoresFiltrados.length === 0 && (
                        <p className="lista-vacia">No se encontraron jugadores</p>
                      )}
                      {busqueda.length === 0 && (
                        <p className="lista-hint">Empieza a escribir para buscar</p>
                      )}
                      {jugadoresFiltrados.map(j => (
                        <button
                          key={j.id}
                          type="button"
                          className={'jugador-item' + (jugadorSel?.id === j.id ? ' selected' : '')}
                          onClick={() => setJugadorSel(j)}
                        >
                          <span className="jugador-nombre">{j.nombre_completo}</span>
                          {j.categoria && <span className="jugador-cat">{j.categoria}</span>}
                        </button>
                      ))}
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!jugadorSel}
                      onClick={() => { setError(''); setPaso(2) }}
                    >
                      Siguiente &rarr;
                    </button>
                  </div>
                )}

                {/* PASO 2: club y golpe */}
                {paso === 2 && (
                  <div className="registro-paso">
                    <p className="jugador-confirmado">
                      Jugador: <strong>{jugadorSel?.nombre_completo}</strong>
                    </p>
                    <div className="form-group">
                      <label>Club</label>
                      <select value={club} onChange={e => setClub(e.target.value)}>
                        <option value="">Selecciona tu club...</option>
                        {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Golpe preferido</label>
                      <select value={golpe} onChange={e => setGolpe(e.target.value)}>
                        <option value="">Selecciona...</option>
                        {GOLPES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <div className="paso-botones">
                      <button type="button" className="btn-secondary" onClick={() => setPaso(1)}>
                        &larr; Atr&aacute;s
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!club || !golpe}
                        onClick={() => { setError(''); setPaso(3) }}
                      >
                        Siguiente &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 3: credenciales */}
                {paso === 3 && (
                  <form className="registro-paso" onSubmit={handleRegistro}>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={jugadorSel?.nombre_completo || ''}
                        disabled
                        className="input-disabled"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Contrase&ntilde;a</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="M&iacute;nimo 6 caracteres"
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirmar contrase&ntilde;a</label>
                      <input
                        type="password"
                        value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        placeholder="Repite tu contrase&ntilde;a"
                        required
                      />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <div className="paso-botones">
                      <button type="button" className="btn-secondary" onClick={() => setPaso(2)}>
                        &larr; Atr&aacute;s
                      </button>
                      <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creando...' : 'Crear cuenta'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default Login
