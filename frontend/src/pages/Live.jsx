import { Link, useNavigate } from 'react-router-dom'
import WebcamView from '../components/WebcamView'
import { useAuthStore } from '../stores/auth'

// Trang realtime. Token duoc truyen vao WebcamView de gan vao URL WebSocket.
export default function Live() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

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
      <WebcamView token={token} />
    </div>
  )
}
