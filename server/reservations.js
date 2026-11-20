// Les réservations faites depuis l'appli téléphone, et la liste d'attente.
// Gardées en mémoire comme le reste : elles disparaissent si on relance le serveur.
import {
  TABLES, MAX_GUESTS, MEAL_DURATION, SERVICES,
  tablesNeeded, toMinutes, nextDays, dateKey, fromKey, overlaps,
} from '../shared/booking.js'

export const reservations = []
export const waitlist = []

// Tables déjà prises autour d'une heure donnée (un repas dure 1h30).
function tablesUsed(date, time) {
  return reservations
    .filter((r) => r.date === date && r.status !== 'annulee'
      && Math.abs(toMinutes(r.time) - toMinutes(time)) < MEAL_DURATION)
    .reduce((sum, r) => sum + tablesNeeded(r.guests), 0)
}

function isPast(date, time) {
  const now = new Date()
  if (date !== dateKey(now)) return date < dateKey(now)
  return toMinutes(time) <= now.getHours() * 60 + now.getMinutes()
}

function isFree(date, time, guests) {
  return !isPast(date, time) && tablesUsed(date, time) + tablesNeeded(guests) <= TABLES
}

// Pour chaque service, les créneaux : libres, complets ou déjà passés.
export function availability(date, guests) {
  const result = {}
  for (const [key, service] of Object.entries(SERVICES)) {
    result[key] = {
      label: service.label,
      slots: service.slots.map((time) => ({ time, free: isFree(date, time, guests), past: isPast(date, time) })),
    }
  }
  return result
}

function checkRequest({ date, time, guests, name, phone }) {
  if (!nextDays().includes(date)) return 'Date hors des 3 semaines de réservation.'
  if (!Object.values(SERVICES).some((s) => s.slots.includes(time))) return 'Créneau inconnu.'
  if (!(guests >= 1 && guests <= MAX_GUESTS)) return 'Nombre de personnes invalide.'
  if (!name?.trim() || !phone?.trim()) return 'Le nom et le téléphone sont obligatoires.'
  return null
}

export function create(data, deviceId) {
  const guests = Number(data.guests)
  const error = checkRequest({ ...data, guests })
  if (error) return { error }
  if (!isFree(data.date, data.time, guests)) return { error: "Ce créneau vient d'être pris, choisissez-en un autre." }

  const resa = {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    deviceId,
    date: data.date, time: data.time, guests,
    name: data.name.trim().slice(0, 60),
    phone: data.phone.trim().slice(0, 20),
    occasion: data.occasion ?? 'Aucune',
    placement: data.placement ?? 'Pas de préférence',
    diets: data.diets ?? [],
    note: (data.note ?? '').slice(0, 200),
    guestList: [], // les invités qui ont rempli le lien partagé
    confirmed: false, // confirmé après le rappel de la veille
    status: 'confirmee', // confirmee, installee, annulee
    tableIds: [], // attribuées par la réception à la réception de la réservation
  }
  reservations.push(resa)
  return { resa }
}

export function find(id) {
  return reservations.find((r) => r.id === id)
}

export function cancel(id) {
  const r = find(id)
  if (!r || r.status !== 'confirmee') return null
  r.status = 'annulee'
  return r
}

export function confirm(id) {
  const r = find(id)
  if (r && r.status === 'confirmee') r.confirmed = true
  return r
}

// La réception choisit les tables d'une réservation. Une table ne peut pas être
// attribuée à deux réservations qui se chevauchent le même jour.
export function assign(id, tableIds) {
  const r = find(id)
  if (!r || r.status !== 'confirmee') return { error: 'Réservation introuvable.' }
  const ids = [...new Set(tableIds.map(Number))].filter((t) => t >= 1 && t <= TABLES)
  if (ids.length !== tablesNeeded(r.guests)) return { error: `Il faut ${tablesNeeded(r.guests)} table(s).` }
  const taken = takenTables(r)
  if (ids.some((t) => taken.includes(t))) return { error: 'Une de ces tables est déjà prise à cette heure-là.' }
  r.tableIds = ids
  return { resa: r }
}

// Les tables déjà attribuées à d'autres réservations qui chevauchent celle-ci.
export function takenTables(r) {
  return reservations
    .filter((o) => o !== r && o.status !== 'annulee' && overlaps(o, r))
    .flatMap((o) => o.tableIds)
}

