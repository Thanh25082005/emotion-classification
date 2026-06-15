import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EmotionTimeline from '../components/EmotionTimeline'
import UploadDropzone from '../components/UploadDropzone'
import { api } from '../services/api'

// Mau theo cam xuc (dung chung voi History)
const COLORS = {
  angry: '#e63946', disgust: '#6a994e', fear: '#8338ec', happy: '#ffb703',
  neutral: '#8d99ae', sad: '#3a86ff', surprise: '#fb5607',
}

export default function Analyze() {
  const [mode, setMode] = useState('image') // 'image' | 'video'

  // --- Anh ---
  const [imageURL, setImageURL] = useState('')
  const [imgResult, setImgResult] = useState(null) // {faces, width, height}
  const canvasRef = useRef(null)

  // --- Video ---
  const [videoResult, setVideoResult] = useState(null) // {frames_analyzed, duration_sec, timeline, summary}

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setError('')
    setImgResult(null)
    setVideoResult(null)
  }

  async function onImageFile(file) {
    reset()
    if (imageURL) URL.revokeObjectURL(imageURL)
    setImageURL(URL.createObjectURL(file))
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/detect/image', form)
      setImgResult(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Phan tich anh that bai')
    } finally {
      setLoading(false)
    }
  }

  async function onVideoFile(file) {
    reset()
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/detect/video', form)
      setVideoResult(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Phan tich video that bai')
    } finally {
      setLoading(false)
    }
  }

  // Ve box len anh (canvas dat dung kich thuoc anh goc -> toa do box khop)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgResult) return
    canvas.width = imgResult.width
    canvas.height = imgResult.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const fontSize = Math.max(16, Math.round(canvas.width / 40))
    ctx.font = `${fontSize}px sans-serif`
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 320))
    ctx.textBaseline = 'bottom'

    for (const f of imgResult.faces) {
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
  }, [imgResult])

  const tabStyle = (active) => ({
    padding: '6px 14px', marginRight: 8, cursor: 'pointer',
    border: '1px solid #ccc', borderRadius: 6,
    background: active ? '#0a7' : '#fff', color: active ? '#fff' : '#333',
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Phan tich</h1>
        <Link to="/live">← Ve Live</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button style={tabStyle(mode === 'image')} onClick={() => { setMode('image'); reset() }}>Anh</button>
        <button style={tabStyle(mode === 'video')} onClick={() => { setMode('video'); reset() }}>Video</button>
      </div>

      {mode === 'image' ? (
        <UploadDropzone onFile={onImageFile} accept="image/*" label="Keo-tha hoac bam de chon anh (jpg/png)" />
      ) : (
        <UploadDropzone onFile={onVideoFile} accept="video/*" label="Keo-tha hoac bam de chon video (<=60s, <=50MB)" />
      )}

      {loading && (
        <p style={{ marginTop: 12 }}>
          Dang phan tich{mode === 'video' ? ' video (co the mat vai giay-vai chuc giay tren CPU)...' : '...'}
        </p>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Ket qua anh */}
      {mode === 'image' && imageURL && (
        <>
          <div style={{ position: 'relative', marginTop: 16 }}>
            <img src={imageURL} alt="upload" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          </div>
          {imgResult && (
            <p style={{ marginTop: 8 }}>
              Phat hien <b>{imgResult.faces.length}</b> khuon mat
              {imgResult.faces.length > 0 && ': ' + imgResult.faces.map((f) => f.emotion).join(', ')}
            </p>
          )}
        </>
      )}

      {/* Ket qua video */}
      {mode === 'video' && videoResult && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <SummaryCard label="Thoi luong" value={`${videoResult.duration_sec}s`} />
            <SummaryCard label="So frame da quet" value={videoResult.frames_analyzed} />
            <SummaryCard label="Cam xuc noi troi" value={videoResult.summary.dominant || '-'} color={COLORS[videoResult.summary.dominant]} />
          </div>
          {/* Tai su dung EmotionTimeline: timeline = samples, summary.counts = counts */}
          <EmotionTimeline samples={videoResult.timeline} counts={videoResult.summary.counts} />
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, minWidth: 130 }}>
      <div style={{ color: '#888', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#222' }}>{value}</div>
    </div>
  )
}
