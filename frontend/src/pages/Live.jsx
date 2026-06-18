import { useRef, useState } from 'react'
import { useAuthStore } from '../stores/auth'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import WebcamView from '../components/WebcamView'
import EmotionBars from '../components/EmotionBars'
import EmotionTimeline from '../components/EmotionTimeline'
import { emoColor, emoEmoji, emoLabel } from '../lib/emotions'

export default function Live() {
  const token = useAuthStore((s) => s.token)

  // Tich luy cam xuc cua PHIEN tu WebSocket (chi frontend, khong them request)
  const startRef = useRef(Date.now())
  const [samples, setSamples] = useState([]) // [{t, emotion, score}] (~150 mau gan nhat)
  const [counts, setCounts] = useState({}) // tong so lan moi cam xuc trong phien
  const [current, setCurrent] = useState(null) // cam xuc hien tai (mat ro nhat moi nhat)

  function onFaces(faces) {
    if (!faces || faces.length === 0) {
      setCurrent(null)
      return
    }
    const dom = faces.reduce((a, b) => (b.score > a.score ? b : a)) // mat ro nhat
    const t = Math.round((Date.now() - startRef.current) / 100) / 10
    setCurrent({ emotion: dom.emotion, score: dom.score })
    setSamples((prev) => [...prev.slice(-149), { t, emotion: dom.emotion, score: dom.score }])
    setCounts((prev) => ({ ...prev, [dom.emotion]: (prev[dom.emotion] || 0) + 1 }))
  }

  return (
    <Layout>
      <div className="rise mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Nhận diện cảm xúc theo thời gian thực
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Khuôn mặt được khoanh và gán nhãn cảm xúc ngay khi bạn xuất hiện trước camera.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Video la nhan vat chinh */}
        <section className="rise">
          <WebcamView token={token} onFaces={onFaces} />
        </section>

        {/* Panel ket qua */}
        <aside className="flex flex-col gap-6">
          <Card className="rise p-5" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Cảm xúc hiện tại
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400 ring-1 ring-white/10">
                phiên này
              </span>
            </div>
            {current ? (
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="grid h-16 w-16 place-items-center rounded-2xl text-4xl"
                  style={{ background: `${emoColor(current.emotion)}24`, boxShadow: `inset 0 0 0 1px ${emoColor(current.emotion)}59` }}
                >
                  {emoEmoji(current.emotion)}
                </div>
                <div>
                  <div className="text-3xl font-extrabold leading-none" style={{ color: emoColor(current.emotion) }}>
                    {emoLabel(current.emotion)}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Độ tin cậy <span className="font-semibold text-slate-200">{Math.round(current.score * 100)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Chưa phát hiện khuôn mặt nào.</p>
            )}
          </Card>

          <Card className="rise p-5" style={{ animationDelay: '0.1s' }}>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Phân bố cảm xúc</span>
            <div className="mt-4">
              <EmotionBars counts={counts} />
            </div>
          </Card>
        </aside>
      </div>

      <Card className="rise mt-6 p-5">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Cảm xúc theo thời gian</span>
        <div className="mt-2">
          <EmotionTimeline samples={samples} />
        </div>
      </Card>
    </Layout>
  )
}
