// Tous les messages échangés entre les appareils et le serveur.
// Le détail (qui envoie, qui reçoit, contenu) est dans le README.
export const MSG = {
  // appareil -> serveur
  JOIN: 'join', // un écran se présente : { role, tableId, deviceId }
  TABLE_OPEN: 'table:open', // la réception ouvre une table : { tableId }
  TABLE_CLOSE: 'table:close', // la réception libère une table : { tableId }

  SEAT_OPEN: 'seat:open', // un client touche sa zone pour commencer : { tableId, seat }
  ORDER_ADD: 'order:add', // la table ajoute un plat dans une zone : { tableId, seat, dishId }
  ORDER_REMOVE: 'order:remove', // la table retire un plat pas encore envoyé : { tableId, seat, itemId }
  SEAT_VALIDATE: 'seat:validate', // un client valide (ou dévalide) dans sa zone : { tableId, seat, validated }
  ORDER_SEND: 'order:send', // le bouton du centre envoie la commande en cuisine : { tableId }

  CLIENT_JOIN: 'client:join', // le téléphone se lie à sa place (QR de la zone) : { tableId, seat, clientId }
  DIET_SET: 'diet:set', // le téléphone envoie régimes et allergies : { tableId, clientId, diets, allergies }
  EDIT_START: 'edit:start', // bouton Modifier dans la zone : { tableId, seat, itemId }
  EDIT_CANCEL: 'edit:cancel', // le client abandonne la modification : { tableId, seat }
  EDIT_REQUEST: 'edit:request', // le téléphone envoie la modification : { tableId, clientId, itemId, mods }
  EDIT_ANSWER: 'edit:answer', // la cuisine accepte ou refuse : { tableId, itemId, accepted }

  // appli téléphone, hors du restaurant
  RESA_AVAILABILITY: 'resa:availability', // créneaux libres : { date, guests }, réponse { services }
  RESA_CREATE: 'resa:create', // réserver : { date, time, guests, name, phone, occasion, diets, note }, réponse { resa } ou { error }
  RESA_CANCEL: 'resa:cancel', // annuler : { id }
  RESA_ASSIGN: 'resa:assign', // la réception attribue les tables d'une réservation : { id, tableIds }
  RESA_SEAT: 'resa:seat', // à l'arrivée, la réception installe le groupe sur ses tables : { id }
  RESA_CONFIRM: 'resa:confirm', // le client confirme sa venue après le rappel : { id }
  RESA_INVITE_INFO: 'resa:invite-info', // un invité ouvre le lien partagé : { code }, réponse { info } ou { error }
  RESA_GUEST_ADD: 'resa:guest-add', // l'invité donne son nom et ses régimes : { code, name, diets, allergies }
  WAIT_JOIN: 'wait:join', // liste d'attente sur un créneau complet : { date, time, guests, name, phone }
  WAIT_ACCEPT: 'wait:accept', // une table s'est libérée, le client la prend : { id }
  WAIT_DECLINE: 'wait:decline', // ou il n'en veut plus : { id }
  TABLE_LINK: 'table:link', // la réception couple deux tables : { tableId, otherId }
  TABLE_UNLINK: 'table:unlink', // et les découple : { tableId }
  PAY: 'pay', // payer sur le téléphone : { tableId, clientId, scope: 'moi' ou 'table' }
  REVIEW_ADD: 'review:add', // avis après le repas : { tableId, clientId, stars, comment }

  TICKET_READY: 'ticket:ready', // la cuisine a fini un plat : { tableId, itemId }
  DISH_SERVED: 'dish:served', // le serveur a apporté le plat : { tableId, itemId }

  // serveur -> appareils
  TABLE_STATE: 'table:state', // état d'une table, envoyé à la table et aux téléphones (sans les régimes)
  ALL_STATE: 'all:state', // état de toutes les tables, envoyé au personnel
  RESA_LIST: 'resa:list', // réservations, liste d'attente et avis, envoyé à la réception
  DEVICE_STATE: 'device:state', // ses réservations et sa liste d'attente, envoyé à l'appli d'un téléphone
  DISH_READY: 'dish:ready', // notification pour le serveur : { tableId, dishName }
}

// Délai laissé à la cuisine pour répondre à une demande de modification.
export const EDIT_DELAY_MS = 60 * 1000
