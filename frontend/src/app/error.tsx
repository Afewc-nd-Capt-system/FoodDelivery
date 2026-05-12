'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: '#FFF8F0',
      fontFamily: 'sans-serif', padding: '24px',
    }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg"
        style={{ background: 'linear-gradient(135deg, #E8621A 0%, #BE3A2A 100%)', marginBottom: '16px' }}>
        V
      </div>
      <h2 style={{ color: '#E8621A', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#636366', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
        We ran into an unexpected error. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          background: 'linear-gradient(135deg, #E8621A, #C4501A)',
          color: 'white', border: 'none', padding: '12px 24px',
          borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '14px',
        }}
      >
        Try again
      </button>
    </div>
  )
}
