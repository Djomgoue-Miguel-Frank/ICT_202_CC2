# ICT_202_CC2 - Application de Gestion de Pressing

Application web pour gérer un pressing:
- dépôt des habits par client
- calcul automatique de la facturation selon catégorie/type
- suivi du statut de lavage (en attente, lavé, livré)
- suivi des paiements (impayé, partiel, payé)
- visualisation du stock en atelier (pièces non livrées)
- profil boutique avec noms des propriétaires
- interface dépôt orientée e-commerce (catalogue + panier)

## 1. Stack technique

- Frontend: React.js (Vite)
- UI/CSS: Bootstrap + CSS personnalisé
- Backend: Node.js + Express
- Base de données: SQLite (`index.db` à la racine)

## 2. Structure du projet

```bash
.
├── backend
│   ├── package.json
│   └── src
│       ├── db.js
│       └── server.js
├── frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       ├── components
│       │   ├── DashboardCards.jsx
│       │   ├── OrderForm.jsx
│       │   ├── OrdersTable.jsx
│       │   ├── PricingTable.jsx
│       │   └── StockPanel.jsx
│       └── utils
│           └── format.js
├── index.db   # généré automatiquement au premier lancement backend
└── README.md
```

## 3. Fonctionnalités implémentées

### A. Catalogue et pricing
- catégories d'habits (Hauts, Bas, Traditionnel, Maison)
- types d'habits et prix unitaires
- seed automatique en base au premier démarrage

### B. Dépôt client
- formulaire:
  - nom client
  - téléphone
  - date de retrait prévue
  - liste des pièces (type + quantité)
  - notes
  - paiement initial facultatif
- calcul de facture en temps réel côté frontend
- validation backend + recalcul serveur (source de vérité)

### C. Gestion des commandes
- statut de lavage:
  - `en_attente`
  - `lave`
  - `livre`
- affichage total, payé, restant
- ajout de paiements complémentaires
- statut paiement auto:
  - `impaye`
  - `partiel`
  - `paye`

### D. Dashboard
- total commandes
- commandes en attente / lavées / livrées
- total facturé / total payé / reste à encaisser
- stock en atelier par type (non livré)

## 4. Base de données (`index.db`)

Tables principales:
- `garment_categories`
- `garment_types`
- `customers`
- `orders`
- `order_items`
- `payments`

La base est créée automatiquement au lancement de l'API backend.

## 5. API REST principale

- `GET /api/health`
- `GET /api/profile`
- `GET /api/pricing`
- `GET /api/dashboard`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/payments`

## 6. Démarrage local

### Prérequis
- Node.js 18+
- npm

### Backend
```bash
cd backend
npm install
npm run dev
```
API disponible sur `http://localhost:4000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App disponible sur `http://localhost:5173`

Le frontend est configuré avec un proxy Vite vers le backend (`/api`).

## 7. Logique métier résumée

1. L'utilisateur enregistre un dépôt
2. L'API calcule le total depuis les prix en base
3. La commande est créée avec statut `en_attente`
4. Le paiement initial (si saisi) est enregistré
5. Le statut paiement est déduit automatiquement (`impaye/partiel/paye`)
6. Le stock atelier est la somme des pièces des commandes non livrées

## 8. Extensions possibles

- authentification (admin, caissier)
- impression ticket/facture PDF
- recherche avancée (client, téléphone, date)
- export Excel/CSV
- historique détaillé des changements de statut
- notifications WhatsApp/SMS pour retrait
