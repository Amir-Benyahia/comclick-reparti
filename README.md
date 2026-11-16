# COMCLICK réparti

Projet du cours IHM réparties. COMCLICK est une table tactile pour un restaurant premium.
La table tactile sert à commander. Chaque client a sa zone sur la table, et le personnel
suit les commandes sur ses propres écrans.

## Lancer le projet

```bash
npm install     # une seule fois
npm run dev     # lance le serveur et les pages en même temps
```

Puis ouvrir `http://localhost:5173` et choisir l'appareil.

| Appareil | Adresse | Qui le code |
|---|---|---|
| Table tactile | `/table/1`, `/table/2` | Amir |
| Réception | à créer | un autre membre |
| Cuisine | à créer | un autre membre |
| Serveur (tablette) | à créer | un autre membre |

Pour ouvrir la table sur une tablette, le PC et la tablette doivent être sur le même réseau.
L'adresse à utiliser s'affiche dans le terminal au démarrage.

### Tester sans les écrans des autres

En attendant les écrans réception et cuisine, un petit outil joue leur rôle depuis un deuxième terminal :

```bash
npm run simuler -- ouvrir 1          # ouvre la table 1
npm run simuler -- pret              # les plats envoyés passent à prêt
npm run simuler -- liberer 1         # libère la table 1
```

## Architecture

```
table      ─┤                    ┌─ serveur Node + Socket.IO (port 3001)
cuisine    ─┼── WebSocket ──► Vite ─┤   garde l'état de toutes les tables
serveur    ─┤   (port 5173)      └─
réception  ─┘
```

- `server/index.js` : le serveur temps réel. C'est lui qui garde l'état. Les écrans ne font qu'afficher ce qu'il envoie.
- `shared/` : ce qui sert aux deux côtés (la carte, les règles, la liste des messages).
- `src/pages/` : une page par appareil.
- `src/socket.js` : la connexion au serveur, partagée par toutes les pages.

Quand un appareil perd la connexion puis revient, il se présente à nouveau et reçoit tout l'état.

## Protocole

| Message | Envoyé par | Reçu par | Contenu |
|---|---|---|---|
| `join` | tous les écrans | serveur | `{ role, tableId }` |
| `table:open` / `table:close` | réception | serveur | `{ tableId }` |
| `seat:open` | table (zone du client) | serveur | `{ tableId, seat }` |
| `order:add` | table (zone du client) | serveur | `{ tableId, seat, dishId }` |
| `order:remove` | table (zone du client) | serveur | `{ tableId, seat, itemId }`, seulement avant l'envoi |
| `seat:validate` | table (zone du client) | serveur | `{ tableId, seat, validated }` |
| `order:send` | table (bouton du centre) | serveur | `{ tableId }`, seulement si tout le monde a validé |
| `ticket:ready` | cuisine | serveur | `{ tableId, itemId }` |
| `dish:served` | serveur (tablette) | serveur | `{ tableId, itemId }` |
| `table:state` | serveur | la table | l'état d'une table |
| `all:state` | serveur | cuisine, serveur, réception | l'état de toutes les tables |
| `dish:ready` | serveur | tablette du serveur | `{ tableId, dishName }` |

## Qui fait quoi

- **La table** sert à commander. Chaque client a sa zone avec la carte à gauche et sa commande à droite.
  Il valide dans sa zone, et quand tout le monde a validé un bouton apparaît au centre pour envoyer en cuisine.

### Ce que le serveur attend des autres écrans

- **Réception** : reçoit `all:state`. Elle ouvre et libère les tables (`table:open`, `table:close`).
- **Cuisine** : reçoit `all:state` et marque les plats prêts avec `ticket:ready`.
- **Serveur** : reçoit `all:state` et `dish:ready`, puis marque les plats servis avec `dish:served`.

Un plat passe par 4 états : choisi, en cuisine, prêt, servi.

## Premier scénario de validation

1. La réception ouvre la table 1 (ou `npm run simuler -- ouvrir 1`).
2. Deux clients touchent leur zone et choisissent leurs plats sur la table.
3. Chaque plat apparaît tout de suite dans la commande de sa zone.
4. Les deux clients valident dans leur zone, le bouton du centre apparaît, la commande part en cuisine.
5. La cuisine clique sur Prêt (ou `npm run simuler -- pret`), le serveur reçoit une notification, puis clique sur Servi.
