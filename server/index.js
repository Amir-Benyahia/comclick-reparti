// Serveur temps réel de COMCLICK.
// Il garde l'état de toutes les tables. Les écrans ne font qu'afficher ce qu'il envoie.
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { Server } from 'socket.io'
import { findDish } from '../shared/menu.js'
import { MSG, EDIT_DELAY_MS } from '../shared/messages.js'
import { canSend, canValidate, isPending } from '../shared/rules.js'

const PORT = 3001
const SEATS = 4

// ---------- L'état ----------
// Une table : { id, open, clients, items }
// Un client : { seat, validated, clientId (téléphone lié ou null), diets, allergies, editing }
// Un plat :   { id, dishId, seat, status, mods, request }
//   status  : choisi -> envoye -> preparation -> pret -> servi
//   request : la demande de modification { mods, status, deadline }
//             status : en_attente, acceptee, refusee, expiree
const tables = {}
function emptyTable(id, open = false) {
  return { id, open, clients: [], items: [] }
}
for (let id = 1; id <= 6; id++) tables[id] = emptyTable(id)


// ---------- Petit serveur HTTP ----------
// /api/info donne l'adresse IP du PC, pour que la table fabrique des QR codes
// que le téléphone peut ouvrir (localhost ne marche pas depuis un téléphone).
const http = createServer((req, res) => {
  if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ip: localIp() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const io = new Server(http, { cors: { origin: '*' } })

// ---------- Envoi de l'état ----------
// La table et les téléphones reçoivent leur table, sans les régimes ni les allergies :
// ce sont des données privées, seule la cuisine les voit.
// Le personnel reçoit tout.
function publicTable(table) {
  return {
    ...table,
    clients: table.clients.map(({ diets, allergies, ...rest }) => rest),
  }
}

// Envoie une table à tous ceux qui la regardent.
function sendTable(tableId) {
  io.to('table:' + tableId).emit(MSG.TABLE_STATE, publicTable(tables[tableId]))
  io.to('staff').emit(MSG.ALL_STATE, Object.values(tables))
}

function getClient(table, seat) {
  return table?.clients.find((c) => c.seat === seat)
}

// Ouvre la zone d'une place si elle ne l'est pas déjà.
function openSeat(table, seat) {
  let client = getClient(table, seat)
  if (!client) {
    client = { seat, validated: false, clientId: null, diets: [], allergies: '', editing: null }
    table.clients.push(client)
  }
  return client
}

// ---------- Connexions ----------
io.on('connection', (socket) => {
  socket.on(MSG.JOIN, ({ role, tableId }) => {
    if (role === 'table' || role === 'mobile') {
      socket.join('table:' + tableId)
      socket.emit(MSG.TABLE_STATE, publicTable(tables[tableId]))
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
    table.items.push({ id: Date.now() + Math.random(), dishId, seat, status: 'choisi', mods: null, request: null })
    client.validated = false // il a changé sa commande, il doit revalider
    sendTable(tableId)
  })

  socket.on(MSG.ORDER_REMOVE, ({ tableId, seat, itemId }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    const item = table?.items.find((i) => i.id === itemId)
    if (!client || !item || item.seat !== seat || item.status !== 'choisi' || isPending(item)) return
    table.items = table.items.filter((i) => i.id !== itemId)
    if (client.editing === itemId) client.editing = null
    client.validated = false
    sendTable(tableId)
  })

  socket.on(MSG.SEAT_VALIDATE, ({ tableId, seat, validated }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    if (!client) return
    if (validated && !canValidate(table, seat)) return
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
    for (const client of table.clients) {
      client.validated = false
      client.editing = null
    }
    sendTable(tableId)
  })

  // ----- Téléphone -----
  // Le QR de chaque zone contient le numéro de place.
  // Le téléphone garde un identifiant : s'il recharge la page, il retrouve sa place.
  socket.on(MSG.CLIENT_JOIN, ({ tableId, seat, clientId }, reply) => {
    const table = tables[tableId]
    if (!table?.open) return reply({ error: "La table n'est pas encore ouverte." })

    const already = table.clients.find((c) => c.clientId === clientId)
    if (already) return reply({ seat: already.seat, diets: already.diets, allergies: already.allergies })

    if (!(seat >= 1 && seat <= SEATS)) return reply({ error: 'Place inconnue.' })
    const client = openSeat(table, seat)
    if (client.clientId) return reply({ error: 'Un autre téléphone est déjà lié à cette place.' })
    client.clientId = clientId
    reply({ seat, diets: client.diets, allergies: client.allergies })
    sendTable(tableId)
  })

  socket.on(MSG.DIET_SET, ({ tableId, clientId, diets, allergies }) => {
    const client = tables[tableId]?.clients.find((c) => c.clientId === clientId)
    if (!client) return
    client.diets = diets
    client.allergies = (allergies ?? '').slice(0, 200)
    sendTable(tableId)
  })

  // Bouton Modifier dans la zone : la suite se fait sur le téléphone.
  socket.on(MSG.EDIT_START, ({ tableId, seat, itemId }) => {
    const table = tables[tableId]
    const client = getClient(table, seat)
    const item = table?.items.find((i) => i.id === itemId)
    if (!client?.clientId || !item || item.seat !== seat || item.status !== 'choisi' || isPending(item)) return
    client.editing = itemId
    sendTable(tableId)
  })

  socket.on(MSG.EDIT_CANCEL, ({ tableId, seat }) => {
    const client = getClient(tables[tableId], seat)
    if (!client) return
    client.editing = null
    sendTable(tableId)
  })

  // Le téléphone envoie la modification. La cuisine a une minute pour répondre.
  socket.on(MSG.EDIT_REQUEST, ({ tableId, clientId, itemId, mods }) => {
    const table = tables[tableId]
    const client = table?.clients.find((c) => c.clientId === clientId)
    const item = table?.items.find((i) => i.id === itemId)
    if (!client || !item || item.seat !== client.seat || client.editing !== itemId) return

    item.request = { mods, status: 'en_attente', deadline: Date.now() + EDIT_DELAY_MS }
    client.editing = null
    client.validated = false
    sendTable(tableId)

    // Sans réponse dans la minute, la demande est refusée et le plat reste comme sur la carte.
    setTimeout(() => {
      if (isPending(item)) {
        item.request.status = 'expiree'
        sendTable(tableId)
      }
    }, EDIT_DELAY_MS)
  })

  // ----- Cuisine -----
  socket.on(MSG.EDIT_ANSWER, ({ tableId, itemId, accepted }) => {
    const item = tables[tableId]?.items.find((i) => i.id === itemId)
    if (!item || !isPending(item)) return
    item.request.status = accepted ? 'acceptee' : 'refusee'
    if (accepted) item.mods = item.request.mods
    sendTable(tableId)
  })

  // Le chef commence la préparation de tous les plats envoyés de cette table.
  socket.on(MSG.TICKET_START, ({ tableId }) => {
    const table = tables[tableId]
    if (!table?.open) return
    let changed = false
    for (const item of table.items) {
      if (item.status === 'envoye' && !isPending(item)) {
        item.status = 'preparation'
        changed = true
      }
    }
    if (changed) sendTable(tableId)
  })

  socket.on(MSG.TICKET_READY, ({ tableId, itemId }) => {
    const item = tables[tableId]?.items.find((i) => i.id === itemId)
    // Le simulateur historique peut aussi terminer directement un plat envoyé.
    if (!item || !['envoye', 'preparation'].includes(item.status)) return
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
  console.log(`Depuis un téléphone : http://${localIp()}:5173`)
})
