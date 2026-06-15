import { emoColor, emoEmoji, emoLabel } from '../lib/emotions'

// Badge cam xuc: emoji + nhan + mau theo cam xuc. size: 'sm' | 'md'
export default function EmotionBadge({ emotion, score, size = 'md' }) {
  const color = emoColor(emotion)
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ color, background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}55` }}
    >
      <span>{emoEmoji(emotion)}</span>
      {emoLabel(emotion)}
      {score != null && <span className="opacity-80">{Math.round(score * 100)}%</span>}
    </span>
  )
}
