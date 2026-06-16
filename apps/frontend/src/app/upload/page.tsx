'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import { predictImage } from '@/services/emotion.service'
import { hasToken, getCachedUser, getMe } from '@/services/auth.service'
import { EmotionResult, User } from '@/types'

const EMOTION_EMOJI: Record<string, string> = {
  angry: '😠',
  disgust: '🤢',
  fear: '😨',
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  surprise: '😲',
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<EmotionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    if (!hasToken()) {
      router.replace('/login')
      return
    }
    async function load() {
      try {
        const me = await getMe()
        setUser(me)
        if (!me.can_upload && me.role !== 'admin') {
          setError('Bạn không có quyền upload file. Vui lòng liên hệ admin để được cấp quyền.')
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh (JPEG, PNG, WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File không được vượt quá 10MB.')
      return
    }
    setError(null)
    setResult(null)
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handlePredict() {
    if (!selectedFile) return
    setPredicting(true)
    setError(null)
    try {
      const res = await predictImage(selectedFile)
      setResult(res)
    } catch (err: unknown) {
      const e = err as Error & { code?: string }
      if (e.code === 'UPLOAD_NOT_PERMITTED') {
        setError('Bạn không có quyền upload file.')
      } else {
        setError(e.message || 'Có lỗi xảy ra khi phân tích ảnh.')
      }
    } finally {
      setPredicting(false)
    }
  }

  function handleReset() {
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  const noPermission = user && !user.can_upload && user.role !== 'admin'

  return (
    <PageLayout title="Upload ảnh">
      {noPermission ? (
        <div className="card max-w-lg mx-auto text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Không có quyền upload</h2>
          <p className="text-sm text-gray-500">
            Tài khoản của bạn chưa được cấp quyền upload file. Vui lòng liên hệ admin để được cấp quyền.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Drop zone */}
          {!preview && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`card border-2 border-dashed cursor-pointer text-center transition-colors ${
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
              }`}
            >
              <p className="text-4xl mb-3">📷</p>
              <p className="text-sm font-medium text-gray-700">Kéo thả ảnh vào đây hoặc click để chọn</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — tối đa 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">{selectedFile?.name}</p>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Xóa
                </button>
              </div>
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg bg-gray-100"
              />
              {!result && (
                <button
                  onClick={handlePredict}
                  disabled={predicting}
                  className="btn-primary w-full"
                >
                  {predicting ? 'Đang phân tích...' : 'Phân tích cảm xúc'}
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="card space-y-4">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Kết quả</h2>
              {result.faces.length === 0 ? (
                <p className="text-sm text-gray-500">Không phát hiện khuôn mặt trong ảnh.</p>
              ) : (
                result.faces.map((face) => (
                  <div key={face.face_id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{EMOTION_EMOJI[face.emotion.toLowerCase()] ?? '🙂'}</span>
                      <div>
                        <p className="text-lg font-semibold capitalize text-gray-900">{face.emotion}</p>
                        <p className="text-sm text-gray-500">
                          Độ tin cậy: {(face.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(face.scores)
                        .sort(([, a], [, b]) => b - a)
                        .map(([emotion, score]) => (
                          <div key={emotion} className="flex items-center gap-2">
                            <span className="w-16 text-xs text-gray-500 capitalize">{emotion}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-brand-500 h-1.5 rounded-full"
                                style={{ width: `${(score * 100).toFixed(1)}%` }}
                              />
                            </div>
                            <span className="w-10 text-xs text-gray-400 text-right">
                              {(score * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
              {result.processing_time_ms && (
                <p className="text-xs text-gray-400">
                  Thời gian xử lý: {result.processing_time_ms.toFixed(0)}ms
                </p>
              )}
              <button onClick={handleReset} className="btn-secondary w-full">
                Upload ảnh khác
              </button>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
