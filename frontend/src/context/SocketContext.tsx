'use client'
import {
  createContext, useContext, useEffect,
  useState, type ReactNode
} from 'react'

const SOCKET_URL = 'https://vibechops.onrender.com'

const SocketContext = createContext<any>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let s: any = null

    import('socket.io-client').then(({ io }) => {
      s = io(SOCKET_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        timeout: 10000,
      })

      s.on('connect', () => {
        console.log('Socket connected')
      })

      s.on('connect_error', (err: any) => {
        console.warn('Socket connection error:', err.message)
      })

      setSocket(s)
    })

    return () => {
      if (s) s.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
export default SocketContext
