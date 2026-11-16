// Les règles communes au serveur et à la table.

// La commande peut partir en cuisine quand tous les clients assis ont validé
// et qu'il y a au moins un plat choisi.
export function canSend(table) {
  return table.clients.length > 0
    && table.clients.every((c) => c.validated)
    && table.items.some((i) => i.status === 'choisi')
}
