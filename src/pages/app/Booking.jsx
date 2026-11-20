// Réserver une table : personnes, jour, créneau, puis coordonnées.
// Si un créneau est complet, on peut s'inscrire sur la liste d'attente.
import { useEffect, useState } from 'react'
import { socket } from '../../socket.js'
import { MSG } from '../../../shared/messages.js'
import { DIETS } from '../../../shared/menu.js'
import { MAX_GUESTS, OCCASIONS, PLACEMENTS, nextDays, formatDay, tablesNeeded } from '../../../shared/booking.js'

const EMPTY_FORM = { name: '', phone: '', occasion: 'Aucune', placement: 'Pas de préférence', diets: [], note: '' }

export default function Booking({ onSeeMine }) {
  const days = nextDays()
  const [guests, setGuests] = useState(2)
  const [date, setDate] = useState(days[0])
  const [services, setServices] = useState(null)
  const [time, setTime] = useState(null)
  const [waiting, setWaiting] = useState(false) // mode liste d'attente
  const [step, setStep] = useState('choix') // choix, infos, fait
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  // A chaque changement de jour ou de nombre de personnes, on redemande les créneaux.
  useEffect(() => {
    setTime(null)
    setServices(null)
    socket.emit(MSG.RESA_AVAILABILITY, { date, guests }, (res) => setServices(res.services))
  }, [date, guests])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const toggleDiet = (d) => set('diets', form.diets.includes(d) ? form.diets.filter((x) => x !== d) : [...form.diets, d])
  const allSlots = services ? Object.values(services).flatMap((s) => s.slots) : []
  const hasFull = allSlots.some((s) => !s.free && !s.past)

  function confirm() {
    const msg = waiting ? MSG.WAIT_JOIN : MSG.RESA_CREATE
    socket.emit(msg, { date, time, guests, ...form }, (res) => {
      if (res.error) { setError(res.error); setStep('choix'); return }
      setError(null)
      setDone(res.resa ?? { ...res.entry, waiting: true })
      setStep('fait')
    })
  }

  function restart() {
    setStep('choix'); setDone(null); setWaiting(false); setForm(EMPTY_FORM); setTime(null)
  }

  if (step === 'fait') {
    return (
      <section className="card center-text">
        <div className="big-check">{done.waiting ? '…' : '✓'}</div>
        <h2>{done.waiting ? "Vous êtes sur la liste d'attente" : 'Table réservée'}</h2>
        <p>{formatDay(done.date, true)} à {done.time}<br />{done.guests} personne(s) au nom de {done.name}</p>
        {done.waiting
          ? <p className="muted small">On vous prévient ici dès qu'une table se libère.</p>
          : <p className="muted small">Code de réservation <strong>{done.id}</strong>. Partagez le lien à vos invités depuis Mes réservations.</p>}
        <button className="wide" onClick={onSeeMine}>Voir mes réservations</button>
        <button className="wide ghost" onClick={restart}>Nouvelle réservation</button>
      </section>
    )
  }

  if (step === 'infos') {
    return (
      <section className="card">
        <button className="link" onClick={() => setStep('choix')}>‹ Retour</button>
        {waiting && <p className="tag-wait">Liste d'attente</p>}
        <h2>{formatDay(date, true)} à {time}</h2>
        <p className="muted">{guests} personne(s){tablesNeeded(guests) > 1 && ', deux tables couplées'}</p>

        <label className="field">Nom<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="field">Téléphone<input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></label>

        {!waiting && (
          <>
            <h3>Occasion</h3>
            <div className="chips">
              {OCCASIONS.map((o) => (
                <button key={o} className={'chip-btn' + (form.occasion === o ? ' on' : '')} onClick={() => set('occasion', o)}>{o}</button>
              ))}
            </div>

            <h3>Placement souhaité</h3>
            <div className="chips">
              {PLACEMENTS.map((p) => (
                <button key={p} className={'chip-btn' + (form.placement === p ? ' on' : '')} onClick={() => set('placement', p)}>{p}</button>
              ))}
            </div>

            <h3>Vos régimes</h3>
            <p className="muted small">Vos invités pourront donner les leurs avec un lien après la réservation.</p>
            <div className="chips">
              {DIETS.map((d) => (
                <button key={d} className={'chip-btn' + (form.diets.includes(d) ? ' on' : '')} onClick={() => toggleDiet(d)}>{d}</button>
              ))}
            </div>

            <label className="field">Une demande particulière<input value={form.note} placeholder="Facultatif" onChange={(e) => set('note', e.target.value)} /></label>
          </>
        )}

        <button className="wide" disabled={!form.name.trim() || !form.phone.trim()} onClick={confirm}>
          {waiting ? "M'inscrire sur la liste d'attente" : 'Confirmer la réservation'}
        </button>
      </section>
    )
  }

  return (
    <>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3 className="first">Nombre de personnes</h3>
        <div className="stepper">
          <button className="ghost" disabled={guests <= 1} onClick={() => setGuests(guests - 1)}>−</button>
          <span>{guests}</span>
          <button className="ghost" disabled={guests >= MAX_GUESTS} onClick={() => setGuests(guests + 1)}>+</button>
        </div>
        {guests > 4 && <p className="muted small">À partir de 5, on vous installe sur deux tables couplées.</p>}
        {guests >= MAX_GUESTS && <p className="muted small">Pour plus de {MAX_GUESTS} personnes, appelez le restaurant.</p>}
      </section>

      <section className="card">
        <h3 className="first">Jour</h3>
        <div className="days">
          {days.map((d) => (
            <button key={d} className={'day' + (d === date ? ' on' : '')} onClick={() => setDate(d)}>{formatDay(d)}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="item-line">
          <h3 className="first">{waiting ? "Créneau pour la liste d'attente" : 'Heure'}</h3>
          {(hasFull || waiting) && (
            <button className="link" onClick={() => { setWaiting(!waiting); setTime(null) }}>
              {waiting ? 'Retour aux créneaux libres' : "Complet ? Liste d'attente"}
            </button>
          )}
        </div>
        {!services && <p className="muted">Chargement…</p>}
        {services && Object.entries(services).map(([key, s]) => (
          <div key={key} className="service">
            <div className="muted small">{s.label}</div>
            <div className="slots">
              {s.slots.map((slot) => {
                // En mode liste d'attente, on choisit au contraire un créneau complet.
                const selectable = waiting ? !slot.free && !slot.past : slot.free
                return (
                  <button
                    key={slot.time}
                    className={'slot' + (time === slot.time ? ' on' : '') + (waiting && selectable ? ' full' : '')}
                    disabled={!selectable}
                    onClick={() => setTime(slot.time)}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {services && !waiting && allSlots.every((x) => !x.free) && (
          <p className="muted small">Complet ce jour-là. Essayez un autre jour ou la liste d'attente.</p>
        )}
      </section>

      <button className="wide sticky" disabled={!time} onClick={() => setStep('infos')}>
        {time ? `Continuer · ${formatDay(date)} à ${time}` : 'Choisissez un créneau'}
      </button>
    </>
  )
}
