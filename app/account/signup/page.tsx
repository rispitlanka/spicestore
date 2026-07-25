'use client'

export const dynamic = 'force-dynamic'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/account'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setIsSubmitting(true)
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      const user = data.user
      if (user) {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .upsert(
            {
              id: user.id,
              full_name: fullName.trim(),
            } as any,
            { onConflict: 'id' }
          )

        if (profileError) {
          console.warn('Profile upsert warning:', profileError)
        }
      }

      if (data.session) {
        router.push(redirectUrl)
        router.refresh()
      } else {
        setSuccessMessage(
          'Account created successfully! Please check your email to verify your account.'
        )
        setIsSubmitting(false)
      }
    } catch (err: unknown) {
      console.error('Signup error:', err)
      const message = err instanceof Error ? err.message : 'An error occurred during account creation.'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-[4px] border border-[#E7ECE8] p-8 space-y-6 font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#1C2521] tracking-tight">
          Create an Account
        </h1>
        <p className="text-sm text-[#6B7570]">
          Register to track your orders and save delivery info.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#1C2521] text-xs font-normal">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-[4px] border border-[#E7ECE8] bg-white text-[#2F6B3C] text-xs font-normal space-y-2">
          <p>{successMessage}</p>
          <Link
            href={`/account/login${redirectUrl !== '/account' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
            className="font-medium underline block"
          >
            Go to Login →
          </Link>
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. John Doe"
            autoComplete="name"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Creating Account...
              </span>
            ) : (
              'Sign Up'
            )}
          </Button>
        </form>
      )}

      <div className="border-t border-[#E7ECE8] pt-6 text-center text-sm text-[#6B7570]">
        Already have an account?{' '}
        <Link
          href={`/account/login${redirectUrl !== '/account' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-medium text-[#2F6B3C] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <Suspense fallback={<Spinner size="lg" />}>
        <SignupForm />
      </Suspense>
    </main>
  )
}
