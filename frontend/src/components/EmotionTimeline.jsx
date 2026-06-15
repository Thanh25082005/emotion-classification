import {
  Bar, BarChart, Cell, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

// Thu tu nhan FER2013 (khop EMOTIONS backend). Index dung lam truc Y cho line chart.
const EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
const COLORS = {
  angry: '#e63946', disgust: '#6a994e', fear: '#8338ec', happy: '#ffb703',
  neutral: '#8d99ae', sad: '#3a86ff', surprise: '#fb5607',
}

/**
 * Bieu do cam xuc realtime cua PHIEN hien tai (chi frontend).
 * @param {Array<{t:number, emotion:string, score:number}>} samples  tich luy tu WebSocket
 * @param {Object<string, number>} counts  so lan moi cam xuc trong phien
 */
export default function EmotionTimeline({ samples = [], counts = {} }) {
  // Line chart: emotion -> index de ve duoc duong theo thoi gian
  const lineData = samples.map((s) => ({
    t: s.t,
    y: EMOTIONS.indexOf(s.emotion),
    emotion: s.emotion,
  }))

  // Phan bo cam xuc trong phien
  const distData = EMOTIONS
    .map((e) => ({ name: e, value: counts[e] || 0 }))
    .filter((d) => d.value > 0)

  const total = distData.reduce((a, d) => a + d.value, 0)
  const dominant = distData.length
    ? distData.reduce((a, b) => (b.value > a.value ? b : a)).name
    : '-'

  if (samples.length === 0) {
    return (
      <p style={{ color: '#888', textAlign: 'center', marginTop: 16 }}>
        Bieu do cam xuc se hien khi bat dau nhan dien...
      </p>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Cam xuc theo thoi gian (phien nay)</h3>
      <p style={{ color: '#666', margin: '4px 0' }}>
        Cam xuc noi troi: <b style={{ color: COLORS[dominant] }}>{dominant}</b> · Tong mau: {total}
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={lineData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" unit="s" tick={{ fontSize: 12 }} />
          <YAxis
            type="number"
            domain={[0, 6]}
            ticks={[0, 1, 2, 3, 4, 5, 6]}
            tickFormatter={(v) => EMOTIONS[v] || ''}
            width={70}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(v, _n, p) => [p.payload.emotion, 'cam xuc']} labelFormatter={(l) => `t = ${l}s`} />
          <Line type="stepAfter" dataKey="y" stroke="#0a7" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <h3 style={{ marginTop: 16 }}>Phan bo cam xuc (phien nay)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={distData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} width={40} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" isAnimationActive={false}>
            {distData.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name] || '#888'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
