import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import UploadDropzone from '../components/UploadDropzone'
import { api } from '../services/api'

// Mau theo cam xuc (dung chung voi History)
const COLORS = {
  angry: '#e63946', disgust: '#6a994e', fear: '#8338ec', happy: '#ffb703',
  neutral: '#8d99ae', sad: '#3a86ff', surprise: '#fb5607',
}

export default function Analyze() {
  const [imageURL, setImageURL] = useState('')
  const [result, setResult] = useState(null) // {faces, width, height}
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const canvasRef = useRef(null)

  async function onFile(file) {
    setError('')
    setResult(null)
    // Hien thi anh ngay (object URL)
    if (imageURL) URL.revokeObjectURL(imageURL)
    setImageURL(URL.createObjectURL(file))

    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/detect/image', form) // token gan tu dong qua axios
      setResult(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Phan tich that bai')
    } finally {
      setLoading(false)
    }
  }

  // Ve box len overlay canvas (canvas dat dung kich thuoc anh goc -> toa do box khop truc tiep)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !result) return
    canvas.width = result.width
    canvas.height = result.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const fontSize = Math.max(16, Math.round(canvas.width / 40))
    ctx.font = `${fontSize}px sans-serif`
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 320))
    ctx.textBaseline = 'bottom'

    for (const f of result.faces) {
      const [x1, y1, x2, y2] = f.box
      const color = COLORS[f.emotion] || '#00d26a'
      ctx.strokeStyle = color
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      const label = `${f.emotion} ${(f.score * 100).toFixed(0)}%`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = color
      ctx.fillRect(x1, Math.max(0, y1 - fontSize - 4), tw + 8, fontSize + 4)
      ctx.fillStyle = '#000'
      ctx.fillText(label, x1 + 4, Math.max(fontSize, y1 - 2))
    }
  }, [result])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Phan tich anh</h1>
        <Link to="/live">← Ve Live</Link>
      </div>

      <UploadDropzone onFile={onFile} accept="image/*" label="Keo-tha hoac bam de chon anh (jpg/png)" />

      {loading && <p>Dang phan tich...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {imageURL && (
        <div style={{ position: 'relative', marginTop: 16 }}>
          {/* Anh hien thi 100% chieu rong; canvas overlay co cung ti le -> box khop */}
          <img src={imageURL} alt="upload" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        </div>
      )}

      {result && (
        <p style={{ marginTop: 8 }}>
          Phat hien <b>{result.faces.length}</b> khuon mat
          {result.faces.length > 0 && ': ' + result.faces.map((f) => f.emotion).join(', ')}
        </p>
      )}
    </div>
  )
}
