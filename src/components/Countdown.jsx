// Barre et compte à rebours pour une demande de modification.
import { useCountdown, formatSeconds } from '../useCountdown.js'
import { EDIT_DELAY_MS } from '../../shared/messages.js'

export default function Countdown({ deadline, label }) {
  const left = useCountdown(deadline)
  const ratio = (left * 1000) / EDIT_DELAY_MS
  return (
    <div className="countdown">
      <div className="countdown-text">
        <span>{label}</span>
        <strong>{formatSeconds(left)}</strong>
      </div>
      <div className="countdown-bar"><div style={{ width: ratio * 100 + '%' }} /></div>
    </div>
  )
}
