// Accueil COMCLICK : présentation du restaurant et accès aux interfaces.
import { Routes, Route, Link } from 'react-router-dom'
import Table from './pages/Table.jsx'
import Mobile from './pages/Mobile.jsx'
import Cuisine from './pages/Cuisine.jsx'

function Home() {
  return (
    <main className="home">
      <nav className="home-nav" aria-label="Navigation principale">
        <Link className="home-brand" to="/">COMCLICK<span>RESTAURANT</span></Link>
        <span className="home-nav-note">L'expérience à table, autrement</span>
      </nav>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">CUISINE & ART DE RECEVOIR</p>
          <h1>L'art de bien <em>recevoir.</em></h1>
          <p className="home-intro">Une expérience gastronomique où le service se fait discret et chaque détail compte.</p>
          <a className="home-hero-link" href="#interfaces">Découvrir nos espaces <span aria-hidden="true">↗</span></a>
          <div className="home-hero-index">01 <span> / </span> COMCLICK</div>
        </div>
        <div className="home-hero-image" role="img" aria-label="Ambiance gastronomique élégante">
          <div className="home-image-label">UNE EXPÉRIENCE SINGULIÈRE <span>✦</span></div>
        </div>
      </section>

      <section id="interfaces" className="home-spaces">
        <div className="home-spaces-intro">
          <p className="eyebrow">NOS ESPACES</p>
          <h2>Une même expérience.<br /><em>Plusieurs façons de la vivre.</em></h2>
          <p>Explorez les interfaces du restaurant. Les informations circulent en temps réel entre les différents appareils.</p>
        </div>
        <div className="home-space-grid">
          <Link className="home-space-card" to="/table/1">
            <span className="home-space-number">01 / TABLE</span>
            <span className="home-space-title">La table tactile <span>↗</span></span>
            <span className="home-space-desc">Choisir et partager un moment gourmand.</span>
          </Link>
          <Link className="home-space-card" to="/m/1/1">
            <span className="home-space-number">02 / INVITÉ</span>
            <span className="home-space-title">Mon espace privé <span>↗</span></span>
            <span className="home-space-desc">Allergies, préférences et détails du repas.</span>
          </Link>
          <Link className="home-space-card" to="/cuisine">
            <span className="home-space-number">03 / CUISINE</span>
            <span className="home-space-title">Les bons de cuisine <span>↗</span></span>
            <span className="home-space-desc">Suivre les commandes en temps réel.</span>
          </Link>
          <Link className="home-space-card" to="/table/2">
            <span className="home-space-number">04 / DÉMONSTRATION</span>
            <span className="home-space-title">Explorer la table 2 <span>↗</span></span>
            <span className="home-space-desc">Une seconde table, une expérience partagée.</span>
          </Link>
        </div>
      </section>
      <footer className="home-footer"><span>COMCLICK</span><span>LE DIGITAL AU SERVICE DE L'EXPÉRIENCE</span></footer>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cuisine" element={<Cuisine />} />
      <Route path="/table/:tableId" element={<Table />} />
      <Route path="/m/:tableId/:seat" element={<Mobile />} />
    </Routes>
  )
}
