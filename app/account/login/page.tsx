'use client'

export const dynamic = 'force-dynamic'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/atoms/Input'
import { Button } from '@/components/atoms/Button'
import { Spinner } from '@/components/atoms/Spinner'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please provide both email and password.')
      return
    }

    try {
      setIsSubmitting(true)
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        throw signInError
      }

      router.push(redirectUrl)
      router.refresh()
    } catch (err: unknown) {
      console.error('Login error:', err)
      const message = err instanceof Error ? err.message : 'Invalid email or password.'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-[4px] border border-[#E7ECE8] p-8 space-y-6 font-sans">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-[#1C2521] tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm text-[#6B7570]">
          Sign in to view order history and manage profile details.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-sm border border-[#E7ECE8] bg-white text-[#1C2521] text-xs font-normal">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="••••••••"
          autoComplete="current-password"
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
              <Spinner size="sm" /> Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="border-t border-[#E7ECE8] pt-6 text-center text-sm text-[#6B7570]">
        Don&apos;t have an account?{' '}
        <Link
          href={`/account/signup${redirectUrl !== '/account' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-medium text-[#2F6B3C] hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white text-[#1C2521] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <Suspense fallback={<Spinner size="lg" />}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
