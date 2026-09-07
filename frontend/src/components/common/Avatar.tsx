export interface AvatarProps {
  name: string
  role?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({
  name,
  role,
  size = 'md',
  className = '',
}: AvatarProps) {
  const getInitials = (str: string) => {
    if (!str) return 'H'
    const parts = str.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return str.slice(0, 2).toUpperCase()
  }

  const sizeStyles = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-12 h-12 text-base font-semibold',
  }[size]

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <div
        className={`rounded-full flex items-center justify-center bg-[#FFE5EA] text-[#FF385C] border border-[#FFD2D9] select-none ${sizeStyles} ${className}`}
        title={`${name}${role ? ` (${role})` : ''}`}
      >
        {getInitials(name)}
      </div>
      {role && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#008A05] border-2 border-white"
          title="Active staff"
        />
      )}
    </div>
  )
}
