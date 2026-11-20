// Le menu du chef des 3 prochaines semaines, et la carte.
import { useState } from 'react'
import { nextWeeks, formatRange } from '../../../shared/weeklyMenus.js'
import { CATEGORIES, MENU } from '../../../shared/menu.js'

export default function WeeklyMenus({ onBook }) {
  const weeks = nextWeeks(3)
  const [index, setIndex] = useState(0)
  const week = weeks[index]

  return (
    <>
      <div className="tabs wide-tabs">
        {weeks.map((w, i) => (
          <button key={w.start} className={'tab' + (i === index ? ' active' : '')} onClick={() => setIndex(i)}>
            {i === 0 ? 'Cette semaine' : i === 1 ? 'Semaine pro' : 'Dans 2 sem.'}
          </button>
        ))}
      </div>

      <section className="card chef-menu">
        <p className="muted small">Menu du chef {formatRange(week.start, week.end)}</p>
        <h2>{week.menu.title}</h2>
        {week.menu.courses.map((c, i) => (
          <p key={i} className="course"><span>{['Entrée', 'Plat', 'Dessert'][i]}</span>{c}</p>
        ))}
        <p className="price">{week.menu.price} € par personne</p>
        <button className="wide" onClick={onBook}>Réserver cette semaine</button>
      </section>

      <section className="card">
        <h2>La carte</h2>
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h3>{cat}</h3>
            <ul className="list">
              {MENU.filter((d) => d.category === cat).map((d) => (
                <li key={d.id}><span>{d.name}</span><span className="muted">{d.price} €</span></li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  )
}
