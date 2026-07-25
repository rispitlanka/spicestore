'use client'

import React from 'react'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { SRI_LANKA_DISTRICTS } from '@/lib/constants/districts'

export interface AddressFormData {
  addressLine1: string
  addressLine2: string
  city: string
  district: string
  postalCode: string
}

export interface AddressFormErrors {
  addressLine1?: string
  addressLine2?: string
  city?: string
  district?: string
  postalCode?: string
}

export interface AddressFormProps {
  value: AddressFormData
  onChange: (field: keyof AddressFormData, value: string) => void
  errors?: AddressFormErrors
  isSriLanka: boolean
  disabled?: boolean
}

export const AddressForm: React.FC<AddressFormProps> = ({
  value,
  onChange,
  errors = {},
  isSriLanka,
  disabled = false,
}) => {
  const districtOptions = SRI_LANKA_DISTRICTS.map((d) => ({
    label: d,
    value: d,
  }))

  return (
    <div className="space-y-4 font-sans">
      {/* Address Line 1 */}
      <Input
        label="Address Line 1"
        name="addressLine1"
        value={value.addressLine1}
        onChange={(e) => onChange('addressLine1', e.target.value)}
        placeholder="House/building number and street name"
        autoComplete="address-line1"
        error={errors.addressLine1}
        disabled={disabled}
        required
      />

      {/* Address Line 2 */}
      <Input
        label="Apartment, floor, landmark (optional)"
        name="addressLine2"
        value={value.addressLine2}
        onChange={(e) => onChange('addressLine2', e.target.value)}
        placeholder="Apartment, suite, floor, landmark, etc."
        autoComplete="address-line2"
        error={errors.addressLine2}
        disabled={disabled}
      />

      {/* City / Town & District / State Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City / Town"
          name="city"
          value={value.city}
          onChange={(e) => onChange('city', e.target.value)}
          placeholder="e.g. Jaffna or Colombo"
          autoComplete="address-level2"
          error={errors.city}
          disabled={disabled}
          required
        />

        {isSriLanka ? (
          <Select
            label="District"
            name="district"
            value={value.district}
            onChange={(e) => onChange('district', e.target.value)}
            placeholder="Select a district"
            options={districtOptions}
            error={errors.district}
            disabled={disabled}
            required
          />
        ) : (
          <Input
            label="State / Province / Region"
            name="district"
            value={value.district}
            onChange={(e) => onChange('district', e.target.value)}
            placeholder="e.g. State, Province or Region"
            autoComplete="address-level1"
            error={errors.district}
            disabled={disabled}
          />
        )}
      </div>

      {/* Postal Code */}
      <Input
        label="Postal Code"
        name="postalCode"
        value={value.postalCode}
        onChange={(e) => onChange('postalCode', e.target.value)}
        placeholder={isSriLanka ? 'e.g. 40000 (optional)' : 'Postal or ZIP code (optional)'}
        autoComplete="postal-code"
        error={errors.postalCode}
        disabled={disabled}
      />
    </div>
  )
}
