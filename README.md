# COMCLICK réparti

Table tactile de restaurant reliée au téléphone des clients et aux écrans du personnel.

## Lancer

```bash
npm install
npm run dev
```

- Table : `http://localhost:5173/table/1`
- Téléphone : scanner le QR code de sa zone sur la table
- Appli de réservation : `http://localhost:5173/app`

Pour tester sans les écrans réception et cuisine : `npm run simuler -- ouvrir 1` (ou `ouvrir 1 2` pour coupler deux tables), `installer CODE` pour une réservation, puis `accepter`, `refuser`, `pret` ou `liberer 1`.
