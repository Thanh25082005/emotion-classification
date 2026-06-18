import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanFace, Lock, User } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button'

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
      if (mode === 'register') await register(username, password)
      await login(username, password)
      navigate('/live')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Có lỗi xảy ra, thử lại.')
    } finally {
      setBusy(false)
    }
  }

  const inputWrap = 'flex items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/10 focus-within:ring-brand-400'
  const inputBase = 'w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none'

  return (
    <div className="bg-glows grid min-h-[100dvh] lg:grid-cols-2">
      {/* Panel gradient (an tren mobile) */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/30 via-ink-950 to-sad/20" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sad text-white shadow-lg shadow-brand-500/30">
              <ScanFace className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">Emora</span>
          </Link>
          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
              Đọc cảm xúc qua khuôn mặt theo thời gian thực.
            </h2>
            <p className="mt-3 max-w-sm text-slate-300">
              Chạy hoàn toàn trên máy bạn. Dữ liệu khuôn mặt không rời thiết bị.
            </p>
            <div className="mt-6 flex gap-2 text-2xl">😊 😢 😠 😨 😮 🤢 😐</div>
          </div>
          <span className="text-sm text-slate-400">7 cảm xúc · YOLO + EfficientNet · ONNX</span>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sad text-white">
                <ScanFace className="h-5 w-5" />
              </span>
              <span className="text-xl font-bold tracking-tight text-white">Emora</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === 'login' ? 'Đăng nhập để bắt đầu nhận diện cảm xúc.' : 'Đăng ký nhanh, không cần email.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-slate-300">Tên đăng nhập</label>
              <div className={inputWrap}>
                <User className="h-4 w-4 text-slate-500" />
                <input
                  id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  required autoComplete="username" placeholder="vd: khanh" className={inputBase}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">Mật khẩu</label>
              <div className={inputWrap}>
                <Lock className="h-4 w-4 text-slate-500" />
                <input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••" className={inputBase}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{error}</p>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="font-semibold text-brand-400 hover:text-brand-500"
            >
              {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
