'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '@/lib/currency'

export const CurrencySwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currency, setCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeInfo = getCurrencyInfo(currency)
  const availableCurrencies = Object.values(DEFAULT_CURRENCIES)

  // Outside click & ESC key handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] px-2 py-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#1C2521] hover:text-[#2F6B3C] border border-transparent hover:border-[#E7ECE8] rounded-[4px] transition-colors cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Select Store Currency"
      >
        <span className="text-sm">{activeInfo.flag}</span>
        <span className="font-semibold">{activeInfo.code}</span>
        <span className="text-[#6B7570] text-[10px]">({activeInfo.symbol})</span>
        <svg
          className={`w-3 h-3 text-[#6B7570] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-[4px] bg-white border border-[#E7ECE8] shadow-lg z-50 overflow-hidden text-xs py-1 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7570] border-b border-[#E7ECE8] bg-[#F4F6F4]">
            Select Currency
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-[#E7ECE8]/50">
            {availableCurrencies.map((item) => {
              const isSelected = item.code === activeInfo.code
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setCurrency(item.code)
                    setIsOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2F6B3C]/10 text-[#2F6B3C] font-semibold'
                      : 'text-[#1C2521] hover:bg-[#F4F6F4]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.flag}</span>
                    <div>
                      <span className="font-medium">{item.code}</span>
                      <span className="text-[10px] text-[#6B7570] ml-1">({item.symbol})</span>
                    </div>
                  </div>

                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-[#2F6B3C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
