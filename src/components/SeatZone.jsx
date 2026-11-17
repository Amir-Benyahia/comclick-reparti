// La zone personnelle d'un client sur la table.
// A gauche la carte, à droite sa commande. Les zones du haut sont tournées
// pour les clients assis en face.
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CATEGORIES, MENU, findDish } from '../../shared/menu.js'
import { isPending } from '../../shared/rules.js'
import ItemStatus from './ItemStatus.jsx'
import RequestStatus from './RequestStatus.jsx'

export default function SeatZone({ seat, client, items, flipped, roundOpen, canValidate, qrUrl, actions }) {
  const [category, setCategory] = useState(CATEGORIES[0])
  const cls = 'zone' + (flipped ? ' flipped' : '')

  // Place libre : le client touche sa zone pour commencer.
  if (!client) {
    return (
      <div className={cls + ' empty'}>
        <div className="zone-title">Place {seat}</div>
        <button className="start" onClick={() => actions.open(seat)}>Commencer ma commande</button>
      </div>
    )
  }

  const drafts = items.filter((i) => i.status === 'choisi')
  const total = drafts.reduce((sum, i) => sum + findDish(i.dishId).price, 0)
  const linked = !!client.clientId

  return (
    <div className={cls + ' on' + (client.validated ? ' validated' : '')}>
      <div className="zone-head">
        <div className="zone-title">Place {seat}</div>
        {linked
          ? <span className="chip">Téléphone lié</span>
          : (
            <div className="link-phone">
              <span>Scannez pour vos régimes<br />et modifier un plat</span>
              <div className="qr"><QRCodeSVG value={qrUrl} size={58} /></div>
            </div>
          )}
      </div>

      <div className="zone-body">
        {/* La carte */}
        <div className="zone-menu">
          <div className="tabs">
            {CATEGORIES.map((c) => (
              <button key={c} className={'tab' + (c === category ? ' active' : '')} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="dishes">
            {MENU.filter((d) => d.category === category).map((d) => (
              <button key={d.id} className="dish" onClick={() => actions.add(seat, d.id)}>
                <span>{d.name}</span>
                <span className="dish-price">{d.price} €<b>+</b></span>
              </button>
            ))}
          </div>
        </div>

        {/* Sa commande */}
        <div className="zone-order">
          <div className="zone-sub">Ma commande</div>
          {items.length === 0 && <p className="muted small">Touchez un plat pour l'ajouter</p>}
          <ul className="zone-list">
            {items.map((it) => {
              const editable = it.status === 'choisi' && !isPending(it)
              const editing = client.editing === it.id
              return (
                <li key={it.id} className="appear">
                  <div className="item-line">
                    <span>{findDish(it.dishId).name}</span>
                    {it.status !== 'choisi' && <ItemStatus status={it.status} />}
                    {editable && !editing && (
                      <span className="item-actions">
                        {linked && <button className="mini" onClick={() => actions.edit(seat, it.id)}>Modifier</button>}
                        <button className="mini ghost" onClick={() => actions.remove(seat, it.id)}>✕</button>
                      </span>
                    )}
                  </div>
                  {editing
                    ? (
                      <div className="req editing">
                        Continuez sur votre téléphone
                        <button className="mini ghost" onClick={() => actions.cancelEdit(seat)}>Annuler</button>
                      </div>
                    )
                    : <RequestStatus item={it} />}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="zone-footer">
        <span className="muted">{drafts.length > 0 ? `Total ${total} €` : ''}</span>
        {!canValidate && <span className="muted small">En attente de la cuisine…</span>}
        {roundOpen && (
          <button
            className={client.validated ? 'ghost' : ''}
            disabled={!client.validated && !canValidate}
            onClick={() => actions.validate(seat, !client.validated)}
          >
            {client.validated ? 'Validé ✓  Modifier' : 'Valider ma commande'}
          </button>
        )}
      </div>
    </div>
  )
}
