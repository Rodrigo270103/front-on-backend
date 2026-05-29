import { useState, useRef } from 'react'
import { Upload, AlertTriangle, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import './Importar.css'

function Importar() {
  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleArchivo = (e) => {
    const file = e.target.files[0]
    if (file) {
      setArchivo(file)
      setResultado(null)
      setError('')
    }
  }

  const handleSubir = async () => {
    if (!archivo) return
    setLoading(true)
    setResultado(null)
    setError('')

    const formData = new FormData()
    formData.append('plantilla', archivo)

    try {
      const res = await api.post('/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResultado(res.data)
      setArchivo(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la plantilla')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="imp-container">
        <div className="imp-card">

          <div className="imp-titulo">
            <Upload size={28} />
            <h2>Importar Torneo</h2>
          </div>

          <div className="imp-aviso">
            <AlertTriangle size={18} />
            <p>
              Esta acci&oacute;n eliminar&aacute; todos los datos actuales del torneo
              y los reemplazar&aacute; con la nueva plantilla.
            </p>
          </div>

          <div
            className={'imp-dropzone' + (archivo ? ' tiene-archivo' : '')}
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet size={36} />
            {archivo ? (
              <div className="imp-nombre-archivo">
                <span>{archivo.name}</span>
                <small>{(archivo.size / 1024).toFixed(1)} KB</small>
              </div>
            ) : (
              <div className="imp-dropzone-texto">
                <span>Haz clic para seleccionar</span>
                <small>Solo archivos .xlsx</small>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={handleArchivo}
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div className="imp-error">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {resultado && (
            <div className="imp-exito">
              <CheckCircle size={20} />
              <div>
                <strong>{resultado.campeonato}</strong>
                <span>{resultado.partidos} partidos &middot; {resultado.jugadores} jugadores importados</span>
              </div>
            </div>
          )}

          <button
            className="imp-btn"
            onClick={handleSubir}
            disabled={!archivo || loading}
          >
            {loading ? (
              <>
                <span className="imp-spinner" />
                Procesando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Subir Plantilla
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  )
}

export default Importar
