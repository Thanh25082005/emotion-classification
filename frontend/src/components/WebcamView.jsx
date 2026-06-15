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
export default function WebcamView({ token, onFaces }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const captureRef = useRef(null) // canvas an, dung de chup frame gui di
  const wsRef = useRef(null)
  const facesRef = useRef([]) // ket qua moi nhat (khong setState moi frame de tranh re-render lien tuc)
  // Doc onFaces qua ref de WS callback luon goi ban moi nhat ma KHONG can restart ket noi
  const onFacesRef = useRef(onFaces)
  onFacesRef.current = onFaces

  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')

  useEffect(() => {
    let stream = null
    let sendTimer = null
    let rafId = null
    let reconnectTimer = null
    let closedByUs = false // true khi unmount/token loi -> KHONG ket noi lai

    // Mo WebSocket + tu dong ket noi lai khi bi rot
    function openWS() {
      wsRef.current = connectEmotionWS({
        token,
        onOpen: () => setStatus('connected'),
        onClose: (ev) => {
          setStatus('disconnected')
          facesRef.current = [] // xoa box cu khi mat ket noi
          if (closedByUs) return
          if (ev && ev.code === 1008) {
            // Token sai/het han -> khong nen ket noi lai
            setError('Phien dang nhap khong hop le. Hay dang nhap lai.')
            return
          }
          reconnectTimer = setTimeout(openWS, 1000) // thu ket noi lai sau 1s
        },
        onError: () => setStatus('error'),
        onMessage: (msg) => {
          const faces = msg.faces || []
          facesRef.current = faces
          // Cung cap du lieu cho bieu do realtime (F2) -- khong gui them request nao
          if (onFacesRef.current) onFacesRef.current(faces)
        },
      })
    }

    async function start() {
      // 1) Bat webcam
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (closedByUs) return
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
      } catch (e) {
        setError('Khong truy cap duoc webcam: ' + e.message)
        return
      }

      // 2) Mo WebSocket (co tu dong ket noi lai)
      openWS()

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
        // Video hien thi dang lat guong (selfie), nhung frame gui di KHONG lat
        // -> lat toa do X cua box de khop voi video, con CHU ve binh thuong (doc xuoi).
        const fx1 = canvas.width - x2
        const fx2 = canvas.width - x1

        ctx.strokeStyle = '#00d26a'
        ctx.strokeRect(fx1, y1, fx2 - fx1, y2 - y1)

        const label = `${f.emotion} ${(f.score * 100).toFixed(0)}%`
        const tw = ctx.measureText(label).width
        ctx.fillStyle = '#00d26a'
        ctx.fillRect(fx1, Math.max(0, y1 - fontSize - 4), tw + 8, fontSize + 4)
        ctx.fillStyle = '#000'
        ctx.fillText(label, fx1 + 4, Math.max(fontSize, y1 - 2))
      }
    }

    start()

    // Don dep khi unmount
    return () => {
      closedByUs = true
      if (sendTimer) clearInterval(sendTimer)
      if (rafId) cancelAnimationFrame(rafId)
      if (reconnectTimer) clearTimeout(reconnectTimer)
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
            // KHONG lat canvas -> chu doc xuoi; box da duoc lat toa do X trong drawOverlay
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
