import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmotionTimeline from '../components/EmotionTimeline'
import WebcamView from '../components/WebcamView'
import { useAuthStore } from '../stores/auth'

// Trang realtime. Token duoc truyen vao WebcamView de gan vao URL WebSocket.
export default function Live() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  // F2: tich luy cam xuc cua PHIEN tu WebSocket (chi frontend, khong them request)
  const startRef = useRef(Date.now())
  const [samples, setSamples] = useState([]) // [{t, emotion, score}] (gioi han ~150 mau gan nhat)
  const [counts, setCounts] = useState({}) // tong so lan moi cam xuc trong phien

  // Goi moi khi WebSocket tra ket qua. Lay khuon mat co score cao nhat lam "noi troi".
  function onFaces(faces) {
    if (!faces || faces.length === 0) return
    const dom = faces.reduce((a, b) => (b.score > a.score ? b : a))
    const t = Math.round((Date.now() - startRef.current) / 100) / 10 // giay, lam tron 0.1s
    setSamples((prev) => [...prev.slice(-149), { t, emotion: dom.emotion, score: dom.score }])
    setCounts((prev) => ({ ...prev, [dom.emotion]: (prev[dom.emotion] || 0) + 1 }))
  }

  function onLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Nhan dien cam xuc realtime</h1>
        <div>
          {user && <span style={{ marginRight: 8 }}>Xin chao, {user.username}</span>}
          <Link to="/analyze" style={{ marginRight: 8 }}>Phan tich anh</Link>
          <Link to="/history" style={{ marginRight: 8 }}>Thong ke</Link>
          <button onClick={onLogout}>Dang xuat</button>
        </div>
      </div>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Cho phep truy cap webcam de bat dau. Khuon mat se duoc khoanh kem nhan cam xuc.
      </p>
      <WebcamView token={token} onFaces={onFaces} />
      <EmotionTimeline samples={samples} counts={counts} />
    </div>
  )
}
