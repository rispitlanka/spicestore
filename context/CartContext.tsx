'use client'

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { resolveDefaultCountryPrefill } from '@/lib/customers/default_country'

export interface CartItem {
  id: string
  productId: string
  variationId: string | null
  name: string
  slug: string
  price: number
  weightKg: number
  imageUrl: string | null
  variationAttributes?: Record<string, unknown> | null
  quantity: number
  stock?: number | null
}

export interface AddToCartInput {
  productId: string
  variationId?: string | null
  name: string
  slug: string
  price: number
  weightKg?: number | null
  imageUrl?: string | null
  variationAttributes?: Record<string, unknown> | null
  quantity?: number
  stock?: number | null
}

export interface SetSelectedCountryOptions {
  saveAsDefault?: boolean
}

export interface CartContextType {
  items: CartItem[]
  selectedCountryId: string
  savedDefaultCountryId: string | null
  setSelectedCountryId: (countryId: string, options?: SetSelectedCountryOptions) => void
  isCartOpen: boolean
  isHydrated: boolean
  addItem: (input: AddToCartInput) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  totalItems: number
  subtotal: number
  totalWeightKg: number
}

const STORAGE_KEY = 'yarlsamayal_cart_v1'
const COUNTRY_STORAGE_KEY = 'yarlsamayal_cart_country_v1'
const GUEST_COUNTRY_STORAGE_KEY = 'guest_default_country'

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()

  const [items, setItems] = useState<CartItem[]>([])
  const [selectedCountryId, setSelectedCountryIdState] = useState<string>('')
  const [guestDefaultCountryId, setGuestDefaultCountryId] = useState<string | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasPrefilledCountry, setHasPrefilledCountry] = useState(false)

  // Load cart items, initial country, and guest default from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
      const storedCountry = localStorage.getItem(COUNTRY_STORAGE_KEY)
      if (storedCountry) {
        setSelectedCountryIdState(storedCountry)
      }
      const guestStored = localStorage.getItem(GUEST_COUNTRY_STORAGE_KEY)
      if (guestStored) {
        setGuestDefaultCountryId(guestStored)
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage:', e)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Derived saved default country ID (Profile default for logged-in, localStorage for guest)
  const savedDefaultCountryId = useMemo(() => {
    if (user) {
      return profile?.default_country_id || null
    }
    return guestDefaultCountryId
  }, [user, profile?.default_country_id, guestDefaultCountryId])

  // Persist items to localStorage on change
  useEffect(() => {
    if (!isHydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e)
    }
  }, [items, isHydrated])

  // Prefill Logic according to priority order
  useEffect(() => {
    if (!isHydrated || authLoading || hasPrefilledCountry) return

    let currentSessionCountry = ''
    let guestCountry = ''
    try {
      currentSessionCountry = localStorage.getItem(COUNTRY_STORAGE_KEY) || ''
      guestCountry = localStorage.getItem(GUEST_COUNTRY_STORAGE_KEY) || ''
    } catch (e) {
      console.error(e)
    }

    const result = resolveDefaultCountryPrefill({
      activeSessionCountryId: currentSessionCountry,
      userProfileDefaultCountryId: profile?.default_country_id,
      guestLocalStorageCountryId: guestCountry,
      isLoggedIn: !!user,
    })

    if (result.countryId) {
      setSelectedCountryIdState(result.countryId)
      try {
        localStorage.setItem(COUNTRY_STORAGE_KEY, result.countryId)
      } catch (e) {
        console.error(e)
      }
    }

    setHasPrefilledCountry(true)
  }, [isHydrated, authLoading, user, profile, hasPrefilledCountry])

  // Capture logic when country selection changes
  const setSelectedCountryId = useCallback(
    (countryId: string, options?: SetSelectedCountryOptions) => {
      setSelectedCountryIdState(countryId)

      // Always update active session storage for current order/session
      if (typeof window !== 'undefined') {
        try {
          if (countryId) {
            localStorage.setItem(COUNTRY_STORAGE_KEY, countryId)
          } else {
            localStorage.removeItem(COUNTRY_STORAGE_KEY)
          }
        } catch (e) {
          console.error('Failed to update country storage:', e)
        }
      }

      // Update saved default only when explicitly requested (saveAsDefault: true)
      if (options?.saveAsDefault) {
        if (user) {
          const supabase = createClient() as any
          void (async () => {
            try {
              const { error } = await supabase
                .from('customer_profiles')
                .update({ default_country_id: countryId || null })
                .eq('id', user.id)

              if (!error) {
                await refreshProfile()
              }
            } catch (err) {
              console.error('Failed to update default country in profile:', err)
            }
          })()
        } else if (typeof window !== 'undefined') {
          try {
            if (countryId) {
              localStorage.setItem(GUEST_COUNTRY_STORAGE_KEY, countryId)
              setGuestDefaultCountryId(countryId)
            } else {
              localStorage.removeItem(GUEST_COUNTRY_STORAGE_KEY)
              setGuestDefaultCountryId(null)
            }
          } catch (e) {
            console.error('Failed to update guest country storage:', e)
          }
        }
      }
    },
    [user, refreshProfile]
  )

  const addItem = (input: AddToCartInput) => {
    const varKey = input.variationId ? input.variationId : 'default'
    const itemId = `${input.productId}-${varKey}`
    const qtyToAdd = Math.max(1, input.quantity ?? 1)
    const weight = input.weightKg ?? 0
    const stockLimit = input.stock != null ? input.stock : undefined

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === itemId)
      if (existingIndex > -1) {
        const existingItem = prevItems[existingIndex]
        const currentStock = stockLimit ?? existingItem.stock
        let newQty = existingItem.quantity + qtyToAdd
        if (currentStock != null && currentStock >= 0) {
          newQty = Math.min(newQty, currentStock)
        }
        const updated = [...prevItems]
        updated[existingIndex] = {
          ...existingItem,
          stock: currentStock,
          quantity: newQty,
        }
        return updated
      }

      let finalQty = qtyToAdd
      if (stockLimit != null && stockLimit >= 0) {
        finalQty = Math.min(finalQty, stockLimit)
      }

      const newItem: CartItem = {
        id: itemId,
        productId: input.productId,
        variationId: input.variationId || null,
        name: input.name,
        slug: input.slug,
        price: input.price,
        weightKg: weight,
        imageUrl: input.imageUrl || null,
        variationAttributes: input.variationAttributes || null,
        quantity: finalQty,
        stock: stockLimit,
      }

      return [...prevItems, newItem]
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        let newQty = quantity
        if (item.stock != null && item.stock >= 0) {
          newQty = Math.min(newQty, item.stock)
        }
        return { ...item, quantity: newQty }
      })
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)
  const toggleCart = () => setIsCartOpen((prev) => !prev)

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )

  const totalWeightKg = useMemo(
    () => items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0),
    [items]
  )

  const value = {
    items,
    selectedCountryId,
    savedDefaultCountryId,
    setSelectedCountryId,
    isCartOpen,
    isHydrated,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
    totalItems,
    subtotal,
    totalWeightKg,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
