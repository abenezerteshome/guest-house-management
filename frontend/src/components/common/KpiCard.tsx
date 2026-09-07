import { isValidElement, type ReactNode, type ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface KpiCardProps {
  label?: string
  title?: string
  value: string | number
  detail?: string
  subtitle?: string
  icon: LucideIcon | ReactNode
  tone?: 'success' | 'warning' | 'danger' | 'accent' | 'neutral'
  badge?: ReactNode
  className?: string
}

export function KpiCard({
  label,
  title,
  value,
  detail,
  subtitle,
  icon,
  tone = 'neutral',
  badge,
  className = '',
}: KpiCardProps) {
  const displayLabel = label || title || ''
  const displayDetail = detail || subtitle || ''

  const toneIconStyles = {
    neutral: 'bg-[#FFF0F2] text-[#FF385C]',
    accent: 'bg-neutral-100 text-neutral-800',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
  }[tone]

  const renderIcon = () => {
    if (isValidElement(icon)) {
      return icon
    }
    if (icon) {
      const IconComp = icon as ComponentType<{ size?: number; className?: string }>
      return <IconComp size={16} />
    }
    return null
  }

  return (
    <div
      className={`bg-white border border-[#DDDDDD] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#CCCCCC] transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
          {displayLabel}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toneIconStyles}`}>
          {renderIcon()}
        </div>
      </div>
      <div className="mt-4 mb-1 flex items-baseline gap-2">
        <strong className="text-2xl font-semibold text-[#222222] tracking-tight">
          {value}
        </strong>
        {badge}
      </div>
      {displayDetail && (
        <p className="text-xs text-[#717171] leading-normal font-normal">
          {displayDetail}
        </p>
      )}
    </div>
  )
}
