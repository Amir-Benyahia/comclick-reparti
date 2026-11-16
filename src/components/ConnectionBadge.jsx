// Petit voyant en haut à droite : le serveur répond ou pas.
export default function ConnectionBadge({ connected }) {
  return (
    <div className={'badge ' + (connected ? 'ok' : 'ko')}>
      {connected ? 'Connecté' : 'Connexion perdue, reconnexion…'}
    </div>
  )
}
