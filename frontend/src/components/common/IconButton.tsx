import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  icon: ReactNode
  variant?: 'ghost' | 'outline' | 'secondary' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'full' | 'xl' | 'lg'
}

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  rounded = 'full',
  className = '',
  ...props
}: IconButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none'

  const roundedStyles = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    lg: 'rounded-lg',
  }[rounded]

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size]

  const variantStyles = {
    ghost: 'bg-transparent text-[#717171] hover:text-[#222222] hover:bg-[#F7F7F7] active:bg-[#EFEFEF] focus-visible:ring-[#222222]',
    outline: 'bg-white text-[#222222] border border-[#DDDDDD] hover:border-[#222222] hover:bg-[#F7F7F7] focus-visible:ring-[#222222]',
    secondary: 'bg-[#F7F7F7] text-[#222222] hover:bg-[#EFEFEF] focus-visible:ring-[#222222]',
    primary: 'bg-[#FF385C] hover:bg-[#E31C5F] text-white focus-visible:ring-[#FF385C]',
  }[variant]

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`${baseStyles} ${roundedStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {icon}
    </button>
  )
}
