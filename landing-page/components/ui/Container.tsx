import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  size?: 'sm' | 'default' | 'lg' | 'full'
}

const sizeClasses = {
  sm: 'max-w-3xl',
  default: 'max-w-6xl',
  lg: 'max-w-7xl',
  full: 'max-w-full',
}

export function Container({ children, className, as: Tag = 'div', size = 'default' }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </Tag>
  )
}
