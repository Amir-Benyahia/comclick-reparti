// L'aiguillage : une adresse = un appareil.
// Les écrans réception, cuisine et serveur sont codés par les autres membres du groupe.
import { Routes, Route, Link } from 'react-router-dom'
import Table from './pages/Table.jsx'

function Home() {
  return (
    <div className="page">
      <h1>COMCLICK</h1>
      <p>Choisir l'appareil :</p>
      <ul className="links">
        <li><Link to="/table/1">Table 1</Link></li>
        <li><Link to="/table/2">Table 2</Link></li>
      </ul>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/table/:tableId" element={<Table />} />
    </Routes>
  )
}
