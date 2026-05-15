import { useState, useEffect } from 'react'
import { User, Save, CheckCircle } from 'lucide-react'
import NavbarJugador from '../components/NavbarJugador'
import api from '../api/axios'
import './Perfil.css'

const GOLPES = ['Drive', 'Back', 'Grulla', 'Mistsuki', '3D']
const CATEGORIAS = ['A', 'B', 'C', 'D']

function Perfil() {
  const [form, setForm] = useState({ club: '', golpe_preferido: '', categoria: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    if (!usuario.jugador_id) { setLoading(false); return }
    api.get(`/jugadores/${usuario.jugador_id}`)
      .then(res => {
        const { club, golpe_preferido, categoria } = res.data
        setForm({ club: club || '', golpe_preferido: golpe_preferido || '', categoria: categoria || '' })
      })
      .catch(() => setError('No se pudo cargar el perfil'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!usuario.jugador_id) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/jugadores/${usuario.jugador_id}`, form)
      setSuccess(true)
    } catch {
      setError('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="perfil-wrapper">
      <NavbarJugador />
      <div className="perfil-container">
        <div className="perfil-header">
          <div className="perfil-avatar">
            <User size={40} />
          </div>
          <div>
            <h1>{usuario.nombre}</h1>
            <p>{usuario.email}</p>
          </div>
        </div>

        {loading && <p className="perfil-loading">Cargando...</p>}

        {!loading && (
          <form className="perfil-form" onSubmit={handleSubmit}>
            <h2>Datos del jugador</h2>

            <div className="perfil-field">
              <label>Club</label>
              <input
                name="club"
                value={form.club}
                onChange={handleChange}
                placeholder="Nombre de tu club"
              />
            </div>

            <div className="perfil-field">
              <label>Golpe preferido</label>
              <select name="golpe_preferido" value={form.golpe_preferido} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {GOLPES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="perfil-field">
              <label>Categor&iacute;a</label>
              <select name="categoria" value={form.categoria} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <div className="perfil-error">{error}</div>}

            {success && (
              <div className="perfil-success">
                <CheckCircle size={16} />
                Perfil actualizado correctamente
              </div>
            )}

            <button type="submit" disabled={saving} className="perfil-btn">
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        )}
      </div>
      <div className="perfil-bottom-spacer" />
    </div>
  )
}

export default Perfil
