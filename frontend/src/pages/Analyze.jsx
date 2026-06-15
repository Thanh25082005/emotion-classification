import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Video } from 'lucide-react'
import { api } from '../services/api'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import UploadDropzone from '../components/UploadDropzone'
import EmotionBadge from '../components/EmotionBadge'
import EmotionBars from '../components/EmotionBars'
import EmotionTimeline from '../components/EmotionTimeline'
import { emoColor, emoEmoji, emoLabel } from '../lib/emotions'

export default function Analyze() {
  const [mode, setMode] = useState('image') // 'image' | 'video'

  const [imageURL, setImageURL] = useState('')
  const [imgResult, setImgResult] = useState(null) // {faces, width, height}
  const canvasRef = useRef(null)

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
      setError(e?.response?.data?.detail || 'Phân tích ảnh thất bại')
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
      setError(e?.response?.data?.detail || 'Phân tích video thất bại')
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

    const fontSize = Math.max(18, Math.round(canvas.width / 36))
    ctx.font = `600 ${fontSize}px Geist, sans-serif`
    ctx.lineWidth = Math.max(2, Math.round(canvas.width / 280))
    ctx.textBaseline = 'middle'

    for (const f of imgResult.faces) {
      const [x1, y1, x2, y2] = f.box
      const color = emoColor(f.emotion)
      ctx.strokeStyle = color
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x1, y1, x2 - x1, y2 - y1, 12); ctx.stroke()
      } else {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      }
      const label = `${emoEmoji(f.emotion)} ${f.emotion} ${(f.score * 100).toFixed(0)}%`
      const padX = fontSize * 0.45
      const tw = ctx.measureText(label).width + padX * 2
      const th = fontSize + 12
      const ly = Math.max(0, y1 - th - 4)
      ctx.fillStyle = 'rgba(8,8,12,0.78)'
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x1, ly, tw, th, 8); ctx.fill()
      } else {
        ctx.fillRect(x1, ly, tw, th)
      }
      ctx.fillStyle = color
      ctx.fillText(label, x1 + padX, ly + th / 2)
    }
  }, [imgResult])

  const tab = (m, label, Icon) => (
    <button
      onClick={() => { setMode(m); reset() }}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        mode === m ? 'bg-gradient-to-r from-brand-500 to-sad text-white' : 'text-slate-400 ring-1 ring-white/12 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  )

  return (
    <Layout>
      <div className="rise mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Phân tích ảnh và video</h1>
        <p className="mt-1 text-sm text-slate-400">Tải lên ảnh hoặc video ngắn để nhận diện cảm xúc trên khuôn mặt.</p>
      </div>

      <div className="mb-5 flex gap-2">
        {tab('image', 'Ảnh', ImageIcon)}
        {tab('video', 'Video', Video)}
      </div>

      {mode === 'image' ? (
        <UploadDropzone onFile={onImageFile} accept="image/*" label="Kéo-thả hoặc bấm để chọn ảnh (jpg/png)" />
      ) : (
        <UploadDropzone onFile={onVideoFile} accept="video/*" label="Kéo-thả hoặc bấm để chọn video (≤60s, ≤50MB)" />
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang phân tích{mode === 'video' ? ' video (có thể mất vài giây tới vài chục giây trên CPU)...' : '...'}
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{error}</p>}

      {/* Ket qua anh */}
      {mode === 'image' && imageURL && (
        <Card className="rise mt-6 p-3">
          <div className="relative overflow-hidden rounded-xl">
            <img src={imageURL} alt="ảnh đã tải" className="block w-full" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          </div>
          {imgResult && (
            <div className="flex flex-wrap items-center gap-2 p-3">
              <span className="text-sm text-slate-400">Phát hiện {imgResult.faces.length} khuôn mặt:</span>
              {imgResult.faces.map((f, i) => (
                <EmotionBadge key={i} emotion={f.emotion} score={f.score} size="sm" />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Ket qua video */}
      {mode === 'video' && videoResult && (
        <div className="rise mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Thời lượng" value={`${videoResult.duration_sec}s`} />
            <SummaryCard label="Số frame đã quét" value={videoResult.frames_analyzed} />
            <Card className="p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Cảm xúc nổi trội</span>
              <div className="mt-2 flex items-center gap-2 text-2xl font-extrabold" style={{ color: emoColor(videoResult.summary.dominant) }}>
                <span>{emoEmoji(videoResult.summary.dominant)}</span> {emoLabel(videoResult.summary.dominant) || '-'}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Cảm xúc theo thời gian</span>
            <div className="mt-2"><EmotionTimeline samples={videoResult.timeline} /></div>
          </Card>

          <Card className="p-5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Phân bố cảm xúc</span>
            <div className="mt-4"><EmotionBars counts={videoResult.summary.counts} /></div>
          </Card>
        </div>
      )}
    </Layout>
  )
}

function SummaryCard({ label, value }) {
  return (
    <Card className="p-5">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <div className="mt-2 text-3xl font-extrabold text-white tabular-nums">{value}</div>
    </Card>
  )
}
