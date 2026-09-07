import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './IconButton'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  size,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const resolvedWidth = size || maxWidth || 'md'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[resolvedWidth]

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidthStyles} bg-white rounded-2xl border border-[#DDDDDD] shadow-[0_16px_48px_rgba(0,0,0,0.2)] p-4 sm:p-6 z-10 animate-fade-in my-auto max-h-[92vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0F0F0]">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-[#222222]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#717171] mt-1">
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon={<X size={18} />}
            aria-label="Close dialog"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="pt-4 border-t border-[#F0F0F0] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
