// Les règles communes au serveur et à la table.

// Une demande de modification attend la réponse de la cuisine.
export function isPending(item) {
  return item.request?.status === 'en_attente'
}

// Un client peut valider s'il n'a aucune demande en attente.
export function canValidate(table, seat) {
  return !table.items.some((i) => i.seat === seat && isPending(i))
}

// La commande peut partir en cuisine quand tous les clients assis ont validé,
// qu'il y a au moins un plat choisi et qu'aucune demande n'attend la cuisine.
export function canSend(table) {
  return table.clients.length > 0
    && table.clients.every((c) => c.validated)
    && table.items.some((i) => i.status === 'choisi')
    && !table.items.some(isPending)
}

// Même règle pour un groupe de tables couplées : tout le groupe doit être prêt.
export function canSendGroup(group) {
  const clients = group.flatMap((t) => t.clients)
  const items = group.flatMap((t) => t.items)
  return clients.length > 0
    && clients.every((c) => c.validated)
    && items.some((i) => i.status === 'choisi')
    && !items.some(isPending)
}

// Ce que doit un client : ses plats déjà envoyés en cuisine.
export function billOf(table, seat, priceOf) {
  return table.items
    .filter((i) => i.seat === seat && i.status !== 'choisi')
    .reduce((sum, i) => sum + priceOf(i.dishId), 0)
}
