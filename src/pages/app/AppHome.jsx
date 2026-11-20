// L'appli téléphone hors du restaurant : réserver, voir les menus, retrouver ses réservations.
// Le serveur lui envoie ses réservations et sa liste d'attente dès qu'elles changent.
import { useState } from 'react'
import { getDeviceId, useJoin, useMessage } from '../../socket.js'
import { MSG } from '../../../shared/messages.js'
import ConnectionBadge from '../../components/ConnectionBadge.jsx'
import Booking from './Booking.jsx'
import WeeklyMenus from './WeeklyMenus.jsx'
import MyBookings from './MyBookings.jsx'
import Notices from './Notices.jsx'

const TABS = [
  { id: 'reserver', label: 'Réserver' },
  { id: 'menus', label: 'Menus' },
  { id: 'mes', label: 'Mes réservations' },
]

export default function AppHome() {
  const deviceId = getDeviceId()
  const connected = useJoin('app', undefined, deviceId)
  const [tab, setTab] = useState('reserver')
  const [mine, setMine] = useState({ resas: [], waitlist: [] })
  useMessage(MSG.DEVICE_STATE, setMine)

  return (
    <div className="app">
      <header className="app-head">
        <span className="app-logo">COMCLICK</span>
        <ConnectionBadge connected={connected} />
      </header>

      <main className="app-main">
        <Notices mine={mine} />
        {tab === 'reserver' && <Booking onSeeMine={() => setTab('mes')} />}
        {tab === 'menus' && <WeeklyMenus onBook={() => setTab('reserver')} />}
        {tab === 'mes' && <MyBookings mine={mine} />}
      </main>

      <nav className="app-nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
    </div>
  )
}
