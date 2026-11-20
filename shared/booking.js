// Les règles de réservation, communes au serveur et à l'appli téléphone.

export const TABLES = 6 // tables de 4 places dans la salle
export const SEATS_PER_TABLE = 4
export const MAX_GUESTS = 8 // au-delà, on demande d'appeler le restaurant
export const DAYS_AHEAD = 21 // on réserve sur 3 semaines
export const MEAL_DURATION = 90 // une table est occupée 1h30

export const SERVICES = {
  midi: { label: 'Déjeuner', slots: ['12:00', '12:30', '13:00', '13:30'] },
  soir: { label: 'Dîner', slots: ['19:00', '19:30', '20:00', '20:30', '21:00'] },
}

export const PLACEMENTS = ['Pas de préférence', 'Coin calme', 'Près de la fenêtre', 'Vue sur la cuisine']

export const OCCASIONS = ['Aucune', 'Anniversaire', 'Repas d\'affaires', 'En amoureux', 'Fête de famille']

export function tablesNeeded(guests) {
  return Math.ceil(guests / SEATS_PER_TABLE)
}

export function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Deux réservations du même jour qui se chevauchent (un repas dure 1h30).
export function overlaps(a, b) {
  return a.date === b.date && Math.abs(toMinutes(a.time) - toMinutes(b.time)) < MEAL_DURATION
}

// "2026-11-16" à partir d'une date, en heure locale.
export function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Les n prochains jours à partir d'aujourd'hui.
export function nextDays(n = DAYS_AHEAD) {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    return dateKey(d)
  })
}

export function formatDay(key, long = false) {
  return fromKey(key).toLocaleDateString('fr-FR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric' })
}
