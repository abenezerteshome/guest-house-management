import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding]

  const hoverStyles = hover
    ? 'hover:border-[#CCCCCC] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-200'
    : ''

  return (
    <div
      className={`bg-white border border-[#DDDDDD] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${paddingStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
