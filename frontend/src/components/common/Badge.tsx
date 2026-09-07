import type { ReactNode } from 'react'

export type BadgeTone =
  | 'available'
  | 'occupied'
  | 'expected'
  | 'cleaning'
  | 'maintenance'
  | 'info'
  | 'neutral'
  | 'inactive'
  | 'green'
  | 'amber'
  | 'red'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  showDot = true,
  className = '',
}: BadgeProps) {
  // Normalize tones to support both semantic hotel statuses and basic colors
  const resolvedTone: 'available' | 'occupied' | 'expected' | 'cleaning' | 'maintenance' | 'info' | 'neutral' =
    tone === 'green'
      ? 'available'
      : tone === 'red'
      ? 'occupied'
      : tone === 'amber'
      ? 'expected'
      : tone === 'inactive'
      ? 'neutral'
      : tone

  const toneStyles = {
    available: 'bg-[#EBF9EB] text-[#008A05] border-[#BFE4C1]',
    occupied: 'bg-[#FFF0F2] text-[#FF385C] border-[#FFD2D9]',
    expected: 'bg-[#FFF6EB] text-[#C76A00] border-[#FAD9B5]',
    cleaning: 'bg-[#FEF8E7] text-[#B86B00] border-[#F6E3B4]',
    maintenance: 'bg-[#F2F2F2] text-[#616161] border-[#DDDDDD]',
    info: 'bg-[#F0F7FF] text-[#0073E6] border-[#C7E0FF]',
    neutral: 'bg-[#F7F7F7] text-[#717171] border-[#DDDDDD]',
  }[resolvedTone]

  const dotColor = {
    available: 'bg-[#008A05]',
    occupied: 'bg-[#FF385C]',
    expected: 'bg-[#C76A00]',
    cleaning: 'bg-[#B86B00]',
    maintenance: 'bg-[#616161]',
    info: 'bg-[#0073E6]',
    neutral: 'bg-[#717171]',
  }[resolvedTone]

  const sizeStyles = {
    sm: 'text-[11px] py-0.5 px-2.5 gap-1.5 font-medium',
    md: 'text-xs py-1 px-3 gap-2 font-medium',
  }[size]

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-normal select-none ${sizeStyles} ${toneStyles} ${className}`}
    >
      {showDot && (
        <span
          className={`rounded-full shrink-0 ${dotColor} ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  )
}