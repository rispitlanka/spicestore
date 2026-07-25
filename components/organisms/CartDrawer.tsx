/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { PriceTag } from '../atoms/PriceTag'
import { WeightTag } from '../atoms/WeightTag'
import { QuantitySelector } from '../molecules/QuantitySelector'
import { Button } from '../atoms/Button'
import { EmptyState } from '../atoms/EmptyState'

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalWeightKg,
    totalItems,
  } = useCart()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        closeCart()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isCartOpen])

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div
        className="fixed inset-0 bg-[#1C2521]/30 transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart Drawer"
          className="w-screen max-w-md bg-white flex flex-col border-l border-[#E7ECE8]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7ECE8]">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1C2521]">
                Shopping Cart
              </h2>
              {totalItems > 0 && (
                <span className="text-xs text-[#6B7570] font-normal">
                  ({totalItems})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={closeCart}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#6B7570] hover:text-[#1C2521] transition-colors cursor-pointer"
              aria-label="Close cart drawer"
            >
              ✕
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <EmptyState
                  title="Your cart is empty"
                  description="You haven't added any products to your cart yet."
                  action={
                    <Button variant="primary" size="md" onClick={closeCart}>
                      Start shopping
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-[#E7ECE8]">
                {items.map((item) => {
                  const formatAttributes = () => {
                    if (!item.variationAttributes) return null
                    const values = Object.values(item.variationAttributes).filter(Boolean)
                    if (values.length > 0) {
                      return values.join(' / ')
                    }
                    return null
                  }

                  const attrText = formatAttributes()

                  return (
                    <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[4px] border border-[#E7ECE8] bg-white flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="text-[10px] text-[#6B7570]">No image</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeCart}
                            className="text-xs font-semibold text-[#1C2521] hover:text-[#2F6B3C] transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-[#6B7570] hover:text-[#1C2521] cursor-pointer"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            Remove
                          </button>
                        </div>

                        {attrText && (
                          <p className="text-xs text-[#6B7570] font-normal">{attrText}</p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <PriceTag amount={item.price} size="sm" />
                          <WeightTag weightKg={item.weightKg} size="sm" />
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <QuantitySelector
                            size="sm"
                            value={item.quantity}
                            max={item.stock ?? 99}
                            onChange={(q) => updateQuantity(item.id, q)}
                          />
                          <PriceTag amount={item.price * item.quantity} size="sm" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && (
            <div className="border-t border-[#E7ECE8] bg-white p-6 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#6B7570]">
                  <span>Total Weight</span>
                  <WeightTag weightKg={totalWeightKg} unit="kg" size="md" />
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-[#1C2521] pt-1.5 border-t border-[#E7ECE8]">
                  <span>Subtotal</span>
                  <PriceTag amount={subtotal} size="lg" />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Link href="/checkout" onClick={closeCart} className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link href="/cart" onClick={closeCart} className="w-full">
                  <Button variant="secondary" size="md" className="w-full">
                    View Full Cart Page
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-[#6B7570] hover:text-[#1C2521] transition-colors text-center mt-1 cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
