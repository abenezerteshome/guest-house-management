import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loading?: boolean
  isLoading?: boolean
  rounded?: 'full' | 'xl' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  isLoading = false,
  rounded = 'full',
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isSpinning = loading || isLoading

  const baseStyles =
    'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed select-none'

  const roundedStyles = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    lg: 'rounded-lg',
  }[rounded]

  const sizeStyles = {
    xs: 'h-7 px-2.5 text-[11px] gap-1',
    sm: 'h-8 px-3.5 text-xs gap-1.5',
    md: 'h-10 px-5 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  }[size]

  const variantStyles = {
    primary:
      'bg-[#FF385C] hover:bg-[#E31C5F] text-white active:scale-[0.99] focus-visible:ring-[#FF385C] disabled:bg-[#E5E5E5] disabled:text-[#999999] shadow-xs',
    secondary:
      'bg-white hover:bg-[#F7F7F7] text-[#222222] border border-[#DDDDDD] hover:border-[#222222] active:bg-[#EFEFEF] focus-visible:ring-[#222222] disabled:bg-[#F7F7F7] disabled:text-[#999999] disabled:border-[#E5E5E5]',
    outline:
      'bg-transparent hover:bg-[#F7F7F7] text-[#222222] border border-[#DDDDDD] hover:border-[#222222] focus-visible:ring-[#222222] disabled:text-[#999999] disabled:border-[#E5E5E5]',
    ghost:
      'bg-transparent hover:bg-[#F7F7F7] text-[#222222] hover:text-black focus-visible:ring-[#222222] disabled:text-[#999999]',
    danger:
      'bg-[#C13515] hover:bg-[#A32B0F] text-white focus-visible:ring-[#C13515] disabled:bg-[#FDE8E4] disabled:text-[#D98A78]',
  }[variant]

  return (
    <button
      disabled={disabled || isSpinning}
      aria-busy={isSpinning || undefined}
      aria-disabled={disabled || isSpinning || undefined}
      className={`${baseStyles} ${roundedStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isSpinning ? (
        <Loader2 className="animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isSpinning && rightIcon}
    </button>
  )
}
