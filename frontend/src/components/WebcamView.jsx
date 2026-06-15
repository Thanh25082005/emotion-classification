import { useEffect, useRef, useState } from 'react'
import { connectEmotionWS } from '../services/ws'

// Throttle fps o client (~6-7 fps) theo gotcha #4: gui 30fps se nghen, nhat la may CPU.
const SEND_INTERVAL_MS = 150
const JPEG_QUALITY = 0.6

/**
 * Bat webcam -> gui frame JPEG qua WS -> ve bounding box + nhan cam xuc len overlay.
 * Toa do box backend tra ve tinh theo do phan giai goc cua frame gui len,
 * nen canvas overlay duoc dat dung kich thuoc do phan giai goc cua video.
 */
export default function WebcamView({ token }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureRef = useRef(null) // canvas an, dung de chup frame gui di
  const wsRef = useRef(null)
  const facesRef = useRef([]) // ket qua moi nhat (khong setState moi frame de tranh re-render lien tuc)

  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let sendTimer = null
    let rafId = null
    let cancelled = false

    async function start() {
      // 1) Bat webcam
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (cancelled) return
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
      } catch (e) {
        setError('Khong truy cap duoc webcam: ' + e.message)
        return
      }

      // 2) Mo WebSocket
      wsRef.current = connectEmotionWS({
        token,
        onOpen: () => setStatus('connected'),
        onClose: () => setStatus('disconnected'),
        onError: () => setStatus('error'),
        onMessage: (msg) => { facesRef.current = msg.faces || [] },
      })

      // 3) Gui frame dinh ky
      sendTimer = setInterval(sendFrame, SEND_INTERVAL_MS)

      // 4) Ve overlay lien tuc theo nhip man hinh
      const loop = () => {
        drawOverlay()
        rafId = requestAnimationFrame(loop)
      }
      rafId = requestAnimationFrame(loop)
    }

    function sendFrame() {
      const video = videoRef.current
      const ws = wsRef.current
      if (!video || !ws || ws.readyState !== WebSocket.OPEN || !video.videoWidth) return

      const cap = captureRef.current
      cap.width = video.videoWidth
      cap.height = video.videoHeight
      cap.getContext('2d').drawImage(video, 0, 0, cap.width, cap.height)
      cap.toBlob(
        (blob) => {
          if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob)
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    function drawOverlay() {
      const video = videoRef.current
      const canvas = overlayRef.current
      if (!video || !canvas || !video.videoWidth) return

      // Dong bo do phan giai canvas = do phan giai goc video -> toa do box khop truc tiep
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const fontSize = Math.max(16, Math.round(canvas.width / 40))
      ctx.font = `${fontSize}px sans-serif`
      ctx.lineWidth = Math.max(2, Math.round(canvas.width / 320))
      ctx.textBaseline = 'bottom'

      for (const f of facesRef.current) {
        const [x1, y1, x2, y2] = f.box
        ctx.strokeStyle = '#00d26a'
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

        const label = `${f.emotion} ${(f.score * 100).toFixed(0)}%`
        const tw = ctx.measureText(label).width
        ctx.fillStyle = '#00d26a'
        ctx.fillRect(x1, Math.max(0, y1 - fontSize - 4), tw + 8, fontSize + 4)
        ctx.fillStyle = '#000'
        ctx.fillText(label, x1 + 4, Math.max(fontSize, y1 - 2))
      }
    }

    start()

    // Don dep khi unmount
    return () => {
      cancelled = true
      if (sendTimer) clearInterval(sendTimer)
      if (rafId) cancelAnimationFrame(rafId)
      if (wsRef.current) wsRef.current.close()
      if (stream) stream.getTracks().forEach((t) => t.stop())
    }
  }, [token])

  return (
    <div>
      {/* Container co position:relative de overlay nam de len video.
          scaleX(-1) lat guong ca video lan canvas -> hieu ung selfie va box van khop. */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 720, margin: '0 auto' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', display: 'block', borderRadius: 8, transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <canvas ref={captureRef} style={{ display: 'none' }} />
      <p style={{ textAlign: 'center' }}>
        Trang thai ket noi: <b>{status}</b>
      </p>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
