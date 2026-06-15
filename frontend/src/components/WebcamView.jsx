import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Wifi, WifiOff } from 'lucide-react'
import { connectEmotionWS } from '../services/ws'
import { emoColor, emoEmoji } from '../lib/emotions'

// Back-pressure: chi gui frame moi khi da nhan ket qua frame truoc (in-flight = 1).
// -> client tu dieu chinh dung bang toc do backend, KHONG d6n u frame -> box khong tre don.
const JPEG_QUALITY = 0.6
const SEND_WATCHDOG_MS = 4000 // neu qua lau khong co ket qua -> coi nhu mat frame, gui lai

/**
 * Bat webcam -> gui frame JPEG qua WS -> ve bounding box + nhan cam xuc len overlay.
 * Toa do box backend tra ve tinh theo do phan giai goc cua frame gui len,
 * nen canvas overlay duoc dat dung kich thuoc do phan giai goc cua video.
 */
export default function WebcamView({ token, onFaces }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureRef = useRef(null) // canvas an, dung de chup frame gui di
  const wsRef = useRef(null)
  const streamRef = useRef(null)
  const facesRef = useRef([]) // ket qua moi nhat (khong setState moi frame de tranh re-render lien tuc)
  // Doc onFaces / cameraOn qua ref de callback luon doc ban moi nhat ma KHONG can restart effect
  const onFacesRef = useRef(onFaces)
  onFacesRef.current = onFaces
  const cameraOnRef = useRef(true)
  const inFlightRef = useRef(false) // dang cho ket qua 1 frame?
  const lastSentRef = useRef(0)

  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [cameraOn, setCameraOn] = useState(true)
  const [faceCount, setFaceCount] = useState(0)

  function toggleCamera() {
    const next = !cameraOnRef.current
    cameraOnRef.current = next
    setCameraOn(next)
    // Tat/bat track -> camera ngung thu hinh, KHONG can mo lai ket noi
    if (streamRef.current) streamRef.current.getVideoTracks().forEach((t) => (t.enabled = next))
    if (!next) {
      inFlightRef.current = false // tranh ket lai khi bat camera tro lai
      facesRef.current = []
      setFaceCount(0)
      if (onFacesRef.current) onFacesRef.current([])
    }
  }

  useEffect(() => {
    let rafId = null
    let reconnectTimer = null
    let closedByUs = false // true khi unmount/token loi -> KHONG ket noi lai

    function openWS() {
      wsRef.current = connectEmotionWS({
        token,
        onOpen: () => setStatus('connected'),
        onClose: (ev) => {
          setStatus('disconnected')
          facesRef.current = []
          if (closedByUs) return
          if (ev && ev.code === 1008) {
            setError('Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.')
            return
          }
          reconnectTimer = setTimeout(openWS, 1000) // thu ket noi lai sau 1s
        },
        onError: () => setStatus('error'),
        onMessage: (msg) => {
          inFlightRef.current = false // da co ket qua -> cho phep gui frame ke tiep
          const faces = msg.faces || []
          facesRef.current = faces
          setFaceCount(faces.length)
          if (onFacesRef.current) onFacesRef.current(faces) // du lieu cho bieu do realtime (F2)
        },
      })
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (closedByUs) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
      } catch (e) {
        setError('Không truy cập được webcam: ' + e.message)
        return
      }

      openWS()

      // Mot vong rAF lo CA hai: ve overlay + thu gui frame (back-pressure).
      const loop = () => {
        drawOverlay()
        trySend()
        rafId = requestAnimationFrame(loop)
      }
      rafId = requestAnimationFrame(loop)
    }

    // Gui frame CHI khi khong con frame nao dang cho ket qua (in-flight = 1).
    function trySend() {
      const video = videoRef.current
      const ws = wsRef.current
      if (!cameraOnRef.current) return
      if (!video || !ws || ws.readyState !== WebSocket.OPEN || !video.videoWidth) return
      // Watchdog: neu cho qua lau (frame loi/bi bo) -> mo lai cho gui
      if (inFlightRef.current && performance.now() - lastSentRef.current < SEND_WATCHDOG_MS) return

      const cap = captureRef.current
      cap.width = video.videoWidth
      cap.height = video.videoHeight
      cap.getContext('2d').drawImage(video, 0, 0, cap.width, cap.height)
      inFlightRef.current = true
      lastSentRef.current = performance.now()
      cap.toBlob(
        (blob) => {
          if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob)
          else inFlightRef.current = false // gui hong -> cho phep thu lai
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    function drawOverlay() {
      const video = videoRef.current
      const canvas = overlayRef.current
      if (!video || !canvas || !video.videoWidth) return

      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const fontSize = Math.max(18, Math.round(canvas.width / 36))
      ctx.font = `600 ${fontSize}px Geist, sans-serif`
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 280))
      ctx.textBaseline = 'middle'

      for (const f of facesRef.current) {
        const [x1, y1, x2, y2] = f.box
        // Video lat guong (selfie), frame gui di KHONG lat -> lat toa do X de box khop, chu doc xuoi.
        const fx1 = canvas.width - x2
        const fx2 = canvas.width - x1
        const color = emoColor(f.emotion)

        // Box bo goc + mau theo cam xuc
        ctx.strokeStyle = color
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(fx1, y1, fx2 - fx1, y2 - y1, 12)
          ctx.stroke()
        } else {
          ctx.strokeRect(fx1, y1, fx2 - fx1, y2 - y1)
        }

        // Nhan: chip toi + chu mau (de doc tren moi nen video)
        const label = `${emoEmoji(f.emotion)} ${f.emotion} ${(f.score * 100).toFixed(0)}%`
        const padX = fontSize * 0.45
        const tw = ctx.measureText(label).width + padX * 2
        const th = fontSize + 12
        const ly = Math.max(0, y1 - th - 4)
        ctx.fillStyle = 'rgba(8,8,12,0.78)'
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(fx1, ly, tw, th, 8)
          ctx.fill()
        } else {
          ctx.fillRect(fx1, ly, tw, th)
        }
        ctx.fillStyle = color
        ctx.fillText(label, fx1 + padX, ly + th / 2)
      }
    }

    start()

    return () => {
      closedByUs = true
      if (rafId) cancelAnimationFrame(rafId)
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) wsRef.current.close()
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [token])

  const connected = status === 'connected'

  return (
    <div className="glass rounded-card p-3">
      <div className="relative overflow-hidden rounded-xl bg-ink-850" style={{ aspectRatio: '4 / 3' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* overlay canvas: KHONG lat (box da lat toa do X) */}
        <canvas
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Chip trang thai goc tren */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur">
            <span className={`h-2 w-2 rounded-full bg-red-500 ${connected && cameraOn ? 'live-dot' : 'opacity-40'}`} />
            LIVE
          </span>
          {cameraOn && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15 backdrop-blur">
              {faceCount} khuôn mặt
            </span>
          )}
        </div>

        {/* Khi tat camera */}
        {!cameraOn && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950/70 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <VideoOff className="h-8 w-8" />
              <span className="text-sm">Camera đang tắt</span>
            </div>
          </div>
        )}

        {/* Thanh dieu khien */}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 backdrop-blur ${
              connected
                ? 'bg-black/55 text-emerald-300 ring-emerald-400/25'
                : 'bg-black/55 text-amber-300 ring-amber-400/25'
            }`}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? 'Đã kết nối' : status === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối'}
          </span>
          <button
            onClick={toggleCamera}
            className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20 active:scale-[0.98]"
          >
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            {cameraOn ? 'Tắt camera' : 'Bật camera'}
          </button>
        </div>
      </div>

      <canvas ref={captureRef} className="hidden" />
      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}
