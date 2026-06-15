import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'

// Vung chon/keo-tha file. Goi onFile(file) khi co file duoc chon.
export default function UploadDropzone({ onFile, accept = 'image/*', label = 'Kéo-thả hoặc bấm để chọn file' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    if (files && files[0]) onFile(files[0])
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      className={`flex w-full flex-col items-center gap-3 rounded-card border-2 border-dashed p-10 text-center transition ${
        dragging ? 'border-brand-400 bg-brand-500/5' : 'border-white/12 bg-white/[0.02] hover:border-white/25'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-brand-400 ring-1 ring-white/10">
        <UploadCloud className="h-6 w-6" />
      </span>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </button>
  )
}
