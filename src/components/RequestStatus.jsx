// La ligne sous un plat qui dit où en est sa modification.
import { modsSummary } from '../../shared/menu.js'
import Countdown from './Countdown.jsx'

export default function RequestStatus({ item }) {
  const r = item.request
  if (r?.status === 'en_attente') {
    return <Countdown deadline={r.deadline} label="Demande en cuisine" />
  }
  if (r?.status === 'refusee' || r?.status === 'expiree') {
    return (
      <div className="req refused">
        {r.status === 'refusee' ? 'Modification refusée' : 'Pas de réponse de la cuisine'}, plat servi comme sur la carte
      </div>
    )
  }
  if (item.mods) return <div className="req accepted">✓ {modsSummary(item.mods)}</div>
  return null
}
