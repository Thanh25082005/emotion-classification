import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Activity, ArrowRight, Cpu, ScanFace, ShieldCheck, Smile, Sparkles, Zap } from 'lucide-react'

const STEPS = [
  { icon: ScanFace, title: 'Phát hiện khuôn mặt', desc: 'YOLO khoanh vùng mọi khuôn mặt trong khung hình webcam.' },
  { icon: Sparkles, title: 'Phân tích cảm xúc', desc: 'EfficientNet-B2 phân loại vùng mặt thành 1 trong 7 cảm xúc.' },
  { icon: Activity, title: 'Hiển thị realtime', desc: 'Kết quả vẽ đè lên video và cập nhật nhiều lần mỗi giây.' },
]

export default function Landing() {
  const reduce = useReducedMotion()
  const fade = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  })

  return (
    <div className="bg-glows min-h-[100dvh]">
      {/* Header */}
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-sad text-white shadow-lg shadow-brand-500/30">
            <ScanFace className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">Emora</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white">
            Đăng nhập
          </Link>
          <Link
            to="/live"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            Dùng thử
          </Link>
        </div>
      </header>

      {/* Hero - asymmetric split */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-16">
        <motion.div {...fade(0)}>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Đọc cảm xúc qua khuôn mặt{' '}
            <span className="bg-gradient-to-r from-brand-400 to-sad bg-clip-text text-transparent">theo thời gian thực</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-400">
            Bật webcam, Emora khoanh mặt và nhận diện 7 cảm xúc ngay lập tức. Chạy hoàn toàn trên máy bạn.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-sad px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-[0.98]"
            >
              Dùng thử demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how" className="rounded-full px-5 py-3 text-sm font-semibold text-slate-300 ring-1 ring-white/15 transition hover:bg-white/5">
              Cách hoạt động
            </a>
          </div>
        </motion.div>

        {/* Visual */}
        <motion.div {...fade(0.12)} className="glass rounded-card p-3">
          <div className="relative overflow-hidden rounded-xl bg-ink-850" style={{ aspectRatio: '4 / 3' }}>
            <img
              src="https://picsum.photos/seed/emora-hero/1000/750"
              alt="Minh hoạ nhận diện cảm xúc"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute" style={{ left: '32%', top: '22%', width: '36%', height: '54%' }}>
              <div className="h-full w-full rounded-lg" style={{ border: '2px solid #f59e0b', boxShadow: '0 0 28px rgba(245,158,11,.35)' }} />
              <div className="absolute -top-3 left-0 rounded-md px-2 py-1 text-xs font-bold text-black" style={{ background: '#f59e0b' }}>
                😊 Happy 92%
              </div>
            </div>
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur">
              <span className="live-dot h-2 w-2 rounded-full bg-red-500" /> LIVE
            </span>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white">Cách hoạt động</h2>
        <p className="mt-2 max-w-md text-slate-400">Ba bước, tất cả chạy trong cùng một tiến trình trên máy bạn.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.title} {...fade(i * 0.08)} className="relative">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500/30 to-sad/20 text-brand-400 ring-1 ring-white/10">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-500">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features - bento (4 cells, co cell gradient) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white">Vì sao chọn Emora</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {/* cell lon: rieng tu */}
          <motion.div {...fade(0)} className="glass rounded-card relative overflow-hidden p-6 md:col-span-2">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500/30 to-sad/20 blur-2xl" />
            <ShieldCheck className="h-7 w-7 text-brand-400" />
            <h3 className="mt-4 text-xl font-semibold text-white">Riêng tư, chạy local</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Toàn bộ suy luận chạy ngay trên máy bạn. Hình ảnh webcam không gửi lên server bên ngoài.
            </p>
          </motion.div>

          <motion.div {...fade(0.06)} className="glass rounded-card p-6">
            <Zap className="h-7 w-7 text-happy" />
            <h3 className="mt-4 text-lg font-semibold text-white">Realtime</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Cập nhật nhiều lần mỗi giây qua WebSocket.</p>
          </motion.div>

          <motion.div {...fade(0.12)} className="glass rounded-card p-6">
            <Smile className="h-7 w-7 text-surprise" />
            <h3 className="mt-4 text-lg font-semibold text-white">7 cảm xúc</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Happy, sad, angry, fear, surprise, disgust, neutral.</p>
          </motion.div>

          {/* cell gradient nhan manh */}
          <motion.div {...fade(0.18)} className="rounded-card relative overflow-hidden bg-gradient-to-br from-brand-600/40 to-sad/30 p-6 ring-1 ring-white/10 md:col-span-2">
            <Cpu className="h-7 w-7 text-white" />
            <h3 className="mt-4 text-xl font-semibold text-white">Không cần GPU NVIDIA</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-200">
              Mô hình ONNX tự chọn phần cứng phù hợp và tự lùi về CPU. Cùng một file chạy được trên mọi máy.
            </p>
          </motion.div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to="/live"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-sad px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            Dùng thử demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/5 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <ScanFace className="h-4 w-4 text-brand-400" />
          <span>Emora · Nhận diện cảm xúc realtime</span>
        </div>
        <span>Chạy local · YOLO + EfficientNet · ONNX</span>
      </footer>
    </div>
  )
}
