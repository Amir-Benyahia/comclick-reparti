// La page ouverte par un invité avec le lien partagé.
// Il donne son prénom, son régime et ses allergies, qui partent en cuisine avant le repas.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { socket, useJoin } from '../../socket.js'
import { MSG } from '../../../shared/messages.js'
import { DIETS } from '../../../shared/menu.js'
import { formatDay } from '../../../shared/booking.js'

export default function Invite() {
  const { code } = useParams()
  const connected = useJoin('invite')
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [diets, setDiets] = useState([])
  const [allergies, setAllergies] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!connected) return
    socket.emit(MSG.RESA_INVITE_INFO, { code }, (res) => (res.error ? setError(res.error) : setInfo(res.info)))
  }, [connected, code])

  const toggle = (d) => setDiets(diets.includes(d) ? diets.filter((x) => x !== d) : [...diets, d])

  function send() {
    socket.emit(MSG.RESA_GUEST_ADD, { code, name, diets, allergies }, (res) => (res.error ? setError(res.error) : setDone(true)))
  }

  return (
    <div className="app">
      <header className="app-head"><span className="app-logo">COMCLICK</span></header>
      <main className="app-main">
        {error && <p className="error">{error}</p>}
        {info && !done && (
          <section className="card">
            <p className="muted small">{info.host} vous invite</p>
            <h2>{formatDay(info.date, true)} à {info.time}</h2>
            <p className="muted">Table pour {info.guests}. Indiquez votre régime pour que la cuisine le prépare à l'avance.</p>
            <label className="field">Votre prénom<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <h3>Régime</h3>
            <div className="chips">
              {DIETS.map((d) => (
                <button key={d} className={'chip-btn' + (diets.includes(d) ? ' on' : '')} onClick={() => toggle(d)}>{d}</button>
              ))}
            </div>
            <label className="field">Allergies<input value={allergies} placeholder="Facultatif" onChange={(e) => setAllergies(e.target.value)} /></label>
            <button className="wide" disabled={!name.trim()} onClick={send}>Envoyer</button>
          </section>
        )}
        {done && (
          <section className="card center-text">
            <div className="big-check">✓</div>
            <h2>Merci {name} !</h2>
            <p className="muted">La cuisine est prévenue. À bientôt chez COMCLICK.</p>
          </section>
        )}
      </main>
    </div>
  )
}
