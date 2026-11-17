// Petit outil pour tester la table et le téléphone sans les écrans des autres membres.
// Il joue le rôle de la réception et de la cuisine depuis le terminal.
//
//   npm run simuler -- ouvrir 1          ouvre la table 1
//   npm run simuler -- accepter          la cuisine accepte toutes les demandes de modification
//   npm run simuler -- refuser           la cuisine les refuse
//   npm run simuler -- pret              la cuisine marque tous les plats envoyés comme prêts
//   npm run simuler -- liberer 1         libère la table 1
import { io } from 'socket.io-client'
import { MSG } from '../shared/messages.js'

const [command, ...args] = process.argv.slice(2)
const socket = io('http://localhost:3001')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// On récupère l'état comme le ferait l'écran de la réception.
const state = { tables: [] }
socket.on(MSG.ALL_STATE, (t) => { state.tables = t })

socket.on('connect', async () => {
  socket.emit(MSG.JOIN, { role: 'reception' })
  socket.emit(MSG.JOIN, { role: 'cuisine' })
  await wait(300)
  const items = state.tables.flatMap((t) => t.items.map((i) => ({ ...i, tableId: t.id })))

  if (command === 'ouvrir') {
    socket.emit(MSG.TABLE_OPEN, { tableId: Number(args[0]) })
    console.log(`Table ${args[0]} ouverte`)
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
    console.log('Commandes : ouvrir, accepter, refuser, pret, liberer')
  }
  await wait(200)
  socket.close()
})
