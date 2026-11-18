// Étape 1 : lecture des bons de cuisine.
// Les actions sur les plats seront ajoutées dans les étapes suivantes.
import { useState } from 'react'
import { useJoin, useMessage } from '../socket.js'
import { MSG } from '../../shared/messages.js'
import { findDish, modsSummary } from '../../shared/menu.js'
import ConnectionBadge from '../components/ConnectionBadge.jsx'
import ItemStatus from '../components/ItemStatus.jsx'

export default function Cuisine() {
  const connected = useJoin('cuisine')
  const [tables, setTables] = useState([])
  useMessage(MSG.ALL_STATE, setTables)

  const activeTables = tables
    .map((table) => ({
      ...table,
      items: (table.items ?? []).filter((item) =>
        item.status === 'envoye' || item.status === 'pret'
      ),
    }))
    .filter((table) => table.items.length > 0)

  return (
    <main className="page cuisine-page">
      <ConnectionBadge connected={connected} />
      <header className="cuisine-header">
        <div className="cuisine-logo">COMCLICK</div>
        <p className="muted small">CUISINE / BONS DE COMMANDE</p>
        <h1>Service en cours</h1>
        <p className="muted small">{activeTables.length} table(s) avec des commandes</p>
      </header>

      {activeTables.length === 0 && (
        <section className="card cuisine-empty">
          <h2>Aucun bon en attente</h2>
          <p className="muted">Les commandes envoyées depuis la table tactile apparaîtront ici.</p>
        </section>
      )}

      <div className="cuisine-tickets">
        {activeTables.map((table) => (
          <section className="card cuisine-ticket appear" key={table.id}>
            <header className="cuisine-ticket-head">
              <div>
                <span className="cuisine-eyebrow">BON DE CUISINE</span>
                <h2>Table {table.id}</h2>
              </div>
              <span className="muted small">{table.items.length} plat(s)</span>
            </header>
            <ul className="list cuisine-list">
              {[...table.items]
                .sort((a, b) => a.seat - b.seat)
                .map((item) => {
                  const dish = findDish(item.dishId)
                  const client = (table.clients ?? []).find((c) => c.seat === item.seat)
                  const mods = modsSummary(item.mods)
                  return (
                    <li className="cuisine-dish" key={item.id}>
                      <div className="cuisine-seat">{String(item.seat).padStart(2, '0')}</div>
                      <div className="cuisine-dish-body">
                        <div className="cuisine-dish-line">
                          <strong>{dish?.name ?? 'Plat inconnu'}</strong>
                          <ItemStatus status={item.status} />
                        </div>
                        {mods && <p className="cuisine-detail">{mods}</p>}
                        {!!client?.diets?.length && (
                          <p className="cuisine-detail">Régime : {client.diets.join(', ')}</p>
                        )}
                        {!!client?.allergies && (
                          <p className="cuisine-allergy">Allergies : {client.allergies}</p>
                        )}
                        {item.request?.status === 'en_attente' && (
                          <p className="cuisine-request">Demande particulière à examiner — prochaine étape</p>
                        )}
                      </div>
                    </li>
                  )
                })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
