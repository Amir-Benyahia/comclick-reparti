const LABELS = { choisi: 'Choisi', envoye: 'En cuisine', preparation: 'En préparation', pret: 'Prêt', servi: 'Servi' }

export default function ItemStatus({ status }) {
  return <span className={'status ' + status}>{LABELS[status]}</span>
}
