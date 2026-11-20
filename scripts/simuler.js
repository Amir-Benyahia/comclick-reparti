// Petit outil pour tester la table et l'appli sans les écrans des autres membres.
// Il joue le rôle de la réception et de la cuisine depuis le terminal.
//
//   npm run simuler -- ouvrir 1          ouvre la table 1
//   npm run simuler -- ouvrir 1 2        ouvre les tables 1 et 2 et les couple
//   npm run simuler -- installer CODE    installe une réservation (attribue les tables libres puis ouvre)
//   npm run simuler -- accepter          la cuisine accepte toutes les demandes de modification
//   npm run simuler -- refuser           la cuisine les refuse
//   npm run simuler -- pret              la cuisine marque tous les plats envoyés comme prêts
//   npm run simuler -- liberer 1         libère la table 1
import { io } from 'socket.io-client'
import { MSG } from '../shared/messages.js'
import { tablesNeeded, overlaps } from '../shared/booking.js'

const [command, ...args] = process.argv.slice(2)
const socket = io('http://localhost:3001')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// On récupère l'état comme le ferait l'écran de la réception.
const state = { tables: [], resas: null }
socket.on(MSG.ALL_STATE, (t) => { state.tables = t })
socket.on(MSG.RESA_LIST, (d) => { state.resas = d.reservations })

socket.on('connect', async () => {
  socket.emit(MSG.JOIN, { role: 'reception' })
  socket.emit(MSG.JOIN, { role: 'cuisine' })
  await wait(300)
  const items = state.tables.flatMap((t) => t.items.map((i) => ({ ...i, tableId: t.id })))

  if (command === 'ouvrir') {
    for (const id of args) socket.emit(MSG.TABLE_OPEN, { tableId: Number(id) })
    if (args.length === 2) {
      await wait(100)
      socket.emit(MSG.TABLE_LINK, { tableId: Number(args[0]), otherId: Number(args[1]) })
    }
    console.log(`Table(s) ${args.join(' + ')} ouverte(s)`)
  } else if (command === 'installer') {
    const resa = state.resas?.find((r) => r.id === args[0])
    if (!resa) { console.log('Réservation introuvable'); return socket.close() }
    // Tables libres maintenant et pas déjà attribuées à une réservation qui chevauche.
    const taken = state.resas.filter((r) => r !== resa && r.status !== 'annulee' && overlaps(r, resa)).flatMap((r) => r.tableIds)
    const free = state.tables.filter((t) => !t.open && !taken.includes(t.id)).map((t) => t.id)
    const tableIds = resa.tableIds.length ? resa.tableIds : free.slice(0, tablesNeeded(resa.guests))
    socket.emit(MSG.RESA_ASSIGN, { id: resa.id, tableIds }, async (res) => {
      if (res?.error) { console.log(res.error); return socket.close() }
      socket.emit(MSG.RESA_SEAT, { id: resa.id })
      await wait(100)
      console.log(`Réservation ${resa.id} installée sur la table ${tableIds.join(' + ')}`)
      socket.close()
    })
    return
  } else if (command === 'accepter' || command === 'refuser') {
    const pending = items.filter((i) => i.request?.status === 'en_attente')
    for (const i of pending) socket.emit(MSG.EDIT_ANSWER, { tableId: i.tableId, itemId: i.id, accepted: command === 'accepter' })
    console.log(`${pending.length} demande(s) ${command === 'accepter' ? 'acceptée(s)' : 'refusée(s)'}`)
  } else if (command === 'pret') {
    const sent = items.filter((i) => i.status === 'envoye')
    for (const i of sent) socket.emit(MSG.TICKET_READY, { tableId: i.tableId, itemId: i.id })
    console.log(`${sent.length} plat(s) prêt(s)`)
  } else if (command === 'liberer') {
    socket.emit(MSG.TABLE_CLOSE, { tableId: Number(args[0]) })
    console.log(`Table ${args[0]} libérée`)
  } else {
    console.log('Commandes : ouvrir, installer, accepter, refuser, pret, liberer')
  }
  await wait(200)
  socket.close()
})
