import { useRef, useState } from 'react'

// Vung chon/keo-tha file. Goi onFile(file) khi co file duoc chon.
// accept: vd 'image/*' hoac 'video/*'
export default function UploadDropzone({ onFile, accept = 'image/*', label = 'Keo-tha hoac bam de chon file' }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFiles(files) {
    if (files && files[0]) onFile(files[0])
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      style={{
        border: `2px dashed ${dragging ? '#0a7' : '#bbb'}`,
        borderRadius: 8,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        background: dragging ? '#f0fff7' : '#fafafa',
        color: '#666',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {label}
    </div>
  )
}
