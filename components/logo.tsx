import { ClipboardCheck } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md`}>
        <ClipboardCheck className={iconSizes[size]} strokeWidth={2.5} />
      </div>
      {showText && (
        <div>
          <div className={`${textSizes[size]} font-bold text-foreground leading-tight`}>
            AsistApp
          </div>
          <div className="text-xs text-muted-foreground">
            Control de asistencia
          </div>
        </div>
      )}
    </div>
  )
}
