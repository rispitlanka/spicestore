import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: string
  size?: string
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-semibold text-[#2F6B3C] bg-transparent font-sans',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
