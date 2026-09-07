import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    id,
    disabled,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[#222222] tracking-normal select-none"
        >
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center w-full min-h-[46px] rounded-xl border bg-white px-3.5 transition-all duration-150 focus-within:ring-1 focus-within:border-[#222222] focus-within:ring-[#222222] ${
          error
            ? 'border-[#C13515] focus-within:border-[#C13515] focus-within:ring-[#C13515]'
            : 'border-[#DDDDDD] hover:border-[#B0B0B0]'
        } ${disabled ? 'bg-[#F7F7F7] cursor-not-allowed opacity-60' : ''}`}
      >
        {leftIcon && (
          <span className="mr-2.5 text-[#717171] shrink-0 flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full bg-transparent text-sm text-[#222222] placeholder:text-[#999999] focus:outline-none disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="ml-2.5 text-[#717171] shrink-0 flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#C13515] flex items-center gap-1 font-medium mt-1">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-[#717171] mt-1">{helperText}</p>
      )}
    </div>
  )
})
