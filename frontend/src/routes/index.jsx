import { createBrowserRouter, Navigate } from 'react-router-dom'
import Live from '../pages/Live'

// Routing toi thieu cho Phase 3. Login/History se them o Phase 4/5.
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/live" replace /> },
  { path: '/live', element: <Live /> },
])
