# Plan de développement - Application Flutter LTC vCard

## Phase 1: Structure et écrans avec données mock

### 1. Configuration et dépendances

#### 1.1 Mise à jour du pubspec.yaml
Ajouter les dépendances essentielles:
- `http` - Client HTTP pour communiquer avec l'API backend
- `provider` - Gestion d'état
- `shared_preferences` - Stockage local (tokens, préférences)
- `intl` - Formatage des dates et montants
- `flutter_svg` - Support des icônes SVG

### 2. Structure de répertoires

```
lib/
├── main.dart                          # Point d'entrée, MaterialApp, routes
├── config/
│   ├── api_config.dart               # Configuration API (baseUrl, endpoints)
│   ├── theme.dart                    # Thème LTC Group (colors, textStyles)
│   └── constants.dart                # Constantes globales
├── models/
│   ├── user.dart                     # Modèle utilisateur (id, name, email, kycStatus)
│   ├── card.dart                     # Modèle carte (id, type, balance, status, maskedNumber)
│   └── transaction.dart              # Modèle transaction (id, amount, type, date, status)
├── services/
│   ├── api_service.dart              # Client HTTP avec méthodes mock
│   ├── auth_service.dart             # Gestion authentification (login, register, logout)
│   └── storage_service.dart          # Gestion stockage local (tokens, user data)
├── providers/
│   ├── auth_provider.dart            # État d'authentification
│   ├── cards_provider.dart           # État des cartes
│   └── transactions_provider.dart    # État des transactions
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart         # Écran connexion
│   │   ├── register_screen.dart      # Écran inscription
│   │   └── kyc_screen.dart           # Écran KYC (placeholder)
│   ├── dashboard/
│   │   └── dashboard_screen.dart     # Écran principal avec stats et cartes récentes
│   ├── cards/
│   │   ├── card_list_screen.dart     # Liste des cartes
│   │   ├── card_detail_screen.dart   # Détails d'une carte
│   │   └── purchase_card_screen.dart # Achat nouvelle carte
│   ├── transactions/
│   │   ├── transaction_list_screen.dart  # Historique transactions
│   │   ├── topup_screen.dart             # Recharge carte
│   │   └── withdraw_screen.dart          # Retrait
│   ├── notifications/
│   │   └── notifications_screen.dart     # Liste notifications
│   └── profile/
│       └── profile_screen.dart           # Profil utilisateur
└── widgets/
    ├── card_widget.dart              # Widget carte virtuelle (affichage visuel)
    ├── transaction_item.dart         # Item transaction pour liste
    ├── custom_button.dart            # Bouton personnalisé LTC
    ├── custom_input.dart             # Input field personnalisé
    └── loading_indicator.dart        # Indicateur de chargement

```

### 3. Configuration du thème LTC Group

**Couleurs:**
- Primaire: `#10151e` (dark navy)
- Accent: `#cea427` (gold)
- Background: `#f5f5f5` (light gray)
- Surface: `#ffffff` (white)
- Error: `#d32f2f` (red)
- Success: `#4caf50` (green)

**Typographie:**
- Famille: System default (Roboto Android, SF Pro iOS)
- Tailles: 12, 14, 16, 18, 24, 32

### 4. Modèles de données

#### 4.1 User Model
```dart
class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String kycStatus; // PENDING, VERIFIED, REJECTED
  final DateTime createdAt;
}
```

#### 4.2 Card Model
```dart
class VirtualCard {
  final String id;
  final String type; // VISA, MASTERCARD
  final double balance;
  final String status; // ACTIVE, FROZEN, BLOCKED
  final String maskedNumber; // **** **** **** 1234
  final String currency; // EUR
  final DateTime expiryDate;
  final DateTime createdAt;
}
```

#### 4.3 Transaction Model
```dart
class Transaction {
  final String id;
  final String cardId;
  final double amount;
  final String type; // PURCHASE, TOPUP, WITHDRAWAL, REFUND
  final String status; // PENDING, SUCCESS, FAILED
  final String? merchant;
  final DateTime createdAt;
}
```

### 5. Service API avec données mock