export function seat(id) {
  const r = find(id)
  if (!r || r.status !== 'confirmee' || r.tableIds.length === 0) return null
  r.status = 'installee'
  return r
}

// ----- Invités -----
export function inviteInfo(code) {
  const r = find(code)
  if (!r || r.status === 'annulee') return { error: 'Réservation introuvable.' }
  return {
    info: {
      date: r.date, time: r.time, guests: r.guests, host: r.name,
      joined: r.guestList.map((g) => g.name),
    },
  }
}

export function addGuest(code, { name, diets, allergies }) {
  const r = find(code)
  if (!r || r.status === 'annulee') return { error: 'Réservation introuvable.' }
  if (!name?.trim()) return { error: 'Indiquez votre prénom.' }
  if (r.guestList.length >= r.guests - 1) return { error: 'Tous les invités ont déjà répondu.' }
  r.guestList.push({ name: name.trim().slice(0, 40), diets: diets ?? [], allergies: (allergies ?? '').slice(0, 120) })
  return { resa: r }
}

// ----- Liste d'attente -----
export function joinWaitlist(data, deviceId) {
  const guests = Number(data.guests)
  const error = checkRequest({ ...data, guests })
  if (error) return { error }
  const entry = {
    id: 'W' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    deviceId, date: data.date, time: data.time, guests,
    name: data.name.trim().slice(0, 60), phone: data.phone.trim().slice(0, 20),
    status: 'attente', // attente, proposee, convertie, annulee
  }
  waitlist.push(entry)
  return { entry }
}

// Après une annulation : les premiers de la liste pour qui ça rentre maintenant sont prévenus.
// Renvoie les entrées qui viennent de changer.
export function checkWaitlist(date) {
  const changed = []
  for (const w of waitlist) {
    if (w.date === date && w.status === 'attente' && isFree(w.date, w.time, w.guests)) {
      w.status = 'proposee'
      changed.push(w)
    }
  }
  return changed
}

export function acceptWait(id) {
  const w = waitlist.find((x) => x.id === id)
  if (!w || w.status !== 'proposee') return { error: 'Cette proposition n\'est plus valable.' }
  const res = create(w, w.deviceId)
  if (res.error) { w.status = 'attente'; return res }
  w.status = 'convertie'
  return res
}

export function declineWait(id) {
  const w = waitlist.find((x) => x.id === id)
  if (w) w.status = 'annulee'
  return w
}

export function forDevice(deviceId) {
  return {
    resas: reservations.filter((r) => r.deviceId === deviceId),
    waitlist: waitlist.filter((w) => w.deviceId === deviceId && w.status !== 'convertie'),
  }
}

// Quelques fausses réservations pour que les disponibilités aient l'air réelles.
// Toujours les mêmes, pour que les démos se ressemblent.
export function seed() {
  const names = ['Martin', 'Bernard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Garcia', 'Roux']
  let n = 7
  const rand = () => (n = (n * 9301 + 49297) % 233280) / 233280
  for (const date of nextDays()) {
    const day = fromKey(date).getDay()
    const busy = day === 5 || day === 6 ? 9 : 3 // vendredi et samedi soir plus chargés
    for (let i = 0; i < busy; i++) {
      const service = i < 2 ? SERVICES.midi : SERVICES.soir
      const time = service.slots[Math.floor(rand() * service.slots.length)]
      const guests = 2 + Math.floor(rand() * 4)
      if (tablesUsed(date, time) + tablesNeeded(guests) > TABLES) continue
      const resa = {
        id: 'DEMO' + reservations.length, deviceId: null, date, time, guests,
        name: names[Math.floor(rand() * names.length)], phone: '06 00 00 00 00',
        occasion: 'Aucune', placement: 'Pas de préférence', diets: [], note: '',
        guestList: [], confirmed: false, status: 'confirmee', tableIds: [],
      }
      // Les fausses réservations ont déjà leurs tables, comme si la réception les avait traitées.
      const taken = takenTables(resa)
      const free = Array.from({ length: TABLES }, (_, k) => k + 1).filter((t) => !taken.includes(t))
      resa.tableIds = free.slice(0, tablesNeeded(guests))
      reservations.push(resa)
    }
  }
}
