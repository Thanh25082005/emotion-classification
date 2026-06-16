'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logout, getCachedUser } from '@/services/auth.service'
import { User } from '@/types'

const BASE_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/realtime', label: 'Realtime' },
  { href: '/history', label: 'History' },
]

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getCachedUser())
  }, [pathname])

  const navLinks = [
    ...BASE_LINKS,
    ...(user?.can_upload || user?.role === 'admin'
      ? [{ href: '/upload', label: 'Upload' }]
      : []),
  ]

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-base font-semibold text-brand-600">
            EmotionAI
          </Link>
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-3 px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
