import React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-[4px] border border-[#E7ECE8] bg-white my-4 font-sans space-y-2',
        className
      )}
      {...props}
    >
      <h3 className="text-base font-semibold text-[#1C2521] tracking-tight">{title}</h3>
      {description && <p className="text-sm text-[#6B7570] max-w-sm font-normal">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
