// Le téléphone du client : espace privé.
// Il sert à deux choses : donner ses régimes et allergies à la cuisine,
// et modifier un plat quand le client appuie sur Modifier dans sa zone de la table.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { socket, useJoin, useMessage } from '../socket.js'
import { MSG } from '../../shared/messages.js'
import { findDish, modsSummary, DIETS } from '../../shared/menu.js'
import { isPending } from '../../shared/rules.js'
import ConnectionBadge from '../components/ConnectionBadge.jsx'
import ItemStatus from '../components/ItemStatus.jsx'
import RequestStatus from '../components/RequestStatus.jsx'

// Un identifiant gardé dans le téléphone, pour retrouver sa place si la page recharge.
function getClientId() {
  let id = localStorage.getItem('comclick-client')
  if (!id) {
    id = Math.random().toString(36).slice(2)
    localStorage.setItem('comclick-client', id)
  }
  return id
}

export default function Mobile() {
  const params = useParams()
  const tableId = Number(params.tableId)
  const seatFromQr = Number(params.seat)
  const connected = useJoin('mobile', tableId)
  const [table, setTable] = useState(null)
  const [seat, setSeat] = useState(null)
  const [error, setError] = useState(null)
  const [diets, setDiets] = useState([])
  const [allergies, setAllergies] = useState('')
  const [dietSaved, setDietSaved] = useState(true)
  const clientId = getClientId()

  useMessage(MSG.TABLE_STATE, setTable)

  // Dès que la table est ouverte, on se lie à la place du QR.
  useEffect(() => {
    if (!connected || !table?.open) return
    socket.emit(MSG.CLIENT_JOIN, { tableId, seat: seatFromQr, clientId }, (res) => {
      if (res.error) return setError(res.error)
      setSeat(res.seat)
      setDiets(res.diets)
      setAllergies(res.allergies)
      setError(null)
    })
  }, [connected, table?.open, tableId, seatFromQr, clientId])

  function toggleDiet(d) {
    setDiets((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]))
    setDietSaved(false)
  }

  function saveDiet() {
    socket.emit(MSG.DIET_SET, { tableId, clientId, diets, allergies })
    setDietSaved(true)
  }

  const me = table?.clients.find((c) => c.seat === seat)
  const myItems = table?.items.filter((i) => i.seat === seat) ?? []
  const editingItem = me?.editing ? myItems.find((i) => i.id === me.editing) : null

  return (
    <div className="page mobile">
      <ConnectionBadge connected={connected} />
      <header className="mobile-brand-head"><a className="mobile-wordmark" href="/">COMCLICK<span>RESTAURANT</span></a><p className="eyebrow">VOTRE EXPÉRIENCE PRIVÉE</p><h1>À votre <em>table.</em></h1><p className="muted">Table {tableId}{seat ? ` · place ${seat}` : ''}</p></header>

      {table && !table.open && <p className="muted">La table n'est pas encore ouverte.</p>}
      {error && <p className="error">{error}</p>}

      {seat && editingItem && (
        <DishEditor
          key={editingItem.id}
          item={editingItem}
          onSend={(mods) => socket.emit(MSG.EDIT_REQUEST, { tableId, clientId, itemId: editingItem.id, mods })}
          onCancel={() => socket.emit(MSG.EDIT_CANCEL, { tableId, seat })}
        />
      )}

      {seat && !editingItem && (
        <>
          <section className="card">
            <h2>Mon régime</h2>
            <p className="muted small">Seule la cuisine le voit, il n'est pas affiché sur la table.</p>
            <div className="chips">
              {DIETS.map((d) => (
                <button key={d} className={'chip-btn' + (diets.includes(d) ? ' on' : '')} onClick={() => toggleDiet(d)}>
                  {d}
                </button>
              ))}
            </div>
            <label className="field">
              Allergies
              <input
                value={allergies}
                placeholder="Par exemple : arachides, fruits de mer"
                onChange={(e) => { setAllergies(e.target.value); setDietSaved(false) }}
              />
            </label>
            {dietSaved && (diets.length > 0 || allergies)
              ? <p className="ok-text">Transmis à la cuisine ✓</p>
              : <button className="wide" disabled={dietSaved} onClick={saveDiet}>Envoyer à la cuisine</button>}
          </section>

          <section className="card">
            <h2>Mes plats</h2>
            {myItems.length === 0 && <p className="muted">Choisissez vos plats dans votre zone sur la table.</p>}
            <ul className="list">
              {myItems.map((it) => (
                <li key={it.id} className="col">
                  <div className="item-line">
                    <span>{findDish(it.dishId).name}</span>
                    <ItemStatus status={it.status} />
                  </div>
                  <RequestStatus item={it} />
                </li>
              ))}
            </ul>
            {myItems.some((i) => i.status === 'choisi' && !isPending(i)) && (
              <p className="hint">Pour changer la cuisson ou retirer un ingrédient, appuyez sur Modifier à côté du plat sur la table.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

// L'écran de modification d'un plat.
function DishEditor({ item, onSend, onCancel }) {
  const dish = findDish(item.dishId)
  const start = item.mods ?? { cuisson: null, removed: [], note: '' }
  const [cuisson, setCuisson] = useState(start.cuisson)
  const [removed, setRemoved] = useState(start.removed)
  const [note, setNote] = useState(start.note)

  const mods = { cuisson, removed, note: note.trim() }
  const changed = modsSummary(mods) !== modsSummary(item.mods)

  function toggle(ing) {
    setRemoved((list) => (list.includes(ing) ? list.filter((x) => x !== ing) : [...list, ing]))
  }

  return (
    <section className="card editor">
      <p className="muted small">Modifier le plat</p>
      <h2 className="editor-title">{dish.name}</h2>

      {dish.cuissons && (
        <>
          <h3>Cuisson</h3>
          <div className="chips">
            {dish.cuissons.map((c) => (
              <button key={c} className={'chip-btn' + (cuisson === c ? ' on' : '')} onClick={() => setCuisson(cuisson === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <h3>Retirer un ingrédient</h3>
      <div className="chips">
        {dish.ingredients.map((ing) => (
          <button key={ing} className={'chip-btn' + (removed.includes(ing) ? ' removed' : '')} onClick={() => toggle(ing)}>
            {removed.includes(ing) ? 'Sans ' + ing.toLowerCase() : ing}
          </button>
        ))}
      </div>

      <label className="field">
        Une précision pour le chef
        <input value={note} maxLength={80} placeholder="Facultatif" onChange={(e) => setNote(e.target.value)} />
      </label>

      <p className="muted small">La cuisine a une minute pour dire si c'est possible.</p>
      <button className="wide" disabled={!changed} onClick={() => onSend(mods)}>Envoyer la demande en cuisine</button>
      <button className="wide ghost" onClick={onCancel}>Annuler</button>
    </section>
  )
}
