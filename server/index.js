// Serveur temps réel de COMCLICK.
// Il garde l'état de toutes les tables. Les écrans ne font qu'afficher ce qu'il envoie.
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { Server } from 'socket.io'
import { findDish } from '../shared/menu.js'
import { MSG, EDIT_DELAY_MS } from '../shared/messages.js'
import { canSendGroup, canValidate, isPending } from '../shared/rules.js'
import * as resas from './reservations.js'

const PORT = 3001
const SEATS = 4

// ---------- L'état ----------
// Une table : { id, open, clients, items, linked, announced }
//   linked    : la table couplée avec elle pour un groupe de 5 à 8, ou null
//   announced : les régimes donnés à la réservation (privé, pour la cuisine)
// Un client : { seat, validated, clientId (téléphone lié ou null), diets, allergies, editing, paid }
// Un plat :   { id, dishId, seat, status, mods, request }
//   status  : choisi -> envoye -> pret -> servi
//   request : la demande de modification { mods, status, deadline }
//             status : en_attente, acceptee, refusee, expiree
const tables = {}
function emptyTable(id, open = false) {
  return { id, open, clients: [], items: [], linked: null, announced: [] }
}
for (let id = 1; id <= 6; id++) tables[id] = emptyTable(id)
resas.seed()

const reviews = []

// La table et celle qui lui est couplée.
function groupOf(table) {
  return [table, tables[table.linked]].filter(Boolean)
}

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
// Ils reçoivent aussi un résumé du groupe quand deux tables sont couplées.
// Le personnel reçoit tout.
function publicTable(table) {
  const group = groupOf(table)
  const clients = group.flatMap((t) => t.clients)
  return {
    ...table,
    announced: undefined,
    clients: table.clients.map(({ diets, allergies, ...rest }) => rest),
    group: {
      tableIds: group.map((t) => t.id),
      clients: clients.length,
      validated: clients.filter((c) => c.validated).length,
      paid: clients.filter((c) => c.paid).length,
      roundOpen: group.some((t) => t.items.some((i) => i.status === 'choisi')),
      ready: canSendGroup(group),
    },
  }
}

// Envoie une table (et sa table couplée) à tous ceux qui la regardent.
function sendTable(tableId) {
  for (const t of groupOf(tables[tableId])) {
    io.to('table:' + t.id).emit(MSG.TABLE_STATE, publicTable(t))
  }
  io.to('staff').emit(MSG.ALL_STATE, Object.values(tables))
}

function sendReservations() {
  io.to('reception').emit(MSG.RESA_LIST, { reservations: resas.reservations, waitlist: resas.waitlist, reviews })
}

// L'appli d'un téléphone reçoit ses réservations et sa liste d'attente dès qu'elles changent.
function sendDevice(deviceId) {
  if (deviceId) io.to('app:' + deviceId).emit(MSG.DEVICE_STATE, resas.forDevice(deviceId))
}

function getClient(table, seat) {
  return table?.clients.find((c) => c.seat === seat)
}

// Ouvre la zone d'une place si elle ne l'est pas déjà.
function openSeat(table, seat) {
  let client = getClient(table, seat)
  if (!client) {
    client = { seat, validated: false, clientId: null, diets: [], allergies: '', editing: null, paid: false }
    table.clients.push(client)
  }
  return client
}

function unlink(table) {
  const other = tables[table.linked]
  if (other) other.linked = null
  table.linked = null
  return other
}

