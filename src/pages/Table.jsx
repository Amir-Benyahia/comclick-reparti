// La table tactile : espace de groupe.
// Comme la v1 : une zone par client sur les bords, deux en haut et deux en bas.
// Chaque client commande dans sa zone. Le centre sert à envoyer la commande en cuisine.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { socket, useJoin, useMessage } from '../socket.js'
import { MSG } from '../../shared/messages.js'
import { canSend } from '../../shared/rules.js'
import ConnectionBadge from '../components/ConnectionBadge.jsx'
import SeatZone from '../components/SeatZone.jsx'

export default function Table() {
  const tableId = Number(useParams().tableId)
  const connected = useJoin('table', tableId)
  const [table, setTable] = useState(null)
  const [justSent, setJustSent] = useState(false)

  useMessage(MSG.TABLE_STATE, setTable)

  if (!table?.open) {
    return (
      <div className="tabletop waiting">
        <ConnectionBadge connected={connected} />
        <h1>COMCLICK</h1>
        <p className="muted">Table {tableId} · en attente de la réception</p>
      </div>
    )
  }

  // Ce que les zones peuvent demander au serveur.
  const actions = {
    open: (seat) => socket.emit(MSG.SEAT_OPEN, { tableId, seat }),
    add: (seat, dishId) => socket.emit(MSG.ORDER_ADD, { tableId, seat, dishId }),
    remove: (seat, itemId) => socket.emit(MSG.ORDER_REMOVE, { tableId, seat, itemId }),
    validate: (seat, validated) => socket.emit(MSG.SEAT_VALIDATE, { tableId, seat, validated }),
  }

  function send() {
    socket.emit(MSG.ORDER_SEND, { tableId })
    setJustSent(true)
    setTimeout(() => setJustSent(false), 3000)
  }

  const roundOpen = table.items.some((i) => i.status === 'choisi')
  const ready = canSend(table)
  const validated = table.clients.filter((c) => c.validated).length

  const zone = (seat, flipped) => (
    <SeatZone
      seat={seat}
      client={table.clients.find((c) => c.seat === seat)}
      items={table.items.filter((i) => i.seat === seat)}
      flipped={flipped}
      roundOpen={roundOpen}
      actions={actions}
    />
  )

  return (
    <div className="tabletop">
      <div className="row">{zone(1, true)}{zone(2, true)}</div>

      <div className="center">
        <div className="muted">
          Table {tableId}
        </div>
        <div className="center-action">
          {justSent && <div className="sent-msg">Commande envoyée en cuisine</div>}
          {!justSent && ready && (
            <button className="send" onClick={send}>Envoyer la commande en cuisine</button>
          )}
          {!justSent && !ready && roundOpen && (
            <p className="muted">{validated} / {table.clients.length} client(s) ont validé</p>
          )}
          {!justSent && !roundOpen && <p className="muted">Bienvenue, touchez votre zone pour commander</p>}
        </div>
        <div className="center-logo">
          COMCLICK
          <ConnectionBadge connected={connected} />
        </div>
      </div>

      <div className="row">{zone(3, false)}{zone(4, false)}</div>
    </div>
  )
}
