// Le menu du chef change chaque semaine. On en montre 3 à l'avance.
import { fromKey, dateKey } from './booking.js'

const CHEF_MENUS = [
  {
    title: 'Retour du marché',
    price: 58,
    courses: ['Velouté de potimarron, noisettes torréfiées', 'Bar rôti, fenouil confit et beurre blanc', 'Tarte au citron meringuée'],
  },
  {
    title: 'Forêt d\'automne',
    price: 62,
    courses: ['Œuf parfait, crème de cèpes', 'Filet de bœuf, purée maison et sauce au poivre', 'Fondant au chocolat, glace vanille'],
  },
  {
    title: 'Saveurs de la mer',
    price: 65,
    courses: ['Tartare de saumon, avocat et citron vert', 'Saint-Jacques snackées, risotto crémeux', 'Pavlova aux fruits rouges'],
  },
]

// Les 3 semaines à venir, en commençant par le lundi de la semaine en cours.
export function nextWeeks(count = 3) {
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i * 7)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    const weekNumber = Math.floor(start.getTime() / (7 * 24 * 3600 * 1000))
    return { start: dateKey(start), end: dateKey(end), menu: CHEF_MENUS[weekNumber % CHEF_MENUS.length] }
  })
}

export function formatRange(start, end) {
  const opts = { day: 'numeric', month: 'long' }
  return `du ${fromKey(start).toLocaleDateString('fr-FR', opts)} au ${fromKey(end).toLocaleDateString('fr-FR', opts)}`
}
