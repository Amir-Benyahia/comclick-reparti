// Les réservations faites depuis ce téléphone, et sa liste d'attente.
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { socket } from '../../socket.js'
import { MSG } from '../../../shared/messages.js'
import { formatDay } from '../../../shared/booking.js'

const STATUS = { confirmee: 'Confirmée', installee: 'Vous êtes à table', annulee: 'Annulée' }
const WAIT = { attente: "Sur liste d'attente", proposee: 'Table libérée !', annulee: 'Abandonnée' }

// Le lien que l'on partage aux invités. Avec l'IP du PC pour qu'il marche depuis un autre téléphone.
function useInviteBase() {
  const [base, setBase] = useState(location.origin)
  useEffect(() => {
    fetch('/api/info').then((r) => r.json()).then((d) => setBase(`http://${d.ip}:${location.port}`)).catch(() => {})
  }, [])
  return base
}

function Invite({ resa, base }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const link = `${base}/app/invite/${resa.id}`

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Notre table chez COMCLICK', text: 'Indique tes régimes pour le repas', url: link }) } catch { /* annulé */ }
      return
    }
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setOpen(true) }
  }

  return (
    <div className="invite">
      <h3>Mes invités</h3>
      <p className="muted small">
        {resa.guestList.length} / {resa.guests - 1} ont donné leurs régimes. La cuisine les reçoit avant votre arrivée.
      </p>
      {resa.guestList.map((g, i) => (
        <p key={i} className="small">✓ {g.name}{g.diets.length > 0 && ` · ${g.diets.join(', ')}`}{g.allergies && ` · allergie : ${g.allergies}`}</p>
      ))}
      {resa.guests > 1 && resa.guestList.length < resa.guests - 1 && (
        <div className="row-btns">
          <button className="ghost" onClick={share}>{copied ? 'Lien copié ✓' : 'Partager le lien'}</button>
          <button className="ghost" onClick={() => setOpen(!open)}>{open ? 'Masquer' : 'QR code'}</button>
        </div>
      )}
      {open && (
        <div className="invite-qr">
          <div className="qr"><QRCodeSVG value={link} size={140} /></div>
          <p className="small muted">{link}</p>
        </div>
      )}
    </div>
  )
}

export default function MyBookings({ mine }) {
  const base = useInviteBase()
  const { resas, waitlist } = mine

  if (resas.length === 0 && waitlist.length === 0) return <p className="muted">Aucune réservation pour l'instant.</p>

  return (
    <>
      {waitlist.map((w) => (
        <section key={w.id} className={'card' + (w.status === 'annulee' ? ' faded' : '')}>
          <div className="item-line">
            <h2>{formatDay(w.date, true)} à {w.time}</h2>
            <span className="status envoye">{WAIT[w.status]}</span>
          </div>
          <p>{w.guests} personne(s). On vous prévient dès qu'une table se libère.</p>
          {w.status === 'attente' && (
            <button className="wide ghost" onClick={() => socket.emit(MSG.WAIT_DECLINE, { id: w.id })}>Quitter la liste d'attente</button>
          )}
        </section>
      ))}

      {resas.map((r) => (
        <section key={r.id} className={'card' + (r.status === 'annulee' ? ' faded' : '')}>
          <div className="item-line">
            <h2>{formatDay(r.date, true)} à {r.time}</h2>
            <span className={'status ' + (r.status === 'annulee' ? 'servi' : 'pret')}>{STATUS[r.status]}</span>
          </div>
          <p>{r.guests} personne(s) au nom de {r.name}</p>
          <p className="muted small">
            Code <strong>{r.id}</strong>
            {r.occasion !== 'Aucune' && ` · ${r.occasion}`}
            {r.placement !== 'Pas de préférence' && ` · ${r.placement}`}
            {r.confirmed && ' · venue confirmée ✓'}
          </p>
          {r.status === 'installee' && <p className="small">Table {r.tableIds.join(' + ')}</p>}
          {r.status === 'confirmee' && <Invite resa={r} base={base} />}
          {r.status === 'confirmee' && (
            <button className="wide ghost" onClick={() => socket.emit(MSG.RESA_CANCEL, { id: r.id })}>Annuler la réservation</button>
          )}
        </section>
      ))}
    </>
  )
}
