'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setErrorMessage('Access Denied: Your account does not have admin permissions.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Verify admin role in admin_users table
        const { data: adminRow, error: adminErr } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (adminErr || !adminRow) {
          await supabase.auth.signOut()
          setErrorMessage('Access Denied: You do not have administrator permissions.')
          setLoading(false)
          return
        }

        // Redirect to admin panel
        router.push('/admin')
        router.refresh()
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred during login.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground font-black text-2xl shadow-md mb-2">
          Y
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          Admin Portal
        </h1>
        <p className="text-sm text-muted">
          Sign in to manage catalog, orders, and shipping rules.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700 animate-in fade-in">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          required
          placeholder="admin@yarlsamayal.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <Input
          label="Password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full font-semibold mt-2"
          isLoading={loading}
          disabled={loading}
        >
          Sign In as Admin
        </Button>
      </form>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-muted font-medium">Loading...</div>}>
        <AdminLoginForm />
      </Suspense>
    </main>
  )
}
