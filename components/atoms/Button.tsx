import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[4px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2F6B3C] disabled:opacity-50 select-none cursor-pointer disabled:cursor-not-allowed font-sans'

    const variants = {
      primary: 'bg-[#2F6B3C] text-white hover:bg-[#265730] active:bg-[#1E4627]',
      secondary: 'bg-white text-[#2F6B3C] border border-[#2F6B3C] hover:bg-[#2F6B3C]/5',
      outline: 'bg-white text-[#2F6B3C] border border-[#2F6B3C] hover:bg-[#2F6B3C]/5',
      text: 'bg-transparent text-[#2F6B3C] hover:underline p-0 min-h-0',
      ghost: 'bg-transparent text-[#2F6B3C] hover:underline p-0 min-h-0',
      danger: 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50',
    }

    const sizes = {
      sm: (variant === 'text' || variant === 'ghost') ? 'text-xs gap-1' : 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
      md: (variant === 'text' || variant === 'ghost') ? 'text-sm gap-1.5' : 'text-sm px-4 py-2 gap-2 min-h-[38px]',
      lg: (variant === 'text' || variant === 'ghost') ? 'text-base gap-2' : 'text-sm px-5 py-2.5 gap-2 min-h-[44px]',
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant] || variants.primary, sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
