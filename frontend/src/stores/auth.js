// State auth bang zustand. Luu token vao localStorage de giu dang nhap khi reload.
import { create } from 'zustand'
import { api, setAuthToken, TOKEN_KEY } from '../services/api'

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user: null,

  // Dang ky: KHONG tu dong dang nhap (de man hinh Login xu ly tiep)
  async register(username, password) {
    await api.post('/auth/register', { username, password })
  },

  // Dang nhap: luu token + lay thong tin user
  async login(username, password) {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setAuthToken(data.access_token)
    set({ token: data.access_token })
    await get().fetchMe()
  },

  async fetchMe() {
    const { data } = await api.get('/auth/me')
    set({ user: data })
    return data
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    setAuthToken(null)
    set({ token: null, user: null })
  },
}))
