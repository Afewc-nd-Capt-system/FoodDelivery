'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', backgroundColor: '#FFF8F0',
        fontFamily: 'sans-serif'
      }}>
        <h2 style={{ color: '#E8621A' }}>Something went wrong</h2>
        <button
          onClick={reset}
          style={{
            background: 'linear-gradient(135deg, #E8621A, #C4501A)',
            color: 'white', border: 'none', padding: '12px 24px',
            borderRadius: '12px', cursor: 'pointer', marginTop: '16px'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
