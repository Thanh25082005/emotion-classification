import { EMOTIONS, EMOTION_META } from '../lib/emotions'

// Phan bo 7 cam xuc duoi dang thanh %, mau + emoji theo cam xuc, animate muot.
// counts: { happy: 12, sad: 3, ... }
export default function EmotionBars({ counts = {} }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // Sap xep giam dan theo so lan; cam xuc chua xuat hien xuong cuoi
  const rows = [...EMOTIONS].sort((a, b) => (counts[b] || 0) - (counts[a] || 0))

  return (
    <div className="space-y-3">
      {rows.map((e) => {
        const meta = EMOTION_META[e]
        const n = counts[e] || 0
        const pct = total ? Math.round((n / total) * 100) : 0
        return (
          <div key={e}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <span>{meta.emoji}</span>
                {meta.label}
              </span>
              <span className="font-medium tabular-nums text-slate-400">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
              <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
            </div>
          </div>
        )
      })}
      {total === 0 && (
        <p className="text-center text-sm text-slate-500">Chưa có dữ liệu trong phiên này.</p>
      )}
    </div>
  )
}
