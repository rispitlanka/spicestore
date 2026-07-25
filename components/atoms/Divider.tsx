import React from 'react'
import { cn } from '@/lib/utils'

export type DividerProps = React.HTMLAttributes<HTMLHRElement>

export const Divider: React.FC<DividerProps> = ({ className, ...props }) => {
  return <hr className={cn('border-t border-[#E7ECE8] my-4 w-full', className)} {...props} />
}
