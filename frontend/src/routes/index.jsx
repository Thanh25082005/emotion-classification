import { createBrowserRouter, Navigate } from 'react-router-dom'
import History from '../pages/History'
import Live from '../pages/Live'
import Login from '../pages/Login'
import { useAuthStore } from '../stores/auth'

// Chan route neu chua dang nhap -> chuyen ve /login.
function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/live" replace /> },
  { path: '/login', element: <Login /> },
  {
    path: '/live',
    element: (
      <RequireAuth>
        <Live />
      </RequireAuth>
    ),
  },
  {
    path: '/history',
    element: (
      <RequireAuth>
        <History />
      </RequireAuth>
    ),
  },
])
