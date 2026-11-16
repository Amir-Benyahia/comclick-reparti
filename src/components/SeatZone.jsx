// La zone personnelle d'un client sur la table.
// A gauche la carte, à droite sa commande. Les zones du haut sont tournées
// pour les clients assis en face.
import { useState } from 'react'
import { CATEGORIES, MENU, findDish } from '../../shared/menu.js'
import ItemStatus from './ItemStatus.jsx'

export default function SeatZone({ seat, client, items, flipped, roundOpen, actions }) {
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

  return (
    <div className={cls + ' on' + (client.validated ? ' validated' : '')}>
      <div className="zone-head">
        <div className="zone-title">Place {seat}</div>
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
            {items.map((it) => (
              <li key={it.id} className="appear">
                <div className="item-line">
                  <span>{findDish(it.dishId).name}</span>
                  {it.status === 'choisi'
                    ? <button className="mini ghost" onClick={() => actions.remove(seat, it.id)}>✕</button>
                    : <ItemStatus status={it.status} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="zone-footer">
        <span className="muted">{drafts.length > 0 ? `Total ${total} €` : ''}</span>
        {roundOpen && (
          <button
            className={client.validated ? 'ghost' : ''}
            onClick={() => actions.validate(seat, !client.validated)}
          >
            {client.validated ? 'Validé ✓  Modifier' : 'Valider ma commande'}
          </button>
        )}
      </div>
    </div>
  )
}
