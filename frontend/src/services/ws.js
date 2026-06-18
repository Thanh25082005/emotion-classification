// Ket noi WebSocket toi backend /ws/emotion.
// Client gui frame JPEG (binary), nhan JSON {faces, ts} (text).
// Hop dong 6.2. Token la tuy chon (Phase 4 se truyen vao).

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

/**
 * Mo ket noi WebSocket toi /ws/emotion.
 * @param {object} opts
 * @param {(msg: {faces: Array, ts: number}) => void} opts.onMessage  callback nhan ket qua
 * @param {() => void} [opts.onOpen]
 * @param {(ev: CloseEvent) => void} [opts.onClose]
 * @param {(ev: Event) => void} [opts.onError]
 * @param {string} [opts.token]  JWT (Phase 4)
 * @returns {WebSocket}
 */
export function connectEmotionWS({ onMessage, onOpen, onClose, onError, token } = {}) {
  const url = `${WS_BASE}/ws/emotion` + (token ? `?token=${encodeURIComponent(token)}` : '')
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'

  ws.onopen = () => onOpen && onOpen()
  ws.onclose = (ev) => onClose && onClose(ev)
  ws.onerror = (ev) => onError && onError(ev)
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      onMessage && onMessage(msg)
    } catch (e) {
      // bo qua message khong phai JSON
    }
  }
  return ws
}