**Méthodes à implémenter:**
- `login(email, password)` - Retourne token + user mock
- `register(email, password, firstName, lastName)` - Retourne user mock
- `getCards()` - Retourne liste de 2-3 cartes mock
- `getCardById(id)` - Retourne détails carte mock
- `purchaseCard(type, currency)` - Retourne nouvelle carte mock
- `getTransactions(cardId?)` - Retourne liste transactions mock
- `topupCard(cardId, amount, method)` - Retourne transaction mock
- `withdrawFromCard(cardId, amount, method)` - Retourne transaction mock
- `getNotifications()` - Retourne liste notifications mock

**Configuration API:**
- Base URL: `http://localhost:8000/api/v1`
- Timeout: 30 secondes
- Headers: `Authorization: Bearer {token}`

### 6. Navigation

#### 6.1 Routes nommées
```dart
routes: {
  '/': LoginScreen,
  '/register': RegisterScreen,
  '/kyc': KycScreen,
  '/main': MainScreen (avec BottomNavigationBar),
  '/card-detail': CardDetailScreen,
  '/purchase-card': PurchaseCardScreen,
  '/topup': TopupScreen,
  '/withdraw': WithdrawScreen,
}
```

#### 6.2 BottomNavigationBar (4 tabs)
1. **Dashboard** - Icône: home - Vue d'ensemble
2. **Cartes** - Icône: credit_card - Liste des cartes
3. **Transactions** - Icône: receipt - Historique
4. **Profil** - Icône: person - Profil utilisateur

### 7. Écrans détaillés

#### 7.1 Login Screen
- Champs: email, password
- Bouton: Se connecter
- Lien: Créer un compte (vers Register)
- Utilise données mock pour le login

#### 7.2 Register Screen
- Champs: firstName, lastName, email, password, confirmPassword
- Bouton: S'inscrire
- Lien: Déjà un compte? (vers Login)

