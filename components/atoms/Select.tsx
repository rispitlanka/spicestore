import React from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: SelectOption[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, helperText, options, placeholder, children, id, disabled, ...props },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId

    return (
      <div className="w-full space-y-1 font-sans">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#1C2521]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full min-h-[44px] appearance-none rounded-[4px] border border-[#E7ECE8] bg-white pl-3 pr-10 py-2.5 text-base sm:text-sm text-[#1C2521] transition-colors focus:border-[#2F6B3C] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
              error && 'border-rose-500 focus:border-rose-500',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B7570]">
            <svg
              className="h-4 w-4 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-normal">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#6B7570] font-normal">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'
