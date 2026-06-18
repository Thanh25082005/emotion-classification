import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EMOTIONS, emoColor, emoLabel } from '../lib/emotions'

// Line chart cam xuc theo thoi gian (truc Y = 7 nhan). samples: [{t, emotion, score}]
export default function EmotionTimeline({ samples = [] }) {
  const data = samples.map((s) => ({ t: s.t, y: EMOTIONS.indexOf(s.emotion), emotion: s.emotion }))

  if (samples.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">Biểu đồ sẽ hiện khi bắt đầu nhận diện...</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
        <XAxis dataKey="t" unit="s" tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="rgba(255,255,255,0.15)" />
        <YAxis
          type="number"
          domain={[0, 6]}
          ticks={[0, 1, 2, 3, 4, 5, 6]}
          tickFormatter={(v) => emoLabel(EMOTIONS[v])}
          width={78}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          stroke="rgba(255,255,255,0.15)"
        />
        <Tooltip
          contentStyle={{
            background: '#12121b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: '#e2e8f0',
          }}
          formatter={(v, _n, p) => [emoLabel(p.payload.emotion), 'Cảm xúc']}
          labelFormatter={(l) => `t = ${l}s`}
        />
        <Line
          type="stepAfter"
          dataKey="y"
          stroke="#a78bfa"
          strokeWidth={2}
          dot={{ r: 2.5, fill: '#a78bfa' }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
