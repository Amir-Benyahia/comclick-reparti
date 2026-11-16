// Tous les messages échangés entre les appareils et le serveur.
// Le détail (qui envoie, qui reçoit, contenu) est dans le README.
export const MSG = {
  // appareil -> serveur
  JOIN: 'join', // un écran se présente : { role, tableId }
  TABLE_OPEN: 'table:open', // la réception ouvre une table : { tableId }
  TABLE_CLOSE: 'table:close', // la réception libère une table : { tableId }

  SEAT_OPEN: 'seat:open', // un client touche sa zone pour commencer : { tableId, seat }
  ORDER_ADD: 'order:add', // la table ajoute un plat dans une zone : { tableId, seat, dishId }
  ORDER_REMOVE: 'order:remove', // la table retire un plat pas encore envoyé : { tableId, seat, itemId }
  SEAT_VALIDATE: 'seat:validate', // un client valide (ou dévalide) dans sa zone : { tableId, seat, validated }
  ORDER_SEND: 'order:send', // le bouton du centre envoie la commande en cuisine : { tableId }

  TICKET_READY: 'ticket:ready', // la cuisine a fini un plat : { tableId, itemId }
  DISH_SERVED: 'dish:served', // le serveur a apporté le plat : { tableId, itemId }

  // serveur -> appareils
  TABLE_STATE: 'table:state', // état d'une table, envoyé à la table
  ALL_STATE: 'all:state', // état de toutes les tables, envoyé au personnel
  DISH_READY: 'dish:ready', // notification pour le serveur : { tableId, dishName }
}
