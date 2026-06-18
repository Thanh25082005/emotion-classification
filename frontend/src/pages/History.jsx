import { useEffect, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Download, BarChart3, Sparkles } from 'lucide-react'
import { api } from '../services/api'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmotionBars from '../components/EmotionBars'
import { emoColor, emoEmoji, emoLabel } from '../lib/emotions'

export default function History() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/logs/stats')
      .then((res) => setStats(res.data))
      .catch((e) => setError(e?.response?.data?.detail || 'Không tải được thống kê'))
      .finally(() => setLoading(false))
  }, [])

  async function downloadCSV() {
    try {
      const res = await api.get('/logs/export.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'emotions.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Tải CSV thất bại')
    }
  }

  const data = stats
    ? Object.entries(stats.counts).map(([emotion, count]) => ({ name: emotion, value: count }))
    : []
  const dominant = data.length ? data.reduce((a, b) => (b.value > a.value ? b : a)).name : null

  return (
    <Layout>
      <div className="rise mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Thống kê cảm xúc</h1>
          <p className="mt-1 text-sm text-slate-400">Tổng hợp lịch sử cảm xúc đã ghi của bạn.</p>
        </div>
        <Button variant="secondary" onClick={downloadCSV} disabled={!stats || stats.total === 0}>
          <Download className="h-4 w-4" /> Tải CSV
        </Button>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">{error}</p>}

      {/* Skeleton khi tai */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass rounded-card h-28 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && stats && stats.total === 0 && (
        <Card className="rise grid place-items-center p-12 text-center">
          <BarChart3 className="h-10 w-10 text-slate-600" />
          <p className="mt-3 font-medium text-slate-300">Chưa có dữ liệu</p>
          <p className="mt-1 text-sm text-slate-500">Hãy dùng trang Trực tiếp một lúc rồi quay lại đây.</p>
        </Card>
      )}

      {/* Dashboard */}
      {!loading && stats && stats.total > 0 && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rise p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tổng số lần đo</span>
              <div className="mt-2 text-4xl font-extrabold text-white tabular-nums">{stats.total}</div>
            </Card>
            <Card className="rise p-5" style={{ animationDelay: '0.05s' }}>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Cảm xúc nổi bật</span>
              <div className="mt-2 flex items-center gap-2 text-3xl font-extrabold" style={{ color: emoColor(dominant) }}>
                <span>{emoEmoji(dominant)}</span> {emoLabel(dominant)}
              </div>
            </Card>
            <Card className="rise p-5 sm:col-span-2 lg:col-span-1" style={{ animationDelay: '0.1s' }}>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Số loại cảm xúc</span>
              <div className="mt-2 flex items-center gap-2 text-4xl font-extrabold text-white tabular-nums">
                <Sparkles className="h-7 w-7 text-brand-400" /> {data.length}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rise p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tỉ lệ cảm xúc</span>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={2} stroke="none">
                    {data.map((d) => (
                      <Cell key={d.name} fill={emoColor(d.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#12121b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
                    formatter={(v, n) => [`${v} lần`, emoLabel(n)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="rise p-5">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Phân bố chi tiết</span>
              <div className="mt-4">
                <EmotionBars counts={stats.counts} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  )
}
