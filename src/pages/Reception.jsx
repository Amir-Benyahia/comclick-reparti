// Réception COMCLICK
// Rôle : superviser la salle, ouvrir/fermer les tables, accueillir les clients.
// Protocole serveur :
//   - reçoit all:state (toutes les tables)
//   - envoie table:open { tableId } pour ouvrir une table
//   - envoie table:close { tableId } pour libérer une table
import { useState, useMemo } from 'react'
import { useJoin, useMessage, socket } from '../socket.js'
import { MSG } from '../../shared/messages.js'
import ConnectionBadge from '../components/ConnectionBadge.jsx'

// ----------------------------------------------------------------
// Petit feedback temporaire (toast)
// ----------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState(null)
  const show = (text, isError = false) => {
    setToast({ text, isError })
    setTimeout(() => setToast(null), 3000)
  }
  return [toast, show]
}

// ----------------------------------------------------------------
// Carte d'une table dans le plan de salle
// ----------------------------------------------------------------
function TableCard({ table, onOpen, onClose, linkMode, isSelectedForLink, onLinkToggle }) {
  const isClosed = !table.open
  const isOccupied = table.open && table.clients && table.clients.length > 0
  const hasItems = table.items && table.items.length > 0

  let statusLabel = 'Libre'
  let statusClass = 'rx-status-libre'
  if (isClosed) { statusLabel = 'Fermée'; statusClass = 'rx-status-fermee' }
  else if (isOccupied) { statusLabel = 'Occupée'; statusClass = 'rx-status-occupee' }

  const servingCount = (table.items || []).filter(i => i.status === 'pret').length

  return (
    <div
      className={`card rx-table-card ${statusClass}${isSelectedForLink ? ' rx-selected-link' : ''}`}
      onClick={() => { if (linkMode) onLinkToggle(table.id) }}
    >
      <div className="rx-table-top">
        <strong className="rx-table-num">Table {table.id}</strong>
        <span className={`status rx-status-pill ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="rx-table-info">
        {isOccupied && (
          <div className="small muted">
            {table.clients.length} convive(s) assis
            {servingCount > 0 && <span className="ok-text"> · {servingCount} prêt(s)</span>}
          </div>
        )}
        {hasItems && isOccupied && (
          <div className="small muted">{table.items.length} plat(s) commandé(s)</div>
        )}
      </div>

      {!linkMode && (
        <div className="rx-table-actions">
          {isClosed ? (
            <button
              className="wide"
              style={{ marginTop: 10 }}
              onClick={e => { e.stopPropagation(); onOpen(table.id) }}
            >
              Ouvrir
            </button>
          ) : (
            <button
              className="ghost wide"
              style={{ marginTop: 10 }}
              onClick={e => { e.stopPropagation(); onClose(table.id) }}
            >
              Libérer
            </button>
          )}
        </div>
      )}

      {linkMode && (
        <div className="small" style={{ marginTop: 10, color: isSelectedForLink ? 'var(--gold)' : 'var(--muted)' }}>
          {isSelectedForLink ? '✓ Sélectionnée' : 'Toucher pour sélectionner'}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Page principale — Réception
// ----------------------------------------------------------------
export default function Reception() {
  // useJoin émet MSG.JOIN { role } et renvoie l'état de connexion
  const connected = useJoin('reception')

  // État des tables envoyé par le serveur via all:state
  const [tables, setTables] = useState([])
  useMessage(MSG.ALL_STATE, setTables)

  const [toast, showToast] = useToast()

  // Filtrage du plan de salle
  const [filter, setFilter] = useState('all') // 'all' | 'ouverte' | 'occupee' | 'fermee'

  // Mode couplage de tables (fonctionnalité IHM : grouper deux zones visuellement)
  const [linkMode, setLinkMode] = useState(false)
  const [linkedPair, setLinkedPair] = useState([])

  // ---- Statistiques rapides ----
  const stats = useMemo(() => {
    const open = tables.filter(t => t.open)
    const occupied = open.filter(t => t.clients && t.clients.length > 0)
    const closed = tables.filter(t => !t.open)
    const readyPlates = tables.flatMap(t => t.items || []).filter(i => i.status === 'pret').length
    return { total: tables.length, open: open.length, occupied: occupied.length, closed: closed.length, readyPlates }
  }, [tables])

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (filter === 'ouverte') return t.open && !(t.clients && t.clients.length > 0)
      if (filter === 'occupee') return t.open && t.clients && t.clients.length > 0
      if (filter === 'fermee') return !t.open
      return true
    })
  }, [tables, filter])

  // ---- Actions serveur ----
  const handleOpen = tableId => {
    socket.emit(MSG.TABLE_OPEN, { tableId })
    showToast(`Table ${tableId} ouverte.`)
  }

  const handleClose = tableId => {
    socket.emit(MSG.TABLE_CLOSE, { tableId })
    showToast(`Table ${tableId} libérée.`)
  }

  const handleLinkToggle = tableId => {
    setLinkedPair(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }

  const handleConfirmLink = () => {
    if (linkedPair.length < 2) {
      showToast('Sélectionnez au moins 2 tables à rapprocher.', true)
      return
    }
    // Note : table:link n'existe pas dans le protocole officiel d'Amir.
    // On ferme le mode et on informe l'hôte du rapprochement visuel.
    showToast(`Tables ${linkedPair.join(' & ')} notées comme bloc.`)
    setLinkedPair([])
    setLinkMode(false)
  }

  // ---- Rendu ----
  return (
    <main className="page rx-page">
      <ConnectionBadge connected={connected} />

      {/* En-tête */}
      <header className="rx-header">
        <div className="rx-brand">
          <div className="rx-logo">COMCLICK</div>
          <p className="muted small rx-subtitle">RÉCEPTION &amp; ACCUEIL</p>
        </div>

        {/* KPIs */}
        <div className="rx-kpis">
          <div className="rx-kpi">
            <span className="rx-kpi-val ok-text">{stats.open - stats.occupied}</span>
            <span className="rx-kpi-lbl">Libres</span>
          </div>
          <div className="rx-kpi">
            <span className="rx-kpi-val" style={{ color: 'var(--gold)' }}>{stats.occupied}</span>
            <span className="rx-kpi-lbl">Occupées</span>
          </div>
          <div className="rx-kpi">
            <span className="rx-kpi-val" style={{ color: 'var(--muted)' }}>{stats.closed}</span>
            <span className="rx-kpi-lbl">Fermées</span>
          </div>
          {stats.readyPlates > 0 && (
            <div className="rx-kpi appear">
              <span className="rx-kpi-val ok-text">{stats.readyPlates}</span>
              <span className="rx-kpi-lbl">Prêt(s) à servir</span>
            </div>
          )}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`rx-toast appear ${toast.isError ? 'rx-toast-error' : 'rx-toast-ok'}`}>
          {toast.text}
        </div>
      )}

      {/* Barre de filtres + action couplage */}
      <div className="rx-toolbar">
        <div className="chips">
          {[
            { key: 'all', label: `Toutes (${stats.total})` },
            { key: 'ouverte', label: 'Libres' },
            { key: 'occupee', label: 'Occupées' },
            { key: 'fermee', label: 'Fermées' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`chip-btn${filter === key ? ' on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rx-toolbar-right">
          {linkMode ? (
            <>
              <span className="small" style={{ color: 'var(--gold)' }}>
                {linkedPair.length} sélectionnée(s)
              </span>
              <button className="mini" onClick={handleConfirmLink}>Valider</button>
              <button className="ghost mini" onClick={() => { setLinkMode(false); setLinkedPair([]) }}>
                Annuler
              </button>
            </>
          ) : (
            <button className="ghost mini" onClick={() => setLinkMode(true)}>
              Marquer un bloc
            </button>
          )}
        </div>
      </div>

      {/* Grille du plan de salle */}
      {filteredTables.length === 0 ? (
        <section className="card rx-empty">
          <h2>Aucune table dans cette catégorie</h2>
          <p className="muted">Changez le filtre ou attendez la connexion au serveur.</p>
        </section>
      ) : (
        <div className="rx-grid">
          {filteredTables.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onOpen={handleOpen}
              onClose={handleClose}
              linkMode={linkMode}
              isSelectedForLink={linkedPair.includes(table.id)}
              onLinkToggle={handleLinkToggle}
            />
          ))}
        </div>
      )}
    </main>
  )
}
