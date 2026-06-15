// Axios client cho REST API. Tu gan header Authorization tu token da luu.
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const TOKEN_KEY = 'emotion_token'

export const api = axios.create({ baseURL })

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

// Khoi phuc token luc tai trang
const saved = localStorage.getItem(TOKEN_KEY)
if (saved) setAuthToken(saved)
