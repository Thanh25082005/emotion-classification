import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useAuthStore } from './stores/auth'

export default function App() {
  const token = useAuthStore((s) => s.token)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  // Neu da co token (vd sau khi reload), lay lai thong tin user
  useEffect(() => {
    if (token) fetchMe().catch(() => {})
  }, [token, fetchMe])

  return <RouterProvider router={router} />
}
