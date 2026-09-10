import { useState, useRef } from 'react'
import {
  Upload,
  Trash2,
  Eye,
  CheckCircle2,
  Maximize2,
  RefreshCw,
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
  helperText = 'Upload an image file of the guest’s passport or national ID.',
}: IdPhotoCaptureProps) {
  const [inspectOpen, setInspectOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* PHOTO PREVIEW (When photo is attached) */}
      {value ? (
        <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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

            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 truncate">ID / Passport Verified</p>
              <p className="text-[11px] text-neutral-500 truncate">Document photo attached for check-in</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
              leftIcon={<RefreshCw size={13} />}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs"
              title="Replace with new photo"
            >
              Replace
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
      ) : (
        /* ONLY UPLOAD PHOTO OPTION AVAILABLE */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-3.5 rounded-xl border border-dashed border-neutral-300 hover:border-[#FF385C] bg-white hover:bg-neutral-50/80 text-left transition flex items-center gap-3 group cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-neutral-100 group-hover:bg-[#FF385C]/10 text-neutral-600 group-hover:text-[#FF385C] transition shrink-0">
            <Upload size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-800 group-hover:text-[#FF385C] transition">
              Upload Photo File
            </p>
            <p className="text-[11px] text-neutral-400">
              JPG, PNG, or WebP up to 10MB
            </p>
          </div>
        </button>
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
