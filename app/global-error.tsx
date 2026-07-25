'use client'

import React, { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#FFFFFF',
          color: '#1C2521',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#1C2521',
              marginBottom: '2rem',
            }}
          >
            YARL SAMAYAL
          </div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 600,
              color: '#1C2521',
              margin: '0 0 1rem 0',
              lineHeight: 1.25,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '0.9375rem',
              color: '#6B7570',
              margin: '0 0 1.5rem 0',
              lineHeight: 1.5,
            }}
          >
            We hit an unexpected error. Please try again, or head back to the homepage.
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: '#2F6B3C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                color: '#2F6B3C',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                padding: '0.625rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
              }}
            >
              Back to homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
