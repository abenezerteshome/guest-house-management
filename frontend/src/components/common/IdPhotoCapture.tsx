import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  AlertCircle,
  Maximize2,
} from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

interface IdPhotoCaptureProps {
  value?: string | null
  onChange: (photoDataUrl: string | null) => void
  label?: string
  required?: boolean
  helperText?: string
}

/**
 * Resizes and compresses an image (from File or DataURL) to a crisp, lightweight JPEG data URI.
 */
function compressImage(source: File | string, maxWidth = 1280, maxHeight = 960, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxHeight) / height)
          height = maxHeight
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(typeof source === 'string' ? source : '')
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))

    if (typeof source === 'string') {
      img.src = source
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(source)
    }
  })
}

export function IdPhotoCapture({
  value,
  onChange,
  label = 'Passport / National ID Photo',
  required = false,
  helperText = 'Capture or upload a clear photo of the guest’s passport or national ID.',
}: IdPhotoCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [inspectOpen, setInspectOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
    setCameraError(null)
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    setCameraError(null)
    setIsCameraActive(true)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please use file upload.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message ||
        'Could not access camera. Please ensure camera permissions are granted or upload a file.'
      setCameraError(msg)
    }
  }, [facingMode, stopCamera])

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Switch between front and back camera
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  // Effect to restart camera if facingMode changes while active
  useEffect(() => {
    if (isCameraActive) {
      startCamera()
    }
  }, [facingMode, isCameraActive, startCamera])

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9)
      try {
        const compressed = await compressImage(rawDataUrl)
        onChange(compressed)
      } catch {
        onChange(rawDataUrl)
      }
    }
    stopCamera()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      onChange(compressed)
    } catch (err) {
      console.error('Failed to compress image:', err)
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        onChange(loadEvent.target?.result as string)
      }
      reader.readAsDataURL(file)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#222222]">
          {label} {required && <span className="text-[#FF385C]">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Photo Attached
          </span>
        )}
      </div>

      {helperText && <p className="text-[11px] text-neutral-500">{helperText}</p>}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ACTIVE CAMERA VIEW */}
      {isCameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-md">
          <div className="relative aspect-video max-h-64 w-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Document alignment viewfinder overlay */}
            <div className="absolute inset-4 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
              <span className="text-[10px] font-bold text-white uppercase bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                Align ID / Passport within border
              </span>
              <span className="text-[9px] text-white/80 bg-black/40 px-2 py-0.5 rounded">
                Hold steady & avoid glare
              </span>
            </div>

            {/* Camera error message if failed */}
            {cameraError && (
              <div className="absolute inset-0 bg-neutral-900/90 text-white p-4 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                <p className="text-xs text-rose-200 mb-3 max-w-xs">{cameraError}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-white border-white/40 hover:bg-white/10"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload from Device Instead
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white"
                    onClick={stopCamera}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Camera controls bar */}
          {!cameraError && (
            <div className="p-3 bg-neutral-900 flex items-center justify-between gap-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
              >
                <X size={14} /> Cancel
              </button>

              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="px-5 py-2 rounded-full bg-[#FF385C] hover:bg-[#E00B41] text-white text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95"
              >
                <Camera size={15} />
                Snap Photo
              </button>

              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition flex items-center gap-1"
                title="Switch Camera"
              >
                <RefreshCw size={13} /> Switch
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHOTO PREVIEW (When photo is attached) */}
      {!isCameraActive && value && (
        <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              onClick={() => setInspectOpen(true)}
              className="relative w-16 h-12 rounded-xl overflow-hidden border border-emerald-300 bg-neutral-100 cursor-pointer group shadow-2xs shrink-0"
              title="Click to view full photo"
            >
              <img src={value} alt="ID Document" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                <Maximize2 size={14} />
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-900">ID / Passport Verified</p>
              <p className="text-[11px] text-neutral-500">Document photo ready for check-in</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Eye size={13} />}
              onClick={() => setInspectOpen(true)}
              className="h-8 text-xs"
            >
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Camera size={13} />}
              onClick={startCamera}
              className="h-8 text-xs"
            >
              Retake
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              className="h-8 text-xs text-rose-600 hover:bg-rose-50"
              title="Remove Photo"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* DEFAULT BUTTONS (When no photo & camera is inactive) */}
      {!isCameraActive && !value && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={startCamera}
            className="p-3 rounded-xl border border-dashed border-neutral-300 hover:border-[#FF385C] bg-white hover:bg-neutral-50/80 text-left transition flex items-center gap-3 group"
          >
            <div className="p-2 rounded-xl bg-neutral-100 group-hover:bg-[#FF385C]/10 text-neutral-600 group-hover:text-[#FF385C] transition shrink-0">
              <Camera size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-800 group-hover:text-[#FF385C] transition">
                Capture with Camera
              </p>
              <p className="text-[11px] text-neutral-400">Snap ID using webcam or phone</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl border border-dashed border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50/80 text-left transition flex items-center gap-3 group"
          >
            <div className="p-2 rounded-xl bg-neutral-100 group-hover:bg-neutral-200 text-neutral-600 transition shrink-0">
              <Upload size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-800">Upload Photo File</p>
              <p className="text-[11px] text-neutral-400">JPG, PNG, or WebP up to 10MB</p>
            </div>
          </button>
        </div>
      )}

      {/* INSPECT PHOTO MODAL */}
      <Modal
        isOpen={inspectOpen}
        onClose={() => setInspectOpen(false)}
        title="Passport / ID Document Preview"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-neutral-200 bg-neutral-950 flex items-center justify-center p-2">
            {value && (
              <img
                src={value}
                alt="Enlarged ID Document"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg"
              />
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Trash2 size={14} className="text-rose-600" />}
              onClick={() => {
                onChange(null)
                setInspectOpen(false)
              }}
              className="text-rose-600 hover:bg-rose-50"
            >
              Remove Photo
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setInspectOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
