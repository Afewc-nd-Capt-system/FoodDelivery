'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRoot() {
  const router = useRouter()
  useEffect(() => {
    if (typeof window === 'undefined') return
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.role === 'admin') {
      router.replace('/admin/dashboard')
    } else {
      router.replace('/admin/login')
    }
  }, [])
  return null
}
