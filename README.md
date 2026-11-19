# COMCLICK — Écran Réception

Projet du cours IHM Réparties. COMCLICK est une table tactile pour restaurant premium.
Plusieurs appareils sont connectés en temps réel via Socket.IO.

Ce dépôt contient la partie table tactile et téléphone client (Amir).
**Ma contribution : l'écran Réception** (`src/pages/Reception.jsx`), dans la branche `hafid/receptionist`.

---

## Lancer le projet

```bash
npm install       # une seule fois
npm run dev       # lance le serveur (port 3001) ET Vite (port 5173) en même temps
```

Puis ouvrir dans le navigateur :

| Appareil | URL |
|---|---|
| Table tactile | `http://localhost:5173/table/1` |
| Téléphone client | Scanner le QR code affiché sur la table |
| **Réception** | `http://localhost:5173/reception` |

> `npm run dev` utilise `concurrently` : un seul terminal suffit pour tout démarrer.

---

## Arborescence

```
comclick-reparti/
│
├── server/
│   └── index.js          ← Serveur Node.js + Socket.IO. Garde l'état de toutes les tables en RAM.
│
├── shared/
│   ├── messages.js       ← Constantes des messages Socket.IO (MSG.TABLE_OPEN, MSG.ALL_STATE…)
│   ├── menu.js           ← La carte : plats, prix, ingrédients. findDish(id), modsSummary(mods)
│   └── rules.js          ← Règles métier (qui peut valider, envoyer en cuisine…)
│
└── src/
    ├── App.jsx           ← Routeur : associe chaque URL à un écran
    ├── index.css         ← Styles communs + une section par écran à la fin
    ├── socket.js         ← Connexion Socket.IO partagée. useJoin(role), useMessage(event, fn)
    │
    ├── components/
    │   ├── ConnectionBadge.jsx   ← Voyant vert/rouge connexion serveur
    │   ├── ItemStatus.jsx        ← Pastille statut d'un plat (choisi / en cuisine / prêt / servi)
    │   ├── Countdown.jsx         ← Barre or qui se vide (délai réponse cuisine : 60s)
    │   └── SeatZone.jsx          ← Zone d'une place sur la table tactile
    │
    └── pages/
        ├── Table.jsx       ← Table tactile (Amir)
        ├── Mobile.jsx      ← Téléphone client (Amir)
        └── Reception.jsx   ← Écran réception (Hafid) ← ma page
```

---

## Fichiers clés à connaître

### `server/index.js`
Le seul endroit qui a de la mémoire. Il reçoit les actions des écrans, modifie l'état, et le réémet à tout le monde via `all:state`.

### `shared/messages.js`
On n'écrit jamais un nom de message en dur. Toujours `MSG.TABLE_OPEN` plutôt que `'table:open'`.

### `src/socket.js`
Deux hooks à utiliser dans chaque page :
```js
const connected = useJoin('reception')         // se présente au serveur, retourne true/false
useMessage(MSG.ALL_STATE, setTables)           // écoute un message, appelle la fonction à chaque update
```

### `src/pages/Reception.jsx`
Mon écran. Il :
- reçoit `all:state` → affiche le plan de salle en temps réel
- envoie `table:open { tableId }` → ouvre une table
- envoie `table:close { tableId }` → libère une table

---

## Tester sans les autres écrans

```bash
npm run simuler -- ouvrir 1    # ouvre la table 1 (simule la réception)
npm run simuler -- pret        # passe les plats à "prêt" (simule la cuisine)
npm run simuler -- liberer 1   # libère la table 1
```
