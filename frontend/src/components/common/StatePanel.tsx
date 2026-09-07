import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { Button } from './Button'

export interface EmptyStateProps {
  title: string
  description?: string
  message?: string
  actionLabel?: string
  actionSlot?: ReactNode
  onAction?: () => void
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  message,
  actionLabel,
  actionSlot,
  onAction,
  icon,
  className = '',
}: EmptyStateProps) {
  const desc = description || message

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-[#DDDDDD] ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#717171] mb-4">
        {icon || <Sparkles size={22} className="text-[#FF385C]" />}
      </div>
      <h3 className="text-base font-semibold text-[#222222] tracking-tight mb-1.5">
        {title}
      </h3>
      {desc && (
        <p className="text-sm text-[#717171] max-w-sm leading-relaxed mb-5">
          {desc}
        </p>
      )}
      {actionSlot ? (
        actionSlot
      ) : actionLabel && onAction ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          rightIcon={<ArrowRight size={14} />}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export interface LoadingStateProps {
  label?: string
  className?: string
}

export function LoadingState({
  label = 'Loading information…',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-[#717171] ${className}`}
      role="status"
    >
      <Loader2 className="animate-spin text-[#FF385C] mb-3" size={26} />
      <span className="text-sm font-medium text-[#717171]">{label}</span>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-[#F0F0F0] animate-pulse rounded-xl ${className}`}
      aria-hidden="true"
    />
  )
}

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Unable to complete request',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-[#FFF7F5] border border-[#F2D1CA] rounded-2xl ${className}`}
      role="alert"
    >
      <div className="w-10 h-10 rounded-full bg-[#FFEAE5] flex items-center justify-center text-[#C13515] mb-3">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-semibold text-[#C13515] mb-1">
        {title}
      </h3>
      <p className="text-xs text-[#717171] max-w-md mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-[#F2D1CA] hover:bg-white text-[#C13515]"
        >
          Try again
        </Button>
      )}
    </div>
  )
}

export interface StatePanelProps {
  type: 'empty' | 'loading' | 'error'
  title?: string
  description?: string
  message?: string
  actionLabel?: string
  actionSlot?: ReactNode
  onAction?: () => void
  icon?: ReactNode
  className?: string
}

export function StatePanel({
  type,
  title = '',
  description,
  message,
  actionLabel,
  actionSlot,
  onAction,
  icon,
  className = '',
}: StatePanelProps) {
  if (type === 'loading') {
    return <LoadingState label={message || description || title} className={className} />
  }
  if (type === 'error') {
    return <ErrorState title={title} message={message || description || ''} onRetry={onAction} className={className} />
  }
  return (
    <EmptyState
      title={title}
      description={description}
      message={message}
      actionLabel={actionLabel}
      actionSlot={actionSlot}
      onAction={onAction}
      icon={icon}
      className={className}
    />
  )
}