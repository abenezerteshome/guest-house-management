import type { ReactNode } from 'react'

export interface PageHeaderProps {
  kicker?: string
  title: string
  description?: string
  subtitle?: string
  actions?: ReactNode
  action?: ReactNode
  badge?: ReactNode
  className?: string
}

export function PageHeader({
  kicker,
  title,
  description,
  subtitle,
  actions,
  action,
  badge,
  className = '',
}: PageHeaderProps) {
  const desc = description || subtitle
  const actionSlot = actions || action

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-[#DDDDDD] ${className}`}
    >
      <div className="space-y-1">
        {kicker && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
              {kicker}
            </span>
            {badge}
          </div>
        )}
        <h1 className="text-xl sm:text-3xl font-semibold text-[#222222] tracking-tight break-words">
          {title}
        </h1>
        {desc && (
          <p className="text-sm text-[#717171] max-w-2xl leading-relaxed">
            {desc}
          </p>
        )}
      </div>
      {actionSlot && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap w-full sm:w-auto">
          {actionSlot}
        </div>
      )}
    </div>
  )
}
