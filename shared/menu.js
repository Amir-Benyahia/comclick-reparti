// La carte, utilisée par le serveur et par les écrans.
// ingredients : ce que le client peut demander à retirer.
// cuissons : seulement pour les plats où on peut choisir la cuisson.
export const CATEGORIES = ['Entrées', 'Plats', 'Desserts']

export const MENU = [
  { id: 'burrata', category: 'Entrées', name: 'Burrata et tomates anciennes', price: 14,
    ingredients: ['Tomates anciennes', 'Basilic', 'Huile d\'olive', 'Pignons de pin'] },
  { id: 'veloute', category: 'Entrées', name: 'Velouté de potimarron', price: 11,
    ingredients: ['Crème fraîche', 'Noisettes torréfiées', 'Ciboulette'] },
  { id: 'tartare', category: 'Entrées', name: 'Tartare de saumon', price: 16,
    ingredients: ['Avocat', 'Citron vert', 'Sésame', 'Oignon rouge'] },

  { id: 'boeuf', category: 'Plats', name: 'Filet de bœuf, sauce au poivre', price: 34,
    cuissons: ['Bleu', 'Saignant', 'À point', 'Bien cuit'],
    ingredients: ['Sauce au poivre', 'Purée maison', 'Champignons'] },
  { id: 'bar', category: 'Plats', name: 'Bar rôti, beurre blanc', price: 28,
    cuissons: ['Nacré', 'À point'],
    ingredients: ['Beurre blanc', 'Fenouil confit', 'Câpres'] },
  { id: 'risotto', category: 'Plats', name: 'Risotto aux cèpes', price: 24,
    ingredients: ['Parmesan', 'Crème', 'Persil'] },

  { id: 'fondant', category: 'Desserts', name: 'Fondant au chocolat', price: 10,
    ingredients: ['Glace vanille', 'Noisettes', 'Chantilly'] },
  { id: 'tarte', category: 'Desserts', name: 'Tarte au citron meringuée', price: 9,
    ingredients: ['Meringue', 'Zestes de citron vert'] },
  { id: 'pavlova', category: 'Desserts', name: 'Pavlova aux fruits rouges', price: 11,
    ingredients: ['Chantilly', 'Coulis de framboise', 'Menthe'] },
]

export function findDish(id) {
  return MENU.find((d) => d.id === id)
}

// Les régimes que le client peut indiquer.
export const DIETS = ['Halal', 'Casher', 'Végétarien', 'Vegan', 'Sans gluten', 'Sans lactose']

// Petit résumé d'une modification, par exemple "Saignant · sans Champignons".
export function modsSummary(mods) {
  if (!mods) return ''
  const parts = []
  if (mods.cuisson) parts.push(mods.cuisson)
  for (const r of mods.removed ?? []) parts.push('sans ' + r.toLowerCase())
  if (mods.note) parts.push('« ' + mods.note + ' »')
  return parts.join(' · ')
}
