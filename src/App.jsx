// L'aiguillage : une adresse = un appareil.
// Les écrans réception, cuisine et serveur sont codés par les autres membres du groupe.
import { Routes, Route, Link } from 'react-router-dom'
import Table from './pages/Table.jsx'
import Mobile from './pages/Mobile.jsx'
import AppHome from './pages/app/AppHome.jsx'
import Invite from './pages/app/Invite.jsx'

function Home() {
  return (
    <div className="page">
      <h1>COMCLICK</h1>
      <p>Choisir l'appareil :</p>
      <ul className="links">
        <li><Link to="/table/1">Table 1</Link></li>
        <li><Link to="/table/2">Table 2</Link></li>
        <li><Link to="/m/1/1">Téléphone à table (table 1, place 1)</Link></li>
        <li><Link to="/app">Appli téléphone : réserver et menus</Link></li>
      </ul>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/table/:tableId" element={<Table />} />
      <Route path="/m/:tableId/:seat" element={<Mobile />} />
      <Route path="/app" element={<AppHome />} />
      <Route path="/app/invite/:code" element={<Invite />} />
    </Routes>
  )
}
