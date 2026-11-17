// Renvoie le nombre de secondes restantes avant une date limite.
import { useEffect, useState } from 'react'

export function useCountdown(deadline) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!deadline) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [deadline])
  if (!deadline) return 0
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function formatSeconds(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
