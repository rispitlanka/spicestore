'use client'

import React, { useEffect, useState } from 'react'
import { Select, SelectProps } from '../atoms/Select'
import { createClient } from '@/lib/supabase/client'
import { Tables } from '@/types/database'

export interface CountrySelectProps extends Omit<SelectProps, 'options'> {
  onCountryChange?: (countryId: string, country?: Tables<'countries'>) => void
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  onCountryChange,
  label = 'Country',
  placeholder = 'Select a country',
  error,
  helperText,
  disabled,
  ...props
}) => {
  const [countries, setCountries] = useState<Tables<'countries'>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchCountries = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('countries')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (err) throw err

        if (isMounted) {
          setCountries(data || [])
          setFetchError(null)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Failed to load countries'
          setFetchError(message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchCountries()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e)
    }
    if (onCountryChange) {
      const selected = countries.find((c) => c.id === e.target.value)
      onCountryChange(e.target.value, selected)
    }
  }

  const options = countries.map((c) => ({
    label: `${c.name} (${c.code})`,
    value: c.id,
  }))

  return (
    <Select
      label={label}
      value={value}
      onChange={handleChange}
      placeholder={isLoading ? 'Loading countries...' : placeholder}
      options={options}
      error={error || (fetchError ? fetchError : undefined)}
      helperText={helperText}
      disabled={disabled || isLoading}
      {...props}
    />
  )
}
