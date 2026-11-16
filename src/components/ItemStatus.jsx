const LABELS = { choisi: 'Choisi', envoye: 'En cuisine', pret: 'Prêt', servi: 'Servi' }

export default function ItemStatus({ status }) {
  return <span className={'status ' + status}>{LABELS[status]}</span>
}
