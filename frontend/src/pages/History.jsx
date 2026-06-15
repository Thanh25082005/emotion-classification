import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../services/api'

// Mau cho tung cam xuc (7 lop FER2013)
const COLORS = {
  angry: '#e63946',
  disgust: '#6a994e',
  fear: '#8338ec',
  happy: '#ffb703',
  neutral: '#8d99ae',
  sad: '#3a86ff',
  surprise: '#fb5607',
}

export default function History() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/logs/stats')
      .then((res) => setStats(res.data))
      .catch((e) => setError(e?.response?.data?.detail || 'Khong tai duoc thong ke'))
  }, [])

  // Tai CSV: fetch kem token (axios) roi tao blob de tai -> link <a> thuan khong gan duoc header
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
    } catch (e) {
      setError('Tai CSV that bai')
    }
  }

  const data = stats
    ? Object.entries(stats.counts).map(([emotion, count]) => ({ name: emotion, value: count }))
    : []

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Thong ke cam xuc</h1>
        <div>
          <button onClick={downloadCSV} style={{ marginRight: 8 }}>Tai CSV</button>
          <Link to="/live">← Ve Live</Link>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {stats && stats.total === 0 && (
        <p>Chua co du lieu. Hay dung realtime mot luc roi quay lai.</p>
      )}

      {stats && stats.total > 0 && (
        <>
          <p>Tong so ban ghi: <b>{stats.total}</b></p>
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={130}
                label={(d) => `${d.name}: ${d.value}`}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={COLORS[d.name] || '#cccccc'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
