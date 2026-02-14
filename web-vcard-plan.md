# Plan d'implémentation - Extension vCard Next.js

## Contexte
Extension du site Next.js LTC GROUP existant pour ajouter des fonctionnalités de cartes virtuelles (vCard). Le site utilise React 19 + Tailwind 4 avec des couleurs corporate (primary: #ea2a33, corporate-blue: #0f172a).

## Architecture existante observée
- Layout principal avec Header/Footer
- Pages de services avec layouts dédiés
- Composants réutilisables
- Système i18n avec FR/EN
- Formulaires avec gestion d'état useState
- Intégration paiement S3P/E-nkap
- Base PostgreSQL via lib/db.ts

## Phase 1 - Nouvelles routes et pages vCard

### 1.1 Structure des routes
Créer dans `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/`:

1. **layout.tsx** - Layout spécifique vCard
   - Navigation secondaire (Présentation, Achat, Recharge, Dashboard)
   - Breadcrumb "Accueil > Services > Solutions Financières > vCard"
   - Réutilise Header/Footer parent

2. **page.tsx** - Page présentation vCard
   - Hero section avec visuel de carte
   - Avantages (Visa vs Mastercard, segments différents)
   - Comparaison des offres
   - Call-to-action vers /achat
   - Témoignages/FAQ

3. **achat/page.tsx** - Formulaire achat carte virtuelle
   - Sélection type de carte (Visa/Mastercard)
   - Sélection segment (pour Visa)
   - Formulaire identité (similaire à page.tsx existante mais simplifié pour vCard)
   - Paiement immédiat (pas de pay_later)
   - Prévisualisation carte

4. **recharge/page.tsx** - Formulaire recharge
   - Entrée numéro de carte ou email
   - Montant de recharge
   - Méthode de paiement (Mobile Money, E-nkap)
   - Confirmation

5. **dashboard/page.tsx** - Dashboard client
   - Vue des cartes actives
   - Solde et détails carte
   - Historique des transactions
   - Bouton recharge rapide
   - Statut carte (active, bloquée, expirée)

### 1.2 Composants vCard
Créer dans `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/`:

1. **CardSelector.tsx**
   - Radio buttons ou cards pour Visa/Mastercard
   - Segments Visa (Segment 1, 2, 3) avec descriptions
   - Prix et limites affichés
   - State: selectedType, selectedSegment

2. **CardPreview.tsx**
   - Affichage visuel carte 3D/gradient
   - Type (Visa/MC), couleur selon segment
   - Numéro masqué (•••• •••• •••• 1234)
   - Date expiration
   - Nom du titulaire
   - Effet hover/flip pour voir CVV

3. **TransactionList.tsx**
   - Table/liste des transactions
   - Colonnes: Date, Description, Montant, Statut
   - Filtres: Date, Type (recharge/paiement)
   - Pagination si > 10 transactions
   - Export CSV optionnel

4. **BalanceWidget.tsx**
   - Card avec solde principal
   - Solde disponible vs réservé
   - Graphique circulaire utilisation
   - Bouton "Recharger"

5. **TopupForm.tsx**
   - Input montant (avec suggestions 5000, 10000, 25000)
   - Sélection méthode paiement
   - Total + frais
   - Bouton confirmation
   - Intégration avec APIs paiement

## Style et design

### Couleurs à utiliser
- Primary: #ea2a33 (rouge LTC)
- Primary Dark: #c91f27
- Corporate Blue: #0f172a (backgrounds sombres)
- Backgrounds: #f8f6f6 (light), #211111 (dark)
- Accent pour vCard: Selon type carte
  - Visa: Dégradé bleu (#1434CB → #0D2B99)
  - Mastercard: Dégradé rouge/orange (#EB001B → #FF5F00)

### Patterns de composants
- Cards: `rounded-lg shadow-lg border border-slate-200`
- Buttons: `rounded-lg h-10 px-6 bg-primary hover:bg-primary-dark text-white font-bold transition-all`
- Inputs: `border border-slate-300 rounded-lg px-4 py-2 focus:border-primary focus:ring-2 focus:ring-primary/20`
- Sections: `px-6 lg:px-20 py-12`

### Responsive
- Mobile-first avec Tailwind breakpoints
- Navigation collapse sur mobile
- Cards stack verticalement sur petit écran
- Tables deviennent scrollables horizontalement

## Données mock Phase 1

### Types de cartes disponibles
```typescript
const VCARD_TYPES = {
  visa_segment1: {
    name: "Visa Segment 1",
    price: 5000,
    limits: { daily: 100000, monthly: 500000 },
    color: "from-blue-600 to-blue-800"
  },
  visa_segment2: {
    name: "Visa Segment 2",
    price: 10000,
    limits: { daily: 300000, monthly: 1500000 },
    color: "from-blue-700 to-blue-900"
  },
  visa_segment3: {
    name: "Visa Segment 3",
    price: 20000,
    limits: { daily: 1000000, monthly: 5000000 },
    color: "from-blue-800 to-indigo-900"
  },
  mastercard: {
    name: "Mastercard Standard",
    price: 15000,
    limits: { daily: 500000, monthly: 2500000 },
    color: "from-orange-600 to-red-600"
  }
}
```

### Transactions mock
```typescript
const MOCK_TRANSACTIONS = [
  { id: 1, date: "2026-02-14", description: "Netflix", amount: -4500, status: "completed" },
  { id: 2, date: "2026-02-13", description: "Recharge Mobile Money", amount: 25000, status: "completed" },
  { id: 3, date: "2026-02-12", description: "Amazon", amount: -12000, status: "completed" },
  // etc.
]
```

### Cartes mock utilisateur
```typescript
const MOCK_USER_CARDS = [
  {
    id: "vc_001",
    type: "visa_segment2",
    last4: "1234",
    balance: 45000,
    status: "active",
    expiryDate: "12/28",
    holderName: "JEAN DUPONT"
  }
]
```

## Préparation backend Phase 2 (hors scope immédiat)

Les composants seront structurés avec:
- Interfaces TypeScript pour les types de données
- Fonctions fetch commentées (à activer Phase 2)
- Gestion d'erreur avec try/catch
- Loading states (isLoading, isSubmitting)
- Toast notifications pour feedback utilisateur

Structure API attendue:
```
POST /api/vcard/purchase - Achat carte
POST /api/vcard/topup - Recharge
GET /api/vcard/balance - Solde
GET /api/vcard/transactions - Historique
GET /api/vcard/cards - Liste cartes utilisateur
```

## Ordre d'implémentation

1. Créer layout vCard avec navigation
2. Créer composants de base (CardPreview, CardSelector)
3. Page présentation (page.tsx)
4. Page achat avec CardSelector + formulaire
5. Composants dashboard (BalanceWidget, TransactionList)
6. Page dashboard
7. Page recharge avec TopupForm
8. Tests navigation et responsive
9. Refinements UX/UI

## Points d'attention

- ✅ Réutiliser le système i18n existant (useLanguage hook)
- ✅ Suivre les patterns de formulaire existants (formData state, validation)
- ✅ Utiliser Material Symbols pour icônes
- ✅ Responsive mobile-first
- ✅ Accessibilité (aria-labels, keyboard navigation)
- ✅ Pas d'emojis sauf demande explicite
- ✅ Cohérence visuelle avec le site existant
- ⚠️ Données mock clairement identifiées avec commentaires
- ⚠️ Code prêt à connecter backend (fetch commentés)

## Fichiers à créer

**Routes (5 fichiers):**
1. `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/layout.tsx`
2. `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/page.tsx`
3. `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/achat/page.tsx`
4. `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/recharge/page.tsx`
5. `/Users/hackingcorp/Downloads/ltcgroup/web/src/app/services/solutions-financieres/vcard/dashboard/page.tsx`

**Composants (5 fichiers):**
6. `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/CardSelector.tsx`
7. `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/CardPreview.tsx`
8. `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/TransactionList.tsx`
9. `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/BalanceWidget.tsx`
10. `/Users/hackingcorp/Downloads/ltcgroup/web/src/components/vcard/TopupForm.tsx`

**Total: 10 fichiers à créer**

## Estimation
- Temps: ~3-4h de développement
- Complexité: Moyenne (réutilisation patterns existants)
- Risques: Cohérence visuelle, responsive mobile
