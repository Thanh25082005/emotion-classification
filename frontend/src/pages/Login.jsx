import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

// Trang dang nhap / dang ky. Sau khi dang nhap thanh cong -> chuyen sang /live.
export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(username, password)
      }
      await login(username, password)
      navigate('/live')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Co loi xay ra, thu lai.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '64px auto', padding: 16 }}>
      <h1 style={{ textAlign: 'center' }}>{mode === 'login' ? 'Dang nhap' : 'Dang ky'}</h1>
      <form onSubmit={onSubmit}>
        <input
          placeholder="Ten dang nhap"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Mat khau"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8, marginBottom: 8, boxSizing: 'border-box' }}
        />
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 10 }}>
          {busy ? '...' : mode === 'login' ? 'Dang nhap' : 'Dang ky'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <p style={{ textAlign: 'center', marginTop: 12 }}>
        {mode === 'login' ? 'Chua co tai khoan?' : 'Da co tai khoan?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          style={{ border: 'none', background: 'none', color: '#0a7', cursor: 'pointer' }}
        >
          {mode === 'login' ? 'Dang ky' : 'Dang nhap'}
        </button>
      </p>
    </div>
  )
}
