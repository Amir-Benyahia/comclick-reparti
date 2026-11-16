// La connexion au serveur, partagée par toutes les pages.
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { MSG } from '../shared/messages.js'

// Pas d'adresse : on passe par Vite, qui renvoie vers le serveur.
export const socket = io()

// À appeler au début de chaque page.
// Elle se présente au serveur, et recommence après chaque reconnexion.
// Elle renvoie true ou false selon que le serveur répond.
export function useJoin(role, tableId) {
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    const join = () => {
      setConnected(true)
      socket.emit(MSG.JOIN, { role, tableId })
    }
    const lost = () => setConnected(false)

    if (socket.connected) join()
    socket.on('connect', join)
    socket.on('disconnect', lost)
    return () => {
      socket.off('connect', join)
      socket.off('disconnect', lost)
    }
  }, [role, tableId])

  return connected
}

// Écoute un message du serveur tant que la page est affichée.
export function useMessage(name, handler) {
  useEffect(() => {
    socket.on(name, handler)
    return () => socket.off(name, handler)
  }, [name, handler])
}
