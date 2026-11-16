// Serveur temps réel de COMCLICK.
// Il garde l'état de toutes les tables. Les écrans ne font qu'afficher ce qu'il envoie.
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { Server } from 'socket.io'
import { findDish } from '../shared/menu.js'
import { MSG } from '../shared/messages.js'
import { canSend } from '../shared/rules.js'

const PORT = 3001
const SEATS = 4

// ---------- L'état ----------
// Une table : { id, open, clients, items }
// Un client : { seat, validated }
// Un plat :   { id, dishId, seat, status }
//   status  : choisi -> envoye -> pret -> servi
const tables = {}
function emptyTable(id, open = false) {
  return { id, open, clients: [], items: [] }
}
for (let id = 1; id <= 6; id++) tables[id] = emptyTable(id)

const http = createServer()

const io = new Server(http, { cors: { origin: '*' } })

// ---------- Envoi de l'état ----------
// Envoie une table à tous ceux qui la regardent.
function sendTable(tableId) {
  io.to('table:' + tableId).emit(MSG.TABLE_STATE, tables[tableId])
  io.to('staff').emit(MSG.ALL_STATE, Object.values(tables))
}

function getClient(table, seat) {
  return table?.clients.find((c) => c.seat === seat)
}

// Ouvre la zone d'une place si elle ne l'est pas déjà.
function openSeat(table, seat) {
  let client = getClient(table, seat)
  if (!client) {
    client = { seat, validated: false }
    table.clients.push(client)
  }
  return client
}

// ---------- Connexions ----------
io.on('connection', (socket) => {
  socket.on(MSG.JOIN, ({ role, tableId }) => {
    if (role === 'table') {
      socket.join('table:' + tableId)
      socket.emit(MSG.TABLE_STATE, tables[tableId])
    } else {
      socket.join('staff')
      socket.join(role)
      socket.emit(MSG.ALL_STATE, Object.values(tables))
    }
    console.log(`[join] ${role}${tableId ? ' table ' + tableId : ''}`)
  })

  // ----- Réception -----
  socket.on(MSG.TABLE_OPEN, ({ tableId }) => {
    if (!tables[tableId] || tables[tableId].open) return
    tables[tableId] = emptyTable(tableId, true)
    sendTable(tableId)
  })

  socket.on(MSG.TABLE_CLOSE, ({ tableId }) => {
    if (!tables[tableId]) return
    tables[tableId] = emptyTable(tableId)
    sendTable(tableId)
  })

  // ----- Table : la commande se fait dans la zone de chaque client -----
  socket.on(MSG.SEAT_OPEN, ({ tableId, seat }) => {
    const table = tables[tableId]
    if (!table?.open || !(seat >= 1 && seat <= SEATS)) return
    openSeat(table, seat)
    sendTable(tableId)
  })

  socket.on(MSG.ORDER_ADD, ({ tableId, seat, dishId }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    if (!client || !findDish(dishId)) return
    table.items.push({ id: Date.now() + Math.random(), dishId, seat, status: 'choisi' })
    client.validated = false // il a changé sa commande, il doit revalider
    sendTable(tableId)
  })

  socket.on(MSG.ORDER_REMOVE, ({ tableId, seat, itemId }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    const item = table?.items.find((i) => i.id === itemId)
    if (!client || !item || item.seat !== seat || item.status !== 'choisi') return
    table.items = table.items.filter((i) => i.id !== itemId)
    client.validated = false
    sendTable(tableId)
  })

  socket.on(MSG.SEAT_VALIDATE, ({ tableId, seat, validated }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    if (!client) return
    client.validated = validated
    sendTable(tableId)
  })

  // Le bouton du centre : il n'apparaît que quand tout le monde a validé.
  socket.on(MSG.ORDER_SEND, ({ tableId }) => {
    const table = tables[tableId]
    if (!table) return
    if (!canSend(table)) return
    for (const item of table.items) {
      if (item.status === 'choisi') item.status = 'envoye'
    }
    for (const client of table.clients) client.validated = false
    sendTable(tableId)
  })

  socket.on(MSG.TICKET_READY, ({ tableId, itemId }) => {
    const item = tables[tableId]?.items.find((i) => i.id === itemId)
    if (!item) return
    item.status = 'pret'
    sendTable(tableId)
    io.to('serveur').emit(MSG.DISH_READY, { tableId, dishName: findDish(item.dishId).name })
  })

  // ----- Serveur -----
  socket.on(MSG.DISH_SERVED, ({ tableId, itemId }) => {
    const item = tables[tableId]?.items.find((i) => i.id === itemId)
    if (!item) return
    item.status = 'servi'
    sendTable(tableId)
  })
})

function localIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return 'localhost'
}

http.listen(PORT, () => {
  console.log(`Serveur COMCLICK prêt sur le port ${PORT}`)
  console.log(`Depuis une tablette : http://${localIp()}:5173`)
})