#### 7.3 KYC Screen (Placeholder)
- Message: "Vérification KYC requise"
- Texte explicatif: "Vous devez compléter la vérification d'identité"
- Bouton: "Continuer" (redirige vers dashboard pour l'instant)

#### 7.4 Dashboard Screen
- Section 1: Balance totale (somme de toutes les cartes)
- Section 2: Cartes actives (2-3 cartes en mode carousel/horizontal scroll)
- Section 3: Transactions récentes (5 dernières)
- Section 4: Actions rapides (Recharger, Retirer, Nouvelle carte)

#### 7.5 Card List Screen
- AppBar avec bouton "Nouvelle carte"
- Liste verticale de toutes les cartes
- Chaque item affiche: type, maskedNumber, balance, status
- Tap sur une carte -> CardDetailScreen

#### 7.6 Card Detail Screen
- Vue complète de la carte (design visuel)
- Informations: maskedNumber, expiryDate, CVV (***), balance
- Boutons d'action:
  - Recharger
  - Retirer
  - Geler/Dégeler
  - Bloquer (avec confirmation)
- Liste des transactions de cette carte

#### 7.7 Purchase Card Screen
- Sélection type: Visa / Mastercard
- Sélection devise: EUR (par défaut)
- Montant initial (optionnel)
- Prix d'achat de la carte (ex: 5€)
- Bouton: Acheter la carte

#### 7.8 Transaction List Screen
- Filtre par carte (dropdown)
- Filtre par type (tous, achats, recharges, retraits)
- Liste chronologique des transactions
- Chaque item: merchant/type, amount, date, status

#### 7.9 Topup Screen
- Sélection carte (dropdown)
- Montant à recharger
- Méthode: Mobile Money, Virement bancaire (placeholder)
- Bouton: Recharger

#### 7.10 Withdraw Screen
- Sélection carte (dropdown)
- Montant à retirer
- Destination: Compte bancaire, Mobile Money (placeholder)
- Bouton: Retirer

#### 7.11 Notifications Screen
- Liste des notifications (transactions, KYC, cartes)
- Badge de count sur l'icône notification
- Marquer comme lu

#### 7.12 Profile Screen
- Informations utilisateur (nom, email, téléphone)
- Statut KYC avec badge
- Boutons:
  - Modifier profil (placeholder)
  - Paramètres (placeholder)
  - Se déconnecter

### 8. Widgets réutilisables

#### 8.1 CardWidget
- Affichage visuel d'une carte bancaire
- Gradient background (variant selon type Visa/Mastercard)
- Logo du type de carte
- Numéro masqué
- Date d'expiration
- Balance

#### 8.2 TransactionItem
- Icône selon type (achat, recharge, retrait)
- Merchant/description
- Montant avec couleur (rouge: débit, vert: crédit)
- Date formatée
- Badge status

#### 8.3 CustomButton
- Bouton avec style LTC Group
- Variantes: primary (gold), secondary (dark), outline
- Support loading state
- Support disabled state

#### 8.4 CustomInput
- Input field avec style cohérent
- Support label, hint, error message
- Icône optionnelle
- Support obscureText pour passwords

### 9. Données mock

#### 9.1 User mock
```dart
{
  "id": "user-123",
  "email": "demo@ltcgroup.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678",
  "kycStatus": "VERIFIED",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

#### 9.2 Cards mock (2 cartes)
```dart
[
  {
    "id": "card-1",
    "type": "VISA",
    "balance": 250.00,
    "status": "ACTIVE",
    "maskedNumber": "**** **** **** 4532",
    "currency": "EUR",
    "expiryDate": "2028-12-31",
    "createdAt": "2026-01-20T14:30:00Z"
  },
  {
    "id": "card-2",
    "type": "MASTERCARD",
    "balance": 150.75,
    "status": "ACTIVE",
    "maskedNumber": "**** **** **** 8765",
    "currency": "EUR",
    "expiryDate": "2029-06-30",
    "createdAt": "2026-02-01T09:15:00Z"
  }
]
```

#### 9.3 Transactions mock (5-6 transactions)
```dart
[
  {
    "id": "tx-1",
    "cardId": "card-1",
    "amount": -45.99,
    "type": "PURCHASE",
    "status": "SUCCESS",
    "merchant": "Amazon",
    "createdAt": "2026-02-13T16:45:00Z"
  },
  {
    "id": "tx-2",
    "cardId": "card-1",
    "amount": 100.00,
    "type": "TOPUP",
    "status": "SUCCESS",
    "merchant": null,
    "createdAt": "2026-02-12T10:20:00Z"
  },
  // ... etc
]
```

### 10. Ordre d'implémentation

1. **Configuration** (pubspec.yaml, config/, theme)
2. **Modèles** (models/)
3. **Services** (services/ avec données mock)
4. **Providers** (providers/)
5. **Widgets réutilisables** (widgets/)
6. **Écrans auth** (screens/auth/)
7. **Navigation principale** (main.dart avec routes et BottomNavigationBar)
8. **Dashboard** (screens/dashboard/)
9. **Écrans cartes** (screens/cards/)
10. **Écrans transactions** (screens/transactions/)
11. **Écrans secondaires** (notifications, profile)
12. **Tests et ajustements**

### Notes importantes

- **Phase 1 = Mock uniquement**: Toutes les données sont statiques/mock, aucune vraie connexion API
- **Responsive design**: Gérer les différentes tailles d'écran (phone, tablet)
- **Gestion d'erreurs**: Messages d'erreur utilisateur clairs
- **Loading states**: Indicateurs de chargement pour toutes les actions
- **Validation**: Validation des formulaires côté client
- **Sécurité**: Stockage sécurisé du token (shared_preferences pour Phase 1)

### Livrables Phase 1

- ✅ Application Flutter fonctionnelle avec toutes les routes
- ✅ 12+ écrans navigables
- ✅ Thème LTC Group appliqué partout
- ✅ Données mock pour tous les services
- ✅ Navigation fluide avec BottomNavigationBar
- ✅ Widgets réutilisables cohérents
- ✅ Code structuré et commenté
- ✅ README mis à jour avec instructions

**Prêt pour Phase 2**: Connexion au backend réel FastAPI (remplacer les mock par de vrais appels HTTP)