// ---------- Connexions ----------
io.on('connection', (socket) => {
  socket.on(MSG.JOIN, ({ role, tableId, deviceId }) => {
    if (role === 'table' || role === 'mobile') {
      socket.join('table:' + tableId)
      socket.emit(MSG.TABLE_STATE, publicTable(tables[tableId]))
    } else if (role === 'invite') {
      // Un invité qui ouvre le lien partagé : il pose juste des questions.
    } else if (role === 'app') {
      // L'appli téléphone hors du restaurant : chaque téléphone a son salon.
      socket.data.deviceId = deviceId
      socket.join('app:' + deviceId)
      sendDevice(deviceId)
    } else {
      socket.join('staff')
      socket.join(role)
      socket.emit(MSG.ALL_STATE, Object.values(tables))
      if (role === 'reception') socket.emit(MSG.RESA_LIST, { reservations: resas.reservations, waitlist: resas.waitlist, reviews })
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
    const other = unlink(tables[tableId])
    tables[tableId] = emptyTable(tableId)
    sendTable(tableId)
    if (other) sendTable(other.id)
  })

  // Deux tables de 4 couplées pour un groupe de 5 à 8 : une seule commande, un seul envoi.
  socket.on(MSG.TABLE_LINK, ({ tableId, otherId }) => {
    const a = tables[tableId]
    const b = tables[otherId]
    if (!a?.open || !b?.open || a === b || a.linked || b.linked) return
    a.linked = b.id
    b.linked = a.id
    sendTable(a.id)
  })

  socket.on(MSG.TABLE_UNLINK, ({ tableId }) => {
    const table = tables[tableId]
    if (!table?.linked) return
    const other = unlink(table)
    sendTable(table.id)
    sendTable(other.id)
  })

  // Quand une réservation arrive, la réception choisit sa ou ses tables.
  socket.on(MSG.RESA_ASSIGN, ({ id, tableIds }, reply) => {
    const res = resas.assign(id, tableIds ?? [])
    reply?.({ error: res.error })
    if (res.resa) {
      sendReservations()
      sendDevice(res.resa.deviceId)
    }
  })

  // A l'arrivée du groupe, la réception l'installe sur les tables attribuées.
  // Avec deux tables, elles sont couplées.
  socket.on(MSG.RESA_SEAT, ({ id }) => {
    const resa = resas.find(id)
    if (!resa || resa.tableIds.length === 0) return
    if (resa.tableIds.some((tid) => tables[tid].open)) return
    if (!resas.seat(id)) return
    const ids = resa.tableIds

    // Les régimes annoncés à la réservation partent en cuisine avec la table.
    const announced = [
      { name: resa.name, diets: resa.diets, allergies: '' },
      ...resa.guestList,
    ].filter((g) => g.diets.length > 0 || g.allergies)
    for (const tid of ids) {
      tables[tid] = emptyTable(tid, true)
      tables[tid].announced = announced
    }
    if (ids.length === 2) {
      tables[ids[0]].linked = ids[1]
      tables[ids[1]].linked = ids[0]
    }
    sendTable(ids[0])
    sendReservations()
    sendDevice(resa.deviceId)
  })

  // ----- Appli téléphone : réservations -----
  socket.on(MSG.RESA_AVAILABILITY, ({ date, guests }, reply) => {
    reply({ services: resas.availability(date, Number(guests)) })
  })

  socket.on(MSG.RESA_CREATE, (data, reply) => {
    const res = resas.create(data, socket.data.deviceId)
    reply(res)
    if (res.resa) {
      sendReservations()
      sendDevice(socket.data.deviceId)
    }
  })

  // Une annulation libère peut-être un créneau : on prévient la liste d'attente.
  socket.on(MSG.RESA_CANCEL, ({ id }) => {
    const resa = resas.cancel(id)
    if (!resa) return
    sendDevice(resa.deviceId)
    for (const w of resas.checkWaitlist(resa.date)) sendDevice(w.deviceId)
    sendReservations()
  })

  // Le rappel de la veille : le client confirme qu'il vient.
  socket.on(MSG.RESA_CONFIRM, ({ id }) => {
    const resa = resas.confirm(id)
    if (!resa) return
    sendDevice(resa.deviceId)
    sendReservations()
  })

  // Le lien partagé aux invités.
  socket.on(MSG.RESA_INVITE_INFO, ({ code }, reply) => {
    reply(resas.inviteInfo(code))
  })

  socket.on(MSG.RESA_GUEST_ADD, (data, reply) => {
    const res = resas.addGuest(data.code, data)
    reply({ error: res.error })
    if (res.resa) {
      sendDevice(res.resa.deviceId)
      sendReservations()
    }
  })

  // La liste d'attente.
  socket.on(MSG.WAIT_JOIN, (data, reply) => {
    const res = resas.joinWaitlist(data, socket.data.deviceId)
    reply(res)
    if (res.entry) {
      sendDevice(socket.data.deviceId)
      sendReservations()
    }
  })

  socket.on(MSG.WAIT_ACCEPT, ({ id }, reply) => {
    const res = resas.acceptWait(id)
    reply?.(res)
    sendDevice(socket.data.deviceId)
    sendReservations()
  })

  socket.on(MSG.WAIT_DECLINE, ({ id }) => {
    const w = resas.declineWait(id)
    if (!w) return
    sendDevice(w.deviceId)
    // la place revient au suivant
    for (const next of resas.checkWaitlist(w.date)) sendDevice(next.deviceId)
    sendReservations()
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

  // Le bouton du centre : pour des tables couplées, il envoie la commande des deux tables.
  socket.on(MSG.ORDER_SEND, ({ tableId }) => {
    const table = tables[tableId]
    if (!table) return
    const group = groupOf(table)
    if (!canSendGroup(group)) return
    for (const t of group) {
      for (const item of t.items) {
        if (item.status === 'choisi') item.status = 'envoye'
      }
      for (const client of t.clients) {
        client.validated = false
        client.editing = null
      }
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

  // L'addition : chacun paie sa part, ou une personne paie pour toute la table.
  // Le paiement est simulé, aucune donnée bancaire n'est demandée.
  socket.on(MSG.PAY, ({ tableId, clientId, scope }) => {
    const table = tables[tableId]
    const client = table?.clients.find((c) => c.clientId === clientId)
    if (!client) return
    const payers = scope === 'table' ? groupOf(table).flatMap((t) => t.clients) : [client]
    for (const c of payers) c.paid = true
    sendTable(tableId)
  })

  socket.on(MSG.REVIEW_ADD, ({ tableId, clientId, stars, comment }) => {
    const client = tables[tableId]?.clients.find((c) => c.clientId === clientId)
    if (!client || !(stars >= 1 && stars <= 5)) return
    reviews.unshift({ tableId, stars, comment: (comment ?? '').slice(0, 300), at: Date.now() })
    sendReservations()
  })

  // ----- Cuisine -----
  socket.on(MSG.EDIT_ANSWER, ({ tableId, itemId, accepted }) => {
    const item = tables[tableId]?.items.find((i) => i.id === itemId)
    if (!item || !isPending(item)) return
    item.request.status = accepted ? 'acceptee' : 'refusee'
    if (accepted) item.mods = item.request.mods
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
  console.log(`Depuis un téléphone : http://${localIp()}:5173`)
})
