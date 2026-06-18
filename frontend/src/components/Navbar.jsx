import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, ScanFace, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth'

const LINKS = [
  { to: '/live', label: 'Trực tiếp' },
  { to: '/analyze', label: 'Phân tích' },
  { to: '/history', label: 'Lịch sử' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)

  function onLogout() {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-40">
      <div className="glass rounded-none border-x-0 border-t-0">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/live" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sad text-white shadow-lg shadow-brand-500/30">
              <ScanFace className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Emora</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 ring-1 ring-white/10 sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-sad text-xs font-semibold text-white">
                {(user?.username || '?').charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-slate-200">{user?.username || '...'}</span>
            </div>
            <button
              onClick={onLogout}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/5 md:hidden"
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Menu mobile */}
        {open && (
          <div className="border-t border-white/5 px-4 py-2 md:hidden">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-white/10 text-white' : 'text-slate-300'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
