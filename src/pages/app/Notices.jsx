// Les messages en haut de l'appli : rappel de la veille et place libérée sur la liste d'attente.
import { socket } from '../../socket.js'
import { MSG } from '../../../shared/messages.js'
import { dateKey, formatDay } from '../../../shared/booking.js'

function isSoon(date) {
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  return date === dateKey(today) || date === dateKey(tomorrow)
}

export default function Notices({ mine }) {
  // Rappel : réservation aujourd'hui ou demain, pas encore confirmée.
  const reminders = mine.resas.filter((r) => r.status === 'confirmee' && !r.confirmed && isSoon(r.date))
  const offers = mine.waitlist.filter((w) => w.status === 'proposee')

  return (
    <>
      {offers.map((w) => (
        <div key={w.id} className="notice-card good">
          <strong>Une table s'est libérée !</strong>
          <p>{formatDay(w.date, true)} à {w.time} pour {w.guests} personne(s).</p>
          <div className="row-btns">
            <button onClick={() => socket.emit(MSG.WAIT_ACCEPT, { id: w.id })}>Je la prends</button>
            <button className="ghost" onClick={() => socket.emit(MSG.WAIT_DECLINE, { id: w.id })}>Non merci</button>
          </div>
        </div>
      ))}
      {reminders.map((r) => (
        <div key={r.id} className="notice-card">
          <strong>Rappel : votre table est {r.date === dateKey(new Date()) ? "aujourd'hui" : 'demain'} à {r.time}</strong>
          <p>{r.guests} personne(s) au nom de {r.name}. Vous venez toujours ?</p>
          <div className="row-btns">
            <button onClick={() => socket.emit(MSG.RESA_CONFIRM, { id: r.id })}>Je confirme</button>
            <button className="ghost" onClick={() => socket.emit(MSG.RESA_CANCEL, { id: r.id })}>J'annule</button>
          </div>
        </div>
      ))}
    </>
  )
}
